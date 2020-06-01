---
layout: post
title: "Visualizing Stocks"
description: "In this post we explore Plotly Library and how we can use it to visualize vast amount of data. I will be demonstrating how to visualizing stocks"
keywords: "plotly python stocks finance"
---



Understanding stocks can be hard but In this post, we will be visualizing stocks with the help of `Plotly`(a visualization Library). As we all know Python is really powerful when it comes to handling data. Therefore we will be using modules such as `Pandas` to handle our CSV files and `Plotly` to visualize our data.

#### In order to begin we need to install a few libraries
- Install `Anaconda` Distribution. (This contains all data science related packages/modules) [Installion Link](https://www.anaconda.com/download/#linux).
- Install `Plotly` (This is not included in Anaconda) `pip install plotly`.

If you don't want to install `Anaconda`. You can install the packages you need by following these instructions.

- Install Pandas `pip install pandas`.
- Install Jupyter Notebook `python3 -m pip install jupyter`.
- Install `Plotly` `pip install plotly`.

## Lets Begin
- First, let start jupyter notebook by running the following command 
`jupyter-notebook`.
- Now we have the `jupyter-notebook` running. We will be importing libraries.

```python
import pandas as pd 
# importing Plotly
import plotly.plotly
import plotly.graph_objs as go
```

- Turning on offline mode for `Plotly`

```python
plotly.offline.init_notebook_mode(connected=True)
```


- Lets download stocks data (It can be found on [Yahoo Finance](https://finance.yahoo.com/) Search for your favourite stock). I will be using 
AAPL.


- Now I will be reading stocks csv using pandas.

```python
# read_csv allows us to read csv files
data = pd.read_csv('AAPL.csv')
# few pandas operations.

#This will display first few cells of the CSV files we can always specify how many cells we need by passing a number within those parenthesis data.head(10)
data.head()

# This will tell how many rows and columns are there in our CSV file.
data.shape

# This will describe our data by giving us information like mean, max, min, std and etc
data.describe()
```

- Selecting specific columns using `pandas` to plot them 

```python
# Selecting a specific column from csv file. Note brackets should contain exact name from the csv file.
dates = data['Date']
high = data['High']
```

- Plotting the data using `Plotly`

```python
plotly.offline.iplot({
    "data": [go.Scatter(x=dates ,y=high)],
    "layout": go.Layout(title="AAPL Stocks")
})
```


##### Output


![Imgur](https://imgur.com/61rF9vO.png)


And now you have the stocks data represented using Line Graph.

I hope you enjoyed this post if you think i missed any thing feel free to dm me on [twitter](https://twitter.com/) 
Feel to share it among your friends and colleagues.



##### Important Links 

- [Pandas CheatSheet](https://s3.amazonaws.com/assets.datacamp.com/blog_assets/PandasPythonForDataScience.pdf)
- [Plotly Docs](https://plot.ly/python/getting-started/#jupyter-setup)
- [Code](https://github.com/mraza007/stocks)


