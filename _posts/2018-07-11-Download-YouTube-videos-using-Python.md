---
layout: post
title: "Download YouTube videos using Python."
description: "Learn how to use Python to download YouTube Videos."
keywords: "pytube python videodownloader"
tags: [python]
comment: true
---
In this blog I am going to demonstrate how can we use Python to download 
Yotube videos.
* In order to get started make sure we have python installed in our laptop/PC but if you aren't sure you can always check by typing this command on your terminal.
```console
python3 --version
# This prompt the python3 version that is installed in your system.
```
* Since we have made sure that we have Python installed. Now we need to install python package manager pip so we can install dependencies.
```console
pip --version
#If pip isn't installed you can always install using this command
sudo apt-get install python3-pip
```
* After installing pip , we can get started by installing pipenv which is more like virtualenv. It allows you to keep track of your dependencies automatically since it creates .Pipfile that keeps track of your dependencies installed related to the project. In order to install pipenv we need to run this command. 
```console
pip3 install pipenv
```
* Once you install pipenv now create a new directory where you will keep your project files
```console
mkdir myproject
cd  myproject
```
* Now run this command to activate shell.This command will create a isolated python environment that will keep your project dependencies seperated from python packages installed in your laptop/pc.
```console
pipenv shell
```
* Once we install pipenv now we will be installing [Pytube](https://github.com/nficano/pytube) within our isolated environment.
```console
pipenv install pytube
```
* This command will install pytube within your environment. After installing pytube we can actually start building the script by creating a python file.
```console
touch app.py
```
* This command will create a python file and now lets begin writing the code in app.py file
```python
from pytube import Youtube as yt
# This will get the youtube video link from the user
video = input('Enter the link of the video you want to download')
# Now we can use that video link to see the available formats of the video
download_video = video.streams.first()
# In this case we will be using the first one but you can view other streams too using streams.all()
download_video.download()
#Withing .download() you can also specify the location where you want to download the video
```
* Now our script is complete. Lets save our script and run it.
```console
python3 app.py
```




Checkout my videodownloader script that was written using python and pytube by me and my friend [videodownloader](https://github.com/mraza007/videodownloader)

Follow me on [twitter](http://twitter.com/muhammad_o7) for more updates and feel free to dm if you have any questions. <3
