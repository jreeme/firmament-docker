FROM elasticsearch:5.6.6-alpine

RUN apk update \
    && apk upgrade
RUN apk add curl wget bash openssl
RUN rm -rf /var/cache/apk/*
#RUN sysctl -w vm.max_map_count=262144
#RUN echo "vm.max_map_count=262144" >> /etc/sysctl.conf
RUN echo "http.cors.enabled: true" >> /usr/share/elasticsearch/config/elasticsearch.yml
RUN echo "http.cors.allow-headers: \"*\"" >> /usr/share/elasticsearch/config/elasticsearch.yml
RUN echo "http.cors.allow-origin: \"*\"" >> /usr/share/elasticsearch/config/elasticsearch.yml
RUN echo "http.cors.allow-methods: OPTIONS, HEAD, GET, POST, PUT, DELETE" >> /usr/share/elasticsearch/config/elasticsearch.yml

#CMD ["elasticsearch", \
#  "-Ecluster.name=es-cluster", \
#  "-Enode.name=${HOSTNAME}", \
#  "-Epath.data=/usr/share/elasticsearch/data", \
#  "-Epath.logs=/usr/share/elasticsearch/logs", \
#  "-Enetwork.host=0.0.0.0", \
#  "-Ediscovery.zen.minimum_master_nodes=2", \
#  "-Ediscovery.zen.ping.unicast.hosts=es-master"]

# http://derpturkey.com/elasticsearch-cluster-with-docker-engine-swarm-mode/
