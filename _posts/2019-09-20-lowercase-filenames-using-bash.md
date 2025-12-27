---
layout: post
title: "Bash Script to Lowercase Filenames"
description: "Simple bash script to convert all filenames in a directory to lowercase using tr command. Useful for organizing files."
tags : [linux, bash]
---

A simple script that allows you turn all the files names to lowercase

```bash
  for x in `ls`
  do
    if [ ! -f $x ]; then
      continue
    fi
    lc=`echo $x  | tr '[A-Z]' '[a-z]'`
    if [ $lc != $x ]; then
      mv -i $x $lc
    fi
  done
```
