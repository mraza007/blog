---
layout: post
title: "How ECS Actually Works: A Visual Guide for People Who Know Kubernetes"
description: "An interactive explainer of AWS ECS — clusters, services, tasks, and the reconciliation loop — mapped one-to-one to Kubernetes concepts. Plus an honest look at what you stop operating when a small team picks ECS over EKS."
keywords: "ecs vs eks, what is aws ecs, aws ecs explained, ecs kubernetes comparison, ecs fargate, aws container orchestration, ecs for small teams, eks alternatives"
tags: [aws, devops, kubernetes]
comments: true
---

Every few months I have the same conversation. A small team, three to eight engineers, is containerizing their app, and someone says "we should use Kubernetes, that's the industry standard." Six months later they're maintaining a small distributed systems platform on the side, and the app they were supposed to ship is still competing for attention with CNI upgrades.

I've written before about [the ECS decisions that waste six weeks](/2025/ecs-decisions-that-waste-6-weeks/). This post is the prequel: what ECS actually is, how it maps onto the Kubernetes concepts you already know, and what you stop carrying on your pager when you choose it. There are a few interactive diagrams below. Click around in them; they teach the model faster than prose does.

One thing before we start: this is not a "Kubernetes bad" post. EKS is the right choice for some teams, and I'll tell you exactly which ones at the end. But I've watched too many three-person teams default to EKS because it felt like the serious choice, without anyone explaining what they were signing up to operate.

## ECS is an orchestrator. That's it.

Strip away the branding and every container orchestrator does the same job: you declare what should be running, and a control loop makes reality match the declaration. Kubernetes does this. Nomad does this. ECS does this.

ECS just exposes far fewer moving parts to you. Here's the whole object model. Click each piece:

<style>
/* ---- ecsx shared widget styles (scoped) ---- */
.ecsx{background:#0e131b;border:1px solid #2a3447;border-radius:8px;padding:18px;margin:1.6em 0;
  font-family:"JetBrains Mono",monospace;color:#dbe2ee;font-size:13px;line-height:1.5}
.ecsx *{box-sizing:border-box}
.ecsx-title{font-size:11px;letter-spacing:.18em;color:#7d8aa3;margin-bottom:14px;text-transform:uppercase}
.ecsx button{font-family:inherit;font-size:12px;background:#1a2333;color:#dbe2ee;border:1px solid #36435c;
  border-radius:5px;padding:7px 12px;cursor:pointer;transition:all .15s}
.ecsx button:hover{border-color:#ffb454;color:#ffb454}
.ecsx button:disabled{opacity:.4;cursor:default}
.ecsx-badge{display:inline-block;font-size:10px;padding:2px 8px;border-radius:99px;border:1px solid #4b79c4;
  color:#8db8f8;margin-left:8px;white-space:nowrap}
.ecsx-flex{display:flex;gap:16px;flex-wrap:wrap}
@media(max-width:640px){.ecsx{font-size:12px}}
/* anatomy */
.ecsx-anat-box{border:1.5px solid;border-radius:7px;padding:10px;cursor:pointer;transition:background .15s}
.ecsx-anat-box:hover{background:rgba(255,180,84,.06)}
.ecsx-anat-box.sel{background:rgba(255,180,84,.12)}
.ecsx-anat-label{font-size:11px;letter-spacing:.08em;margin-bottom:8px;font-weight:700}
.ecsx-info{flex:1;min-width:240px;border-left:2px solid #ffb454;padding:4px 0 4px 14px;align-self:center}
.ecsx-info h4{margin:0 0 6px;font-size:14px;color:#ffb454;font-family:inherit}
.ecsx-info p{margin:0;color:#aab4c8;font-size:12.5px}
/* recon */
.ecsx-taskgrid{display:flex;gap:10px;flex-wrap:wrap;min-height:84px;margin:12px 0}
.ecsx-task{width:118px;border:1.5px solid #3e9c5a;border-radius:6px;padding:8px;cursor:pointer;
  transition:opacity .4s, transform .4s}
.ecsx-task .id{font-size:11px;color:#7d8aa3}
.ecsx-task .st{font-size:11px;font-weight:700;margin-top:4px}
.ecsx-task.RUNNING{border-color:#3e9c5a}.ecsx-task.RUNNING .st{color:#79d68a}
.ecsx-task.PROVISIONING{border-color:#b98a3c;animation:ecsxpulse 1s infinite}.ecsx-task.PROVISIONING .st{color:#ffb454}
.ecsx-task.DRAINING{border-color:#5c677c;opacity:.55}.ecsx-task.DRAINING .st{color:#8b96ab}
.ecsx-task.STOPPED{border-color:#c44f5e;opacity:.25;transform:scale(.92)}.ecsx-task.STOPPED .st{color:#ff6b7d}
.ecsx-ver{display:inline-block;font-size:10px;padding:1px 7px;border-radius:99px;margin-top:5px}
.ecsx-ver.v1{background:#16344e;color:#7fc4ff}.ecsx-ver.v2{background:#33234e;color:#c9a6ff}
@keyframes ecsxpulse{50%{background:rgba(255,180,84,.08)}}
.ecsx-log{background:#0a0e15;border:1px solid #232c3d;border-radius:6px;padding:10px 12px;font-size:11.5px;
  height:118px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;color:#94a0b8}
.ecsx-log .t{color:#525e75;margin-right:8px}
.ecsx-log .hl{color:#ffb454}.ecsx-log .ok{color:#79d68a}.ecsx-log .bad{color:#ff6b7d}
.ecsx-svchead{display:flex;gap:18px;flex-wrap:wrap;font-size:12px;color:#aab4c8;margin-bottom:4px}
.ecsx-svchead b{color:#dbe2ee}
/* stack */
.ecsx-cols{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px}
.ecsx-col{flex:1;min-width:230px}
.ecsx-colhead{text-align:center;font-weight:700;font-size:13px;padding:8px;border-bottom:2px solid #36435c;margin-bottom:8px}
.ecsx-cell{border-radius:5px;padding:8px 10px;margin-bottom:6px;font-size:12px;border:1px solid;min-height:54px}
.ecsx-cell .who{font-size:10px;font-weight:700;letter-spacing:.1em;display:block;margin-bottom:2px}
.ecsx-cell.aws{background:rgba(62,156,90,.10);border-color:#2c5e3e}.ecsx-cell.aws .who{color:#79d68a}
.ecsx-cell.you{background:rgba(255,180,84,.10);border-color:#7a5a28}.ecsx-cell.you .who{color:#ffb454}
.ecsx-cell.na{background:rgba(120,130,150,.05);border-color:#2a3447;color:#67738c}.ecsx-cell.na .who{color:#67738c}
.ecsx-score{margin-top:10px;padding:10px 12px;background:#0a0e15;border:1px solid #232c3d;border-radius:6px;
  font-size:12.5px;color:#aab4c8}
.ecsx-score b{color:#ffb454}
.ecsx-toggle{display:inline-flex;border:1px solid #36435c;border-radius:6px;overflow:hidden;margin-left:10px}
.ecsx-toggle button{border:none;border-radius:0;padding:5px 12px;font-size:11px}
.ecsx-toggle button.on{background:#ffb454;color:#1a1206}
</style>

<div class="ecsx" id="ecsx-anatomy">
  <div class="ecsx-title">The entire ECS object model — click anything</div>
  <div class="ecsx-flex">
    <div style="flex:1.4;min-width:280px">
      <div class="ecsx-anat-box" data-k="cluster" style="border-color:#4b79c4">
        <div class="ecsx-anat-label" style="color:#8db8f8">CLUSTER</div>
        <div class="ecsx-anat-box" data-k="service" style="border-color:#3e9c5a">
          <div class="ecsx-anat-label" style="color:#79d68a">SERVICE — web · desired: 3</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div class="ecsx-anat-box" data-k="task" style="border-color:#ffb454;flex:1;min-width:110px">
              <div class="ecsx-anat-label" style="color:#ffb454">TASK</div>
              <div class="ecsx-anat-box" data-k="container" style="border-color:#c9a6ff;font-size:11px;color:#c9a6ff">container: app</div>
              <div class="ecsx-anat-box" data-k="container" style="border-color:#c9a6ff;font-size:11px;color:#c9a6ff;margin-top:6px">container: nginx</div>
            </div>
            <div class="ecsx-anat-box" data-k="task" style="border-color:#ffb454;flex:1;min-width:110px">
              <div class="ecsx-anat-label" style="color:#ffb454">TASK</div>
              <div class="ecsx-anat-box" data-k="container" style="border-color:#c9a6ff;font-size:11px;color:#c9a6ff">container: app</div>
              <div class="ecsx-anat-box" data-k="container" style="border-color:#c9a6ff;font-size:11px;color:#c9a6ff;margin-top:6px">container: nginx</div>
            </div>
            <div class="ecsx-anat-box" data-k="task" style="border-color:#ffb454;flex:1;min-width:110px">
              <div class="ecsx-anat-label" style="color:#ffb454">TASK</div>
              <div class="ecsx-anat-box" data-k="container" style="border-color:#c9a6ff;font-size:11px;color:#c9a6ff">container: app</div>
              <div class="ecsx-anat-box" data-k="container" style="border-color:#c9a6ff;font-size:11px;color:#c9a6ff;margin-top:6px">container: nginx</div>
            </div>
          </div>
        </div>
      </div>
      <div class="ecsx-anat-box" data-k="taskdef" style="border-color:#e06c75;margin-top:10px">
        <div class="ecsx-anat-label" style="color:#e06c75">TASK DEFINITION — web:42 <span style="color:#67738c;font-weight:400">(the blueprint the service stamps tasks from)</span></div>
      </div>
    </div>
    <div class="ecsx-info" id="ecsx-anat-info">
      <h4>Click a component</h4>
      <p>Every box on the left has a direct Kubernetes equivalent. Click to see what it is and what it maps to.</p>
    </div>
  </div>
</div>

<script>
(function(){
  var INFO = {
    cluster:  ['Cluster', 'Kubernetes equivalent: cluster',
      'A logical boundary for compute and workloads. Unlike a Kubernetes cluster, there is no control plane living inside it that you can see, version, or break — the scheduler and state store are an AWS regional service. There is nothing to upgrade. Ever.'],
    service:  ['Service', 'Kubernetes equivalent: Deployment + Service',
      'Holds the declaration: "keep N copies of this task definition running, registered behind this load balancer target group." It is the reconciliation loop — it replaces dead tasks, performs rolling deployments, and hooks into autoscaling. One ECS object does what a Deployment, ReplicaSet, and Service do together in Kubernetes.'],
    task:     ['Task', 'Kubernetes equivalent: Pod',
      'One running copy of your workload: one or more containers scheduled together on the same host, sharing a network namespace and an IAM role. With the awsvpc network mode every task gets its own ENI and private IP — same mental model as a pod IP.'],
    container:['Container', 'Kubernetes equivalent: container',
      'Exactly what you think it is. Sidecars work the same way as in a pod — an nginx or log-router container scheduled next to your app container inside the same task.'],
    taskdef:  ['Task Definition', 'Kubernetes equivalent: pod spec (+ a bit of Deployment)',
      'A versioned, immutable JSON document: images, CPU/memory, env vars, ports, volumes, IAM role. Every revision gets a number (web:41, web:42). A deployment is literally "point the service at a new revision." No Helm, no templating layer — which is both the good news and the bad news.'],
  };
  var root = document.getElementById('ecsx-anatomy');
  var info = document.getElementById('ecsx-anat-info');
  root.addEventListener('click', function(e){
    var box = e.target.closest('.ecsx-anat-box');
    if(!box) return;
    e.stopPropagation();
    root.querySelectorAll('.ecsx-anat-box').forEach(function(b){b.classList.remove('sel')});
    box.classList.add('sel');
    var d = INFO[box.dataset.k];
    info.innerHTML = '<h4>'+d[0]+'<span class="ecsx-badge">'+d[1]+'</span></h4><p>'+d[2]+'</p>';
  }, true);
})();
</script>

If you know Kubernetes, the translation table is short enough to memorize over coffee:

| ECS | Kubernetes | What it is |
|---|---|---|
| Cluster | Cluster | Logical boundary for compute + workloads |
| Service | Deployment + ReplicaSet + Service | "Keep N running, behind this LB" |
| Task | Pod | Co-scheduled containers, shared network + identity |
| Task definition | Pod spec | Versioned blueprint for a task |
| Capacity provider | Node group / Karpenter | Where compute comes from |
| Fargate | — (closest: virtual kubelet) | Serverless compute, no nodes at all |
| Task IAM role | ServiceAccount + IRSA | Per-workload cloud credentials |
| `awsvpc` mode | CNI | Every task gets its own ENI/IP — not a choice, a default |

That last column is where the story actually lives. In Kubernetes, "where compute comes from" and "how pods get IPs" and "how workloads get cloud credentials" are all *decisions* with an ecosystem of competing answers. In ECS they're defaults. You don't pick a CNI. You don't install an IRSA webhook. There's one way, it's boring, and it works.

## The reconciliation loop — same idea, fewer layers

The core idea both systems share: you declare desired state, a control loop enforces it. This is the part I find people understand instantly once they *watch* it instead of reading about it.

Below is an ECS service with `desired count: 4`. Click a task to kill it, then watch the scheduler notice and replace it. Then hit deploy and watch a rolling deployment do exactly what a Kubernetes Deployment rollout does: bring up new tasks, drain old ones, never drop below healthy.

<div class="ecsx" id="ecsx-recon">
  <div class="ecsx-title">Service reconciliation — click a task to kill it</div>
  <div class="ecsx-svchead">
    <span>service: <b>web</b></span>
    <span>desired: <b>4</b></span>
    <span>running: <b id="ecsx-running">4</b></span>
    <span>revision: <b id="ecsx-rev">web:41</b></span>
  </div>
  <div class="ecsx-taskgrid" id="ecsx-tasks"></div>
  <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
    <button id="ecsx-kill">⚡ kill a task</button>
    <button id="ecsx-deploy">🚀 deploy web:42</button>
    <button id="ecsx-reset">↺ reset</button>
  </div>
  <div class="ecsx-log" id="ecsx-loglines"></div>
</div>

<script>
(function(){
  var grid = document.getElementById('ecsx-tasks');
  var logEl = document.getElementById('ecsx-loglines');
  var runEl = document.getElementById('ecsx-running');
  var revEl = document.getElementById('ecsx-rev');
  var DESIRED = 4, tasks = [], logs = [], t0 = Date.now(), deploying = false, timers = [];

  function now(){ return ((Date.now()-t0)/1000).toFixed(1)+'s'; }
  function log(msg, cls){
    logs.push('<div><span class="t">'+now()+'</span><span class="'+(cls||'')+'">'+msg+'</span></div>');
    logs = logs.slice(-7); logEl.innerHTML = logs.join('');
  }
  function id(){ return Math.random().toString(16).slice(2,8); }
  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }

  function render(){
    grid.innerHTML = tasks.map(function(t){
      return '<div class="ecsx-task '+t.st+'" data-id="'+t.id+'">'+
        '<div class="id">'+t.id+'</div>'+
        '<div class="st">'+t.st+'</div>'+
        '<span class="ecsx-ver '+t.ver+'">web:'+(t.ver==='v1'?41:42)+'</span></div>';
    }).join('');
    runEl.textContent = tasks.filter(function(t){return t.st==='RUNNING'}).length;
  }

  function spawn(ver, cb){
    var t = { id:id(), ver:ver, st:'PROVISIONING' };
    tasks.push(t); render();
    log('scheduler: starting task <span class="hl">'+t.id+'</span> ('+(ver==='v1'?'web:41':'web:42')+')');
    later(function(){
      t.st = 'RUNNING'; render();
      log('task <span class="hl">'+t.id+'</span> RUNNING — registered with target group','ok');
      if(cb) cb(t);
    }, 1900 + Math.random()*700);
  }

  function reconcile(){
    if (deploying) return;
    var alive = tasks.filter(function(t){return t.st==='RUNNING'||t.st==='PROVISIONING'}).length;
    if (alive < DESIRED){
      log('service web: running ('+alive+') below desired ('+DESIRED+')','hl');
      spawn(tasks.some(function(t){return t.ver==='v2'}) ? 'v2' : 'v1');
    }
  }

  function kill(tid){
    var t = tasks.find(function(x){return x.id===tid && x.st==='RUNNING'});
    if(!t) return;
    t.st='STOPPED'; render();
    log('task <span class="bad">'+t.id+'</span> stopped (essential container exited)','bad');
    later(function(){ tasks = tasks.filter(function(x){return x!==t}); render(); reconcile(); }, 900);
  }

  grid.addEventListener('click', function(e){
    var el = e.target.closest('.ecsx-task'); if(el) kill(el.dataset.id);
  });
  document.getElementById('ecsx-kill').onclick = function(){
    var r = tasks.filter(function(t){return t.st==='RUNNING'});
    if(r.length) kill(r[Math.floor(Math.random()*r.length)].id);
  };

  document.getElementById('ecsx-deploy').onclick = function(){
    if (deploying || tasks.some(function(t){return t.ver==='v2'})) return;
    deploying = true;
    revEl.textContent = 'web:42';
    log('deployment started: web:41 → web:42 (rolling, min healthy 100%)','hl');
    (function step(){
      var olds = tasks.filter(function(t){return t.ver==='v1' && t.st==='RUNNING'});
      if (!olds.length){ deploying=false; log('deployment completed: 4/4 tasks on web:42','ok'); return; }
      spawn('v2', function(){
        var old = tasks.find(function(t){return t.ver==='v1' && t.st==='RUNNING'});
        if (old){
          old.st='DRAINING'; render();
          log('task <span class="hl">'+old.id+'</span> draining connections…');
          later(function(){
            tasks = tasks.filter(function(x){return x!==old}); render();
            log('task '+old.id+' deregistered + stopped');
            step();
          }, 1400);
        } else step();
      });
    })();
  };

  function reset(){
    timers.forEach(clearTimeout); timers=[]; tasks=[]; logs=[]; deploying=false; t0=Date.now();
    revEl.textContent='web:41';
    for (var i=0;i<DESIRED;i++) tasks.push({id:id(), ver:'v1', st:'RUNNING'});
    render(); log('service web: steady state — 4/4 running','ok');
  }
  document.getElementById('ecsx-reset').onclick = reset;
  setInterval(reconcile, 1200);
  reset();
})();
</script>

That's a Deployment rollout and a ReplicaSet self-heal, except nobody installed anything to get it. There's no controller manager to version. You get all of this the moment you create a service.

When I help teams ship on ECS, this is where it clicks: you already understand ECS. If you can reason about desired state and reconciliation, the orchestration knowledge transfers completely. What doesn't transfer is the operational surface area, and that's the actual argument.

## What you stop operating

This is the comparison that matters for a small team, and it's the one nobody draws. The question isn't which scheduler is smarter. They're both fine. The question is whose pager each layer lands on.

Toggle ECS between Fargate and EC2 to see the middle ground:

<div class="ecsx" id="ecsx-stack">
  <div class="ecsx-title">Who operates each layer
    <span class="ecsx-toggle"><button id="ecsx-fg" class="on">ECS · Fargate</button><button id="ecsx-ec2">ECS · EC2</button></span>
  </div>
  <div class="ecsx-cols">
    <div class="ecsx-col"><div class="ecsx-colhead" style="color:#8db8f8">EKS</div><div id="ecsx-col-eks"></div></div>
    <div class="ecsx-col"><div class="ecsx-colhead" style="color:#79d68a">ECS <span id="ecsx-mode">· Fargate</span></div><div id="ecsx-col-ecs"></div></div>
  </div>
  <div class="ecsx-score" id="ecsx-score"></div>
</div>

<script>
(function(){
  /* rows: [layer, EKS cell, ECS-Fargate cell, ECS-EC2 cell]; who: aws|you|na */
  var ROWS = [
    ['Control plane (API, scheduler, state store)',
      {who:'aws', txt:'AWS runs it — you pay $0.10/hr per cluster'},
      {who:'aws', txt:'AWS runs it — free'},
      {who:'aws', txt:'AWS runs it — free'}],
    ['Version upgrade treadmill',
      {who:'you', txt:'You initiate + test a cluster upgrade ~every 12–14 months, or pay 6× for extended support'},
      {who:'na',  txt:'Does not exist — there is no version'},
      {who:'na',  txt:'Does not exist — there is no version'}],
    ['Cluster add-ons (CNI, CoreDNS, kube-proxy)',
      {who:'you', txt:'You choose, install, and upgrade them — and they break during cluster upgrades'},
      {who:'na',  txt:'Built in (awsvpc networking). Not configurable, not breakable'},
      {who:'na',  txt:'Built in (awsvpc networking). Not configurable, not breakable'}],
    ['Ingress / load balancing',
      {who:'you', txt:'You install + upgrade the AWS Load Balancer Controller'},
      {who:'aws', txt:'Native ALB target-group integration'},
      {who:'aws', txt:'Native ALB target-group integration'}],
    ['Node OS, AMIs, patching',
      {who:'you', txt:'Yours — managed node groups help, but the reboot schedule is still your problem'},
      {who:'aws', txt:'No nodes. AWS patches the compute under you'},
      {who:'you', txt:'Yours — ASG AMI rotation, drain hooks, the works'}],
    ['Capacity planning + node autoscaling',
      {who:'you', txt:'Karpenter or Cluster Autoscaler — you configure and tune it'},
      {who:'aws', txt:'Per-task. You declare CPU/memory, AWS finds room'},
      {who:'you', txt:'Capacity providers + ASG sizing — bin-packing is back on you'}],
    ['Workload identity (cloud credentials)',
      {who:'you', txt:'RBAC + OIDC provider + IRSA annotations per service account'},
      {who:'aws', txt:'A plain IAM role on the task definition'},
      {who:'aws', txt:'A plain IAM role on the task definition'}],
  ];
  var eksCol = document.getElementById('ecsx-col-eks');
  var ecsCol = document.getElementById('ecsx-col-ecs');
  var score  = document.getElementById('ecsx-score');
  var modeEl = document.getElementById('ecsx-mode');
  var WHO = {aws:'AWS MANAGES', you:'YOU OPERATE', na:'— GONE —'};

  function cell(layer, c){
    return '<div class="ecsx-cell '+c.who+'"><span class="who">'+WHO[c.who]+'</span><b>'+layer+'</b><br>'+c.txt+'</div>';
  }
  function draw(fargate){
    var idx = fargate ? 2 : 3;
    eksCol.innerHTML = ROWS.map(function(r){ return cell(r[0], r[1]); }).join('');
    ecsCol.innerHTML = ROWS.map(function(r){ return cell(r[0], r[idx]); }).join('');
    var ye = ROWS.filter(function(r){return r[1].who==='you'}).length;
    var yc = ROWS.filter(function(r){return r[idx].who==='you'}).length;
    modeEl.textContent = fargate ? '· Fargate' : '· EC2';
    score.innerHTML = 'Layers on <b>your</b> pager — EKS: <b>'+ye+' of '+ROWS.length+'</b> · ECS '+
      (fargate?'on Fargate':'on EC2')+': <b>'+yc+' of '+ROWS.length+'</b>';
    document.getElementById('ecsx-fg').classList.toggle('on', fargate);
    document.getElementById('ecsx-ec2').classList.toggle('on', !fargate);
  }
  document.getElementById('ecsx-fg').onclick = function(){ draw(true); };
  document.getElementById('ecsx-ec2').onclick = function(){ draw(false); };
  draw(true);
})();
</script>

Look at the EKS column. Six of the seven layers are yours. None of them are your product.

The upgrade treadmill deserves special attention because it's the one that quietly eats small teams. Kubernetes ships about three releases a year, and EKS standard support for each lands around 14 months. That means a recurring, unskippable project roughly once a year, forever: test the control plane upgrade, upgrade the add-ons in the right order, chase whatever deprecated APIs your manifests use, then roll the nodes. Skip it and AWS moves you to extended support at six times the control plane price. For a platform team of 15, that's Tuesday. For a team of four, it's a sprint per year spent running to stand still. And there's a quieter cost on top: you have to stay the kind of team that can do this safely.

ECS doesn't have a version. I want to make sure that lands. There is no upgrade, no deprecation cycle, no "v1.29 removes the API your ALB controller depends on." The control plane changed under you a hundred times last year and you never noticed. I have ECS services from 2021 that have never needed a maintenance commit. Infrastructure that doesn't generate homework is worth more to a small team than anything on the Kubernetes feature list. It's the same reason I tell teams to [pick boring options everywhere else in the stack](/2025/ecs-decisions-that-waste-6-weeks/): boring means you debug your app, not your platform.

On raw cost, the EKS control plane is about $73 a month per cluster and ECS's is free, and that's the least interesting line in the comparison. Run the numbers on engineering time instead. One sprint of one engineer's time per year on cluster maintenance is $10-20k. The [biggest AWS savings I've ever found](/2025/aws-cost-optimization-case-study/) came from deleting complexity, not from rightsizing it.

## What you give up

If this were one-sided, EKS wouldn't exist. Here's what you actually lose.

The big one is the operator ecosystem. Kubernetes has operators for Postgres, Kafka, cert-manager, external-dns, ArgoCD, all debugged by thousands of teams over a decade. ECS has no CRDs and no operator pattern. The AWS answer is "use the managed service": RDS instead of a Postgres operator, MSK instead of Strimzi. That works right up until you need something AWS doesn't sell.

Tooling in general follows the same line. Vendors ship a Helm chart, not a task definition. Kustomize, the CNCF landscape, none of it targets ECS. And your deployment layer is AWS-native, so a future move off AWS means rewriting it. Your containers move unchanged, but the wiring around them doesn't.

There's also the hiring thing, and I won't pretend it isn't real. Engineers want Kubernetes on their CV. ECS knowledge is real orchestration knowledge and the concepts transfer completely, as the diagrams above show, but nobody's career was ever advanced by the phrase "task definition."

And ECS has a control ceiling. Custom schedulers, topology spread, network policy, the more exotic probe and init semantics: Kubernetes gives you knobs ECS simply doesn't have. Most web products never touch them. If yours genuinely does, you'll feel the ceiling and you'll resent it.

## So when is EKS the right call?

EKS earns its keep when at least one of these is true:

- Someone owns the platform. You have, or are hiring, people whose actual job is cluster operations, so the pager layers above land on a team that exists.
- You're running stateful infrastructure on-cluster that AWS doesn't offer as a managed service, and you need the operator ecosystem for it.
- Multi-cloud or on-prem is a real requirement: contractual, regulatory, or your customers deploy your software into their clusters.
- Your team is already fluent. K8s veterans ship faster on EKS than they would learning anything else. The tax is only a tax if you haven't already paid it.

If none of those describe you, and for most sub-ten-engineer teams shipping a web product none do, then Kubernetes isn't buying you capability. It's buying you a second job.

## The takeaway

ECS is not "Kubernetes for beginners." It's the same control loop idea with a deliberately smaller operational surface. Same desired state, same reconciliation, same rolling deploys, minus the version treadmill, the add-on stack, and the node fleet. You've seen the whole object model in this post. There is no part two where the hidden complexity lives.

Small teams don't lose because they picked the wrong orchestrator. They lose because their best engineers spent the year operating infrastructure the product didn't need. Pick the tool that generates the least homework, ship, and revisit when you have the head count to afford opinions.

If you're starting an ECS build-out, the companion post on [the 5 ECS decisions that waste 6 weeks](/2025/ecs-decisions-that-waste-6-weeks/) covers the concrete choices: Fargate vs EC2, service discovery, CI/CD, secrets, and monitoring.

---

*If this post saved you a meeting, it did its job. I write about AWS, DevOps, and building things from scratch. Subscribe via [RSS](/feed.xml), or find me on [Twitter](https://twitter.com/muhammad_o7).*
