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

## Extensibility through skills and MCP servers

Baton itself is deliberately simple. It polls, dispatches, and manages worktrees. The interesting part is what you put in the prompt and what tools you give the agent.

Claude Code supports MCP servers, which means you can wire up external tools and the agent can use them during its run. Baton passes MCP server config through to each worker:

```yaml
agent:
  mcp_servers:
    - name: playwright
      command: npx @playwright/mcp@latest
```

That means the agent has access to a headless browser while it works. It can open a page, click around, take screenshots, verify that the UI renders correctly. You don't have to build that into Baton. You just declare which MCP servers you want and the agent figures out when to use them.

Same idea with CLI tools. If [agent-browser](https://github.com/vercel-labs/agent-browser) is installed on the machine, you can tell the agent to use it in the prompt template. "Before creating a PR, open the app with agent-browser and verify the acceptance criteria." The agent spins up a local server, opens the page, clicks buttons, fills inputs, takes snapshots. All from instructions in WORKFLOW.md, nothing hardcoded in the orchestrator.

Claude Code also has skills, which are reusable prompt fragments that teach the agent specific capabilities. If you have a code review skill or a testing skill installed, the agent can use them during its run. Baton's config supports a `skills` list for this:

```yaml
agent:
  skills:
    - code-reviewer
    - accessibility-checker
```

You can also override skills per issue by adding a `## Skills` section to the issue body. If one issue needs Playwright but the others don't, just add it to that issue.

The point is that Baton doesn't need to know about browsers or test runners or linters. It just needs to dispatch agents with the right config. The prompt and the tools do the rest.

## Putting it together: a todo app from scratch

To see all of this working end to end, I had Baton build a todo app. Fresh repo, no code. I created three GitHub issues labeled `baton`:

1. Create basic HTML structure
2. Add JavaScript for create/delete
3. Add localStorage persistence

The WORKFLOW.md prompt told the agent to use agent-browser for verification before opening PRs. I ran `baton start` and went to make coffee.

Baton picked up issue #1, created a worktree on `baton/create-basic-todo-app-html-structure-1`, and dispatched Claude Code. The agent wrote `index.html`, spun up a local server with `npx serve`, opened it with agent-browser, confirmed the layout rendered, then committed, pushed, and opened a PR. The PR description included what agent-browser found:

> Opened `http://localhost:3456` and confirmed the page renders correctly.
> Ran `agent-browser snapshot -i` confirming interactive elements: textbox and button.

I merged it. The issue auto-closed (the PR had `Closes #1`). Baton saw the issue was gone on the next poll, released the slot, and picked up issue #2. Same cycle. Then #3.

Three issues, three PRs, three merges. I didn't write a line of the todo app. The agent-browser verification wasn't built into Baton. It was just instructions in the prompt and a CLI tool on my machine.

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
