---
layout: post
title: "Exploring Lesser-Known Commands and Advanced Features of Homebrew"
description: "Diving into the lesser-known commands and advanced features of Homebrew and how it can help you remain productive while using homebrew"
keywords: "unix bash sysadmin commandline apple homebrew packagemanagement macos"
tags: [macos]
comments: true
---


Over a year ago, I began extensively using macOS. I originally came from a Linux background, where I started my Linux journey with Ubuntu, primarily using the `apt` package manager, and later switching to `pacman`. However, after using macOS at my day job, I decided to purchase a Mac for myself. Since then, it has become my daily driver. Like many on macOS, I've chosen Homebrew as my preferred package manager for installing software. In this post, I will delve into some lesser-known commands and advanced features of Homebrew.

## What is Homebrew?

Homebrew, often referred to as `brew`, is a popular package manager for macOS and Linux operating systems. It provides a convenient way to install, update, and manage software packages and libraries on your system. Homebrew simplifies the process of installing and maintaining software by automating the downloading, compiling (if necessary), and installation of packages.

Homebrew is written in Ruby and uses Git for version control. It was created by Max Howell in 2009 and is currently maintained by a team of developers. Homebrew is open-source and distributed under the BSD 2-Clause License.


Here are some key features and aspects of Homebrew:

1. **Package Management:** Homebrew allows you to easily install a wide range of software packages, including command-line utilities, libraries, and applications, from a central repository.
2. **Dependency Management:** It automatically handles dependencies for you, ensuring that all required components are installed when you install a package.
3. **Casks:** In addition to command-line software, Homebrew Cask extends Homebrew's functionality to include GUI applications. This is especially useful for installing and updating graphical software.
4. **Taps:** Homebrew supports the concept of "taps," which are additional repositories maintained by the community or individuals. Taps allow you to access packages not found in the core Homebrew repository.
5. **Custom Formulas:** Users can create custom formulas (recipes) to install software that isn't in the main repository. This feature is handy for maintaining your own packages or adding packages from other sources.


## Homebrew Lesser Known Commands

In this section, I will be discussing some lesser-known commands and some of the advanced features of Homebrew. You can also find more information about these commands by running `brew help` or `man brew`.

1. Create a Formula for a Package

Did you know `brew create` command in `brew` allows you to create a new formula for a software package by specifying a URL to the package's source code. 

```bash
brew create <URL_to_source>
```

When you run this command it does the following:

- Downloads the source code from the specified URL.
- Generates a new formula file in Homebrew's formulae directory, typically named after the package, with a `.rb` extension.

This command is useful for adding packages to Homebrew that are not part of the official repository, allowing you to create and manage custom formulas for their preferred software packages.

2. Retrieving Package Information

```bash
brew info <package_name>
```

This command simply allows you to retrieve information about a package, including its version, dependencies, and installation path. It also displays the URL of the package's homepage and the formula file used to install it.

3. Listing Installed Packages

```bash
brew list 
``` 
This command allows you to list all installed packages on your system and you can also list cask by running `brew list --cask`.

4. Homebrew Interactive Shell Session

```bash
brew sh
```

This command allows you to start an interactive shell session with Homebrew. This is useful for testing out commands and experimenting with Homebrew's functionality. As the shell is isolated and it does not affect your system's global environment. It comes in pretty to test packages, or experiment with different configurations.

5. Brew Bundle Dump

```bash
brew bundle dump
```

This command is pretty handy as it allows you to dump all the installed packages into a Brewfile. This is useful when you want to share the list of packages you have installed with someone else or you want to install the same packages on another system.

6. `brew gist-logs <package_name>`

The brew gist-logs command in Homebrew is used to upload the logs for a specific formula (package) installation to a Gist on GitHub. This command is particularly helpful for debugging and troubleshooting Homebrew-related issues or for seeking assistance from the Homebrew community.


Last but not least here's a custom that I created which using brew to list all the packages with their sizes and display them in a human-readable format.

```bash
brewpackages (){
  brew list --formula | xargs -n1 -P8 -I {} \
    sh -c "brew info {} | egrep '[0-9]* files, ' | sed 's/^.*[0-9]* files, \(.*\)).*$/{} \1/'" | \
    sort -h -r -k2 - | column -t
}
```

Whether you're a seasoned Homebrew user or new to the world of package management, these commands and features can make your life easier and more productive. I hope you found this post useful and learned something new about Homebrew. If you have any questions or comments, feel free to leave them below. 


---

<br>
_If you loved this post, you can always support my work by [buying me a coffee](https://www.buymeacoffee.com/mraza007). your support would mean the world to me!. Also you can follow me on Twitter, and definitely tag me [@muhammad_o7](https://twitter.com/muhammad_o7). when you share this post on twitter_