---
layout: post
title: "Building CodeWiki: Compiling Codebases Into Living Wikis"
description: "Coding agents understand code but forget that understanding between sessions. I built CodeWiki — a Rust CLI that compiles codebases into structured markdown wikis maintained by your AI agent. Here's how it works."
keywords: "codewiki, code wiki, llm knowledge base, codebase understanding, claude code, coding agents, obsidian, qmd, rust cli, session persistence"
tags: [ai, rust, tools]
comments: true
---

Every coding agent session starts from zero. The agent doesn't know how your code is organized, which files matter, how the pieces connect. It has to rediscover the architecture from scratch. Grep around, read some files, build a mental model, start working. That mental model disappears the moment the session ends.

I kept watching this happen. Ten minutes of exploration before any real work, every single time. If you work across multiple repos or come back to a project after a couple weeks, it's worse. The agent is essentially reading the codebase for the first time, again.

I wanted to fix this.

## The idea

A few weeks ago Karpathy [tweeted](https://x.com/karpathy/status/2039805659525644595) about using LLMs to build personal knowledge bases. The workflow: collect raw sources, have an LLM compile them into a structured wiki of markdown files, then query and build on that wiki over time. Every query makes the wiki richer. The knowledge adds up.

The part that stuck with me: he's not using fancy RAG. The LLM maintains its own index files and summaries, and at his scale (~100 articles, ~400K words) it just works. The LLM reads its own compiled knowledge to answer questions.

Codebases are raw data too. Source files are unstructured information that happens to be executable. What if the LLM compiled a codebase into a wiki the same way, with module overviews, architecture docs, concept articles, and then used that wiki as its starting point for every session?

That's [CodeWiki](https://github.com/mraza007/codewiki).

## How it works

CodeWiki is a thin Rust CLI called `cw` paired with a Claude Code skill. The CLI handles git ops, directory scaffolding, and metadata. The agent does all the actual reading and writing. No API keys, no LLM calls from the CLI. Your agent is the intelligence.

When you run `cw init` in a repo, it creates a wiki directory at `~/.codewiki/<project>/` with this structure:

```
~/.codewiki/my-project/
├── _index.md         # master index
├── _architecture.md  # system overview
├── _patterns.md      # recurring patterns
├── _meta.yaml        # last compiled commit
├── modules/          # one article per module
├── concepts/         # cross-cutting concerns
├── decisions/        # why things are the way they are
├── learnings/        # bugs fixed, patterns discovered
└── queries/          # past Q&A, filed back
```

The first time you start a Claude Code session after init, the skill kicks in. The agent walks your codebase, reads the source files, and writes wiki articles. Module articles describe what each part of the code actually does. Not what it's supposed to do, what it does. Key files, functions, data flow, connections to other modules.

Concept articles cut across modules. "How does error handling work across the system" or "how does data flow from request to response." These are the questions that normally require reading eight files across four directories. The wiki answers them in one place.

## Keeping it fresh

The wiki is only useful if it stays current. Every article has YAML frontmatter with a `source_files` field:

```yaml
---
title: Authentication Module
type: module
source_files:
  - src/auth/middleware.py
  - src/auth/tokens.py
tags: [auth, middleware, jwt]
---
```

The CLI tracks which commit the wiki was last compiled against. When you start a new session, `cw status` diffs against that commit and cross-references changed files against every article's `source_files`:

```
$ cw status
Changed since last compile (4964c23):
  M src/auth/middleware.py
  M src/auth/tokens.py

Stale articles:
  ! modules/auth.md
```

The agent sees this and knows exactly what to re-read and update. No guessing, no full recompile.

At session end, the agent writes learnings and decisions back into the wiki. Fixed a bug? That becomes `learnings/auth-token-race-condition.md`. Made a design decision? That's `decisions/switched-to-redis-sessions.md`. Then it updates `_meta.yaml` with the current commit hash.

Next session picks up where this one left off.

## The CLI

About 400 lines of Rust. Here are the commands:

```bash
cw init                # scaffold wiki for current repo
cw status              # what changed since last compile
cw path                # print wiki path
cw projects            # list all wikis
cw index               # rebuild _index.md from article frontmatter
cw meta update         # record current commit as compiled

cw setup claude-code   # install skill into Claude Code
cw setup codex         # install instructions for Codex
cw setup qmd           # register wiki as QMD search collection
```

The CLI doesn't make any LLM calls. It handles the things agents are bad at: tracking git state, knowing which files changed, maintaining timestamps. The agent handles what it's good at: reading code and writing about it.

## Search with QMD

For larger wikis, [QMD](https://github.com/tobi/qmd) by Tobi Lutke adds proper search. It's a local search engine for markdown with hybrid BM25 plus vector search plus a small reranker model. Running `cw setup qmd` registers your wiki as a searchable collection. The agent can then query the wiki through QMD's MCP server during a session.

At the scale of most repos people actually work in, you probably don't need it. A well organized wiki with an index file is enough for the LLM to navigate on its own. But when the wiki gets large, QMD keeps retrieval fast.

## Viewing with Obsidian

All wiki articles live at `~/.codewiki/`. Open that directory as an Obsidian vault and you get a browsable knowledge graph of all your projects. Articles use `[[backlinks]]` so modules connect to each other. The auth article links to `[[database]]` and `[[api]]`. You never have to write or edit these articles yourself. The agent maintains everything.

## Why not RAG

Traditional RAG chunks your code, embeds it, retrieves fragments when you ask a question. You get decontextualized snippets and hope the LLM can stitch them together.

CodeWiki is different. The LLM reads the code and writes structured articles about it. The auth article already connects the middleware to the token service to the database layer. That connection doesn't exist in any single source file. It exists in the compiled understanding.

Karpathy found the same thing with his research wiki. You don't need vector search over raw data when you have a well organized collection of articles. The LLM reads the index, finds the relevant articles, reads those. Simple and it works.

## Getting started

```bash
git clone https://github.com/mraza007/codewiki.git
cd codewiki
cargo install --path .

cd your-project
cw init
cw setup claude-code
```

Start a Claude Code session and the skill handles the rest. The project is MIT licensed and on [GitHub](https://github.com/mraza007/codewiki).
