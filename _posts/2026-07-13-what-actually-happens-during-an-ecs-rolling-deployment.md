---
layout: post
title: "What Actually Happens During an ECS Rolling Deployment"
description: "A task-by-task walkthrough of an Amazon ECS rolling deployment: task definition revisions, image resolution, scheduler math, health checks, target registration, connection draining, circuit breakers, and rollback."
keywords: "ecs rolling deployment, amazon ecs deployment, minimumHealthyPercent, maximumPercent, ecs health checks, ecs deployment circuit breaker, ecs rollback, fargate deployment, alb deregistration delay"
tags: [aws, devops, ecs, containers]
comments: true
---

You push a new image, update an ECS service, and the console says `Deployment in progress`. Then it sits there.

A new task appears in `PENDING`. It changes to `RUNNING`, but the old task does not go away. A minute later the old one starts draining. Eventually it disappears and the service returns to steady state. If you only watch the task count, the whole thing looks oddly slow and a little random.

It is neither. Four systems are working on the deployment at the same time:

- The ECS scheduler is enforcing minimum and maximum task counts.
- The ECS agent or Fargate runtime is provisioning the task and starting its containers.
- The load balancer is deciding whether the new target should receive traffic.
- The old container is trying to finish requests before ECS kills it.

Most of the confusing failures I see come from treating those four systems as one thing. A task can be running but not ready. It can be healthy in ECS but unhealthy in the target group. It can be removed from the load balancer and still spend another minute shutting down.

We are going to follow one deployment from the API call to the final stopped task. At each pause, we will look at which system owns the wait and what condition it needs before the rollout can continue.

## The example service

We will use a small Fargate service behind an Application Load Balancer:

```text
service: api
desired count: 4
current task definition: api:41
new task definition: api:42
minimumHealthyPercent: 100
maximumPercent: 200
healthCheckGracePeriodSeconds: 60
```

The service begins with four healthy tasks running revision `api:41`. Our pipeline registers `api:42`, then calls `UpdateService` to point the service at the new revision.

The deployment settings create a range:

```text
minimum healthy = ceil(4 × 100%) = 4
maximum running or pending = floor(4 × 200%) = 8
```

ECS must keep at least four healthy tasks available, but it may temporarily run as many as eight. With enough Fargate or EC2 capacity, the scheduler can start all four replacements before touching the old tasks.

When a rollout behaves strangely, I calculate this range before looking anywhere else.

## The service revision changes first

Registering a task definition does not deploy it. It only creates an immutable blueprint such as `api:42`.

Updating the service is what starts the deployment:

```bash
aws ecs update-service \
  --cluster production \
  --service api \
  --task-definition api:42
```

ECS records the configuration it is leaving and the configuration it is trying to reach. In the current ECS deployment model, these are the source and target service revisions. A service revision includes more than the task definition: it records the workload configuration ECS is attempting to deploy and gives rollback a known previous state.

No customer traffic has moved yet. ECS has only changed desired state:

```text
source: api:41, four healthy tasks
target: api:42, zero healthy tasks
deployment: IN_PROGRESS
```

The service scheduler now begins reconciling reality with the new declaration.

## The scheduler finds room for the new tasks

The scheduler does not blindly replace one task at a time. It works inside the range created by `minimumHealthyPercent` and `maximumPercent`.

`minimumHealthyPercent` is the availability floor. ECS rounds it up.

`maximumPercent` is the concurrency ceiling for tasks in `RUNNING` or `PENDING`. ECS rounds it down.

The same four-task service behaves quite differently as those settings change:

| Minimum | Maximum | Allowed range | Likely behavior |
|---:|---:|---:|---|
| 100% | 200% | 4 to 8 tasks | Start new tasks before stopping old tasks |
| 50% | 100% | 2 to 4 tasks | Stop up to two old tasks to make room |
| 75% | 125% | 3 to 5 tasks | Replace roughly one task at a time |

These percentages affect availability, but on ECS with EC2 they also decide how much spare capacity a deployment needs. A service configured for `100/200` may run the old and new revisions together. If the cluster is already full, those new tasks have nowhere to go. Fargate hides the hosts, but account quotas, IP availability, and platform capacity can still block placement.

There is also a rounding trap. With a desired count of three and `maximumPercent: 125`, the upper limit is:

```text
floor(3 × 1.25) = 3
```

ECS cannot start a fourth task. If `minimumHealthyPercent` also prevents it from stopping an old task, the deployment has no legal move. ECS emits a service event telling you that the deployment configuration cannot start or stop a task.

## The first task pins the image

Task definition `api:42` may say:

```json
{
  "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/api:production"
}
```

That tag is mutable. It can point to a different image tomorrow.

By default, ECS resolves image tags to digests during a deployment so that every task in the service runs identical image content. For a service with multiple tasks, the first new task is used to establish the image digest, and the remaining tasks use that digest.

Overwriting a tag does not change a running task. ECS needs a new deployment before it resolves and launches the new image. Unique tags, preferably the Git SHA, also save a lot of guesswork during an incident.

```text
api:production                         mutable pointer
api@sha256:8d6c...                     actual image content
```

The task then moves through the early lifecycle:

```text
PROVISIONING → PENDING → ACTIVATING → RUNNING
```

Depending on the launch type and configuration, this includes finding capacity, attaching an ENI, pulling images, creating containers, configuring networking, registering targets, and starting essential containers.

`RUNNING` is one of the most misleading words in the ECS console. It means the containers are running. It does not mean the application is ready for customer traffic, and ECS may not count the task as healthy yet.

## `RUNNING` is followed by another wait

A task can be evaluated by two separate health systems:

1. A container health check defined in the ECS task definition.
2. A load-balancer target group health check.

If an essential container has an ECS health check and the service uses a load balancer, both must pass before the scheduler counts the task as healthy for the deployment.

A container health check runs inside the container:

```json
{
  "healthCheck": {
    "command": [
      "CMD-SHELL",
      "curl -f http://localhost:8080/health || exit 1"
    ],
    "interval": 10,
    "timeout": 5,
    "retries": 3,
    "startPeriod": 30
  }
}
```

The `startPeriod` belongs to the container health check. Failed checks during that bootstrap window do not count toward the retry limit. If a check succeeds during the start period, the container becomes healthy and later failures count normally.

`healthCheckGracePeriodSeconds` is different. It belongs to the ECS service and tells the service scheduler to ignore unhealthy container, load-balancer, or VPC Lattice health status for a period after each task starts.

The two timers sound interchangeable, but they sit at different layers:

```text
container startPeriod
  protects the container health-check retry counter during startup

service health-check grace period
  prevents the ECS scheduler from replacing a new task during startup
```

Neither setting sends traffic to an unhealthy target. The Application Load Balancer still follows its own target health state. The grace period only changes how the ECS scheduler reacts to an unhealthy result.

For a newly registered ALB target, one successful health check is enough to mark it healthy. The target group's healthy-threshold count applies when a previously unhealthy target is recovering. With the default 30-second health-check interval, even a healthy application may spend noticeable time waiting for the next probe.

Before the first `api:42` task counts toward the rollout, all of this must be true:

```text
ECS task state: RUNNING
container health: HEALTHY
ALB target health: healthy
counts toward deployment minimum: yes
receiving customer traffic: yes
```

Now the new revision has proved that it can serve traffic. Until this point, stopping an old task would spend availability on a replacement that had not earned it.

## New tasks come in, old tasks drain

As new tasks become healthy, the scheduler gains room to remove old ones without crossing the availability floor.

With our `100/200` settings, the rollout may look like this:

```text
time     api:41 healthy     api:42 starting/healthy     total
t0              4                     0                   4
t1              4                     4 starting          8
t2              4                     4 healthy           8
t3              0                     4 healthy           4
```

Do not read that table as a promise that all four tasks move together. The scheduler chooses the batches. Placement capacity, startup time, health results, and throttling can turn the same configuration into a more incremental rollout.

When ECS decides to stop an old task behind an ALB, the task does not jump directly from `RUNNING` to `STOPPED`.

It moves through the shutdown side of the lifecycle:

```text
RUNNING → DEACTIVATING → STOPPING → DEPROVISIONING → STOPPED
```

During `DEACTIVATING`, ECS deregisters the task from the target group. The target enters draining, and the load balancer stops assigning it new requests while allowing existing connections time to complete according to the target group's deregistration delay.

Then ECS stops the containers. On Linux, the container receives the signal defined by its image `STOPSIGNAL`, which is `SIGTERM` by default. ECS waits for the container's `stopTimeout`. If the process is still alive after that window, it receives `SIGKILL`.

For graceful shutdown, all three layers need to agree:

```text
ALB deregistration delay
    ≥ longest request or connection you intend to preserve

ECS stopTimeout
    ≥ time the application needs after SIGTERM

application shutdown handler
    stops accepting work and exits before stopTimeout
```

If the application ignores `SIGTERM`, no ECS setting can make its shutdown graceful. ECS will eventually kill it.

Long-lived WebSocket connections, streaming responses, background jobs, and queue consumers require special attention. A web server can stop accepting new requests and finish active ones. A worker may need to stop polling, return an in-flight message to the queue, or extend its visibility timeout. Rolling deployment safety is partly an application concern.

## ECS reaches steady state

The deployment completes after the target revision reaches the desired count and the old revision no longer has active tasks in the rollout.

For our service:

```text
api:41: 0 running tasks
api:42: 4 running and healthy tasks
desired count: 4
deployment: SUCCESSFUL
```

Your CI system does not perform the rollout. A deployment action usually registers the task definition, updates the service and, if configured, polls ECS until the service stabilizes. That is what the official GitHub action does when `wait-for-service-stability` is set to `true`. The scheduler still runs the deployment.

So when a pipeline appears frozen, the useful evidence is often somewhere else. ECS may be waiting for a health check, placement capacity, a draining connection, or the circuit-breaker threshold.

Start with ECS service events and deployment details, not the CI runner logs.

Useful commands include:

```bash
aws ecs describe-services \
  --cluster production \
  --services api

aws ecs list-service-deployments \
  --cluster production \
  --service api

aws ecs describe-service-deployments \
  --service-deployment-arns SERVICE_DEPLOYMENT_ARN

aws ecs list-tasks \
  --cluster production \
  --service-name api
```

Service deployment history includes the source and target revisions, deployment state, failed-task count, alarm state, timestamps, and rollback details. ECS retains recent deployment history, which is much more useful than reconstructing a rollout from a few console event messages.

## What happens when the new tasks fail?

Failed deployments usually split into two groups. The difference tells you where to start looking.

### The task never reaches `RUNNING`

The task may have no capacity, fail to pull its image, or start with an execution role that cannot retrieve a secret. ENI attachment failures also happen here. So does an essential container that exits during startup.

These are launch failures. In its first stage, the deployment circuit breaker counts consecutive tasks that fail to reach `RUNNING`.

### The task runs but never becomes healthy

Sometimes the process starts but listens on the wrong port, or the health endpoint returns a failing status. The ALB security group may not reach the task. A slow application can run past its grace period. I have also seen health checks fail because the image did not contain `curl`, even though the application itself was fine.

These are health failures. After at least one new task reaches `RUNNING`, the circuit breaker moves to its second stage and watches container, load-balancer, and service-discovery health.

The circuit breaker threshold is based on half the desired count, bounded to a minimum of 3 and a maximum of 200:

```text
threshold = ceil(0.5 × desired count), bounded to [3, 200]
```

For a service with a desired count of one, the threshold is still three. A tiny service may launch the same broken task several times before ECS finally calls the deployment failed.

Enable rollback explicitly:

```json
{
  "deploymentCircuitBreaker": {
    "enable": true,
    "rollback": true
  },
  "minimumHealthyPercent": 100,
  "maximumPercent": 200
}
```

When the deployment fails, ECS can roll back to the last service revision that completed successfully. CloudWatch alarms cover a different failure mode: the tasks are technically healthy, but latency or error rate gets worse after the release.

I use both because they answer different questions:

```text
circuit breaker
  catches tasks that cannot launch or become healthy

CloudWatch deployment alarms
  catch applications that are running but behaving badly
```

A `/health` endpoint returning `200` cannot tell you that checkout latency tripled or every database write is failing. The scheduler only knows what you expose to it.

## Why healthy deployments still cause errors

ECS can execute a perfect rolling deployment and users can still see failures.

### The new and old versions are incompatible

During a rolling deployment, both versions receive traffic. A destructive database migration, incompatible queue payload, or changed cache format can break one revision while the other is still alive.

Database changes should generally follow expand-and-contract:

1. Add the new schema while keeping the old schema valid.
2. Deploy code that can work with both representations.
3. Migrate data.
4. Remove the old schema in a later deployment.

### Readiness is too shallow

Returning `200` because the HTTP process started is not enough if the application cannot reach a dependency required for serving requests. But checking every downstream system can also cause a cascading failure by removing all targets during a shared dependency outage.

The useful question is narrower: what condition means this particular task should stop receiving traffic? Write the health check around that contract.

### Shutdown is not graceful

If the process exits immediately on `SIGTERM`, active requests die even though the ALB is draining the target. If it waits longer than `stopTimeout`, ECS kills it anyway.

### Sticky sessions or local state hide the overlap

Rolling deployments assume tasks are replaceable. Sessions stored only in process memory, local uploads, or singleton background work make replacement unsafe. The scheduler cannot protect state it does not know exists.

## The deployment settings I start with

For a normal stateless HTTP service on Fargate behind an ALB, I start here:

```text
desired count: at least 2
minimumHealthyPercent: 100
maximumPercent: 200
deployment circuit breaker: enabled with rollback
CloudWatch alarms: 5xx rate and latency, with rollback
health-check grace period: measured startup time plus margin
image tag: immutable Git SHA
container stopTimeout: matched to graceful shutdown behavior
```

I keep the ALB health check cheap and local. I test `SIGTERM` handling outside production. I also alarm on `SERVICE_DEPLOYMENT_FAILED` through EventBridge because an automatic rollback that nobody notices is still a failed release.

If doubling task count is too expensive or the EC2 cluster cannot hold it, lower `maximumPercent` carefully and verify that the scheduler still has room to make progress. Saving temporary capacity is not useful if it creates a deployment deadlock or reduces availability below what the application can tolerate.

## A practical debugging order

When a deployment is slow or stuck, inspect it in this order:

1. **Deployment state:** What are the source and target service revisions?
2. **Scheduler math:** Do the minimum and maximum percentages allow a task to start or stop?
3. **Service events:** Is placement, capacity, IAM, image pulling, or networking failing?
4. **Task lifecycle:** Are new tasks stuck in `PENDING`, stopping before `RUNNING`, or running and then replaced?
5. **Stopped-task reason:** What did ECS report for the failed task and essential container?
6. **Target health:** Is the ALB target initial, unhealthy, healthy, or draining? What reason does the target group report?
7. **Application logs:** Did the process bind the expected port and finish startup?
8. **Timers:** Are the container start period, service grace period, ALB interval, deregistration delay, and stop timeout consistent?
9. **Rollback controls:** Is the circuit breaker enabled, and are application alarms attached?

The order matters. There is no point staring at application logs if ECS never started the container. Likewise, changing a health endpoint will not fix a target group that cannot reach the task through its security group.

## What to remember

An ECS rolling deployment is a constrained reconciliation loop:

```text
declare a new service revision
        ↓
calculate the legal task-count range
        ↓
start tasks from the new revision
        ↓
prove they can run and receive traffic
        ↓
drain traffic from the old tasks
        ↓
give old processes time to exit
        ↓
stop the old revision and reach steady state
```

The scheduler protects task counts. Health checks decide which tasks receive traffic. Draining gives active requests time to finish. The circuit breaker catches a rollout that cannot converge. CloudWatch alarms catch the more annoying case, where the rollout converges and the application still gets worse.

When the ECS console sits on `Deployment in progress`, I check three things: the task state, the target state, and whichever timer is active. So far, the pause has always been hiding in one of them.

## Sources and further reading

- [Deploy Amazon ECS services by replacing tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html)
- [Amazon ECS task lifecycle](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-lifecycle-explanation.html)
- [How the ECS deployment circuit breaker detects failures](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html)
- [Amazon ECS service deployment history](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-deployment.html)
- [Amazon ECS service revisions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-revision.html)
- [Optimize load-balancer health checks for ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-healthcheck.html)
- [Determine task health with container health checks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html)
- [Automate rollback with CloudWatch alarms](https://aws.amazon.com/blogs/containers/automate-rollbacks-for-amazon-ecs-rolling-deployments-with-cloudwatch-alarms/)
