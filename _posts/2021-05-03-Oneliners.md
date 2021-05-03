---
layout: post
title: "My Favorite One Liners"
description: "Commandline one liners that makes your workflow more productive"
keywords: "linux unix bash sysadmin commandline"
tags: [linux]
comments: true
---

In this post, I will be sharing my favorite commandline one liners that have made my workflow productive and more efficient. As a regular Linux user, I have been using commandline extensively to perform daily tasks such as creating files, navigating through directories , moving files and editing files using `vim`.

1. `ps aux | convert label:@- process.png`

This commmand allows you to convert your shell output into an image as this makes it much easier than taking a screenshot of your shell if you want to share your output with someone.

_Note:`convert utility is part of imagemagick if you don't have convert you can install by installing imagemagick`._


2. `curl ipinfo.io`

If you want to know your external ip address using `ipinfo.io` you can simple run this command or you even add this command as your bash alias.

3.`git log --format='%aN' | sort -u`

This comes in very handy especially if you are working on an open source project and wants to know who has contributed to the project.

4. `history | awk '{print $2}' | sort | uniq -c | sort -rn | head`.

If you want to see which commands you run often you can run the following command and you can even add in your `.bashrc` as an alias.

5. `ls -d */`

As someone who uses commandline everyday, this command is very useful when listing directories only and you can always set this command as a bash alias so you can access it quickily.

6. `du -hs */ | sort -hr | head`

This command will allow you to view 10 largest directories in your current directory.

7. `ss -p`

This command allows you to see what apps are consuming internet.

8. `grep . *`

If you want to `cat` bunch of files at once you can run this command.


9. `rm -f !(test.txt)`.

This command will remove all the files from the directory but the not the one specified within brackets.

10. `python3 -m http.server`

This command will allow you start an http server and serve your files. It comes in handy when you want share an html file over the network.

11. `mkfifo hello; script -f hello`

This command will allow you to share your terminal session in real time. this was something I recently discovered and I was totally surprised by this command.

[See it in Action](https://www.youtube.com/watch?v=4YK9Qb3PVS0&t=24s)


Lastly I hope you enjoyed reading this and got a chance to learn something new from this post and if you have any commandline tips or one liners feel free to comment below and I would love to check it out.

I am also starting a newsletter and If you are interested feel free to 
[subscribe](https://devconsole.substack.com/p/coming-soon?r=qu6c&utm_campaign=post&utm_medium=web&utm_source=copy)
