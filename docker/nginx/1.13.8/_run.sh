#!/bin/bash
docker run -dt --name nginx -h nginx -p 5000:5000 -p 80:80 \
--mount type=bind,source=/mnt/RAM_disk/firmament-docker/docker/nginx/docker-mount,target=/etc/nginx/conf.d \
52.0.211.45:5000/nginx:1.13.8

