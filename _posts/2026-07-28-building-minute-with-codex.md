---
layout: post
title: "I Built a Native macOS Transcription App with Codex in Five Days"
description: "Five days, 124 commits, and a private beta: how I built Minute, a fully local macOS meeting notetaker with Whisper transcription and llama.cpp summaries, by directing Codex instead of writing the code myself — including the bugs that proved the workflow."
keywords: "codex, agentic coding, ai coding agents, tauri app, whisper.cpp, llama.cpp, local transcription macos, meeting notetaker, rust react tauri, building with ai agents, system audio capture macos"
tags: [ai, macos, rust, tools]
comments: true
---

On July 23, 2026, I opened an empty repository and started building Minute, a
private meeting notetaker for macOS. Five days and 124 commits later, version
0.7.0 was available as a private beta for Apple Silicon and Intel Macs.

I built the application through Codex. I set the product direction, chose the
constraints, reviewed the work, and decided what counted as done. Codex
inspected the repository, planned implementation slices, wrote and revised the
code, ran the test suites, diagnosed failures, captured screenshots, and
prepared the release.

The result is a native desktop application with a React and TypeScript
interface, a Rust backend, live local transcription, local LLM summaries,
system-audio capture, meeting detection, search, playback, accessibility
coverage, and a checksummed private release pipeline.

This is how the work happened, including the parts that broke.

![Minute showing a meeting summary, decisions, action items, transcript, and local ask](/assets/images/minute/hero.webp)

## What Minute does

Minute records a meeting, transcribes it with Whisper, and turns the transcript
into a summary, decisions, and action items with a local language model. It can
answer questions about a meeting and cite the exact timestamps that support its
answer.

The complete workflow runs on the Mac. Minute has no account system, cloud
backend, analytics service, or local HTTP server. Its only deliberate network
request downloads a model when the user chooses one.

That privacy constraint shaped the product:

- Audio, transcripts, summaries, and Markdown stay in ordinary folders on
  disk.
- Whisper and llama.cpp run as linked libraries in the application process.
- Fonts ship with the app.
- The content security policy allows no network origin.
- A meeting remains recordable, searchable, and summarizable with Wi-Fi off.

Each note stays readable without Minute:

```text
<note-id>/
├── audio.wav
├── transcript.json
├── summary.json
└── note.md
```

The architecture is compact:

```text
React 19 + TypeScript
          │
    typed Tauri IPC
          │
       Rust process
     ├── microphone capture
     ├── system-audio capture
     ├── whisper.cpp
     ├── llama.cpp
     └── folder-based note store
```

Tauri gave me a webview for the interface and direct access to native Rust code.
The backend uses `cpal` for microphone input, ScreenCaptureKit bindings for
system audio, whisper.cpp for speech recognition, and llama.cpp for summaries
and questions. Metal accelerates inference on Apple Silicon.

Keeping these pieces in one process removed a server from the architecture. It
also put audio callbacks, native frameworks, model inference, file persistence,
and a webview inside the same failure surface. That became the hard part of the
build.

## What “built with Codex” meant

I did not ask Codex for the whole application in one prompt.

Each unit of work had a concrete outcome. A typical request included the user
problem, the relevant repository context, the constraints, and the evidence
needed before completion. Codex then worked through the repository and returned
with code, tests, and the result of running them.

A recording task, for example, included requirements such as:

- keep the audio callback free from blocking file or model work;
- write recoverable audio even when transcription falls behind;
- show the real microphone name reported by the backend;
- keep pause time out of the meeting duration;
- leave the note usable if summarization fails; and
- test the pure timing, resampling, buffering, and persistence logic.

That level of specificity mattered more than prompt length. “Add recording”
invites a demo. “Preserve captured audio when the transcription worker fails”
defines a product behavior.

The working loop stayed consistent:

1. Describe one user-visible outcome and its constraints.
2. Let Codex inspect the current implementation before proposing a change.
3. Implement the smallest coherent slice.
4. Run focused tests, then the wider verification suite.
5. Inspect the diff and exercise the behavior.
6. Capture screenshots or native evidence when tests cannot show the result.
7. Record the remaining gaps instead of hiding them.

This resembles OpenAI’s current [Codex best-practices
guidance](https://learn.chatgpt.com/guides/best-practices), especially its
emphasis on goals, context, constraints, completion criteria, and validation.
In practice, the last item carried the most weight. Codex could move quickly
because every task had to leave proof behind.

## The bugs that made the workflow useful

The feature list shows what Codex produced. The failures show whether the
workflow could handle real engineering.

### AppKit crashed on the detector thread

Minute can notice that Zoom, Teams, FaceTime, or another meeting app is using
the microphone and offer a small recording prompt. The detector runs on a
background Rust thread so it does not block the interface.

Version 0.5.0 crashed when that thread tried to show the prompt. The macOS crash
report ended inside `NSPanel setFloatingPanel`, called through
`tauri-nspanel`, with Minute’s detector thread lower in the stack.

Codex traced the call path from the crash report into my code and then into
the pinned dependency source. Converting the Tauri window into a panel already
mutated AppKit state, so moving only the final `show` call would have left the
bug in place.

The fix routed panel creation, conversion, configuration, positioning, showing,
and hiding through Tauri’s main-thread dispatcher. Debug assertions using
`MainThreadMarker` now guard each native boundary. The detector still does its
polling away from the interface thread.

The useful output was the explanation of the complete native boundary. A
smaller patch could have stopped one crash while leaving the same threading
mistake elsewhere.

### A microphone stream could succeed and still record silence

My early preflight asked CoreAudio for an input stream. On macOS, that stream
can open while microphone permission is unresolved or denied and then deliver
silence. Minute could claim it was ready even though it had no usable audio.

I found this by launching an isolated app identity with a fresh permission
state. Codex added an explicit AVFoundation authorization check, a visible
“Allow microphone” action, and backend gates around preview and recording.
When permission is denied, the preflight stays open and points to the exact
System Settings location. It does not expose an input meter or pretend
recording has started.

The frontend component tests passed, but the decisive evidence came from the
native bundle with a reset permission state. That distinction became a rule for
the rest of the project. Simulate logic in tests and verify operating-system
behavior on the operating system.

### The Intel app contained Apple Silicon libraries

The first Intel build had an `x86_64` executable and `arm64` ggml and llama
dynamic libraries. Code signing passed. The application architecture was still
wrong.

The staging script always copied libraries from one local target directory,
even during a cross-architecture build. Codex updated it to respect Tauri’s
target triple and added `lipo` checks for the executable and every nested
library. The release workflow now fails when a single binary does not match the
intended architecture.

This bug changed my definition of a valid macOS bundle. A signature checks
integrity and identity. It does not prove that every binary can run on the
recipient’s processor.

## Product taste still required a person

The first complete interface worked, but it looked like a competent collection
of panels. I wanted Minute to feel closer to a notebook: warm paper surfaces,
ink-like text, thin rules, and one oxide accent reserved for recording.

I supplied that direction and judged the screenshots. Codex translated it into
design tokens, rebuilt the major views, captured the application in light and
dark appearances, and corrected the details exposed by each pass. I repeated
the process at the minimum window width, at 200 percent text size, and with
reduced motion enabled.

One review found that the recording details rail clipped at the native minimum
width. The fix allowed the secondary rail to recede below 1280 pixels while the
capture source remained visible. Another pass found that VoiceOver announced
recording health every second. The visible status stayed live, while the
assistive announcement changed only when the health category changed.

Codex could measure overflow, inspect the accessibility tree, compare
screenshots, and implement the correction. I still had to decide whether the
screen felt calm, which information deserved priority, and whether a tradeoff
fit the product.

![Minute recording a meeting with the capture source and live transcript visible](/assets/images/minute/recording.webp)

## Verification became part of the product

Fast code generation creates a review problem. More code arrives before a
person can inspect every path with equal care. Minute handled that by turning
acceptance criteria into executable checks wherever possible.

On July 28, a fresh `npm run verify` completed with:

- 676 passing frontend tests across 32 test files;
- 384 passing Rust tests, with 10 hardware, model, and network tests explicitly
  ignored;
- a clean lint run;
- a successful TypeScript and Vite production build; and
- valid release metadata for Minute 0.7.0.

The broader release work added a three-hour logical recording soak, a
large-library performance scenario, automated axe checks, screenshot diffs,
keyboard-only review, and a native VoiceOver pass. I tested light and dark
appearances, minimum width, enlarged text, and reduced motion.

Failure paths received their own acceptance criteria. A simulated disk-write
failure must preserve samples already written, keep transcription forwarding
alive, and mark the final note as needing review. A failed summary must leave
the audio and transcript usable. Deleting a note moves it into local recovery
and exposes Undo.

These checks influenced the design. Once a recovery behavior had to be
asserted, vague states such as “something went wrong” stopped being acceptable.
The app had to say what survived and what the user could do next.

## The division of work

Codex handled a large share of execution:

- repository inspection and implementation planning;
- React, TypeScript, Rust, and macOS framework code;
- unit, component, accessibility, soak, and regression tests;
- dependency and crash-source investigation;
- repeated build, lint, and test runs;
- browser and native visual inspection;
- release scripts, CI workflows, and documentation; and
- small commits that kept each change reviewable.

My work centered on judgment:

- choosing an offline product and keeping that promise narrow;
- deciding what Minute should show before, during, and after a recording;
- rejecting placeholder actions and claims the app could not prove;
- setting the visual direction;
- choosing which failures required device evidence;
- accepting tradeoffs around model size, latency, and memory; and
- deciding that an ad-hoc private beta was honest while a public release was
  premature.

Agentic development increased the number of decisions I could test in working
software while leaving their ownership with me.

## Where the approach worked

Codex performed best when the repository could answer whether a change was
correct. Rust’s type system caught unsafe boundaries. Tests pinned timing and
persistence behavior. Screenshots exposed layout regressions. Native crash
reports and accessibility trees gave the agent evidence beyond source code.

Small commits also helped. The repository reached 124 commits in five days, but
the history remains readable because most commits contain one feature, fix, or
verification step. When a later failure appeared, Codex could trace the
relevant decision without reconstructing one enormous change.

The workflow was especially effective for tasks that crossed layers. Adding a
marker touched keyboard handling, recording state, Tauri commands, Rust
persistence, Markdown generation, post-recording editing, Undo behavior, and
tests. Keeping one agent responsible for the complete outcome reduced the
handoff errors I would expect from splitting those layers into isolated coding
tasks.

## Where it struggled

Native desktop work still depends on physical state. A test cannot unplug a
microphone that I do not have. A controller running on the Mac cannot put its
own machine to sleep and continue observing the result. An architecture check
cannot prove that an Intel user can complete a real transcription.

Long sessions also accumulated assumptions. Starting a fresh task for each
coherent outcome, preserving decisions in repository documents, and asking
Codex to inspect the current code reduced that drift.

Visual work needed several passes. Codex could reproduce a reference and
measure the output, but phrases such as “make it feel native” produced weak
results. Concrete direction about hierarchy, spacing, material, color, and
state produced much better work.

The agent also needed explicit permission to stop. Without that, it could keep
polishing a passing implementation while a higher-risk release gap remained.
A written backlog made unfinished work visible and gave me a place to draw the
line.

## What I would repeat

I would use the same approach for another product, with a few rules in place
from the first commit:

1. Write the product constraints before choosing the architecture.
2. Give each task a user-visible outcome and a completion check.
3. Ask for tests and implementation in the same task.
4. Use screenshots, logs, crash reports, and native inspection as agent input.
5. Test failure recovery before adding secondary features.
6. Keep commits small enough to explain in one sentence.
7. Maintain an honest list of work that automation cannot verify.
8. Reserve release decisions and product taste for the human directing the
   work.

Minute’s current release reflects those limits. The Apple Silicon and Intel
private builds are ad-hoc signed, checksummed, and architecture-verified. They
are not notarized because I do not yet have the required Apple Developer
credentials. Physical Intel launch and transcription, removable-microphone
recovery, sleep and wake, an overnight recording, clean-Mac installation, and
the signed updater remain open release checks.

You can inspect the [Minute source](https://github.com/mraza007/minute) and the
[0.7.0 private beta](https://github.com/mraza007/minute/releases/tag/v0.7.0-private.1).
The repository includes the test suites, visual baselines, reliability matrix,
accessibility review, release checklist, and commit history behind the claims
in this post.
