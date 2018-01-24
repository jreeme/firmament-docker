FROM nginx:1.13.8-alpine

RUN echo "alias ll='ls -Fal'" >> /root/.bashrc && \
  echo "set -o vi" >> /root/.bashrc

RUN apk update && \
  apk upgrade
RUN apk add bash dumb-init supervisor && \
  rm -rf /var/cache/apk/*
RUN rm /etc/supervisord.conf
RUN mkdir -p /var/local/supervisor
COPY nginx-start.sh /var/local/supervisor/
RUN chmod 755 /var/local/supervisor/nginx-start.sh
COPY supervisord.conf /etc/
COPY default.conf /etc/nginx/conf.d

ENTRYPOINT ["/usr/bin/dumb-init","--"]
#CMD ["/bin/bash"]
CMD ["/usr/bin/supervisord"]

