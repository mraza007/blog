---
layout: post
title: "The 5 ECS Decisions That Waste 6 Weeks (And What to Pick Instead)"
description: "A practical guide to deploying Python apps on AWS ECS. Cut through analysis paralysis on Fargate vs EC2, service discovery, CI/CD pipelines, secrets management, and monitoring. Opinionated recommendations from real consulting experience."
keywords: "aws ecs fargate python fastapi django docker deployment github-actions cloudwatch ssm parameter store service discovery alb devops containers"
tags: [aws, devops, python]
comments: true
---

I've been helping Python teams deploy to AWS for the past 2 years now. The pattern is always the same: a team has a working FastAPI or Django app running perfectly on their laptops with `docker-compose up`, and then someone says "let's put this in ECS." Six weeks later, they're still arguing about whether to use Fargate or EC2.

The problem isn't that ECS is hard. The problem is that teams treat infrastructure decisions like they're permanent. They're not.

Last year I worked with a startup that spent 5 weeks evaluating container orchestration options. Five weeks. They had a working app. They had paying customers waiting. But the engineering team was stuck in an endless loop of "what if we need to scale?" and "shouldn't we future-proof this?"

They launched on Fargate. It took 3 days once they stopped debating.

Here are the 5 decisions that waste the most time and what I tell every client to pick.

## Fargate vs EC2: Just Use Fargate

This one wastes more time than all the others combined.

I get it. EC2 looks cheaper on paper. You can run the numbers, build a spreadsheet, show that at 50 containers you'll save $400/month with EC2. The finance person gets excited. Someone mentions spot instances. Now you're three meetings deep into capacity planning for traffic you don't have yet.

Here's what actually happens with EC2: you spend a week figuring out instance types, another week on auto-scaling groups, then you hit some weird issue where your containers won't place because the bin-packing algorithm can't find space, and suddenly your "cheaper" option has eaten two sprints of engineering time.

Fargate just works. You tell it how much CPU and memory you need, and it runs your container. No instances to manage, no patching, no capacity planning.

"But it's more expensive!"

Sure. Maybe 20-30% more at scale. But you're not at scale. You're trying to ship. And even if Fargate costs you an extra $200/month right now, that's nothing compared to the $30k+ in engineering salaries you're burning while debating this.

Python apps especially benefit from Fargate. Your Django app with Celery workers is memory-heavy and I/O bound. You're not doing CPU-intensive work. Fargate lets you right-size memory without playing Tetris with EC2 instance types.

Pick Fargate. When you're running 200 containers 24/7 and have real cost data, revisit. Until then, move on.

## ECS Service Discovery: Use an Internal ALB

When your services need to talk to each other, AWS gives you three options: Cloud Map, internal ALB, or Service Connect. I've seen teams spend weeks evaluating all three, setting up proof-of-concepts, reading whitepapers.

Just use an internal ALB.

I know, it's not great. It's a load balancer. It's been around forever. But that's exactly why you should use it:

- It gives you a stable DNS name your services can call
- Health checks work out of the box
- You get access logs for debugging
- Every developer on your team already understands HTTP

Your FastAPI service calls `http://api-internal.yourdomain.local/users` and it just works. No service mesh. No Envoy sidecars. No DNS caching gotchas.

Cloud Map is fine, but I've debugged too many issues where services couldn't find each other because of DNS TTL problems. Service Connect is powerful, but now you're operating a service mesh. Do you really want to be debugging Envoy proxy configuration when your actual problem is a database query?

The internal ALB is boring. Boring is good. Boring means you're debugging your application code instead of your infrastructure.

## CI/CD for ECS: Use GitHub Actions

I'm gonna be honest here: if your code is on GitHub, use GitHub Actions. Don't overthink this.

"But CodePipeline is AWS-native!"

Yes, and it requires you to set up a pipeline with Source, Build, and Deploy stages, configure IAM roles for each stage, create buildspec files, and wire everything together. It's more YAML for the same result.

"But Jenkins gives us more control!"

It's 2025. Please don't set up a Jenkins server. You'll spend more time maintaining Jenkins than deploying your app.

GitHub Actions has an official AWS action that handles ECS deployments:

```yaml
- name: Deploy to ECS
  uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    task-definition: task-definition.json
    service: my-service
    cluster: my-cluster
    wait-for-service-stability: true
```

That's the whole thing. It registers your task definition, updates the service, and waits for the deployment to stabilize. AWS maintains it. It works.

Your deployment workflow lives in your repo, your team already knows GitHub Actions from running tests, and you're not managing another piece of infrastructure. If you want to understand how these pipeline runners actually work internally, I wrote a deep dive on [building a CI/CD pipeline runner from scratch in Python](/2025/building-cicd-pipeline-runner-python/).

If you're on GitLab, use GitLab CI. If you're on Bitbucket, use Bitbucket Pipelines. The point is: use whatever's already integrated with your code. Don't add complexity.

## ECS Secrets Management: Use SSM Parameter Store

Where do you store your database passwords and API keys?

Not in your task definition. I've seen that. Please don't.

The two real options are SSM Parameter Store and Secrets Manager. Teams debate this endlessly because Secrets Manager has automatic rotation and sounds more "enterprise."

Here's the thing: SSM Parameter Store is free, integrates natively with ECS, and handles 99% of use cases.

```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/myapp/database_url"
    }
  ]
}
```

Your Python app reads `os.environ['DATABASE_URL']` like it does locally. No SDK, no code changes.

Secrets Manager costs $0.40 per secret per month and is worth it if you need automatic rotation for RDS credentials. But you probably don't need that on day one. Start with SSM, migrate specific secrets to Secrets Manager later if you need rotation.

And please, don't set up HashiCorp Vault unless you have compliance requirements that specifically mandate it. You're now operating a distributed system just to store passwords. That's not simplifying your life.

## ECS Logging and Monitoring: Use CloudWatch

Every team wants to evaluate Datadog, New Relic, Honeycomb, and then maybe self-host Prometheus and Grafana "for cost savings."

Stop. Use CloudWatch.

Add this to your task definition:

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/my-service",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "ecs"
    }
  }
}
```

Done. Your container logs go to CloudWatch. You can query them with Log Insights. Enable Container Insights and you get CPU/memory metrics. Set up a few alarms. You now have better observability than 80% of startups.

Datadog is genuinely good software. I like it. But it costs $15+ per host per month from day one, and you need to manage another vendor relationship. You can add it later when you actually need distributed tracing or APM.

Self-hosted observability is a trap. I've seen teams spend months building ELK stacks and Prometheus clusters. That's infrastructure work that doesn't ship features. Unless you have a dedicated platform team, don't volunteer for this.

## The Actual Pattern Here

Look at what I recommended:

- Fargate over EC2
- Internal ALB over Cloud Map or Service Connect
- GitHub Actions over CodePipeline or Jenkins
- SSM over Secrets Manager or Vault
- CloudWatch over Datadog or self-hosted

Every single choice optimizes for the same thing: **less stuff to manage**.

Yes, some of these cost slightly more money. Yes, some of them are less flexible. But they all share one property: they let you ship faster and debug easier.

And here's what nobody puts in their architecture decision records: all of these choices are reversible.

- Fargate to EC2? Task definitions work on both.
- ALB to Service Connect? Just DNS changes.
- SSM to Secrets Manager? Same integration pattern.
- CloudWatch to Datadog? Add the agent, keep CloudWatch as backup.

The "wrong" choice costs you maybe a few hundred dollars a month in inefficiency. The debate about the "right" choice costs you weeks of engineering time.

## What I've Actually Seen Happen

Teams that follow this advice ship in about a week:

- Day 1-2: Fargate cluster up, first service running
- Day 3: ALB routing traffic, services talking to each other
- Day 4: GitHub Actions deploying on push to main
- Day 5: Secrets in SSM, logs in CloudWatch, basic alarms set up

Week 2: Building features.

Teams that "do it right" are still having meetings about networking topology in week 6.

I've watched startups run out of runway while their infrastructure was still "almost ready." I've seen senior engineers burn out on DevOps work instead of building the product that got them excited in the first place.

Your Python app on Fargate with CloudWatch logs isn't going to fall over at 1,000 users. Probably not at 10,000. By the time scale is actually a problem, you'll have the traffic data and revenue to solve it properly.

Ship first. Optimize later.

---

**If you found this helpful, share it on X and tag me [@muhammad_o7](https://twitter.com/muhammad_o7)** - I'd love to hear about your ECS deployment experiences. You can also connect with me on [LinkedIn](https://www.linkedin.com/in/muhammad-raza-07/).

**Need Help?** I'm available for AWS and DevOps consulting. If you're stuck in ECS decision paralysis or need help getting to production faster, reach out via [email](mailto:muhammadraza0047@gmail.com) or DM me on [X/Twitter](https://twitter.com/muhammad_o7).
