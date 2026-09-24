---
layout: post
title: "How to Convert GGUF to MLX (and When You Should Not)"
description: "mlx_lm.convert does not accept GGUF files. Here is what works instead: download an MLX build, convert the original weights, or, if a GGUF is all you have, a tested script that avoids the silent RoPE and tokenizer bugs. Includes MLX to GGUF and measured quality costs."
keywords: "convert gguf to mlx, gguf to mlx, mlx to gguf, convert mlx to gguf, mlx_lm convert gguf, mlx_lm.convert, gguf to safetensors, mlx-community, apple silicon llm, llama.cpp convert_hf_to_gguf"
tags: [ai, llm, mac]
comments: true
---

**Short answer:** There is no direct GGUF to MLX converter. `mlx_lm.convert` only reads Hugging Face safetensors, so pointing it at a `.gguf` file fails. What to do instead, in order of preference:

1. **Download an MLX build that already exists.** Most popular models have one on [mlx-community](https://huggingface.co/mlx-community).
2. **Convert the original weights, not the GGUF.** `mlx_lm.convert --hf-path <original-repo> -q` takes a few seconds.
3. **If a GGUF really is all you have**, dequantize it with transformers and then convert. Take `config.json` and the tokenizer from the original repo, not from the GGUF. If you skip that, a Llama 3 model converts without any error and falls apart on long prompts. [The script is below](#option-3-you-only-have-a-gguf).

The rest of this post shows why, with the exact commands and what each path costs in quality. I tested everything on an M4 Pro, and the versions are listed [at the end](#test-setup).

In my [GGUF vs MLX decision guide](/2026/gguf-vs-mlx-decision-guide/) I argued that GGUF is the safer default and MLX is worth it for specific workloads. The search data for that post shows the follow-up question people have next: how do I convert the GGUF I already have to MLX? This post is the answer.

## Why there is no one-line converter

GGUF and MLX do not store a model the same way. A GGUF file is a single file that holds quantized weights plus the metadata llama.cpp needs: tokenizer, chat template, architecture parameters. An MLX model is a folder in Hugging Face layout: a `config.json`, tokenizer files, and safetensors weights, which MLX quantizes with its own scheme.

`mlx_lm` expects that folder. Give it a GGUF file and it looks for a `config.json` that is not there:

```text
$ mlx_lm.convert --hf-path qwen2.5-0.5b-instruct-q4_k_m.gguf --mlx-path out
NotADirectoryError: [Errno 20] Not a directory: 'qwen2.5-0.5b-instruct-q4_k_m.gguf/config.json'
```

`mlx_lm.generate --model file.gguf` fails the same way. Pointing it at a GGUF repo on Hugging Face fails too. It asks the Hub only for safetensors and JSON files, so at least it does not download every quant first.

### MLX can read some GGUF files, but not as a model

MLX itself has a GGUF reader. `mx.load("model.gguf")` returns the tensors in a dictionary. I tried it on every quant type I could produce:

| GGUF tensor type | `mx.load` result |
|---|---|
| F16 | Loads as float16 |
| Q8_0, Q4_0, Q4_1 | Loads and **stays quantized**: MLX maps them to its own weights, scales, and biases |
| Q4_K, Q6_K | Loads, but is **dequantized to float16**: a 397 MB Q4_K_M file became 1.19 GB in memory |
| Q5_0, Q5_1, IQ4_NL | Fails with `[load_gguf] gguf_tensor_to_f16 failed` |

Two problems make this a dead end for most people. First, what you get back is a dictionary of raw tensors with llama.cpp names like `blk.0.attn_q.weight`, not something `mlx_lm` can run. You would have to rename every tensor and write the config by hand. Second, the name on the file does not tell you which tensor types are inside. Qwen's official `qwen2.5-0.5b-instruct-q4_k_m.gguf` is mostly Q5_0: 133 of its 170 quantized tensors. That is because K-quants need rows that are a multiple of 256 wide, this model's rows are 896 wide, and llama.cpp falls back to Q5_0 for them. So `mx.load` fails on a file called Q4_K_M.

## Option 1: Download an MLX build

This is the right answer most of the time. The mlx-community organization on Hugging Face publishes MLX conversions of most popular open models, usually in several bit widths:

```bash
pip install mlx-lm
mlx_lm.generate --model mlx-community/Llama-3.2-1B-Instruct-4bit --prompt "Hello"
```

Search for the model name plus `mlx`, and you will usually find `-4bit`, `-6bit`, `-8bit`, and `-bf16` variants. If you use LM Studio, it can download and run MLX builds directly on Apple Silicon, so pick the MLX result instead of the GGUF.

## Option 2: Convert the original weights

If nobody has published an MLX build, make one from the original model repo. Every GGUF was made from a Hugging Face repo, and the GGUF model card usually links to it.

```bash
mlx_lm.convert --hf-path unsloth/Llama-3.2-1B-Instruct \
  --mlx-path Llama-3.2-1B-Instruct-4bit -q
```

`-q` quantizes to 4-bit by default. Add `--q-bits 8` for 8-bit, or drop `-q` to keep 16-bit weights. The conversion took about three seconds for the 0.5B and 1B models I tried. Most of the wait is the download.

If the original repo is gated, like the `meta-llama` repos, run `hf auth login` first and accept the license on the model page. Ungated mirrors such as `unsloth/Llama-3.2-1B-Instruct` hold the same weights.

This path gives the best quality you can get from MLX, because it quantizes the full-precision weights once. Every other path quantizes twice.

## Option 3: You only have a GGUF

Sometimes the GGUF really is the only copy. A fine-tune may only be published as GGUF, or you may be offline with a file you downloaded months ago. The path that works has two steps: transformers reads the GGUF and dequantizes it to float16 safetensors, and then `mlx_lm.convert` quantizes that folder the normal way.

The naive version of this, which you will find in older tutorials, is three lines of transformers. On current versions it breaks in three ways, and only the first one gives you an error.

**1. Transformers 5 refuses to save the model.**

```text
ValueError: The model is quantized with QuantizationMethod.GGUF and is not serializable
```

The weights in memory are already plain float16 by then. Transformers still carries a "GGUF quantized" tag on the model and blocks the save. Clearing the tag fixes it.

**2. The RoPE settings get lost, and nothing tells you.** Transformers 5 writes `rope_theta` inside a new `rope_parameters` block in `config.json`. `mlx_lm` reads `rope_theta` from the top level, and if it is missing, it quietly uses the architecture's default. For Qwen2 the default happens to be correct. For Llama the default is 10,000, but Llama 3 was trained with 500,000. The model converts cleanly, and it even answers "The capital of France is Paris." on a short prompt. Then on long input it collapses. On WikiText-2 with a 4,096-token context, its perplexity went from 14.4 to **969**.

Even when `rope_theta` survives, Llama 3's `rope_scaling` block does not. GGUF does not store it as metadata. It stores a precomputed `rope_freqs.weight` tensor, which transformers ignores. That costs about 3 percent in perplexity at 4,096 tokens, with no warning either.

**3. The tokenizer can come out wrong.** Transformers rebuilds the tokenizer from GGUF metadata. For both Qwen models I tried, the result was identical to the original. For Llama 3.2 it was not. It stopped adding the `<|begin_of_text|>` token, and it split text differently: `2026` became `[508, 1627]` instead of `[2366, 21]`. The model never saw those token sequences in training. With the original, full-quality weights and only the tokenizer swapped, the model scored 1.6 to 1.8 percent worse in bits per byte.

On transformers 4.57 the save works and `rope_theta` stays at the top level, but the RoPE scaling and the tokenizer are still wrong. So upgrading or downgrading does not solve this.

### The fix: weights from the GGUF, everything else from the original repo

All three problems come from rebuilding things the GGUF does not store exactly. You do not need to rebuild them. The original repo has the correct `config.json` and tokenizer, and those files are small. So take only the weights from the GGUF:

```python
"""Turn a GGUF file into a Hugging Face folder that mlx_lm.convert can read.

The weights come from the GGUF file. config.json and the tokenizer come from
the original model repo, because the GGUF round trip loses parts of both.

Usage: python gguf_to_hf.py model.gguf org/base-model out_dir
"""
import json
import shutil
import sys
from pathlib import Path

from huggingface_hub import snapshot_download
from transformers import AutoModelForCausalLM

gguf_path, base_repo, out_dir = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3])

# 1. Weights: transformers reads the GGUF and dequantizes every tensor to float16.
model = AutoModelForCausalLM.from_pretrained(
    gguf_path.parent, gguf_file=gguf_path.name, dtype="float16"
)
model.hf_quantizer = None  # transformers 5 refuses to save a model loaded from GGUF
model.save_pretrained(out_dir)

# 2. Config and tokenizer: copy them from the original repo, not from the GGUF.
base = Path(snapshot_download(base_repo, allow_patterns=["*.json", "*.jinja", "*.txt", "*.model"]))
base_config = json.loads((base / "config.json").read_text())
if base_config["vocab_size"] != model.config.vocab_size:
    sys.exit(f"vocab size mismatch: GGUF {model.config.vocab_size}, {base_repo} {base_config['vocab_size']}")

for f in base.iterdir():
    if f.is_file() and f.name != "model.safetensors.index.json":
        shutil.copy(f, out_dir / f.name)
```

Run it, then convert as usual:

```bash
pip install mlx-lm transformers torch gguf accelerate

python gguf_to_hf.py Llama-3.2-1B-Instruct-Q4_K_M.gguf unsloth/Llama-3.2-1B-Instruct llama-hf
mlx_lm.convert --hf-path llama-hf --mlx-path Llama-3.2-1B-Instruct-4bit -q
mlx_lm.generate --model Llama-3.2-1B-Instruct-4bit --prompt "What is the capital of France?"
```

`snapshot_download` fetches only the small JSON and tokenizer files from the base repo, not its weights. The dequantize step took 13 to 18 seconds for the 0.5B to 1B models I tested.

I ran this script on Llama 3.2 1B, Qwen2.5 0.5B, and Qwen3 0.6B. All three produced the original tokenizer and the original RoPE settings, and answered correctly. It also fixed a size problem I had not expected. Qwen2.5 0.5B shares one matrix between its input embeddings and its output layer (`tie_word_embeddings: true`). The naive path untied them and made the 4-bit MLX build 26 percent larger: 349 MB instead of 276 MB. With the original `config.json`, it is 276 MB again.

Which base repo do you pass? The model the GGUF was made from. For a fine-tune, that is the fine-tune's own repo if one exists, otherwise the base model it was trained from. The vocab-size check stops the script if the fine-tune added tokens that the base tokenizer does not know about.

## What each path costs

I measured perplexity on the WikiText-2 test set, using Llama 3.2 1B Instruct, the original tokenizer for every variant, and a 4,096-token context. Lower is better.

| How the MLX model was made | Perplexity | Size |
|---|---|---|
| Original weights, 16-bit | 11.82 | 2.3 GB |
| Original weights → MLX 8-bit | 11.84 | 1.2 GB |
| Q4_K_M GGUF → MLX 8-bit | 12.33 | 1.2 GB |
| Q8_0 GGUF → MLX 4-bit | 13.99 | 680 MB |
| Original weights → MLX 4-bit | 14.05 | 680 MB |
| Q4_K_M GGUF → MLX 4-bit | 14.43 | 680 MB |
| Q4_K_M GGUF → MLX 4-bit, RoPE scaling lost | 14.91 | 680 MB |
| Q4_K_M GGUF → MLX 4-bit, `rope_theta` lost | 969 | 680 MB |

What I take from this:

- **A Q8_0 GGUF is as good as the original weights.** Dequantized, it scored 11.82, the same as the original 16-bit weights. If the GGUF repo has a Q8_0 file, start from that one. It gives the same 4-bit MLX result as the original repo does.
- **Converting a Q4_K_M to 4-bit MLX costs about 3 percent** compared with converting the original weights (14.43 against 14.05). That is the price of quantizing twice.
- **The Q4_K_M weights are better than a plain MLX 4-bit build.** Dequantized, they scored 12.31, and converting them to MLX 8-bit keeps that (12.33). The GGUF file is 808 MB. So if you have the memory, 8-bit MLX from a Q4_K_M keeps more quality than any 4-bit MLX build, at 1.2 GB. This matches what I wrote in the [decision guide](/2026/gguf-vs-mlx-decision-guide/#once-you-have-picked-pick-a-quant-level) about Q4_K_M's mixed precision against uniform 4-bit.
- **The silent failures cost more than the double quantization.** Lost RoPE scaling costs more than quantizing twice. A lost `rope_theta` makes the model useless.

This is a 1B model, and small models react more to quantization than big ones. On a 30B model I would expect every gap except the RoPE one to be smaller.

## The other direction: MLX to GGUF

People search for this too, usually because they fine-tuned with MLX on a Mac and now want to run the result in llama.cpp, Ollama, or LM Studio's GGUF engine. llama.cpp's `convert_hf_to_gguf.py` reads Hugging Face folders, and an unquantized MLX folder is close enough to one. A quantized MLX folder is not:

```text
NotImplementedError: Quant method is not yet supported: None
```

So dequantize first. `mlx_lm.convert` can do that with `-d`:

```bash
mlx_lm.convert --hf-path mlx-community/Llama-3.2-1B-Instruct-4bit --mlx-path llama-deq -d
python $(brew --prefix llama.cpp)/bin/convert_hf_to_gguf.py llama-deq --outfile llama-f16.gguf --outtype f16
llama-quantize llama-f16.gguf llama-q4_k_m.gguf Q4_K_M
```

Homebrew's llama.cpp includes `convert_hf_to_gguf.py`, but runs it with a system Python that has no transformers. Run it with the Python from the environment where you installed `mlx-lm`, as shown above. I first tried the requirements file from the llama.cpp repo, which pins transformers below 5. That failed on the tokenizer config `mlx_lm` writes (`TokenizersBackend does not exist`). With transformers 5 it converted cleanly, with the right pre-tokenizer (`llama-bpe`) and the BOS token on.

The quality cost is larger in this direction, because a 4-bit MLX build has already thrown information away and requantizing cannot bring it back. Measured with `llama-perplexity` on WikiText-2 at a 512-token context:

| How the GGUF was made | Perplexity |
|---|---|
| Original weights → GGUF 16-bit | 14.88 |
| Original weights → GGUF Q4_K_M | 15.42 |
| MLX 4-bit → GGUF 16-bit | 17.55 |
| MLX 4-bit → GGUF Q4_K_M | 18.04 |

A round trip through MLX 4-bit ended 17 percent worse than a Q4_K_M made from the original weights. If you fine-tuned with MLX, fuse your adapter into the 16-bit base model, not the 4-bit one you may have trained on, and convert that. If you just want a GGUF of a public model, download one. Every popular model has them within hours of release.

## Test setup

- M4 Pro, 48 GB, macOS
- mlx 0.32.2, mlx-lm 0.31.3, transformers 5.17.0 (plus 4.57.6 for the comparison), torch 2.14.0, gguf 0.19.0, llama.cpp b8260 from Homebrew
- Models: Llama 3.2 1B Instruct (`unsloth/Llama-3.2-1B-Instruct` and `unsloth/Llama-3.2-1B-Instruct-GGUF`), Qwen2.5 0.5B Instruct (Qwen's own repos), Qwen3 0.6B (`Qwen/Qwen3-0.6B` and `unsloth/Qwen3-0.6B-GGUF`)
- MLX perplexity: my own script, WikiText-2 raw test split, non-overlapping windows, the original tokenizer for every variant, and bits per byte to compare tokenizers. GGUF perplexity: `llama-perplexity -c 512 --chunks 80`. The two tools count differently, so compare numbers within a table, not across tables.

## So, should you convert?

Usually not. Download the MLX build, or convert the original weights. Both take less time than reading this post. Convert a GGUF only when it is truly the only copy of the model, use the script above so that the config and tokenizer come from the source, and start from the Q8_0 file if there is one. And if you are not sure you need MLX at all, the [decision guide](/2026/gguf-vs-mlx-decision-guide/) has the five questions that decide it.
