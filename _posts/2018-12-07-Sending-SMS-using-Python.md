---
layout: post
title: "Sending SMS using Python"
description: "In this post we explore the capabilites of SMTPLIB library and how can use that to send sms to our phones"
keywords: "sms python notwilio smtplib"
---


Whenever we talk about sending an SMS to our phone using any programming language the first thing that comes into our head is Twilio SMS library.But in this post we are going to avoid twilio and use python builtin module `SMTPLIB` I know it sounds crazy since `SMTPLIB` is used to send emails but we can also send text messages using that module. In order to send text message to your phone all you need to know is sms-gateway. So every carrier has their own sms-gateways and you can read more about it here [SMS GATEWAYS](https://en.wikipedia.org/wiki/SMS_gateway).

### SMS Gateways for each Carrier

- AT&T: [number]@txt.att.net
- Sprint: [number]@messaging.sprintpcs.com or [number]@pm.sprint.com
- T-Mobile: [number]@tmomail.net
- Verizon: [number]@vtext.com
- Boost Mobile: [number]@myboostmobile.com
- Cricket: [number]@sms.mycricket.com
- Metro PCS: [number]@mymetropcs.com
- Tracfone: [number]@mmst5.tracfone.com
- U.S. Cellular: [number]@email.uscc.net
- Virgin Mobile: [number]@vmobl.com

## So lets begin writing the script
- First we need to import smtplib and MIME module that will help us structure our message by the you can read more about MIME here [Multipurpose Internet Mail Extensions (MIME)](https://en.wikipedia.org/wiki/MIME)


```python
import smtplib 
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

email = "Your Email"
pas = "Your Pass"

sms_gateway = 'number@tmomail.net'
# The server we use to send emails in our case it will be gmail but every email provider has a different smtp 
# and port is also provided by the email provider.
smtp = "smtp.gmail.com" 
port = 587
# This will start our email server
server = smtplib.SMTP(smtp,port)
# Starting the server
server.starttls()
# Now we need to login
server.login(email,pas)

# Now we use the MIME module to structure our message.
msg = MIMEMultipart()
msg['From'] = email
msg['To'] = sms_gateway
# Make sure you add a new line in the subject
msg['Subject'] = "You can insert anything\n"
# Make sure you also add new lines to your body
body = "You can insert message here\n"
# and then attach that body furthermore you can also send html content.
msg.attach(MIMEText(body, 'plain'))

sms = msg.as_string()

server.sendmail(email,sms_gateway,sms)

# lastly quit the server
server.quit()
```


So this was our simple python script that will allow you to send text messages to your phone. I hope you enjoyed this post if you think i missed any thing feel free to dm me on [twitter](https://twitter.com/)

Furthermore, here's the python module that I wrote that allows you to send text messages without twilio.
[termtext](https://github.com/mraza007/terminal-text)
