---
layout: post
title: "GGUF vs MLX: A Decision Guide, Not Another Benchmark"
description: "If you run local LLMs on a Mac, you keep getting asked to choose between a GGUF file and an MLX build of the same model. Here is how to actually decide, in five questions, without trusting a tokens-per-second counter that lies."
keywords: "gguf vs mlx, mlx quantization, gguf quantization, local llm mac, apple silicon llm, q4_k_m, mlx vs llama.cpp, local llm inference, quantization formats, ollama lm studio mlx"
tags: [ai, llm, devops, mac]
comments: true
---

Every few weeks someone downloads the GGUF build and the MLX build of the same model, runs both, screenshots the tokens-per-second counter, and posts it as proof that one format wins. The replies split down the middle. Half the thread says MLX is obviously faster, the other half says the test was rigged.

They are both right, which is the problem. The number on the screen is real and it is also not the number you actually wait for. And the format you should pick was never really about that number anyway.

I have gone through this decision enough times now, on my own machine and for clients standing up local inference, that I want to write down the part nobody puts in the comparison tables: GGUF versus MLX is a five-question decision, and only one of those questions is about speed.

## What you are actually choosing between

GGUF is the file format from the llama.cpp project. One file holds the quantized weights, the tokenizer, the chat template, and the metadata, and any runtime that can load it will run the model. That includes llama.cpp itself, Ollama, LM Studio, KoboldCPP, and a handful of others. It runs on basically everything: CPU, NVIDIA, AMD, Apple Metal, even a Raspberry Pi if you are patient. Portability is the whole point of the format.

MLX is not a file format. It is Apple's array framework, the rough equivalent of PyTorch built specifically for Apple Silicon. An MLX model is a directory of safetensors files plus a config that the runtime reads directly. You convert and quantize a model in one command with `mlx_lm.convert`. The catch is in the name: MLX runs on Apple Silicon and nowhere else.

One thing worth clearing up before we go further, because it shows up in half the comparisons and it is out of date: people say GGUF does clever mixed-precision quantization while MLX is stuck on flat uniform 4-bit. The first half is true. The second half is not. Apple walked through per-layer mixed precision in their WWDC25 session on running large language models with MLX, including the trick of keeping the embedding and output layers at 6-bit while the rest of the model sits at 4-bit. MLX can do it. It is just that most of the MLX builds floating around Hugging Face do not bother, so in practice you often are comparing GGUF's mixed precision against a uniform MLX quant. Worth knowing when you read someone else's quality benchmark.

## The number on the screen is lying to you

Quick detour, because it poisons most of the benchmarks you will find.

The tokens-per-second figure your runtime prints while text is streaming measures decode speed, the rate at which the model emits new tokens. It does not include prefill, the time the model spends reading your prompt before it says anything. For a chatty exchange with a short prompt that does not matter much. For an agent that stuffs tool output, a chunk of a file, and a system prompt into every turn, prefill is most of what you wait for, and the streaming counter never sees it.

There is a benchmark writeup that made the rounds on r/LocalLLaMA where the author's UI proudly reported nearly twice the tokens per second on MLX as on GGUF, and then the actual wall-clock time had GGUF finishing first on most of the real tasks. Same machine, same model. The counter was not wrong. It was just answering a different question than the one that mattered.

Keep that in your head for the whole rest of this post. When I say one format is "faster" below, I mean wall-clock on a real workload, not the number that scrolls past while tokens stream.

## Five questions that actually decide it

### 1. How big is the model relative to your RAM?

This is the question that quietly settles a lot of arguments. Token generation is bounded by memory bandwidth, not compute. To emit one token the GPU has to read the entire model out of memory. On an M4 Pro with roughly 273 GB/s of bandwidth, a 4-bit 27B model weighing about 17 GB caps out near 16 tokens per second no matter what software you run. MLX cannot fetch bytes faster than the hardware allows, and neither can llama.cpp.

So for large models, the ones that fill most of your unified memory, the format barely matters for speed. They both hit the same wall. The interesting differences show up on smaller models, under roughly 8 to 14B, where the model fits comfortably and the bottleneck shifts from bandwidth to framework overhead. That is where MLX's tighter, Apple-specific kernels pull ahead, often in the 15 to 40 percent range on single-user decode, and wider still on very small models that lean hardest on framework efficiency.

Small model, want it snappy: MLX has something real to offer. Big model that barely fits: pick on the other four questions, because speed is a wash.

### 2. Will this ever need to run somewhere other than a Mac?

If there is any chance the same artifact has to run on a Linux box, a cloud GPU, or a teammate's non-Apple machine, you want GGUF. The same file moves between all of them. MLX does not leave Apple Silicon, full stop. If you ship MLX as your only build and then need a CUDA fallback, you are re-quantizing under pressure.

This one overrides almost everything else. Portability is not a performance feature, but it is the feature you miss most when it is gone.

### 3. What does your workload actually look like?

Not "what model," but the shape of the traffic. Specifically the ratio of input to output.

Workloads that feed the model a lot and ask for a little (classification, tool-calling agents with short replies, RAG with a big injected context) lean toward GGUF. llama.cpp has more battle-tested prompt caching and FlashAttention, and MLX's prefix caching has historically been the less reliable of the two, especially on newer hybrid-attention models. When prefill dominates the wall clock, that maturity wins.

Workloads that take a short prompt and generate a lot (summaries, long-form chat, brainstorming) lean toward MLX. Once the model is past prefill and just streaming tokens, MLX's decode advantage compounds, and the longer the reply the more it pays off.

There is a crossover point that depends on both context size and reply length. With a small prompt, MLX needs a couple hundred output tokens before its faster decode makes up for slower prefill. With a few thousand tokens of context, it needs several hundred more. If your agent's replies are 150 tokens and its context keeps growing, you are living on the wrong side of that crossover, and GGUF is the better call.

### 4. Do you want to train, or just run?

GGUF is an inference format. You download it, you run it, that is the relationship. If you want to fine-tune, you convert back to safetensors, find a GPU, do the work, and convert forward again.

MLX is a full framework. You can fine-tune with LoRA or QLoRA directly on the Mac, merge adapters, and run speculative decoding with a small draft model, all natively. If part of your reason for going local is to actually adapt models and not just serve them, MLX is the only serious option on Apple Silicon, and this question alone can decide the whole thing.

### 5. How much do you care about ecosystem and exact fit?

Two practical edges for GGUF here. First, coverage: every open model gets GGUF builds within hours of release, including the obscure ones. MLX coverage is good for popular models and lags for everything else. Second, granularity. GGUF gives you a long ladder of quant levels, Q4_K_M, Q5_K_M, Q6_K, the I-quants, and so on, so when you have exactly 16 GB to work with you can usually find a quant that fits. MLX builds are mostly published at 4-bit and 8-bit, so you sometimes get a 4-bit that is a hair too small for the quality you want and an 8-bit that will not fit.

The edge on MLX's side: it tends to get support for new Apple hardware features first, because Apple ships the metal abstraction in MLX before llama.cpp catches up.

## The flowchart

Put the five questions in order and most decisions fall out in about ten seconds.

- **Need to run on anything other than Apple Silicon, now or later?** → **GGUF**. Stop here, portability wins.
- **Staying on Apple Silicon. Do you want to fine-tune or train on-device?** → **MLX**.
- **Inference only. Is your workload short-output and prefill-heavy** (agents, RAG, classification)? → **GGUF**.
- **Long outputs, interactive, single user, latency you can feel?** → **MLX**.
- **Need a precise quant to fit tight RAM, or running a just-released or obscure model?** → **GGUF**.
- **Still undecided?** → **GGUF**. It is the conservative default. Ship it, and A/B an MLX build later if throughput becomes the constraint.

The short version: GGUF is what you pick when you are not sure, because it is the one that is hard to regret. MLX is what you pick when you own the hardware, run single-user, and have a specific reason, throughput on long outputs or on-device training, to want it.

## Once you have picked, pick a quant level

The format is half the decision. The bit width is the other half, and the defaults are good but not always right.

Start at **Q4_K_M** for GGUF or **4-bit** for MLX. Q4_K_M is the community default for a reason. It keeps most tensors at 4-bit, then bumps the quality-sensitive ones to 6-bit: the attention value weights and the feed-forward down-projection, on a portion of the layers. That holds quality better than a flat 4-bit quant at a small size cost. The reported quality loss against FP16 on MMLU is model-dependent but small: well under a point on a big model, creeping up toward a point or so on something under 8B, and a little more again for a uniform 4-bit MLX build. On a 30B-plus model that gap is noise. On something under 8B, especially on coding tasks where attention precision matters, it is visible, and you have two outs: stay on GGUF Q4_K_M, or move to MLX 6-bit, which closes the gap for roughly a 30 percent larger file.

If RAM is genuinely tight, GGUF's **I-quants** with an importance matrix are the quality-per-byte champions at low bit widths. The cost is slower decode on CPU, so they make more sense when you are squeezing a model onto limited memory than when you are chasing speed.

One rule regardless of format: do not drop below roughly 3-bit without measuring quality on your own task. The aggregate benchmarks stop predicting what you will actually see down there.

## Two traps that will flip your results

**The bf16 trap on M1 and M2.** A lot of MLX builds ship as bf16, and on the M1 and M2 that data type does not get the accelerated path that fp16 does. During prefill those weights run un-accelerated and the penalty multiplies across every input token, which is part of why some "MLX is slow" reports come from older hardware. The fix is a one-minute reconvert with `--dtype float16`. If you are on an M1 or M2 and MLX feels sluggish, check this before you blame the format.

**Caching is the real variable.** The biggest swings I have seen between runtimes were not about GGUF versus MLX at all, they were about whether prompt and KV caching actually worked for that model on that runtime. A runtime that reprocesses the full conversation every turn will lose to one that caches the prefix, regardless of format. Test caching with your real context lengths before you commit, and do not trust the streaming counter to tell you about it, because it never measures the part that caching fixes.

## So which one

If you want the one-line version: GGUF is the conservative default, and you should reach for it whenever you are uncertain, need portability, or want a specific quant. Reach for MLX when you are locked to Apple Silicon, run single-user interactive workloads with long outputs, or want to fine-tune on the machine you already own.

And if you are choosing this for a team rather than a laptop, treat it as the architecture decision it is. The format you standardize on shapes your model coverage, your fallback options, and your serving setup for as long as the stack lives, and re-quantizing a fleet after the fact is the kind of avoidable week of work I keep getting hired to clean up. Decide it on the five questions, not on a screenshot.
