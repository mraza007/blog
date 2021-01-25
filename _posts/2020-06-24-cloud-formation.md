---
layout: post
title: AWS CloudFormation 
tags : [aws]
published: true
description: what cloudformation and how it works.
---

AWS Cloudformation is a service that helps us initiate aws resources using 
`json` or `yaml` files. It's know as `IaaS` (Infrastructure As A Service).

### Structure of the Document

- **AWS Template Format Version:** It contains the version of the file.
- **Description:** It basically the description of what the script will do written by the owner of the script. It's a string field.
- **MetaData:** This contains the properties of the templates.
- **Parameters:** Any values we pass to the templates 
- **Mappings:** Dependencies between our AWS resources.
- **Conditions:** we add these when stack is being created.
- **Outputs:** The outputs are the ones displayed when are stack is created.
- **Resources:** The AWS Resources we need to initiate. (The most important part)

### Example CloudFormation.

A simple CloudFormation script that initiates EC2 instances with SSH

```json
{
  "Description": "Create an EC2 instance by AWS CloudFormation",
  "Resources": {
    "SecurityGroupDemoSvrTraffic": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "GroupName": "ssh-group",
        "SecurityGroupIngress": [
          {
            "IpProtocol": "tcp",
            "FromPort": 22,
            "ToPort": 22,
            "CidrIp": "0.0.0.0/0",
            "Description": "For traffic from Internet"
          }
        ],
        "GroupDescription": "Security Group for demo server",
        "VpcId": "[Find you VpcId in VPC-->Subnets]"
      }
    },
    "EC2InstanceDemoSvr": {
      "Type": "AWS::EC2::Instance",
      "Properties": {
        "AvailabilityZone": "[Find you AvailabilityZone in VPC-->Subnets]",
        "ImageId": "[Find your ImageId in EC2-->Launch Instance-->Step1]",
        "InstanceType": "[Find your InstanceType in EC2-->Launch Instance-->Step2]",
        "KeyName": "[Find your KeyName in EC2-->Key Pairs]",
      }
    }
  }
}
```

### Starting Windows Machine using CloudFormation

```yaml
Description: "A simple script that starts Window EC2 instances on AWS Cloud"
Resources:
  WinInstance:
    Type: "AWS::EC2::Instance"
    Properties:
      SecurityGroups:
        - !Ref InstanceGroupSecurity
      InstanceType: # t1.micro
      KeyName: # Your key
      ImageId: ""
  InstanceGroupSecurity:
    Type: "AWS::EC2::SecurityGroup"
    Properties:
      GroupDescription: '' # Description
      SecurityGroupIngress:
        - IpProtocol: # Enter Protocol Like TCP
          FromPort: # RDP Port
          ToPort: 3389
          CidrIp: 0.0.0.0/0
```