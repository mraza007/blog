---
layout: post
title: "My Favorites Pandas Tricks"
tags : [python]
---

In this post I will be writing about my favorite tricks about pandas that I use when doing some data analysis.

- Finding unique values 

```python
import pandas as pd
data = pd.read_csv('https://gist.githubusercontent.com/tiangechen/b68782efa49a16edaf07dc2cdaa855ea/raw/0c794a9717f18b094eabab2cd6a6b9a226903577/movies.csv')
data.Film.unique()
```

This will print only unique values in `Film` column in the csv.

- Filtering Data

Lets say in the dataset you are only looking for movies that had audience score above 50 and were comedy only. You can use filtering in this case which is really useful.

```python
new_data = (data.Audience score % > 50) & (data.Genre == 'Comedy')
```

- Saving to `csv`.

Pandas have a function that allows you to save data to csv file.
For instance in order to save all the unique movie names we have to convert it to a data frame

```python
uniq = data.Film.unique()
out = pd.DataFrame(uniq)
out.to_csv('uniq.csv')
```

This will create a csv file of unique names.

- `Groupby`

This allows us to group data into groups. For instance if we want to look at the count of movies according genre we can use `groupby`.

```python
data.groupby('Genre').Film.agg(['count'])
```

This will out put the total numbers of movies for each genre. You can also use other parameters like `sum` , `mean` and `median`.

- String Operations

You can also use string operations when working with text data.

```python
lower case a specific column

data['Genre'] = data['Genre'].str.lower()

```

This will lowercase your `Genre` column in the data. you can also use `upper()` for uppercase and you can also apply your own regex by using `replace`.


Anyways these were my favorite things about pandas and I hope you enjoyed reading it. Let me know in the comments what's your favorite thing about pandas.
