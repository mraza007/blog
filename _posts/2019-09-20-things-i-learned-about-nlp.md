---
layout: post
title: "NLP Basics: Stemming, Lemmatization, Tokenization & More"
description: "Learn the fundamentals of Natural Language Processing including stemming (stemmation), lemmatization, tokenization, POS tagging, named entity recognition, and chunking with practical examples."
keywords: "nlp stemming stemmation lemmatization tokenization natural language processing python nltk text processing"
tags: [python, nlp]
---

**Natural Language Processing (NLP)** is a branch of computer science that enables computers to understand human language. Using NLP, we can derive meaningful insights and apply them in practical applications like chatbots, spam filtering, spell check, and improving search engines.

In this guide, I'll walk you through the core NLP concepts that every developer should know:

- **Tokenization** - Breaking text into meaningful units
- **Stemming** - Reducing words to their root form
- **Lemmatization** - Vocabulary-aware word normalization
- **POS Tags** - Parts of Speech tagging
- **Named Entity Recognition** - Identifying entities in text
- **Chunking** - Extracting meaningful phrases

### Tokenization
Tokenization is the first step of the NLP process. It's process of splitting text into minimal meaningful units so our machine can understand.
[Furthermore Read](https://nlp.stanford.edu/IR-book/html/htmledition/tokenization-1.html)

### Stemming (Stemmation)

**Stemming** (sometimes called stemmation) is the process of reducing words to their root form. For example, words like `Plays`, `Played`, and `Playing` all reduce to the root word `Play`.

Stemming works by stripping prefixes and suffixes from words. The most common algorithm is the **Porter Stemmer**, which uses a series of rules to systematically remove word endings.

```python
from nltk.stem import PorterStemmer
stemmer = PorterStemmer()

words = ["playing", "played", "plays", "player"]
for word in words:
    print(f"{word} -> {stemmer.stem(word)}")
# Output: playing -> play, played -> play, plays -> play, player -> player
```

**Further Reading:**
- [Stanford NLP - Stemming and Lemmatization](https://nlp.stanford.edu/IR-book/html/htmledition/stemming-and-lemmatization-1.html)
- [DataCamp - Stemming and Lemmatization in Python](https://www.datacamp.com/community/tutorials/stemming-lemmatization-python)


### Lemmatization

**Lemmatization** is a more sophisticated technique compared to stemming. While stemming simply chops off word endings, lemmatization uses vocabulary and morphological analysis to return the base dictionary form of a word (called a **lemma**).

The key difference: stemming might reduce "better" to "bett", but lemmatization correctly returns "good".

```python
from nltk.stem import WordNetLemmatizer
lemmatizer = WordNetLemmatizer()

# Lemmatization considers parts of speech
print(lemmatizer.lemmatize("running", pos="v"))  # -> run
print(lemmatizer.lemmatize("better", pos="a"))   # -> good
print(lemmatizer.lemmatize("geese"))             # -> goose
```

**Stemming vs Lemmatization:**
- **Stemming**: Fast, rule-based, may produce non-words (`studies` → `studi`)
- **Lemmatization**: Slower, uses dictionary, always produces real words (`studies` → `study`)

**Further Reading:**
- [Stanford NLP - Stemming and Lemmatization](https://nlp.stanford.edu/IR-book/html/htmledition/stemming-and-lemmatization-1.html)
- [NLTK Stemming and Lemmatization Guide](https://textminingonline.com/dive-into-nltk-part-iv-stemming-and-lemmatization)

### POS Tagging (Parts of Speech)

**POS tagging** assigns grammatical categories (noun, verb, adjective, etc.) to each word in a sentence. This is essential for understanding sentence structure and meaning.

```python
import nltk
sentence = "The quick brown fox jumps over the lazy dog"
tokens = nltk.word_tokenize(sentence)
pos_tags = nltk.pos_tag(tokens)
print(pos_tags)
# [('The', 'DT'), ('quick', 'JJ'), ('brown', 'JJ'), ('fox', 'NN'), ...]
```

Common POS tags: `NN` (noun), `VB` (verb), `JJ` (adjective), `RB` (adverb), `DT` (determiner).

### Named Entity Recognition (NER)

**Named Entity Recognition** identifies and classifies named entities in text into predefined categories like person names, organizations, locations, dates, and more.

```python
import nltk
sentence = "Mark Zuckerberg is the CEO of Facebook in California"
tokens = nltk.word_tokenize(sentence)
pos_tags = nltk.pos_tag(tokens)
entities = nltk.ne_chunk(pos_tags)
# Identifies: Mark Zuckerberg (PERSON), Facebook (ORGANIZATION), California (GPE)
```

### Chunking

**Chunking** extracts meaningful phrases from text rather than individual words. For example, "South Africa" should be treated as a single entity, not two separate words.

```python
# Chunking groups related words together
# "New York City" -> single location chunk
# "machine learning" -> single noun phrase
```

Chunking is useful for:
- Extracting noun phrases for keyword analysis
- Information extraction from documents
- Building knowledge graphs

**Further Reading:**
- [POS Tagging and Chunking in NLP](https://medium.com/greyatom/learning-pos-tagging-chunking-in-nlp-85f7f811a8cb)

---

## Conclusion

These NLP fundamentals—tokenization, stemming, lemmatization, POS tagging, NER, and chunking—form the foundation for building text processing applications. Whether you're building a chatbot, search engine, or sentiment analyzer, mastering these concepts is essential.

To get started with NLP in Python, install NLTK:

```bash
pip install nltk
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger'); nltk.download('wordnet')"
```
