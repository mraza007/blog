---
layout: post
title: "Python smtpd Was Removed in 3.12: How to Test Emails Locally with aiosmtpd"
description: "The smtpd module was removed in Python 3.12, so python -m smtpd -n -c DebuggingServer no longer works. Here is the aiosmtpd replacement: a one-line local SMTP debug server, plus a pytest fixture that catches emails in your tests."
keywords: "python smtpd removed 3.12, python smtpd deprecated, aiosmtpd, python local smtp server for testing, python test smtp server, smtpd DebuggingServer replacement, python test email, pytest email testing"
tags: [python]
comments: true
---

_Updated September 2026. The original version of this post used the `smtpd` module. Python 3.12 removed that module, so I rewrote the post for `aiosmtpd`._

If you run `python -m smtpd` on Python 3.12 or later, you get this:

```text
/usr/bin/python3: No module named smtpd
```

The `smtpd` module was deprecated in Python 3.6 and removed in Python 3.12 ([PEP 594](https://peps.python.org/pep-0594/)). The official replacement is [`aiosmtpd`](https://aiosmtpd.aio-libs.org/), an asyncio-based SMTP server from the aio-libs project. It is a `pip install` away, and it has the same "print every email to the terminal" mode that made `smtpd` useful for local testing.

The short version:

```bash
# Old (Python 3.11 and earlier)
python -m smtpd -n -c DebuggingServer localhost:1025

# New (Python 3.12 and later)
pip install aiosmtpd
python -m aiosmtpd -n -l localhost:1025
```

The rest of this post shows the new command, a script to send a test email, and a pytest fixture that lets your tests check the emails your code sends.

## Why a local SMTP server?

When your app sends email (sign-up confirmations, password resets, alerts), you do not want to send real email while you develop. A local SMTP server accepts the message on your machine and prints it. Nothing leaves your laptop, and you see exactly what your code sent: headers, body, and recipients.

## Step 1: Start the debug server

Install `aiosmtpd` in your virtual environment:

```bash
pip install aiosmtpd
```

Start the server:

```bash
python -m aiosmtpd -n -l localhost:1025
```

What the options do:

- `-n`: Do not try to switch to the `nobody` user. The server tries this by default, and it fails when you are not root. The old `smtpd` command had the same flag.
- `-l localhost:1025`: The host and port to listen on. Without this flag, `aiosmtpd` listens on `localhost:8025`.

You do not need a `-c` flag. The default handler is `aiosmtpd.handlers.Debugging`, which is the replacement for the old `DebuggingServer` class. It prints every message to the terminal.

## Step 2: Send a test email

Save this as `send_email.py`:

```python
import smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg["Subject"] = "Test Email"
msg["From"] = "testing_email@xyz.com"
msg["To"] = "recipient_test@abc.com"
msg.set_content("This is a test email\nHello World")

with smtplib.SMTP("localhost", 1025) as server:
    server.send_message(msg)
```

`smtplib` is still in the standard library. Only the server side moved to a separate package. The script uses `EmailMessage`, the modern API in the `email` package, and a `with` block so that the connection closes even when sending fails.

Run it:

```bash
python send_email.py
```

The terminal that runs the server prints the message:

```text
---------- MESSAGE FOLLOWS ----------
Subject: Test Email
From: testing_email@xyz.com
To: recipient_test@abc.com
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: 7bit
MIME-Version: 1.0
X-Peer: ('::1', 51530, 0, 0)

This is a test email
Hello World
------------ END MESSAGE ------------
```

If you used the old `DebuggingServer`, you will notice one change. The old server printed every line as a bytes literal (`b'Subject: Test Email'`). `aiosmtpd` prints plain text.

## Step 3: Catch emails in your tests

The terminal output is fine when you test by hand. In automated tests, you want to assert on the email itself. `aiosmtpd` includes a `Controller` that runs the server in a background thread, so you can start and stop it from a pytest fixture.

```python
import smtplib
from email.message import EmailMessage

import pytest
from aiosmtpd.controller import Controller
from aiosmtpd.handlers import Message


class Inbox(Message):
    def __init__(self):
        super().__init__()
        self.messages = []

    def handle_message(self, message):
        self.messages.append(message)


@pytest.fixture
def inbox():
    handler = Inbox()
    controller = Controller(handler, hostname="localhost", port=1025)
    controller.start()
    yield handler
    controller.stop()


def send_welcome_email(to):
    msg = EmailMessage()
    msg["Subject"] = "Welcome"
    msg["From"] = "app@example.com"
    msg["To"] = to
    msg.set_content("Thanks for signing up.")
    with smtplib.SMTP("localhost", 1025) as server:
        server.send_message(msg)


def test_welcome_email(inbox):
    send_welcome_email("new_user@example.com")

    assert len(inbox.messages) == 1
    email = inbox.messages[0]
    assert email["To"] == "new_user@example.com"
    assert email["Subject"] == "Welcome"
    assert "Thanks for signing up." in email.get_payload()
```

```bash
$ pytest -q test_email.py
.                                                                        [100%]
1 passed in 0.05s
```

How it works:

- `Message` is a handler in `aiosmtpd` that parses each incoming email into an `email.message.Message` object. The `Inbox` subclass keeps each parsed message in a list.
- `controller.start()` does not return until the server accepts connections, so the test does not need a sleep.
- `controller.stop()` shuts the server down after the test, so the port is free for the next test.

In a real project, `send_welcome_email` is your application code. Point its SMTP host and port at `localhost:1025` in your test settings.

## If you are still on Python 3.11 or earlier

The old command still works on those versions:

```bash
python -m smtpd -n -c DebuggingServer localhost:1025
```

It prints a `DeprecationWarning` on 3.10 and 3.11. I still recommend `aiosmtpd`, because the same command then works when you upgrade.

## Conclusion

The fix for the missing `smtpd` module is one package and one changed command: `pip install aiosmtpd`, then `python -m aiosmtpd -n -l localhost:1025`. For tests, the `Controller` class gives you an in-process inbox that you can assert on. If you have any feedback, leave a comment below. If you prefer not to comment publicly, you can always send me an [email](mailto:muhammadraza0047@gmail.com).

**If you like to be notified about the upcoming posts you can subscribe to the RSS or you can leave your email [here](https://forms.gle/M1EK61LLCxJ3iTiD7)**

---


**If you love to learn how to build cool projects like Docker, BitTorrent, or even understand the internals of your favorite tools such as `Git`, `grep` and etc by recreating them in your preferred programming language, I highly recommend you join [Code Crafters](https://app.codecrafters.io/join?via=mraza007). It's an amazing platform which helps you by building different projects**




<br>

_If you loved this post, you can always support my work by [buying me a coffee](https://www.buymeacoffee.com/mraza007). your support would mean the world to me! Also, if you end up sharing this on X, definitely tag me [@muhammad_o7](https://twitter.com/muhammad_o7). Also follow me on [LinkedIn](https://www.linkedin.com/in/muhammad-raza-07/)_
