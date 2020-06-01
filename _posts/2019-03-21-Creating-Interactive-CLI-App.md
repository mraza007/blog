---
layout: post
title: "Creating Interactive CLI App"
description: "In this post we will be using PyInquirer Library to create an interactive cli app."
keywords: "python cli apps commandling pyinquirer"
---

In this blog post I will be walking you through the process of writing an interactive commandline app using Python. I have been a huge fan commandline apps and I love to create commandline apps since it helps me remain productive and makes navigation a lot easier compared to GUIs.

Anyways we will be creating a simple commandline app that uses Yelp Api to find your favorite restaurant in your city.

### Let's Get Started
- In order to get started make sure you have `python3` installed.
- Now we will create a virtual enviroment using `pipenv` that will handle all our python dependencies.

```console
pipenv shell
```

If you don't have pipenv installed you can  [Click Here](https://pipenv.readthedocs.io/en/latest/)

- After activating the shell now we are going to install our packages. For this commandline app I will be using [PyInquirer](https://github.com/CITGuru/PyInquirer). Its a really cool package that helps you build interactive commandline apps.

```console
pipenv install PyInquirer
```

```console
pipenv install prompt_toolkit==1.0.14
```

- Once we have installed `PyInquirer` now we will be installing python implemetation of the yelp fusion api `pipenv install yelpapi`.
[YelpApi(Python Implementation)](https://github.com/gfairchild/yelpapi)

- Finally we have everything ready.

### Let's write the program.

```python
from __future__ import print_function, unicode_literals
import os
import emoji
from PyInquirer import style_from_dict, Token, prompt, Separator
from examples import custom_style_2
import json
from termcolor import colored
from yelpapi import YelpAPI
# Api key from Yelp Developers
api_key = os.environ['API_KEY']
## This allows you create prompts for the user.
questions = [
    {
        'type': 'input',
        'name': 'food',
        'message': emoji.emojize('What are you looking to eat ? :sushi:,:pizza:,:hamburger:'),


    },
    ## Allows you have a list of choices 
    ## Furthermore you can refer to the documentation.
    {
        'type': 'list',
        'name': 'city',
        'message': 'Choose your City',
        'choices': [
                "New York City",
                "Los Angeles",
                "Chicago",
                "Houston",
                "Philadelphia",
                "Phoenix",
                "San Antonio",
                "San Diego",
                "Dallas",
                "San Jose",
                "Austin",
                "Jacksonville",
                "San Francisco",
                "Indianapolis",
                "Columbus",
                "Fort Worth",
                "Charlotte",
                "Detroit",
                "El Paso",
                "Seattle ",
                "Denver ",
                "Washington",
                "Memphis",
                "Boston ",
                "Nashville-Davidson",
                "Baltimore",
                "Not Listed"
        ]
    },

]
## This will allow you get the results from Yelp Api based on user's input.
answers = prompt(questions, style=custom_style_2)
if answers['city'] == 'Not Listed':
    x = input("What\'s your city: ")
    search_results = yelp_api.search_query(
        term=answers['food'],
        location=answers['city'],
        sort_by='rating',
        limit=5)
    print('Here are few restaurants I found ')
    for nums in search_results['businesses']:
            print('Name : ' +
                  colored(nums['name'], 'white', attrs=['bold']) +
                  '\n' +
                  'Phone: ' +
                  colored(nums['phone'], 'green', attrs=['bold']) +
                  '\n' +
                  'Address: ' +
                  colored(nums['location']['address1'],'cyan',attrs=['bold']) +
                  '\n' +
                  colored('Yelp url: ','red',attrs=['bold']) +
                  nums['url']
                  )
else:
    search_results = yelp_api.search_query(
        term=answers['food'],
        location=answers['city'],
        sort_by='rating',
        limit=5)
    print('Here are few restaurants I found ')
    for nums in search_results['businesses']:
            print('Name : ' +
                  colored(nums['name'], 'white', attrs=['bold']) +
                  '\n' +
                  'Phone: ' +
                  colored(nums['phone'], 'green', attrs=['bold']) +
                  '\n' +
                  'Address: ' +
                  colored(nums['location']['address1'],'cyan',attrs=['bold']) +
                  '\n' +
                  colored('Yelp url: ','red',attrs=['bold']) +
                  nums['url']
)
```

* Lastly in order to run this program we need to obtain api keys from [Yelp Developers](https://www.yelp.com/developers).
* Once you have the api keys now you need to export those keys `export API_KEY=XXXXXXX`
* Now you are all set and Guess what you wrote your first interactive CLI App.


Anyways this was my first blog post after a really long time as I was busy with school.

I hope you enjoyed this post and if you think i missed any thing feel free to dm me on [twitter](https://twitter.com/) 
Feel to share it among your friends and colleagues.


Feel to share it among your friends and colleagues.

#### [Source Code](https://github.com/mraza007/yelp-cli)
