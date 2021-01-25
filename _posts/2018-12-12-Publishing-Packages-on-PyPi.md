---
layout: post
title: "Publishing Packages on PyPi"
description: "In this post we learn how to publish python packages on PyPi"
keywords: "PyPi python python3 github opensource"
tags: [python]
---



As an Intermediate/Beginner Python developer you always wondered how to publish
your own python packages so you can share it with your friends and colleagues.
In this post I will be walk you through the process of publish your own packages
on [PyPi](https://pypi.org/).

#### So What's PyPi ?
PyPi is Python Package Index. It's more like npm or homebrew  where you can find different
packages such as Flask,Django,Tweepy and much more. Most of the packages are open sourced 
and PyPi is itself open source and maintained by developers in there free time and that 
makes PyPi great.

#### Lets begin writing our first Package.
This is going to be a simple python package that will calculate square and cube of a number passed as a commandline arguement.

In order to get started we need.
  - Python installed
  - `pip install twine` this will allow us to connect to pypi and publish our package.
  - `pip install docopt` this package will parse our arguements passed as commandline arguements.
 
Lets begin writing code.



~~~~~~~~
"""calc

Usage:
    calc.py square <num>
    calc.py cube  <num>
    calc.py (-h | --help)

Options:
    -h --help     Show this screen.

"""
from docopt import docopt 


def square(num):
  print(num**2) 

def cube(num):
  print(num**3)


if __name__ == '__main__':                                                                                                                              
  arguments = docopt(__doc__)
  if arguments['square']:
    square(int(arguments['<num>']))
  elif arguments['cube']:
    cube(int(arguments['<num>']))
~~~~~~~~


- so after writing our simple package we need to create a file named 
`setup.py`. This file will allow us to install package and it is going to be used by PyPi.
- Furthermore, We need to create a README file that will contain instructions regarding installion and usage of the package.

- This is how our setup.py file is going to look like and this will contain details regarding our package.


```python

import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="Calculator",
    version="0.0.1",
    author="Your Name",
    author_email="Your Email",
    description="Description regarding the package",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="Project_url",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)

```


- After creating a `setup.py` now we will run this command to generate our package `.tar` file.

 

```bash
python3 setup.py sdist

```


- This is going to create a folder named `dist/` which will contain our package and now we will upload our package using twine.


```bash
twine upload dist/
# This will prompt username and password for pypi
```


## Finally you have published your first PyPi Package.

I hope you enjoyed this post if you think i missed any thing feel free to dm me on [twitter](https://twitter.com/) 
Feel to share it among your friends and colleagues.