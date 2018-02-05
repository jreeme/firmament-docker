FROM alpine:3.7

# Install some software
RUN apk add --update bash dumb-init supervisor bind-tools curl && rm -rf /var/cache/apk/*

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

#Relocate -- Low level install of etcd
#ARG ETCD_VERSION=3.3.0
#RUN curl -L https://github.com/coreos/etcd/releases/download/v${ETCD_VERSION}/etcd-v${ETCD_VERSION}-linux-amd64.tar.gz -o etcd.tar.gz && \
#    tar xzf etcd.tar.gz && \
#    mv etcd-*/etcd /etcd-*/etcdctl /bin/ && \
#    /bin/etcd --version && \
#    rm -rf etcd.tar.gz etcd-*
#
#COPY etcd.sh /bin/
#
##VOLUME /data
#COPY etcd.conf /etc/supervisor.d
#COPY etcd.sh /var/local/supervisor
#RUN chmod 755 /var/local/supervisor/etcd.sh
#
#EXPOSE 2379 2380 4001 7001
#
#ENV MIN_SEEDS_COUNT 3
#ENV ETCDCTL_API=3
