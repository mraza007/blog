---
layout: post
title: "I Built an Orchestrator That Watches GitHub Issues and Sends Agents to Fix Them"
description: "Baton is a Python daemon that polls GitHub Issues, creates isolated git worktrees, and runs Claude Code CLI against each issue autonomously. One config file, zero babysitting."
keywords: "autonomous coding agent, agent orchestrator, claude code cli, github issues automation, git worktrees, baton, symphony spec, autonomous software development, coding agent concurrency, agent-browser verification"
tags: [ai, python, tools, automation]
comments: true
---

I have too many issues and not enough time. Same as everyone. The usual loop is: pick an issue, context switch into it, write the code, open a PR, pick the next one. Do that until the sprint ends or you lose the will.

Coding agents help with this. I can point Claude Code at an issue and let it work while I do something else. But that's still one agent, one issue, one terminal. If I have 10 issues labeled "agent-ready," I'm not babysitting 10 terminal tabs.

I wanted something that just watches for new issues and sends agents after them. So I built [Baton](https://github.com/mraza007/baton).

## What it does

Baton is a Python daemon. You start it in your repo, it polls GitHub Issues matching your configured labels, creates an isolated git worktree per issue, and runs Claude Code CLI as a subprocess. When the agent finishes and opens a PR, Baton releases the claim and grabs the next issue.

One config file. One command. Go do something else.

```
WORKFLOW.md -> Orchestrator -> Worker (per issue)
                  |              |
                  |              +-- git worktree create
                  |              +-- hooks (before_run)
                  |              +-- claude -p "<prompt>"
                  |              +-- check issue state
                  |              +-- hooks (after_run)
                  |
                  +-- Poller (gh issue list)
                  +-- Dispatcher (concurrency control)
                  +-- Reconciler (stale run detection)
```

The name comes from relay races. You hand off the baton and the runner goes.

## The config

Everything lives in `WORKFLOW.md`. YAML front matter for configuration, Jinja2 template below for the prompt. Baton reloads this file on every poll cycle, so you can change settings without restarting.

```yaml
---
tracker:
  kind: github
  labels: ["agent"]
  exclude_labels: ["blocked"]

polling:
  interval_ms: 30000

agent:
  max_concurrent: 3
  max_turns: 5
  command: claude
  permission_mode: bypassPermissions

hooks:
  before_run: |
    git fetch origin main && git rebase origin/main
  timeout_ms: 60000
---

You are an autonomous software engineer working on issue #{{ "{{" }} issue.number {{ "}}" }}: {{ "{{" }} issue.title {{ "}}" }}.

{{ "{{" }} issue.body {{ "}}" }}

{% raw %}{% if attempt %}{% endraw %}
This is continuation attempt {{ "{{" }} attempt {{ "}}" }}. Review what was done and continue.
{% raw %}{% endif %}{% endraw %}

## Instructions

1. Understand the issue requirements
2. Write clean, well-tested code
3. Run existing tests to make sure nothing breaks
4. Commit your changes with a descriptive message
5. Push the branch and create a pull request linking to #{{ "{{" }} issue.number {{ "}}" }}
```

Labels filter which issues get picked up. `max_concurrent` controls parallel agents. `max_turns` is the retry limit per issue. Hooks run shell commands at different points. I use `before_run` to rebase on main so the agent starts from fresh code.

The prompt template gets `issue.number`, `issue.title`, `issue.body`, `issue.labels`, and `attempt` for retries. Standard Jinja2.

## Why worktrees

Each issue gets its own worktree under `.symphony/worktrees/`, with a branch name slugified from the issue title: `baton/fix-login-redirect-42`.

I thought about Docker containers and temp directories but worktrees won out. They share the git object database so creating one is almost instant, unlike a full clone. They're real checkouts, so linters and test runners and build scripts all work without any path hacking. And they're isolated. If one agent trashes its branch, the others don't care.

## Why `gh` CLI instead of the GitHub API

Baton shells out to `gh issue list` and `gh pr create` instead of using PyGitHub or the REST API. Seems odd, but think about setup.

With the API, you need a personal access token. You need to configure it somewhere. You need to handle rate limits.

With `gh`, you authenticate once (`gh auth login`) and everything on your machine uses the same credentials. No token management in the orchestrator. The tradeoff is speed, but Baton polls every 30 seconds. The overhead of a subprocess call doesn't matter at that pace.

## The permission problem

This tripped me up. Claude Code has permission modes: `default` asks for everything, `acceptEdits` auto-approves file edits but prompts for shell commands, and `bypassPermissions` auto-approves everything.

I started with `acceptEdits` because it felt like the right balance. Let the agent write code freely, but make it ask before running commands. Problem: "ask" means a human clicking yes, and in an autonomous orchestrator there's no human. The agent just blocks forever waiting for a prompt nobody will answer.

I wasted about 20 minutes watching it hang before I figured this out. For autonomous operation you need `bypassPermissions`, which maps to `--dangerously-skip-permissions`. The flag name is honest about the risk. I'm comfortable with it because the agents run in isolated worktrees on disposable branches, not in my main checkout.

## Auto-releasing on PR creation

My first version had a dumb problem. The agent would finish its work, create a PR on turn 2 of 5, and Baton would keep scheduling continuation turns for the remaining 3. The slot was occupied but nobody was doing anything useful.

The fix: after each worker finishes, check if a PR exists for that issue's branch. If yes, release the claim immediately and free up the slot. If not, schedule a short retry.

```python
pr_exists = await self.tracker.check_pr_exists(issue.number)
if pr_exists:
    log.info(f"PR_READY #{issue.number} -- PR found, releasing claim")
    return "pr_created"
return "no_pr"
```

Small change, but it meant the orchestrator stopped wasting time on finished work.

## Verification with agent-browser

Writing code and knowing it works are different problems. I added [agent-browser](https://github.com/vercel-labs/agent-browser) to the workflow so the agent actually tests its own work before opening a PR.

The prompt tells the agent to spin up a local server and poke around:

```yaml
---
tracker:
  kind: github
  labels: [baton]
agent:
  max_concurrent: 1
  max_turns: 3
  command: claude
  permission_mode: bypassPermissions
---

You are an autonomous software engineer working on issue #{{ "{{" }} issue.number {{ "}}" }}.

{{ "{{" }} issue.body {{ "}}" }}

## Verification (REQUIRED before creating PR)

Use agent-browser to verify your work:
  agent-browser open http://localhost:3456
  agent-browser snapshot -i
  agent-browser click, fill, type to test interactions

If verification fails, fix the issues before proceeding.
```

The agent starts `npx serve`, opens the page with agent-browser, clicks buttons, fills inputs, takes snapshots, and includes the results in the PR description. Not a replacement for real tests, but it catches the obvious stuff. "I wrote a component and it doesn't even render" is no longer a class of failure that makes it to PR.

## Building a todo app with zero intervention

I tested this by having Baton build a todo app from scratch. Fresh repo. Three GitHub issues labeled `baton`:

1. Create basic HTML structure
2. Add JavaScript for create/delete
3. Add localStorage persistence

I ran `baton start` and went to make coffee.

When I came back, all three issues had PRs. Each one included verification output:

> Opened `http://localhost:3456` and confirmed the page renders correctly.
> Ran `agent-browser snapshot -i` confirming interactive elements: textbox and button.

I merged the PRs. The issues auto-closed. The app worked. I didn't write any of it.

Nobody is shipping this todo app to production. That was never the point. I wanted to know if an orchestrator could watch a backlog and ship working code without me in the loop. It can.

## Stuff that bit me

`baton/issue-42` as a branch name tells you nothing. I stared at `git branch` output for a while before adding slugification. `baton/fix-login-redirect-42` is barely more work to generate and much less annoying to read.

I also wasted a few restarts before I added config hot-reload. Every time I tweaked the prompt I'd kill the daemon, lose running state, and start over. Now Baton rereads `WORKFLOW.md` every poll cycle so prompt changes take effect on the next dispatch.

I briefly thought about running one Baton instance across multiple repos. That fell apart fast. Repos have different workflows, different hooks, different concurrency limits. One instance per repo, started from the project directory. Boring, but it works.

One more: don't crank `max_concurrent` to 10 unless your machine has RAM to spare. Each Claude Code process is not small. I run 1-3 and that's plenty.

## Getting started

```bash
pip install -e .
cp WORKFLOW.md.example WORKFLOW.md
# Edit WORKFLOW.md: set your labels, tweak the prompt
baton start
```

You need Python 3.11+, Claude Code CLI (`claude`), GitHub CLI (`gh`) authenticated, and Git.

The code is at [github.com/mraza007/baton](https://github.com/mraza007/baton). MIT licensed. About 10 Python modules, no external services, no databases. State lives in memory with JSON persistence for the status command.

## What I want to add next

- A proper TUI instead of `baton status` reading a JSON file
- Issue dependency ordering so issue 3 waits for issue 2 if it needs to
- Cost tracking per issue, so I can see what automating the backlog actually costs in tokens
- More trackers besides GitHub Issues (Linear, Jira, GitLab)

If you try it, I want to hear what breaks.
