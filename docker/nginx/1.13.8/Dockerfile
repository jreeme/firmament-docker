FROM nginx:1.13.8-alpine

RUN echo "alias ll='ls -Fal'" >> /root/.bashrc && \
  echo "set -o vi" >> /root/.bashrc

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" > /etc/apk/repositories && \
  echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
  echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories

#RUN apk update && apk upgrade
#RUN apk add --update nodejs nodejs-npm
RUN apk add --update bash dumb-init supervisor && \
  rm -rf /var/cache/apk/*
RUN rm /etc/supervisord.conf
RUN mkdir -p /var/local/supervisor
COPY nginx-start.sh /var/local/supervisor/
RUN chmod 755 /var/local/supervisor/nginx-start.sh
COPY supervisord.conf /etc/
COPY default.conf /etc/nginx/conf.d

ENTRYPOINT ["/usr/bin/dumb-init","--"]
CMD ["/usr/bin/supervisord"]
#CMD ["/usr/sbin/nginx", "-g", "daemon off;"]

