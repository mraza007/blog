---
layout: post
title: Using Regex To Extract Links.
tags : [linux]
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

