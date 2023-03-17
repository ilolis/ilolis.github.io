"use strict";(self.webpackChunkmy_blog=self.webpackChunkmy_blog||[]).push([[450],{6029:e=>{e.exports=JSON.parse('{"blogPosts":[{"id":"redis-durability","metadata":{"permalink":"/redis-durability","editUrl":"https://github.com/ilolis/my-blog/tree/main/blog/2023-02-15-redis-durability.md","source":"@site/blog/2023-02-15-redis-durability.md","title":"Redis Durability","description":"Redis Fundamentals","date":"2023-02-15T00:00:00.000Z","formattedDate":"February 15, 2023","tags":[{"label":"hola","permalink":"/tags/hola"},{"label":"welcome","permalink":"/tags/welcome"}],"readingTime":7.38,"hasTruncateMarker":false,"authors":[{"name":"Ilias Lolis","title":"Software Engineer","url":"https://github.com/ilolis","imageURL":"https://github.com/ilolis.png","key":"ilolis"}],"frontMatter":{"slug":"redis-durability","title":"Redis Durability","authors":"ilolis","tags":["hola","welcome"]},"nextItem":{"title":"Welcome To My Blog!","permalink":"/welcome-to-my-blog"}},"content":"### Redis Fundamentals\\nRedis is a high-performance, distributed, in-memory data store that can be used as a database, cache or message broker. It is an open-source, NoSQL database that is designed to deliver high performance and low latency access to data. The core difference between Redis and a traditional database such as Postgres, MySQL and DynamoDB is that Redis stores data in memory and not in disk, a *feature* that gives Redis ultra fast response times.\\n\\nHowever, the approach of storing data in-memory can be prone to data loss in the event of a system crash or power failure. In contrast, storing data persistently on disk provides durability, but at the cost of slower access times due to disk I/O. In this article, we will discuss methods for configuring Redis to be more resilient, as an out-of-the-box configuration of Redis could result in complete data loss if your Redis instance crashes.\\n\\nThere exist several methods to safeguard against a data loss. However, it is commonly misunderstood that enabling replication in Redis suffices to solve this problem. Yet, this notion does not always hold true. Prior to exploring the various options available for ensuring the durability of Redis as a database, let\'s first examine how Redis replication works.\\n\\n### Redis Replication\\n\\nRedis provides a replication mechanism that allows it to withstand a node failure increasing the availability and the throughput of the system. The default replication strategy of Redis is based on a master-replica model, where one Redis instance acts as the master and one or more Redis instances act as replicas. The master continuously sends commands and data to its replicas, which replicate the master\'s data in near real-time. When a write operation occurs on the master, the operation is first written to the master\'s in-memory database, and then transmitted **asynchronously** to all the connected replicas. The replicas then execute the same operation in their own databases, which allows them to maintain a copy of the master\'s data and being in-sync. \\n\\nIn case of a master node failure, Redis supports automatic failover, where a replica can be promoted to a master. Redis achieves this by monitoring the health of nodes and by initiating a failover if necessary. When Redis detects that the master is down, it selects one replica to promote to master and reconfigures the other replicas to replicate from the new master. This process is designed to be automatic and fast, allowing for minimal downtime in the event of a master failure.\\n\\n\\n#### The catch\\nThe catch in the above strategy is the fact that the replication of the data between the master and the replica happens asynchronously. This means that when a client issues a write command to a Redis master, the master will acknowledge the write operation and then asynchronously update the replicas. If the master crashes after sending the acknowledgement to the client but **before** sending the write command to the replicas, the failover mechanism will be triggered and a slave will be promoted to a master, **without** including the latest write command!\\n\\n\\n### How to mitigate\\n#### Option 1: Use `WAIT N T` \\nThe `WAIT N T` command instructs the master to replicate the write request to at least `N` replicas and for a maximum of `T` milliseconds before acknowledging the write request to the client. \\n\\nIn this scenario, if `N` equals to the number of replicas, then the write operation will only be considered complete when all replicas have received the write and acknowledge it. This approach ensures that all replicas get the write command and in case of a failover all of the replicas will be in-sync with the master, so that no-data will be lost.\\n\\nIf the N parameter in the `WAIT` command is set to a value less than the total number of replicas, then the write operation will only be applied to `N` replicas, and not all replicas in the system will have the latest write. If a replica that did not receive the latest write is promoted to a master during a failover the latest write will be lost. Therefore, it\'s important to set the `N` parameter to a value that is equal to the number of replicas to ensure that all replicas receive the latest write and to prevent data loss.\\n\\n\\n\\nHowever, it\'s important to note that this approach comes with significant performance  trade-off. Waiting for all your replicas to acknowledge a write operation can result in increased latency and reduced throughput, especially when your application is read-heavy requiring many replicas. \\n\\n#### Option 2: Make Redis a persistence database\\nSince Redis stores all of your data in-memory, you should be aware that in the above solution, if the master and all of the replicas fail due to hardware issues, you will lose your data permanently. To make your Redis durable, you can configure Redis to dump your data to durable storage such as an SSD or an HDD. \\n\\nRedis provides two mechanisms for persistence: RDB (Redis Database) and AOF (Append Only File). RDB persistence is a point-in-time snapshot of the entire Redis dataset. It works by periodically saving the dataset to disk as a binary file. This binary file can be used to restore the dataset in case of a Redis restart. RDB persistence is suitable for scenarios where you can afford to lose some data since the persistence is performed at a specific interval (for example every `n` seconds). This method does not cause any significant response latency for the write commands, since saving the dataset to the disk happens asynchronously, but it does not guarantee that the dumped dataset will contain all of the write operations. \\n\\nAOF persistence, on the other hand, logs all the write operations to a file. The AOF file contains a sequence of write operations that can be replayed to reconstruct the dataset. AOF persistence is suitable for scenarios where you cannot afford to lose any data, as it logs every write operation before acknowledging it to the client. \\n\\nAlthough writing your dataset to disk provides protection in the event of Redis failure, it also has a significant disadvantage: increased latency and reduced throughput. However, it\'s important to keep in mind that Redis is primarily an in-memory database, so enabling the AOF (Append-Only File) functionality may seem counter-intuitive. **If durability is a top priority, consider using an on-disk database such as DynamoDB or MongoDB instead.** These databases are optimized for durability and can provide more comprehensive data protection.\\n\\n### How to correctly mitigate in AWS\\nBy implementing the AOF feature in Redis, all writes are stored on disk, ensuring durability. Meanwhile, subsequent reads are retrieved from memory, resulting in faster read speeds compared to traditional on-disk databases. However, write operations are still as slow as on-disk database systems.\\n\\nBy now, you should be familiar that making Redis a durable database might raise some eyebrows, especially when you have *great* alternatives to choose from. For example, DynamoDB provides durability out-of-the-box and has a cool feature named DynamoDB Accelerator (DAX). DAX is a fully managed, in-memory cache layer that sits between your application and DynamoDB, making your read operations as fast as what Redis can deliver!\\n\\nIf I haven\'t yet convinced you to not make Redis a durable database, then let\'s discuss how you can achieve that in AWS. AWS does not let you enable the AOF feature if you have Multi-AZ deployment, so you are out of luck. Thankfully, a different service called AWS MemoryDB solves this problem. AWS markets MemoryDB as a \\"Redis-compatible, durable, in-memory database service for ultra-fast performance\\" that \\"stores data durably across multiple Availability Zones (AZs) **using a distributed transactional log** [emphasis mine] to enable fast failover, database recovery, and node restarts\\".  \\n\\nMemoryDB achieves durability by enabling the AOF feature we discussed earlier. The Append-Only-File is distributed across different Availability Zones which ensures that your data isn\'t lost, even if an AZ becomes offline. In the event where all of your Redis instances fail, MemoryDB will create new instances and restore all the data from the previous instances by executing the AOF. Moreover, in the scenario that only the master node fails and an out-of-date replica is promoted to master, MemoryDB will detect that the new master does not contain all of the data and trigger an execution of the AOF on the new master to prevent any data loss!\\n\\nThe bad case about MemoryDB is that it is very expensive. At the time of writing, the price of `db.r6g.large` with on-demand pricing for the Ireland region costs $0.344/hour which totals to about $260/month. The same instance in ElastiCache costs only about $170/month, which is significantly cheaper. Moreover, MemoryDB changes $0.20 for each GB of data you write to your Redis, which isn\'t significant, but if your application is write-heavy, then this cost will add up quickly.\\n\\nI guess, durability comes at a cost."},{"id":"welcome-to-my-blog","metadata":{"permalink":"/welcome-to-my-blog","editUrl":"https://github.com/ilolis/my-blog/tree/main/blog/2023-02-15-welcome-to-my-blog.md","source":"@site/blog/2023-02-15-welcome-to-my-blog.md","title":"Welcome To My Blog!","description":"Welcome to my blog! \ud83e\udde1","date":"2023-02-15T00:00:00.000Z","formattedDate":"February 15, 2023","tags":[{"label":"hola","permalink":"/tags/hola"},{"label":"welcome","permalink":"/tags/welcome"}],"readingTime":0.73,"hasTruncateMarker":false,"authors":[{"name":"Ilias Lolis","title":"Software Engineer","url":"https://github.com/ilolis","imageURL":"https://github.com/ilolis.png","key":"ilolis"}],"frontMatter":{"slug":"welcome-to-my-blog","title":"Welcome To My Blog!","authors":"ilolis","tags":["hola","welcome"]},"prevItem":{"title":"Redis Durability","permalink":"/redis-durability"}},"content":"Welcome to my blog! \ud83e\udde1\\n\\nIf you\'re passionate about software engineering and microservices, you\'re in the right place! I\'ve always been fascinated by the potential of microservices architecture and its impact on building scalable and resilient applications!\\n\\nIn this blog, I will be sharing my knowledge, experience, and insights on various topics related to software engineering. I\'ll cover a range of topics, including best practices for designing and implementing microservices, tools and technologies for your development process, things to watch out and the latest trends (and not) in the software engineering industry. Also, I might write a few things about embedded stuff. \ud83d\ude0a\\n\\nSo, whether you\'re looking to improve your skills as a software engineer, or you\'re simply interested in learning more about microservices, I invite you to keep an eye on my blog! \\n\\nI hope that you\'ll find something useful and interesting here.\\n\\nSee you!"}]}')}}]);