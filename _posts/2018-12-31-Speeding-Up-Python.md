---
layout: post
title: "Speeding Up Python"
description: "In this post I talk about using pypy while comparing it to compiled languages such as c++ and c "
keywords: "pypy c"
published: false
---





Python is slow compared to other languages. Do you think so? If yes then I think today after reading this it might change your perspective about Python. In this post, I am going to prove Python is not slow by introducing **PyPy**. If you haven't heard about PyPy. Don't worry! I explain you What's PyPy and how it can speed up your Python code.


_"If you want your code to run faster, you should probably just use PyPy. — Guido van Rossum (creator of Python)"_

### So What's is PyPy? 
According to the [PyPy Website](https://www.pypy.org/), PyPy is a fast, compliant alternative implementation of the Python Language and It speeds up the performance of your code bringing closer to Clang As I am going prove in this post.

So PyPy is comprised of two pieces.

1. An Interpreter
2. A translator.

The interpreter is written in RPython(Restricted Python) and that is statically typed which makes it easier to compile into more efficient code and then that code is translated into low-level language like CLang. But the speed is achieved through JIT(Just In Time Compiler). In simpler terms, JIT works like a typical compiler but its more efficient. As JIT compiles source code into machine code on call which results in faster translation of the code you need.
It also monitors and optimizes while it runs. Therefore they are able to refine frequently used instructions and make them run better in future. Thus JIT helps reduce CPU workloads.


On the other hand, when we use a typical compiler like GCC it directly compiles source into executable machine code.
This can also cause problems since JIT compiles when the code is called by the machine and if there's something wrong with that code it will prompt an error which makes it easier to debug but on the other hand when we use a typical compiler it will compile the source code right away even if there's something wrong with our code. Therefore when we run that code it will cause an error during runtime and that makes hard to debug.


Now I am going to prove you that PyPy can help speed up python code. Therefore I decided to square 1 million numbers and then used `time` command to measure the time it took to calculate.


- **Real** or **total** or elapsed (wall clock time) is the time from start to finish of the call. 
- **user** - the amount of CPU time spent in user mode.
- **sys** - the amount of CPU time spent in kernel mode.


### Regular Python 
![Python](https://i.imgur.com/1tihj7Z.png)

### PyPy 
```bash
pypy3 index.py  2.56s user 2.11s system 17% cpu 26.279 total
```

## Clang
![clang](http://i63.tinypic.com/1671d2o.jpg)

## CPP
```bash
./a.out  0.77s user 2.20s system 11% cpu 25.804 total

```

As you can see the results `C` was the winner but did you realize `PyPy` came closer to `CLang`' while beating `C++`. So, therefore, it proves `PyPy` can speed up Python's performance but if you are trying to write software that is totally dependant on speed then `Clang` will be a great choice but you can also try other new languages such as `Rust` that offer new features that are missing in older languages like `C`

**Note**: Integer overflow occurred while calculating squares of one million numbers.

I hope you enjoyed this post if you think I missed anything feel free to comment below.
##### Code 
- [C code]("https://gist.github.com/mraza007/3d92f1d51f315568655385e2f5313812")
- [C++ Code](https://gist.github.com/mraza007/029f90cf278eea87efe1bbfccb15043a)
- [Python Code](https://gist.github.com/mraza007/a0965fc39ad5649943bcc039911bc083)

Feel to share it among your friends and colleagues.

Signup for my mailing list I will be writing 2 articles every week on technology/programming [Signup](https://goo.gl/forms/sU77GoGVOTiYqSUu2)
