---
layout: post
title: Things I discover (Programming/Linux/Automation/Shell)
tags: [TIL]
published: true
---

- [x] I learned about deploying django webapps using gunicorn and nginx. I was able to deploy full fledge application on raspberry pi.
- [x] I was able to configure NGINX and serve static files on the client side.
- [x] Learned about public and private IP addresses. most of the private IP addresses start with `192.XXX.XXX.XXX` or `172.XXX.XXX.XXX`
- [x] `:%s/$/HelloWorld/` This command allows to add something end of the line(Note:This command saved me so much time when formating data.)
- [x] `:%s!^!//!` This vim command will add something in the beginning of the line.
- [x] I learned about created userforms in excel and mapping the userinputs to the excel macros
- [x] you can open python documentation using `python3 -m pydoc -p <specify_port>`

#### 2021/1/25 

- `xargs -n 1 curl -sL < urls.txt | grep -Eo "<title>.*</title>"` This command allows you extract url titles when you have more than 1 url
- `curl -sL <url> | grep -Eo 'href="(https|http):[^\"]+"'` This command allows you extract urls from a webpage.
- use ``backticks`` to run a execute a command in bash script when the command is saved into a variable. 

##### Example Script
```sh
filename="$1"
file="$1"
while read -r line; do
    name="$line"
    x=`curl -sL $name| grep -aEo "<title>.*</title>"` 
    echo "$x - $name"
done < "$filename"
```
