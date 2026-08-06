---
layout: post
title: "What Is an Agent Harness?"
description: "An agent harness is the software around an LLM — the loop, tools, context management, and guardrails that turn a model into a working agent. Where the term came from, what's inside one, and why more harness isn't always better."
keywords: "agent harness, agentic harness, what is an agent harness, harness engineering, ai agent scaffolding, agent loop, claude code harness, codex harness, llm scaffold, eval harness"
tags: [ai, devops, automation]
comments: true
---

An agent harness is the software wrapped around a language model that turns it into an agent: the loop that calls the model repeatedly, the tools it can execute, the context management that decides what the model sees, and the guardrails that decide what it's allowed to do. The model predicts text. The harness is everything that makes those predictions add up to work getting done.

Anthropic's Claude Code documentation puts it in one line: ["Claude Code is the harness; Claude is the model inside it."](https://code.claude.com/docs/en/glossary) OpenAI uses the same word for the shared execution core behind every Codex surface (CLI, IDE extension, web), all of them [powered by the same Codex harness](https://openai.com/index/unlocking-the-codex-harness/). When both labs independently settle on a term, it's worth pinning down what it means.

One thing it doesn't mean: [Harness.io](https://www.harness.io/), the CI/CD and software delivery company. Same word, coincidental collision, unrelated domain. If you searched "harness devops" and landed here expecting deployment pipelines, that's them. This post is about the LLM concept — though if you build deployment pipelines for a living, stick around, because you already have most of the mental model.

## Model, Scaffold, Harness, Agent

These four words get used interchangeably, and they shouldn't be. A [Hugging Face glossary essay from May 2026](https://huggingface.co/blog/agent-glossary), itself a sign the terminology had gotten muddy enough to need one, draws the lines this way:

- **Model**: the LLM. It can *express intent* to call a tool. It cannot execute anything.
- **Scaffold**: the behavioral configuration. System prompt, tool descriptions, how responses get parsed, what carries over between steps.
- **Harness**: the execution layer. It calls the model, runs the tool calls, feeds results back, and decides when to stop.
- **Agent**: model + harness. Something that acts, not just responds.

In casual usage "harness," "scaffold," and "framework" blur together, and for a blog post that's usually fine. The distinction that actually matters is model versus everything-else, because the everything-else is where most of the engineering lives — and, as we'll see, where a surprising amount of benchmark performance comes from.

## Where the Term Came From

"Harness" is old software vocabulary. A *test harness* is code that sets up conditions, drives the thing under test, and scores the output. LLM research inherited that sense directly: EleutherAI's [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness/), started in the GPT-3 era, became the standard way to benchmark models and the backend of Hugging Face's Open LLM Leaderboard. In that world the harness was deliberately boring: standardized scaffolding, so that what you measured was the model, not an accident of prompt engineering.

Then models learned to use tools, and the word migrated. Once an LLM is taking actions in a real environment, the code that drives it stops being a measurement device and becomes a runtime. A datable marker of the shift: in September 2025, Anthropic [renamed the Claude Code SDK to the Claude Agent SDK](https://claude.com/blog/building-agents-with-the-claude-agent-sdk), on the reasoning that "the agent harness that powers Claude Code can power many other types of agents, too." By early 2026 the term was everywhere. Mitchell Hashimoto's [February 2026 post](https://mitchellh.com/writing/my-ai-adoption-journey) crystallized "harness engineering" as a named practice, and [OpenAI published an essay with that exact title](https://openai.com/index/harness-engineering/) the same month, describing a team that shipped a product with zero manually-written code. Their framing of the new engineering job: "design environments, specify intent, and build feedback loops."

A fact-check aside, since I nearly repeated this myself: the term is often attributed to Andrej Karpathy. His widely-cited [2025 year in review](https://karpathy.bearblog.dev/year-in-review-2025/) doesn't contain the word "harness" at all. The vocabulary came out of the labs and the eval community, not a single coinage.

## What's Actually Inside a Harness

Every serious harness is built around the same loop (gather context, take action, verify the result, repeat), but the implementations differ in revealing ways. A quick tour of the ones I use or have studied:

**The loop and tools.** [Claude Code](https://code.claude.com/docs/en/glossary) ships file access, shell execution, and search as first-class tools, plus subagents: child instances with their own context window and restricted tool access, so exploration doesn't pollute the main conversation. Codex runs [one shared Rust core](https://openai.com/index/unlocking-the-codex-harness/) under every product surface.

**Context management.** The context window is the scarcest resource, and each harness spends it differently. [Aider](https://aider.chat/docs/repomap.html) builds a "repo map" — a graph-ranked summary of your codebase's important symbols, compressed into a token budget, sent with every request. Claude Code compacts: when the window fills, older tool outputs get cleared and the conversation gets summarized. [Cursor](https://docs.cursor.com/context/rules) assembles context from a workspace index plus rules files that activate by file-glob.

**Memory files.** Nearly every harness converged on the same idea: a Markdown file in your repo that gets injected at session start. Claude Code reads `CLAUDE.md`; Codex, Cursor, and twenty-plus other tools read [`AGENTS.md`](https://agents.md/), now an open format under the Linux Foundation. The harnesses differ; the convention is shared.

**Permissions and guardrails.** This is where harnesses look most like infrastructure. Claude Code layers permission rules (deny → ask → allow) over sandboxed shell execution. It's IAM policy thinking applied to a model's tool calls.

**Hooks.** Deterministic scripts that fire at lifecycle points: before a tool runs, after an edit, at session start. On my machine, a hook rewrites git and other CLI calls through a token-optimizing proxy before they execute, and another injects a reminder to persist session learnings into my local memory store. The model never decides whether those run. That determinism is the point — hooks are the part of the harness you control completely.

If that list reads like a platform engineering backlog (isolation, resource budgets, policy, lifecycle events, observability), that's not an accident. I've argued before that [harness engineering is a DevOps skill](/2026/harness-engineering-devops-perspective/); this is the anatomy behind that claim.

## More Harness Isn't Better

Here's the part that surprised me. Given how much engineering goes into these harnesses, you'd expect the elaborate ones to decisively beat simple scaffolds. The measured answer is: not reliably.

[METR tested this directly in February 2026](https://metr.org/notes/2026-02-13-measuring-time-horizon-using-claude-code-and-codex/), running the same models under production harnesses and under deliberately simple scaffolds. Claude Code against bare-bones ReAct (an agent that just takes an action, sees the result, and repeats) was a statistical coin flip: Claude Code won in 50.7% of bootstrap samples. Codex against METR's generic Triframe scaffold actually *lost* most of the time, winning only 14.5% of samples. And [mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent), a harness in roughly 100 lines of Python, scores above 74% on SWE-bench Verified — competitive with systems orders of magnitude more complex.

So the harness doesn't matter? No, the opposite. Swapping scaffolds changes what the same model scores, which is exactly why METR controls for it when measuring capability. What the elaborate harness buys you just isn't raw benchmark points. It's everything a benchmark doesn't measure:

- **Safety**: permission gates, sandboxes, and cost caps that make it survivable to let an agent run unattended. A 100-line loop with full shell access benchmarks fine right up until it doesn't.
- **Ergonomics**: memory files, hooks, and skills that encode *your* project's conventions, so you stop re-explaining them every session.
- **Recoverability**: compaction, session resumption, observable tool traces. The difference between an agent you can debug and one you re-run and hope.

One line from a [Hacker News thread on harness engineering](https://news.ycombinator.com/item?id=48881393) sums up the practitioner view: "A decent model with a great harness beats a great model with a bad harness." The benchmark data says the sophistication isn't free capability. The lived experience says it's what makes the capability usable. Both are true, and the tension between them is basically the design brief for every harness team right now.

That brief keeps expanding. Anthropic's latest iteration lets Claude [generate its own orchestration harness per task](https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code) — the harness stops being a fixed artifact a human designs once and becomes something the agent composes on the fly. Whether that's the future or a detour, it tells you where the labs think the leverage is.

## Why This Matters to You

If you're choosing between coding agents, you're mostly choosing between harnesses. The frontier models are closer to each other than the scaffolding around them is. Compare them on harness terms: how they manage context, what their permission model lets you safely automate, whether their memory and hooks let you encode your conventions once.

And if you build one — even a script that collects CI failure logs, asks a model what broke, and posts the answer to Slack — you're doing harness engineering. The model is the part you rent. The harness is the part you own, and it's where your effort compounds. For how to approach building them with the infrastructure skills you already have, see [Harness Engineering: The DevOps Skill Nobody Told You About](/2026/harness-engineering-devops-perspective/).
