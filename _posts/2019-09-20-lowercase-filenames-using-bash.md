---
layout: post
title: "A script that allows you lowercase file names"
tags : [linux]
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
