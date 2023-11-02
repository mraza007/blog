---
layout: post
title: "My Useful Shell Functions"
description: "Commandline Shell Functions that makes your workflow more productive"
keywords: "linux unix bash sysadmin commandline"
tags: [linux]
comments: true
---

I have been working extensively in Linux recently and decided to write a post about my useful shell functions, which have significantly enhanced my workflow productivity. In this post, I will share my go-to shell functions that have improved the efficiency of my tasks. As a regular Linux user, I frequently use the command line for various daily operations, such as file creation, directory navigation, file movement, and text editing using `vim`.


### Viewing CSV Files in a Better Format

```bash
function view_csv_pretty {
    if [ -z "$1" ]; then
        echo "Usage: view_csv_pretty <file.csv>"
    else
        cat "$1" | column -s, -t | less -F -S -X -K
    fi
}
```

This bash function comes in pretty handy when viewing `csv` files directly on the terminal. Here's the explanation for this one liner.

1. `cat` `"$1"`: Reads the content of the specified CSV file.
2. `column` `-s`, `-t`: Uses the column command to format the content into a table 
   1. `-s`,: Specifies that columns are separated by commas in the CSV file.
   2. `-t`: Tells column to create the table output.
3. `less -F -S -X -K`:
   1. `less`: Displays the formatted table output in the terminal.
   2. `-F`: Quits if the entire file fits on one screen.
   3. `-S`: Chops long lines to fit within the screen width.
   4. `-X`: Leaves the screen's contents intact upon exiting less
   5. `-K`: Exits less on Ctrl+C.


### Checking Recently Modified Files

This Bash function, `recently_modified`, proves to be quite handy for my team when keeping track of the latest modifications made to various files on the server.

```bash
function recently_modified() {
    recent_file=$(ls -t | head -n1)
    echo "Most recently modified file: $recent_file"
}
```

### Compressing Multiple Files 

```bash
function compress_files() {
    if [ -z "$1" ]; then
        echo "Usage: compress_files <archive_name.zip> <file1> <file2> ..."
    else
        zip -r "$1" "${@:2}"
    fi
}
```

### Searching text in files

```bash
function search_text_in_files() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        echo "Usage: search_text_in_files <directory> <search_term>"
    else
        grep -rnw "$1" -e "$2"
    fi
}
```

### Checking high usage memory processes

```bash
function process_with_most_memory() {
    ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head
}
```

### Listing Open Ports

```bash
function list_open_ports() {
    netstat -tuln
}
```

### Listening Ports for specific process

```bash
function  find_listening_ports() {
    if [ -z "$1" ]; then
        echo "Usage: find_listening_ports <pid>"
    else
        ss -tulnp | grep "$1"
    fi
}
```


Finally, I hope you enjoyed reading this and had the opportunity to learn something new from this post. If you have any favorite shell functions that you use in your everyday workflow, I would love to see those in the comments. If you prefer not to comment, you can always send me an [email](mailto:muhammadraza0047@gmail.com).


<br>
_If you loved this post, you can always support my work by [buying me a coffee](https://www.buymeacoffee.com/mraza007). your support would mean the world to me! Also, if you end up sharing this on Twitter, definitely tag me [@muhammad_o7](https://twitter.com/muhammad_o7)._


**Note: If you like to be notified about the upcoming posts you can subscribe to the RSS or you can leave your email [here](https://forms.gle/M1EK61LLCxJ3iTiD7)**