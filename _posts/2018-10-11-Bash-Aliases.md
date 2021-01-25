---
layout: post
title: "Bash Aliases"
description: "In this post we explore how to use Bash Aliases"
keywords: "bash scripting automation shell"
tags: [linux]
---

In this post I am going to talk about how can we remain productive by creating bash aliases and save our time by creating easy to use shortcuts for repetitive commands.

#### What is Bash Alias
Bash Alias is more like a shortcut and it can be declared using the following command `alias alias_name = "command"`. Lets create a simple alias for listing hidden directories and files. `alias lm="ls -la"` 

**note:there aren't any spaces between the command and the name** 

### Now we will be creating some useful bash aliases that we might use on daily basis
- git init (initializing git)
```bash
alias gi="git init"
```
- git push master (pushing files to GitHub)
```bash
alias gpm="git push your_repo_name master"
```
- listing files vertically
```bash
alias l="ls | more"
```
- Creating directories with a shortcut
```bash
alias n="mkdir"
```
- Removing Directory
```bash
alias r="rm -rf"
```
- Removing an Alias
```bash
unalias _alias_name
```

