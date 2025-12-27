---
layout: post
title: Databases (AWS Services)
description: "Overview of AWS database services including RDS, DynamoDB, RedShift, and purpose-built databases like QLDB and DocumentDB with use cases for each."
tags : [aws]
published: true
---

## Database services that `AWS` offers
- `RDS` -> Relation Database Service
- Key/Value -> Amazon DynamoDB
- RedShift for Data Warehouses
- Purpose Built Solutions such as `QLDB`,`DocumentDB`

### RDS 
Relational Database Service is good for data when its relational.
Amazon offers `Aurora` and you can also use other services such as `Postgres`,`MySQL`,`Oracle` and `MariaDB`. Its good for transactions that are **ACID**(Atomic Consistency Isolation and Durability) and features needed such as referential integrity.
Its also good when data structures are static and unchanging. RDS also supports `Read Replicas` which means you don't have query the live database instead you can query read replicas for the data. This helps offset load from primary DB.

### Key/Value Store.(NoSQL DB)
As Amazon AWS offers `DynamoDB` as there key value store. These databases are redundant and consistent.
It helps you process large amounts of data and consitent flow of read/write operations for various cases such as online shopping carts,online gaming where keeping the user session is important.
Futhermore, It automatically spread data & traffic for tables across servers to handle throughput while maintaining consistency and fast performance.
Its very good for low latency and `DynamoDB` supports DAX known as _DynamoDB Accelaration_ as this supports in memory cache for items frequently requested.

### RedShift
It's used as data warehouse as it stores data in columns. It's good for analytics and also uses `AQUA` (Advance Query Accelarator).
`AQUA` -> Hardware Accelarated cache that does a substantial share of data processing in place of cache enabling RedShift 10x faster.

### Purpose Built DBs
- `QLDB` A fully managed ledger database. Its good for keeping track of financial changes/records.
- `Amazon DocumentDB` MongoDB version, It stores JSON documents.
- `Amazon Neptune` Its a fully managed graph database.
- `Amazon Keyspaces` Basically Apache Cassandra. [Readmore](https://aws.amazon.com/keyspaces/)

## Database Migrations.
There are two types of migrations.
- Like to Like also known as Homogenous (MySQL to MySQL)
- Like to Unlike also known as Hetrogenous (MySQL to Postgres)
- In order to perform migration `AWS` offers **DMS**(Data Migration Service). 
- Like to Unlike uses SCT(Schema Conversion Tool) when migrating the database before using `DMS`
