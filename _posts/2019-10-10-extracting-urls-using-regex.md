---
layout: post
title: Using Regex To Extract Links.
description: "Learn how to extract URLs from text using regular expressions in Python. Quick regex pattern for matching HTTP, HTTPS, and FTP links."
tags : [linux, python]
---

In order to extract links from a file we can use regular expressions

```
(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%.]+
```

This will match all the urls in the file and we can write a python script to extract the urls.

```python
text = "<CONTAINING URLS>"
urls = re.findall('(?:(?:https?|ftp):\/\/)?[\w/\-?=%.]+\.[\w/\-?=%.]+', text)
print(urls)
```

