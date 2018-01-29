#!/bin/bash
docker run -dt --name nginx-proxy -h nginx-proxy -p 5000:5000 -p 80:80 52.0.211.45:5000/nginx-proxy:1.13

