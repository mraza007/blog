---
layout: post
title: "AWS Cost Optimization Case Study: How I Cut a Client's Bill by 50%"
description: "Real AWS cost optimization case study: I reduced a client's monthly bill from $5,000 to $2,500 using systematic analysis of EC2, RDS, S3, CloudWatch, and ECS. See the exact methodology and scripts."
keywords: "aws cost optimization case study, reduce aws costs, aws bill reduction, cloud cost optimization, devops consulting, ec2 optimization, rds cost savings, s3 lifecycle policies, reserved instances, savings plans"
tags: [aws, devops, case-study]
comments: true
---

Last month, a client's AWS bill hit $5,000 — up 40% from last year with no clear explanation.

After one week of systematic analysis, I cut it to **$2,500/month** — a 50% reduction, saving them **$30,000 annually**. Here's exactly how I did it, with the scripts you can use.

## The Discovery Phase: How I Found the Problems

Before touching anything, I needed to understand the infrastructure. Here's my systematic approach:

### Step 1: Pull Cost Data by Service

First, I analyzed their AWS Cost Explorer data to understand where money was going:

```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-11-01,End=2024-11-30 \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

This gave me the high-level breakdown. But I needed more detail.

### Step 2: Build a Resource Inventory

I wrote a Python script to scan all resources across regions and identify optimization opportunities:

```python
import boto3

def scan_ebs_volumes():
    """Find GP2 volumes that should be GP3 and unattached volumes."""
    ec2 = boto3.client('ec2')
    volumes = ec2.describe_volumes()['Volumes']

    gp2_volumes = []
    unattached = []

    for vol in volumes:
        if vol['VolumeType'] == 'gp2':
            gp2_volumes.append({
                'VolumeId': vol['VolumeId'],
                'Size': vol['Size'],
                'State': vol['State'],
                'MonthlyCost': vol['Size'] * 0.10,  # GP2 pricing
                'GP3Cost': vol['Size'] * 0.08,      # GP3 pricing
                'Savings': vol['Size'] * 0.02
            })

        if vol['State'] == 'available':  # Not attached
            unattached.append(vol)

    return gp2_volumes, unattached
```

I built similar functions for:
- RDS instances (storage type, utilization, Multi-AZ necessity)
- EC2 instances (generation, Reserved Instance coverage)
- Elastic IPs (attached vs idle)
- EBS snapshots (age, associated volumes)
- S3 buckets (storage class, lifecycle policies)

### Step 3: Analyze CloudWatch Metrics for Utilization

This is critical. Before recommending any right-sizing, I needed data:

```python
def get_instance_utilization(instance_id, days=30):
    """Get average CPU utilization over the past N days."""
    cloudwatch = boto3.client('cloudwatch')

    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/EC2',
        MetricName='CPUUtilization',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=datetime.now() - timedelta(days=days),
        EndTime=datetime.now(),
        Period=86400,  # Daily
        Statistics=['Average', 'Maximum']
    )

    return response['Datapoints']
```

The results were eye-opening:
- Two t3.xlarge instances averaging **12% CPU**
- RDS storage at **95% free space**
- Multiple log groups with **no retention policy** (storing terabytes)

### Step 4: Map Dependencies Before Cutting

Before deleting anything, I mapped what depended on what:
- Which services used which Elastic IPs?
- Which applications wrote to which log groups?
- Which backups were actually needed for compliance?

This prevented the classic mistake of breaking production while optimizing costs.

## The Starting Point

After the discovery phase, here's what I was working with:

| Service | Monthly Cost | % of Total |
|---------|-------------|------------|
| EC2-Other (EBS, NAT, IPs) | $1,250 | 25% |
| RDS | $750 | 15% |
| EC2 Compute | $650 | 13% |
| CloudWatch | $500 | 10% |
| AWS Backup | $500 | 10% |
| ECS Fargate | $400 | 8% |
| S3 | $250 | 5% |
| VPC | $250 | 5% |
| Everything else | $450 | 9% |
| **Total** | **$5,000** | **100%** |

The distribution told me a lot. EC2-related costs (compute + EBS + networking) made up over 38% of the bill. That's where I started.

## Phase 1: Quick Wins (Implemented Same Day)

### Release Idle Elastic IPs — Saved $50/month

My inventory script flagged 5 Elastic IPs with no association:

```bash
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null]'
```

Someone had provisioned them for test environments that were deleted months ago. Classic ghost infrastructure.

**Time to fix:** 5 minutes.

### Migrate EBS GP2 to GP3 — Saved $125/month

The script found 6,000+ GB across multiple EBS volumes still on GP2. GP3 costs [20% less](https://aws.amazon.com/ebs/pricing/) **and** provides better baseline performance (3,000 IOPS vs GP2's variable IOPS based on size).

```bash
aws ec2 modify-volume --volume-id vol-xxx --volume-type gp3
```

No downtime. Just a CLI command per volume.

**Time to fix:** 30 minutes for all volumes.

### Set CloudWatch Log Retention — Saved $100/month

My scan found 20+ log groups with no retention policy — storing logs forever:

```bash
aws logs describe-log-groups --query 'logGroups[?retentionInDays==null].logGroupName'
```

Set production to 90 days, staging to 30 days.

**Time to fix:** 20 minutes.

## Phase 2: The Big Discoveries

### AWS Backup Running 24x More Often Than Needed — Saved $400/month

This was the most surprising find. When I pulled the backup plan configuration:

```bash
aws backup get-backup-plan --backup-plan-id xxx
```

I saw: **hourly backups**. 24 backups per day. For every resource.

The backup storage had grown to $500/month — 10% of their total bill.

I reviewed their recovery requirements (they only needed daily backups with 14-day retention) and reconfigured:

```json
{
  "ScheduleExpression": "cron(0 5 * * ? *)",
  "StartWindowMinutes": 60,
  "CompletionWindowMinutes": 120,
  "Lifecycle": {
    "DeleteAfterDays": 14
  }
}
```

**Time to fix:** 1 hour (including testing).

### CloudWatch Metric Streams to Nowhere — Saved $400/month

My CloudWatch cost breakdown showed $400/month on "Metric Streams" — 100+ million metric updates going somewhere.

```bash
aws cloudwatch list-metric-streams
```

Found a stream configured to send data to a third-party monitoring tool. When I asked about it, nobody on the team knew it existed. The integration had been set up by a previous contractor and was never used.

This is a perfect example of ghost infrastructure that accumulates over time.

### RDS Over-Provisioned by 95%

My RDS analysis showed all instances had massive storage allocated. The CloudWatch metrics told the real story:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=production-db \
  --start-time 2024-11-01T00:00:00Z \
  --end-time 2024-11-30T23:59:59Z \
  --period 86400 \
  --statistics Average
```

**Result:** 95% free space across all databases.

RDS storage can only be increased, not decreased. But I migrated all instances from GP2 to GP3 storage — same price, better performance.

For the next database refresh, I recommended right-sized storage instead of the default massive allocations.

**Saved:** $150/month

## Phase 3: Infrastructure Improvements

### NAT Gateway Consolidation — Saved $125/month

My VPC analysis showed NAT Gateways in every AZ across multiple regions costing $500/month combined. After reviewing their architecture and traffic patterns, they only needed half of them.

### ECS Task Right-Sizing — Saved $250/month

The ECS service scan found:
- A staging service constantly failing health checks and restarting (consuming resources 24/7 while accomplishing nothing)
- Legacy services still running in production that nobody was using

These issues relate directly to the [ECS architectural decisions](/2025/ecs-decisions-that-waste-6-weeks/) that often waste weeks of engineering time. Plus, enabled Fargate Spot for fault-tolerant workloads (70% savings on those tasks).

### S3 Lifecycle Policies — Saved $150/month

My S3 bucket analysis showed backup buckets had grown to 10+ TB with no lifecycle policy. Old backups were stored in Standard tier forever.

Added a policy to transition to Glacier after 90 days:

```json
{
  "Rules": [
    {
      "ID": "archive-old-backups",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

### Reserved Instances for Stable Workloads — Saved $500/month

My EC2 coverage analysis showed zero Reserved Instance coverage on instances running 24/7.

I helped them purchase [Compute Savings Plans](https://aws.amazon.com/savingsplans/compute-pricing/) covering their steady-state workloads. Immediate 30-40% savings on compute.

### EC2 Instance Right-Sizing — Saved $250/month

The utilization data was clear: multiple instances running at 10-15% CPU.

Downsized t3.xlarge instances to t3.large where utilization data supported it. Same workload, half the cost.

## The Results

| Category | Monthly Savings |
|----------|----------------|
| Reserved Instances / Savings Plans | $500 |
| AWS Backup (hourly → daily) | $400 |
| CloudWatch Metric Streams | $400 |
| ECS cleanup + Fargate Spot | $250 |
| EC2 right-sizing | $250 |
| S3 lifecycle policies | $150 |
| RDS improvements | $150 |
| EBS GP2 → GP3 | $125 |
| NAT Gateway consolidation | $125 |
| CloudWatch log retention | $100 |
| Idle Elastic IPs | $50 |
| **Total Monthly Savings** | **$2,500** |

**From $5,000/month to $2,500/month — exactly 50% reduction.**

Over a year, that's **$30,000 back in their pocket**.

## The Methodology

Here's the systematic approach I use for every cost optimization engagement:

### 1. Get the Data First

Before making any changes, I pull:
- AWS Cost Explorer data (by service, by tag, over time)
- CloudWatch metrics for utilization
- Resource inventory across all regions

### 2. Find the Ghosts

"Ghost infrastructure" costs more than you think:
- Unused Elastic IPs
- Detached EBS volumes
- Empty S3 buckets accumulating requests
- Log groups with infinite retention
- Metric Streams nobody monitors
- Test environments that outlived their purpose

### 3. Right-Size Ruthlessly

Check actual utilization before committing to Reserved Instances:

```bash
# EC2 CPU utilization over 30 days
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-xxx \
  --start-time $(date -d "30 days ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average
```

If a t3.xlarge averages 15% CPU, you're paying for 85% idle capacity.

### 4. Modernize Storage

GP2 → GP3 is almost always worth it:
- 20% cheaper at baseline
- Better performance (3,000 IOPS baseline)
- Zero downtime migration

### 5. Review Backup Policies

Backups grow silently. Questions to ask:
- How often do you actually need backups?
- How long do you really need to keep them?
- Are you backing up dev/test environments at production frequency?

## What This Looks Like Over Time

| Metric | Before | After |
|--------|--------|-------|
| Monthly spend | $5,000 | $2,500 |
| Annual spend | $60,000 | $30,000 |
| **Annual savings** | — | **$30,000** |

The best part? None of these changes affected performance or reliability. Most improved it.

## Common Patterns I See

After doing this for multiple clients, patterns emerge:

1. **Metric Streams nobody monitors** — $100-400/month just disappearing
2. **Hourly backups for daily restore needs** — 24x the storage cost
3. **GP2 volumes from years ago** — never migrated to GP3
4. **Multi-AZ staging databases** — paying for HA nobody needs
5. **NAT Gateways in every AZ** — when one or two would suffice
6. **Logs kept forever** — "just in case"
7. **No Reserved Instances** — paying full on-demand for 24/7 workloads
8. **Over-provisioned everything** — "it might need it someday"

---

## Need Help With Your AWS Bill?

I do AWS cost optimization as part of my DevOps consulting practice. If your AWS bill feels too high or you just want a second pair of eyes on your infrastructure, let's talk.

**[Book a free 30-minute call](https://calendly.com/muhammad-07/30-minute-meeting)** — I'll review your current setup and tell you where I see opportunities.

---

*Have questions about any of these optimizations? Drop a comment below or reach out on [Twitter/X](https://twitter.com/muhammad_o7).*

