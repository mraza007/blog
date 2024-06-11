---
layout: post
title: "Understanding HTTP Server by implementing in Python"
description: "In this post, we will understand how an HTTP server works by implementing one in Python."
keywords: "linux unix python programming http https"
tags: [python]
comments: true
---

I have been programming professionally for about three years now, and I have been using Python for about four years. I started learning Python back in my sophomore year of college, and since then, I have built web applications, performed data analysis, and written automation scripts, all using Python. As a curious mind, I have always wanted to learn how things work behind the scenes and potentially write about them to help others understand as well.

Anyways, In this blog post, I will be exploring how http servers work behind the scenes and then potentially building a simple http server in python.

An HTTP server is an important part of web architecture that processes requests from clients, typically web browsers, and delivers the requested resources back to them. This server facilitates the communication between the client and the server, ensuring that web pages, images, and other web resources are accessible over the internet.

Now understanding how an HTTP server works can beneficial for several reasons. First and foremost, It forms the backbone of web development, helping you create efficient, secure, and reliable web applications. By understanding the basics, it can help you learn more complex web development frameworks and technologies.

### Understanding the basics of an HTTP Server.

To simply understand how an HTTP server works, consider its following functionalities:

1. #### **<ins>Handling Requests</ins>**

The primary function of an HTTP server is to handle incoming HTTP requests from clients. Here's a breakdown of this process:
   
   1. **Listening for Requests:** The server constantly listens on a specific port (commonly port 80 for HTTP and port 443 for HTTPS) for incoming requests.
   2. **Receiving Requests:** When a client sends a request, the server receives it and parses the request, headers, and body. The request specifies the HTTP method (e.g., `GET`, `POST`), and the requested resource (e.g., `/index.html`).
   3. **Interpreting the Request:** The server interprets the request to determine what resource the client is asking for. This involves understanding the URL, the method used, and any parameters or data included in the request.

2. #### **<ins>Processing Requests</ins>**

Once the server has received and interpreted the request, it processes it accordingly:
   
   1. **Routing:** The server determines which resource or endpoint should handle the request. For static content like `HTML`, `CSS`, or images, this may involve simply retrieving a file from the server's file system. For dynamic content, this may involve invoking server-side scripts or applications (e.g., `PHP`, `Python`, `Node.js`) to generate the appropriate response.
   2. **Executing Server-Side Logic:** For dynamic requests, the server may need to run server-side code to generate the response. This can include querying a database, performing calculations, or interacting with other web services.
   3. **Handling Security:** The server often needs to handle security-related tasks, such as authentication and authorization, ensuring that only authorized users can access certain resources.

3. #### <ins>Sending Responses</ins>

After processing the request, the server sends an HTTP response back to the client. This response consists of several parts:

1. **Status Line:** The status line includes the HTTP version, a status code (e.g., 200 OK, 404 Not Found), and a status message. The status code indicates the result of the request, such as whether it was successful, if the resource was not found, or if there was a server error.
2. **Headers:** The response headers provide additional information about the response. Common headers include Content-Type (indicating the type of content, such as `text/html` or `application/json`), `Content-Length` (indicating the size of the response body), and Server (providing information about the server software).
3. **Body:** The body of the response contains the actual content being sent to the client. This can be an HTML document, an image, a JSON object, or any other type of web content.

#### Example Response

```shell
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 123
Server: Apache/2.4.1 (Unix)

<html>
<head>
   <title>Example</title>
</head>
<body>
   <h1>Hello, World!</h1>
</body>
</html>
```

Now that we have a solid understanding of how an `HTTP` server works, let's implement a simple `HTTP` server in `python`.

### Implementation in Python

Here's an implementation of our simple http server in [python](https://gist.github.com/mraza007/d0d9cfd07ed13390070633b9da1ce73c):

```
import socket

# Define server address and port
HOST, PORT = "", 8000

server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_socket.bind((HOST, PORT))
server_socket.listen(5)
print(f"Listening on port {PORT}")

while True:
    client_connection, client_address = server_socket.accept()
    request_data = client_connection.recv(1024)
    print(request_data.decode("utf-8"))
    response_body = """
    <html>
    <head><title>Hello</title></head>
    <body><h1>Hello, World!</h1></body>
    </html>
    """
    http_response = f"""
    HTTP/1.1 200 OK
    Content-Type: text/html; charset=UTF-8
    Content-Length: {len(response_body)}

    {response_body}
    """
    client_connection.sendall(http_response.encode("utf-8"))
    client_connection.close()
```

#### Lets breakdown the code.

```python
import socket
```

This line imports the socket module, which provides low-level networking interfaces for creating and managing network connections and this comes in python standard library.

- #### Define Server Address and Port

```python
# Define server address and port

HOST, PORT = "", 8000
```
  - `HOST` is set to an empty string, meaning the server will accept connections on all available network interfaces.
  - `PORT` is set to `8000`, specifying the port on which the server will listen for incoming connections.

- #### Creating Socket Object

```python
server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
```
  - This line creates a new socket object.
  - `socket.AF_INET `specifies the address family for IPv4.
  - `socket.SOCK_STREAM` specifies the socket type for TCP, which is a connection-oriented protocol.

- #### Bind the Socket to the Address and Port

```python
server_socket.bind((HOST, PORT))
```
 - The `bind` method associates the socket with the specified network interface and port as this prepares the socket to accept connections on this address and port.

- #### Listen for Incoming Connections

```python 
server_socket.listen(5)
print(f"Listening on port {PORT}")
```
- The listen method enables the server to accept incoming connections.
- The parameter 5 specifies the maximum number of queued connections.


- #### Understand Main Loop

```
while True:
    client_connection, client_address = server_socket.accept()
    request_data = client_connection.recv(1024)
    print(request_data.decode("utf-8"))
    response_body = """
    <html>
    <head><title>Hello</title></head>
    <body><h1>Hello, World!</h1></body>
    </html>
    """
    http_response = f"""
    HTTP/1.1 200 OK
    Content-Type: text/html; charset=UTF-8
    Content-Length: {len(response_body)}

    {response_body}
    """
    client_connection.sendall(http_response.encode("utf-8"))
    client_connection.close()
```

Now in the main loop, while true starts an infinite loop allowing the server to handle incoming connections.  `client_connection, client_address = server_socket.accept()` accepts a connection from a client and returns a new socket `client_connection` to communicate with the client and the client's address.

`request_data` receives data from the client, reading up to 1024 bytes. Last we define HTTP response body and header. Then send back to the client `client_connection.sendall(http_response.encode("utf-8"))` encoding the response from string to bytes. Lastly we close the connection. `client_connection.close()`


### Conclusion


Finally, I hope you enjoyed reading this and had the opportunity to learn about how an HTTP server works. If you have any feedback, please feel free to leave a comment below. If you prefer not to comment publicly, you can always send me an [email](mailto:muhammadraza0047@gmail.com).

Furthermore, you can improve this further, for example you can add more functionality when a request is made and a server looks for html file and sends back in response. 


**If loved reading this blog post and would love to learn more stuff like this I highly recommend you join [Code Crafters](https://app.codecrafters.io/join?via=mraza007). They have amazing new challenges such as helping you learn how to build docker, how to build your own shell and much more.**


---

#### Announcements

- I started a youtube channel a year ago, and if you want me to create video series about interesting stuff like this feel free to [subscribe](https://www.youtube.com/channel/UCC_OnjbHWxVNYjf4YsAdMdA) and let me know your opinion in this [anonymous survey](https://forms.gle/XpSt27hS84RFkW3A7)
- I am also open for Python Consulting as well, If you any interesting python project or even need advice regarding tech, you can always send an [email](mailto:muhammadraza0047@gmail.com)
- Lastly A huge thanks for reading this and supporting my work.


<br>
_If you loved this post, you can always support my work by [buying me a coffee](https://www.buymeacoffee.com/mraza007). your support would mean the world to me! Also, if you end up sharing this on X, definitely tag me [@muhammad_o7](https://twitter.com/muhammad_o7). Also follow me on [LinkedIn](https://www.linkedin.com/in/muhammad-raza-07/)_


**Note: If you like to be notified about the upcoming posts you can subscribe to the RSS or you can leave your email [here](https://forms.gle/M1EK61LLCxJ3iTiD7)**