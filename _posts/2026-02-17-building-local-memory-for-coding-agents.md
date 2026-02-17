---
layout: post
title: "I Built Local Memory for Coding Agents Because They Keep Forgetting Everything"
description: "Coding agents forget everything between sessions. I built EchoVault — an MCP server that gives agents persistent memory using SQLite, Markdown, and zero cloud dependencies. Here's how it works and why I built it."
keywords: "coding agent memory, mcp server, claude code memory, cursor memory, codex memory, local first ai tools, agent persistence, echovault, sqlite fts5, obsidian compatible"
tags: [ai, python, tools]
comments: true
---

Here's something that frustrates me about coding agents. They forget everything. Every single session starts from scratch. The agent that spent 45 minutes yesterday figuring out your authentication flow? Gone. The decision to use JWT over sessions? Gone. The bug it found in your ORM's lazy loading? Gone.

You start a new session and it re-discovers the same patterns. Repeats the same mistakes. Asks the same questions. It's like working with a brilliant colleague who gets amnesia every night.

I got tired of this. So I built [EchoVault](https://github.com/mraza007/echovault) — a local memory system that gives coding agents persistent memory across sessions. No cloud. No API keys. No cost. Just a SQLite database and some Markdown files on your machine.

## The Problem Is Real

I use coding agents daily across multiple client projects. Claude Code, Cursor, Codex — I switch between them depending on the task. Every time I start a session, I'm repeating context that the agent should already know.

"We chose FastAPI over Flask because of async support."
"The deploy script needs --no-cache or the CSS breaks."
"Don't touch the legacy auth module — it's being replaced next sprint."

I was copy-pasting this stuff into every session. That's not how tools should work.

I tried existing solutions. Supermemory announced their MCP and I was tempted, but it saves everything in the cloud. I work with multiple companies as a consultant — I don't want codebase decisions stored on someone else's servers. Claude Mem was the first tool I tried, but it was eating too much memory in my sessions and became a bottleneck when running multiple agents at the same time.

So I built my own.

## How EchoVault Works

EchoVault runs as an MCP server. When your agent starts a session, it has three tools available:

- `memory_context` — load prior decisions, bugs, and context for the current project
- `memory_search` — find specific memories by keyword or semantic similarity
- `memory_save` — persist a decision, bug fix, pattern, or learning

The agent calls these tools like it calls any other tool. No hooks. No shell scripts. No prompt injection. The MCP protocol handles everything.

Here's what happens in practice:

**Session start.** The agent sees `memory_context` in its available tools. The tool description says "You MUST call this at session start." The agent calls it and gets back a list of prior memories for the project. Now it knows what happened yesterday.

**During work.** You ask about authentication. The agent calls `memory_search` with "authentication" and gets back the decision to use JWT, the bug with token refresh, and the migration plan. It has context before writing a single line of code.

**Session end.** The agent just fixed a tricky race condition. The tool description says "You MUST call memory_save before ending any session where you made changes." It saves the root cause, the fix, and what to watch for.

Next session, that knowledge is there. Every session builds on the last one.

## The Architecture

I kept it simple. The whole system is four things:

```
~/.memory/
├── vault/                    # Obsidian-compatible Markdown
│   └── my-project/
│       └── 2026-02-01-session.md
├── index.db                  # SQLite: FTS5 + sqlite-vec
└── config.yaml               # Optional embedding config
```

**Markdown vault.** Every memory gets written to a session file — one file per day per project. These are valid Markdown with YAML frontmatter. You can point Obsidian at `~/.memory/vault/` and browse your agent's memory visually. You can read them in any editor. They're not locked in a proprietary format.

**SQLite index.** This is where search happens. FTS5 handles keyword search out of the box — no configuration needed. If you want semantic search (where "authentication" matches a memory titled "JWT token setup"), add an embedding provider. I use Ollama with `nomic-embed-text` locally. You can also use OpenAI or OpenRouter if you prefer cloud.

**MCP server.** The agent talks to EchoVault through the Model Context Protocol. Three tools, stdio transport, nothing fancy. The server starts when the agent needs it and stops when the session ends. Zero idle cost.

**Secret redaction.** Three layers. Explicit `<redacted>` tags for things you mark yourself. Pattern detection that catches API keys, passwords, and credentials automatically. And `.memoryignore` rules for custom patterns. Nothing sensitive hits disk.

## Making Agents Actually Save

Here's the thing about MCP tools — the agent *can* call them, but will it? Retrieval works well because agents tend to grab context at the start. Saving is the hard part. The agent finishes its work and moves on. It doesn't naturally think "I should save what I learned."

The trick is the tool descriptions. When you register an MCP tool, you include a description. Agents read these descriptions and treat them as instructions. So instead of:

```
"Save a memory for future sessions. Call this when you make decisions."
```

I wrote:

```
"Save a memory for future sessions. You MUST call this before ending
any session where you made changes, fixed bugs, made decisions, or
learned something. This is not optional — failing to save means the
next session starts from zero."
```

That "MUST" language makes a real difference. It's not 100% reliable — nothing with LLMs is — but agents follow strong tool descriptions much more consistently than passive ones.

## Cross-Agent Memory

One of the things I wanted was a single vault for all my agents. A memory saved by Claude Code should be searchable from Cursor or Codex. They're all working on the same codebase. Why should they have separate memories?

EchoVault stores everything in one place. The MCP server is the same regardless of which agent connects to it. Setup is one command per agent:

```bash
memory setup claude-code   # writes ~/.claude.json
memory setup cursor        # writes .cursor/mcp.json
memory setup codex         # writes .codex/config.toml + AGENTS.md
memory setup opencode      # writes opencode.json
```

Each agent has its own config format and conventions. Claude Code uses JSON with `mcpServers`. Cursor uses the same schema but different file paths. Codex uses TOML with `[mcp_servers]`. OpenCode uses JSON with a `mcp` key and a different command format (`command` as an array instead of separate `command` + `args`).

I wrote shared helpers so each agent's setup is just a thin wrapper around `_install_mcp_servers()` or `_install_toml_mcp()`. Adding a new agent takes maybe 20 lines of code.

## What Gets Saved

Not everything should be a memory. Trivial changes don't need to be persisted. Information that's obvious from reading the code doesn't need a memory. The goal is to capture what a future agent wouldn't know from just looking at the codebase.

Good memories:

- **Decisions.** "Chose JWT over sessions because the API needs to be stateless." A future agent reading the code sees JWT but doesn't know *why*.
- **Bugs.** "The ORM lazy-loads relationships by default, causing N+1 queries in the user list endpoint. Fixed by adding `.options(joinedload(...))`. Root cause: SQLAlchemy default behavior." A future agent won't hit the same bug.
- **Patterns.** "All API endpoints follow the pattern: validate input, check permissions, execute, return response. Don't add business logic in the route handler." A future agent follows the existing patterns instead of inventing new ones.
- **Context.** "The legacy auth module is being replaced. Don't modify it — changes go into the new auth service at `src/auth/v2/`." A future agent doesn't waste time on dead code.

Each memory has a title, a "what happened" summary, optional "why" and "impact" fields, tags, and a category. Search returns compact ~50-token summaries. Full details are fetched on demand so context windows don't get bloated.

## The Technical Bits

A few implementation details that might be useful if you're building something similar.

**FTS5 for keyword search.** SQLite's FTS5 extension is fast and works with zero configuration. No external service needed. It handles stemming, phrase matching, and ranking. For most use cases, this is all you need.

**sqlite-vec for semantic search.** When you want "authentication" to match "JWT token rotation", you need vectors. I use `sqlite-vec` to store embeddings right in the same SQLite database. No vector database needed. Embedding providers are pluggable — Ollama for local, OpenAI or OpenRouter for cloud.

**Hybrid search.** The search pipeline runs FTS5 first (fast, precise), then semantic search (slower, fuzzy), and merges the results. This gives you the best of both worlds — exact keyword matches and semantic similarity.

**TOML parsing with fallbacks.** Codex writes some non-standard TOML — unquoted filesystem paths as table keys, dotted version strings as key names. Standard `tomllib` chokes on these. I added a fallback that appends the MCP section directly via string operations when parsing fails. It's not pretty but it handles real-world config files.

**Symlink handling.** Some agents create symlinks in their skill directories. `shutil.rmtree()` crashes on symlinks. Small thing but it bit me in production.

## Setting It Up

```bash
pip install git+https://github.com/mraza007/echovault.git
memory init
memory setup claude-code
```

That's it. Three commands. The agent has memory now.

If you want semantic search, configure an embedding provider:

```bash
memory config init
# Edit ~/.memory/config.yaml to set your provider
memory reindex
```

For fully local operation with no external API calls, use Ollama:

```yaml
embedding:
  provider: ollama
  model: nomic-embed-text
```

## What I've Learned

Building this taught me a few things about agent tooling.

**Tool descriptions are instructions.** Agents read them and follow them. Strong, directive language in tool descriptions is more effective than passive documentation. "You MUST" works better than "You can."

**Local-first matters.** Not because of ideology, but because of practical constraints. Consultants work with multiple clients. Sensitive decisions shouldn't leave the machine. And when your internet goes out, local tools still work.

**MCP is the right abstraction.** Instead of writing agent-specific hooks, skills, and config formats, I write one MCP server and each agent connects to it. When a new agent comes along, I add a setup function for its config format. The memory logic doesn't change.

**Simple storage wins.** Markdown files you can read in any editor. SQLite you can query with any tool. No custom binary formats. No daemon to keep running. The system is completely inspectable and debuggable.

The code is at [github.com/mraza007/echovault](https://github.com/mraza007/echovault). It's MIT licensed. If you're tired of your agents forgetting everything, give it a shot.
