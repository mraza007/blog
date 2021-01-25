---
layout: post
title: "Natural Language Processing"
tags : [devnotes]
---

NLP is a branch of computer science that allows computers to understand Human Language.Using NLP we are able to derive meaningful insights and use them in practical applications such as 
ChatBots,Spam filtering,spell check ,making `google` search better and the list goes on .... 

NLP has few steps such as 

- `Tokenization`
- `Stemmation`.
- `Lemmetization`.
- `POS Tags`(Parts of Speech).
- `Named Entity Recognition`.
- `Chunking`.

### Tokenization
Tokenization is the first step of the NLP process. It's process of splitting text into minimal meaningful units so our machine can understand.
[Furthermore Read](https://nlp.stanford.edu/IR-book/html/htmledition/tokenization-1.html)

### Stemmation
In simplest terms Stemmation is a process of getting a root word. For instance if there are words such as `Plays`,`Played`,`Playing` for this example the root word is `Play`.
Stemming is usually done by stripping the prefixes and suffixes from the words.

**Further Read**
- [Link 1](https://nlp.stanford.edu/IR-book/html/htmledition/stemming-and-lemmatization-1.html).
- [Link 2](https://www.datacamp.com/community/tutorials/stemming-lemmatization-python).


### Lemmetization
Lemmetization is more sophisticated technique compared `stemmation`. As we know stemmation just gets the root word for instance words like `car` wont be matched with `automobile` when doing `stemmation`. But in case of `lemmmetization` `car` will be matched with `automobile`. In lemmatization, the part of speech of a word should be first determined and the normalisation rules will be different for different part of speech.

**Note**: `Stemmation` only strips down words to root words while stripping prefixes and suffixes. While lemmatization will put together words by the use of correct vocabulary.
For instance , `car` will be matched with `automobile`. or `truck` will be matched with `lorry`.

**Further Read**
- [Link 1](https://nlp.stanford.edu/IR-book/html/htmledition/stemming-and-lemmatization-1.html)
- [Link 2](https://textminingonline.com/dive-into-nltk-part-iv-stemming-and-lemmatization)

### POS

Tagging words with correct parts of speech.

### Named Entities.

This process is related to defining the named entities in the text. For instance Mark Zuckerburg is the CEO of Facebook. In this examples `Mark Zuckerburg` and `Facebook` is a named entity.

### Chunking

Chunking is a process of extracting phrases from unstructured text. Instead of just simple tokens which may not represent the actual meaning of the text, its advisable to use phrases such as “South Africa” as a single word instead of ‘South’ and ‘Africa’ separate words.

** Further Read **
- [Link](https://medium.com/greyatom/learning-pos-tagging-chunking-in-nlp-85f7f811a8cb)
