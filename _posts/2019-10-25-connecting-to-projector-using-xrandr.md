---
layout: post
title: Connecting to Projector using XRANDR
description: "How to connect to an external monitor or projector on Linux using xrandr command line utility with auto-scaling resolution."
tags : [linux]
---

`XRANDR` is a commandline utility that allows you to connect to an external monitor or projector. I use this utility since I don't have any access to gui that allows me to connect to project so I have us `xrandr` to connect to projectors.

```console
xrandr
```

- This command will list all the connected displays once we have a connected display then we can connect to it using `xrandr`

```console
xrandr --output DPI --auto
```

- `--auto` auto scale the resolution or you can use your own resolution that is supported by the monitor or projector. 

```console
xrandr --output DP1 --mode 1920x1080
```

For custom resolution.
