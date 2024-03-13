---
layout: post
title: "Email Testing with Python's smtpd Module"
description: "In this post, we will dive deep into python smtpd module and explore its capabilities and how it can used for local testing"
keywords: "linux unix python programing python3 smtp emails"
tags: [python]
comments: true
---

As a seasoned Python developer, I am planning to start a new blog series where I will be covering different Python command-line modules which come pre-installed with your Python installation. In this blog, we will be looking into the Python `smtpd` module, which allows you to run your own local `SMTP` server for email testing.


The `smtpd` module, short for **Simple Mail Transfer Protocol Daemon**, allows developers to set up and run their own local SMTP server. This functionality is particularly useful for testing email-related features during development. Rather than relying on external email servers, developers can take advantage of smtpd to simulate email transactions in a local environment.

It's part of Python's standard library, making it readily available for use in any Python project without the need for installing additional dependencies. At its core, this module provides a simple and lightweight implementation of an SMTP (Simple Mail Transfer Protocol) server. SMTP is the protocol used for transmitting electronic mail over the internet, and the smtpd module allows developers to create their own custom SMTP servers.


### Setting up `smtpd` server.

In order to run `smtpd` server locally you need to perform the following steps, 

1. **Open a Terminal and run the following command**

```bash
python -m smtpd -n -c DebuggingServer localhost:1025
```

Breakdown of the command options:

- `-n`: Prevents the server from attempting to verify the existence of the sender's email address. (since we are testing with random email addresses).
- `-c DebuggingServer`: Specifies the class to be used for the SMTP server, in this case, DebuggingServer as we are testing email functionality.
- `localhost:1025` : Sets the address and port on which the server will listen. You can choose a different port if needed.

Now this command while run our smtp server locally which we can use to test emails.

### Writing a simple `python` script.

Once we have `smtpd` running, we can write a simple script to test it. 

<script src="https://gist.github.com/mraza007/daa95799efe7586b4f6c7d9bbf0d9d87.js"></script>

After creating that script you can simply run it. Once you run it you should see the following output on terminal where your `smtpd` command is running.

```bash
---------- MESSAGE FOLLOWS ----------
b'Content-Type: text/plain; charset="us-ascii"'
b'MIME-Version: 1.0'
b'Content-Transfer-Encoding: 7bit'
b'Subject: Test Email'
b'From: testing_email@xyz.com'
b'To: recipient_test@abc.com'
b'X-Peer: ::1'
b''
b'This is a test email'
b' Hello World'
------------ END MESSAGE ------------
```

### Conclusion

Python is an awesome language, and it comes with lots of powerful command-line modules preinstalled. I hope you had a chance to learn something new! In future blog posts I will be covering more of these preinstalled command-line modules. If you have any feedback, please feel free to leave a comment below. If you prefer not to comment publicly, you can always send me an [email](mailto:muhammadraza0047@gmail.com).

Lastly, I have an exciting announcement about my [YouTube channel](https://www.youtube.com/@mr_o47). I launched this channel last year, but unfortunately, due to some personal reasons, I haven't been very active on it. Your support means a lot to me, so I would genuinely appreciate it if you could subscribe. Keep an eye out for upcoming content on my YouTube channel – there's more to come!

**If you like to be notified about the upcoming posts you can subscribe to the RSS or you can leave your email [here](https://forms.gle/M1EK61LLCxJ3iTiD7)**

---


**If you love to learn how to build cool projects like Docker, BitTorrent, or even understand the internals of your favorite tools such as `Git`, `grep` and etc by recreating them in your preferred programming language, I highly recommend you join [Code Crafters](https://app.codecrafters.io/join?via=mraza007). It's an amazing platform which helps you by building different projects**




<br>

_If you loved this post, you can always support my work by [buying me a coffee](https://www.buymeacoffee.com/mraza007). your support would mean the world to me! Also, if you end up sharing this on X, definitely tag me [@muhammad_o7](https://twitter.com/muhammad_o7). Also follow me on [LinkedIn](https://www.linkedin.com/in/muhammad-raza-07/)_