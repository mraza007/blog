---
layout: post
title: "My Favorite Vim Oneliners For Text Manipulation"
description: "A list of simple vim oneliners which helps you edit your text faster"
keywords: "linux unix bash sysadmin commandline vim nvim"
tags: [vim]
comments: true
---

_To support my work, I've enabled ads on my blog. I hope you don't mind them, as they help me continue creating valuable content. Your understanding and support mean the world to me! Thank you!_

---

In this post, I will be sharing my favorite `vim` one-liners that have significantly enhanced my `vim` workflow, making it more productive and efficient. As an avid `vim` user, I have extensively utilized these one-liners to edit files, and they never cease to surprise me with their ability to accomplish tasks swiftly, saving precious time. This is precisely what drew me to Vim - the unparalleled efficiency it offers when it comes to editing text.

1. Count the Number of Words in a File:

A simple vim one liner which allows you to count the words in the file as this can be very handy.

```console
:%s/\w\+/\=submatch(0)+1/g | echo line('$')
```

2. Format JSON with Python:

Now this command is very simple but it allows you use python json library within vim to format your json document and its very useful when you need to format large json documents locally.

```console
:%!python -m json.tool
```

3. Remove all the blank lines

This allows you to remove all the blank lines from the file you are working on.

```console
:g/^\s*$/d
```

4. Opening Multiple Files at once in split mode

```console
:argedit file1.txt file2.txt | all
```

5. Calculating the sum of all numbers present in the file

```console
:put =eval(join(getline(1, '$'), '+'))
```

6. Extracting IP Addresses

```console
:g/\(\d\{1,3}\.\)\{3}\d\{1,3\}/y A
```


Lastly I hope you enjoyed reading this and got a chance to learn something new from this post and if you have any vim tips or one liners feel free to comment below and I would love to check it out.

---

<br>
_I write occasionally feel free to follow me on [twitter](https://twitter.com/muhammad_o7), also I run a newsletter and if you like reading technology news you can subscribe [here](https://devconsole.substack.com/)_ 


_To support my work, I've enabled ads on my blog. I hope you don't mind them, as they help me continue creating valuable content. Your understanding and support mean the world to me! Thank you!_

