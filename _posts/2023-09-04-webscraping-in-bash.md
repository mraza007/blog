---
layout: post
title: "WebScraping in Bash"
description: "Explore web scraping using Bash and CLI tools for efficient data extraction"
keywords: "unix bash sysadmin commandline awk sed webscraping"
tags: [bash]
comments: true
---


In the realm of web scraping, Python often takes the spotlight with robust libraries such as BeautifulSoup and Scrapy. But did you know that web scraping can also be accomplished using Bash scripting? In this blog post, we'll delve into a Bash script that extracts links and titles from a webpage and stores them in a CSV file.

Spending most of my workday in the terminal, I've become intimately familiar with writing Bash automation scripts. However, to add a creative twist, I ventured into the world of web scraping using Bash. While Bash excels at scripting, I discovered its hidden talents in web scraping, which I'm excited to share in this blog post.

## The Bash Script

```bash
#!/bin/bash

# Define the URL to scrape
base_url="https://lite.cnn.com"
url="https://lite.cnn.com/"

# Create a CSV file and add a header
echo "Link,Title" > cnn_links.csv

# Extract links and titles and save them to the CSV file
link_array=($(curl -s "$url" | awk -F 'href="' '/<a/{gsub(/".*/, "", $2); print $2}'))

for link in "${link_array[@]}"; do
    full_link="${base_url}${link}"
    title=$(curl -s "$full_link" | grep -o '<title[^>]*>[^<]*</title>' | sed -e 's/<title>//g' -e 's/<\/title>//g')
    echo "\"$full_link\",\"$title\"" >> cnn_links.csv
done

echo "Scraping and CSV creation complete. Links and titles saved to 'cnn_links.csv'."

```

## How it Works?

This Bash script accomplishes the following:

1. It defines the base URL and the URL of the webpage you want to scrape.
2. It creates a CSV file named `cnn_links.csv` with a header row containing "Link" and "Title" columns.
3. Using `curl`, it fetches the HTML content of the specified webpage and extracts all the links found within anchor tags `(<a>)` using `awk`.
4. It then iterates through the array of links and extracts the page titles by making additional `curl` requests to each link.
5. Finally, it appends the extracted links and titles to the CSV file in the desired format.

### Breaking it down further

1. `grep -o '<title[^>]*>[^<]*</title>'` extracts the page title from the HTML content using regular expressions.:
   1. `-o` option tells grep to only output the matched part of the input text.
   2. `<title[^>]*>` matches the opening `<title>` tag and any attributes `(e.g., <title attribute="value">)`, if present.
   3. `[^<]*` matches any characters that are not < (i.e., the text within the `<title>` tag).
`</title>` matches the closing `</title>` tag.
   4. `</title>` matches the closing `</title>` tag.
2. `sed -e 's/<title>//g' -e 's/<\/title>//g'` removes the `<title>` and `</title>` tags from the extracted title.`:
   1. `-e `option allows specifying multiple commands to be executed by `sed.`
   2. `'s/<title>//g'` is a sed command that replaces all occurrences of `<title> `with an empty string (i.e., removes the opening `<title>` tag).
   3. `'s/<\/title>//g'` is another sed command that replaces all occurrences of `</title>` with an empty string (i.e., removes the closing `</title>` tag).

Combining these commands:

1. `grep` extracts the text within the `<title>` and `</title>` tags.
2. `sed ` then removes the tags themselves, leaving only the text content of the title.


This command also uses `awk` to extract URLs from an HTML document. Let's break it down step by step:

1. `awk -F 'href="'`:
   - `awk` is a text processing tool that operates on text files or input streams.
   - `-F 'href="'` sets the field separator to `'href="'`. This means `awk` will treat `'href="'` as the delimiter for splitting input lines into fields.

2. `'/<a/{gsub(/".*/, "", $2); print $2}'`:
   - `/<a/` is a pattern that specifies a condition: lines containing `<a>`. This ensures that the following actions are only applied to lines containing anchor tags.
   - `gsub(/".*/, "", $2)` is an `awk` function that globally substitutes (`gsub`) everything from the first double quote (`"`) to the end of the field (`$2`) with an empty string. In this case, it effectively removes the opening `"`, and the result is the URL.
   - `print $2` prints the modified field (the extracted URL).

So, this `awk` command looks for lines containing anchor tags (`<a>`) and extracts the URLs by removing everything before the first double quote (`"`) in the `href` attribute. The extracted URLs are then printed as output.


## Conclusion

So here's a simple web scraper written in bash and uses cli tools such as `awk`, `sed` , `grep` and `curl`. As bash is available on most Linux system so it can be useful for scraping data from web pages without having to install any additional software. However, it is not as powerful as Python or other programming languages when it comes to web scraping. But it can be useful for simple tasks such as extracting links and titles from a webpage and I would not recommend using it for complex web scraping task. 

Anyways this was a fun little script I created while learning about bash scripting and using cli tools such as `awk` , `grep` , `sed` and `curl`. I would still consider myself a beginner at this. 


Lastly I hope you enjoyed reading this and got a chance to learn something new from this post and if you have any bash tips or used bash for similar task feel free to comment below as I would love to hear it.


<br>
_If you loved this post, you can always support my work by [buying me a coffee](https://www.buymeacoffee.com/mraza007). your support would mean the world to me!. Also you can follow me on Twitter, and definitely tag me [@muhammad_o7](https://twitter.com/muhammad_o7). when you share this post on twitter_
