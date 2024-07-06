---
layout: post
title: "Creating a Simple Pastebin Service in Python and Flask"
description: "Learn how to build a functional pastebin service using Python and Flask. This tutorial covers web development basics, file handling, and syntax highlighting."
keywords: "python, flask, pastebin, web development, syntax highlighting, programming tutorial"
tags: [python]
comments: true
---

In this blog post, we will be building a simple Pastebin service using Python and Flask. Pastebin is a popular web application used to store plain text or code snippets for a certain period of time. We'll create a basic version that allows users to paste text, select the programming language, and get a URL to share the paste.

## Getting Starting

Before begin creating our application lets setup our environment and in order to setup your environment follow these steps:

1. First, Let's create a virtual environment in the project directory.

```shell
python -m venv venv
```
2. Now, once we have created the virtual environment, let's activate it and install all the required libraries that are going to be used by this project.

```shell
pip install Flask shortuuid pygments
```
We'll also use `shortuuid` for generating unique IDs for each paste and `pygments` for syntax highlighting.

3. Now that we have installed all the required libraries, let's create the necessary files and folders. 

```shell
mkdir -p pastes templates static && touch index.py templates/index.html static/styles.css
```
This is how your folder structure should look:

```shell
pastebin/
│
├── app.py
├── pastes/
├── templates/
│   └── index.html
└── static/
    └── styles.css

```
The `pastes` directory will store the text files for each paste. The templates directory contains our HTML templates, and the static directory contains CSS for styling.

Now that we have set up the environment, it's time to code.

## Writing Code

Let's dive into the code. Create a file named `index.py` and add the following code:


<script src="https://pastebin.com/embed_js/EKZZqFcZ?theme=light"></script>

Once you have created the flask now let's create html template in `templates/index.html` and `style.css` in `static/style.css`

- `templates/index.html`

<script src="https://pastebin.com/embed_js/q7TgjpxX?theme=light"></script>
<br>

- `static/style.css`

<script src="https://pastebin.com/embed_js/P1Eykcnb?theme=light"></script>

Now that we have created our application, before we run it, let's try to understand how it works by breaking down the code.

### Code Breakdown

1. First, we import the necessary libraries and modules. `Flask` is our web framework, `shortuuid` is used for generating unique IDs, and `Pygments` is for syntax highlighting. We also set up a directory to store our `pastes/`.

```python
from flask import Flask, request, render_template, abort
import shortuuid
import os
from pygments import highlight
from pygments.lexers import get_lexer_by_name, get_all_lexers
from pygments.formatters import HtmlFormatter

app = Flask(__name__)

PASTE_DIR = 'pastes'
if not os.path.exists(PASTE_DIR):
    os.makedirs(PASTE_DIR)
```

2. Then we write a function that retrieves all available programming languages supported by Pygments for syntax highlighting and returns them as a sorted list of tuples.

```python
def get_language_options():
    return sorted([(lexer[1][0], lexer[0]) for lexer in get_all_lexers() if lexer[1]])
```

3. Then we write the main route for our application. If the request method is POST (i.e., when the user submits a form), it saves the content and language to a new file with a unique ID. The URL for the new paste is generated and displayed to the user. If the request method is GET, it simply renders the form.

```python
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        content = request.form['content']
        language = request.form['language']
        paste_id = shortuuid.uuid()
        file_path = os.path.join(PASTE_DIR, paste_id)

        with open(file_path, 'w') as f:
            f.write(f"{language}\n{content}")

        paste_url = request.url_root + paste_id
        return render_template('index.html', paste_url=paste_url, languages=get_language_options())

    return render_template('index.html', languages=get_language_options())

```

This route handles viewing a specific paste. It reads the paste file, applies syntax highlighting using pygments, and renders the highlighted content.

```python
@app.route('/<paste_id>')
def view_paste(paste_id):
    file_path = os.path.join(PASTE_DIR, paste_id)
    if not os.path.exists(file_path):
        abort(404)

    with open(file_path, 'r') as f:
        language = f.readline().strip()
        content = f.read()

    lexer = get_lexer_by_name(language, stripall=True)
    formatter = HtmlFormatter(linenos=True, cssclass="source")
    highlighted_content = highlight(content, lexer, formatter)
    highlight_css = formatter.get_style_defs('.source')

    return render_template('index.html', paste_content=highlighted_content, highlight_css=highlight_css)

```


Now once we understand how everything works, now you can simply run the application using this command
`python index.py`

## Conclusion

You've built a simple Pastebin service using Python and Flask! This service allows users to paste text, select a programming language, and share the paste via a unique URL. You can expand this project by adding features like expiration times for pastes, user authentication, or even a database to store pastes more efficiently.

If you have any feedback, please feel free to leave a comment below. If you prefer not to comment publicly, you can always send me an [email](mailto:muhammadraza0047@gmail.com).

### Announcements

- - I started a youtube channel a year ago, and if you want me to create video series about interesting stuff like this feel free to [subscribe](https://www.youtube.com/channel/UCC_OnjbHWxVNYjf4YsAdMdA).
- I am  open for Python Consulting as well, If you any interesting python project or even need advice regarding tech, you can always send an [email](mailto:muhammadraza0047@gmail.com)
- Lastly A huge thanks for reading this and supporting my work.

<br>
_If you loved this post, you can always support my work by [buying me a coffee](https://www.buymeacoffee.com/mraza007). your support would mean the world to me! Also, if you end up sharing this on X, definitely tag me [@muhammad_o7](https://twitter.com/muhammad_o7). Also follow me on [LinkedIn](https://www.linkedin.com/in/muhammad-raza-07/)_


**Note: If you like to be notified about the upcoming posts you can subscribe to the RSS or you can leave your email [here](https://forms.gle/M1EK61LLCxJ3iTiD7)**
