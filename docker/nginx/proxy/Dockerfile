FROM jwilder/nginx-proxy:alpine

RUN echo "alias ll='ls -Fal'" >> /root/.bashrc && \
  echo "set -o vi" >> /root/.bashrc

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" > /etc/apk/repositories && \
  echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
  echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories

RUN apk add --update bash && rm -rf /var/cache/apk/*

