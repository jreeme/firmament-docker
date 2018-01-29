#!/bin/bash
docker run -dt --name elasticsearch -h elasticsearch -p 9200:9200 -p 9300:9300 52.0.211.45:5000/elasticsearch:2.4.6

