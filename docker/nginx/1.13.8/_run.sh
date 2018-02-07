#!/bin/bash
docker run -dt --name nginx -h nginx -p 80:80 -p 9200:9200 52.0.211.45:5000/nginx:1.13.8
#--mount type=bind,source=/mnt/RAM_disk/firmament-docker/docker/nginx/docker-mount,target=/etc/nginx/conf.d \
#52.0.211.45:5000/nginx:1.13.8

