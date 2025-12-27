---
layout: post
title: Enabling Wifi on Linux using CLI
description: "Quick fix for WiFi soft block on Linux using rfkill command. Unblock wireless when it's disabled by faulty software or kernel."
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
