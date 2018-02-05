FROM alpine:3.7

# Install some software
RUN apk add --update bash dumb-init supervisor && rm -rf /var/cache/apk/*

# Set some environment things
RUN \
  echo "alias ll='ls -Fal'" >> /root/.bashrc && \
  echo "set -o vi" >> /root/.bashrc && \
  echo "export PS1=\"\u@\h:\w \\$ \"" >> /root/.bashrc

RUN \
  rm /etc/supervisord.conf && \
  mkdir -p /etc/supervisor.d && \
  mkdir -p /var/local/supervisor

COPY supervisord.conf /etc
COPY dummy.conf /etc/supervisor.d
COPY dummy.sh /var/local/supervisor

RUN chmod 755 /var/local/supervisor/dummy.sh

ENTRYPOINT ["/usr/bin/dumb-init","--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
