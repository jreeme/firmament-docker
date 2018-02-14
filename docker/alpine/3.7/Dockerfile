FROM alpine:3.7 as base

RUN apk update
RUN apk add --no-cache ca-certificates

FROM alpine:3.7
COPY --from=base /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

RUN apk update
# Install some software (--no-cache switch does not remove files in /var/cache/apk)
RUN apk add --no-cache --update bash dumb-init supervisor bind-tools curl && rm -rf /var/cache/apk/*

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

WORKDIR /root
ENTRYPOINT ["/usr/bin/dumb-init","--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

