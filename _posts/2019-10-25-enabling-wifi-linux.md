---
layout: post
title: Enabling Wifi on Linux using CLI
tags : [linux]
---

When wifi has a soft block due to some faulty software or kernal it can be enabled using `rfkill`

 ```console
 rfkill list 
 ```

- To list and then unblock the wifi using the following command.

```console
sudo rfkill unblock wifi
```
