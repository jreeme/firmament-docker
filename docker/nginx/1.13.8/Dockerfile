FROM nginx:1.13.8-alpine

RUN echo "alias ll='ls -Fal'" >> /root/.bashrc && \
  echo "set -o vi" >> /root/.bashrc

RUN apk update && \
  apk upgrade
RUN apk add bash supervisor
RUN rm -rf /var/cache/apk/*
RUN rm /etc/supervisord.conf
#RUN mkdir -p /etc/supervisor.d
COPY supervisord.conf /etc/supervisord.conf
COPY default.conf /etc/nginx/conf.d
CMD ["/usr/bin/supervisord"]

