---
layout: post
title: Generating SSH Keys for Your Machine
description: "Quick guide to generating SSH public and private key pairs using ssh-keygen on Linux. Understand id_rsa and id_rsa.pub files."
tags : [linux]
---

In order to generate private and public ssh keys we run this command `ssh-key`

- When we run `ssh-keygen` we get this prompt

```console
Generating public/private rsa key pair.
Enter file in which to save the key (/home/username/.ssh/id_rsa):
```

- Now you can save the `ssh keys` in `.ssh/` folder

Things to note: 
- `id_rsa` contains private key
- `id_rsa.pub` contains public key
- `known hosts` shows that services that uses are `ssh-keys`.


`ssh-keygen -t rsa -C "your_email@example.com"` Generating ssh-keys and associating them with our email.