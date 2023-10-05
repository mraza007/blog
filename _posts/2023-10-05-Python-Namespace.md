---
layout: post
title: "Understanding Python Variables: Namespaces and Variable Scope"
description: "A comprehensive guide on namespaces and variable scope. Dive deep into the LEGB rule, understand the importance of the global and nonlocal"
keywords: "python legb rule namespace local global variable"
tags: [python]
comments: true
---

I have been using Python extensively throughout my career. I wanted to write this post to provide an understanding of Namespaces and Variable Scope. Like most programming languages, Python offers a structured way to store and access data through variables. However, understanding where and how these variables exist and interact can sometimes be complicated. This post will help you grasp the fundamental concepts related to Python variables: `namespaces` and `variable scope`.

## What is a Namespace?

In computer programming, and more explicitly in Python, understanding the concept of a namespace is pivotal to managing variable references and ensuring code clarity. At its core, a namespace serves as a fundamental structure, encapsulating and organizing identifiers to avoid potential naming conflicts.

In the simplest terms, a namespace is a container that holds a collection of identifiers. These identifiers can be variable names, function names, class names, and more. Each of these identifiers is associated with specific objects (values) in memory. Think of it as a dictionary where the keys represent variable names (or other identifiers) and the values correspond to the actual objects or references in memory

**Unique Naming System:** Namespaces ensure that there is no ambiguity in the naming system. For instance, you can have a function named calculate in one namespace and another function with the same name in a different namespace without any conflict.

**Lifetime of a Namespace:** The existence of a namespace is dependent on the scope of the objects. If the scope of an object ends, the namespace might also get deleted, and thus all the names defined in that namespace will be made unbound.


## Types of Namespaces

Python has various namespaces, created and deleted at different times:

1. **Built-in Namespace:** Contains Python's built-in functions and exceptions. Created when the Python interpreter starts up.
2. **Global (Module) Namespace:** Specific to a module or script. Created when the module is imported or the script is run.
3. **Enclosing (Function) Namespace:** Exists for nested functions. It chains multiple function namespaces from innermost to outermost.
4. **Local Namespace:** Created when a function is called. Once the function execution completes, the namespace is discarded.

## Variable Scope

Scope defines the region of the code where a variable can be accessed or modified. Python has four primary variable scopes:

1. **Local (L):** Inside the current function.
2. **Enclosing (E):** Inside enclosing functions.
3. **Global (G):** At the top level of the module.
4. **Built-in (B):** In the built-in namespace.

These scopes form the LEGB rule, which Python follows when resolving variable names.


## Understanding Scope with Examples

```python
x = 10  # global variable

def outer_function():
    y = 5  # enclosing variable
    
    def inner_function():
        z = 3 # local var
        
        print(x, y, z)
    
    inner_function()

outer_function()
```

When `inner_function` is called, it accesses:

- `z` from its local scope.
- `y` from the enclosing scope of `outer_function`.
- `x` from the global scope.

### The `global` and `nonlocal` Keywords

To modify global or enclosing variables within a function, Python provides the `global` and `nonlocal` keywords:

```python
x = 10

def modify_global():
    global x
    x = 20

def outer_function():
    y = 5
    
    def modify_enclosing():
        nonlocal y
        y = 15
    
    modify_enclosing()
    print(y)

modify_global()
outer_function()
print(x)
```

This code will output

```shell
15
20
```


The `global` keyword tells Python we're referring to the global `x`, and the `nonlocal` keyword indicates we're targeting the `y` from the enclosing function.

### Avoid Variable Shadowing

If a local variable shares the same name as a global variable or a built-in, it shadows the global or built-in variable:

```python
x = 10

def shadow_example():
    x = 5
    print(x)

shadow_example()  # Outputs: 5
print(x)  # Outputs: 10
```


Shadowing can lead to unexpected behaviors, so it's recommended to avoid using the same names across different scopes.


## Conclusion 

Namespaces and variable scope form the bedrock of how Python manages and accesses data. By understanding these concepts, you can write clearer, more predictable code and avoid common pitfalls. Remember the LEGB rule, be cautious of shadowing, and use the `global` and `nonlocal` keywords judiciously to maintain clean and efficient code.

Happy Coding!

---


<br>
_If you loved this post, you can always support my work by [buying me a coffee](https://www.buymeacoffee.com/mraza007). your support would mean the world to me! Also, if you end up sharing this on Twitter, definitely tag me [@muhammad_o7](https://twitter.com/muhammad_o7)._


You can now also book 30 min call with me [here](https://calendly.com/mraza007/30min). I would love to talk to you or if you have any Open Source project you would like me to contribute to.

**Note: If you like to be notified about the upcoming posts you can subscribe to the RSS or you can leave your email [here](https://forms.gle/M1EK61LLCxJ3iTiD7)**