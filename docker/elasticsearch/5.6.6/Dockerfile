FROM elasticsearch:5.6.6-alpine

RUN apk update && apk upgrade
RUN apk --no-cache add curl wget bash openssl dumb-init supervisor

# Setup ES cors so 'head' service can get to it
RUN echo "http.cors.enabled: true" >> /usr/share/elasticsearch/config/elasticsearch.yml
RUN echo "http.cors.allow-headers: \"*\"" >> /usr/share/elasticsearch/config/elasticsearch.yml
RUN echo "http.cors.allow-origin: \"*\"" >> /usr/share/elasticsearch/config/elasticsearch.yml
RUN echo "http.cors.allow-methods: OPTIONS, HEAD, GET, POST, PUT, DELETE" >> /usr/share/elasticsearch/config/elasticsearch.yml

RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install -b ingest-attachment

CMD ["elasticsearch", \
  "-Enetwork.host=0.0.0.0", \
  "-Ediscovery.zen.minimum_master_nodes=2" \
  "-Ediscovery.zen.ping.unicast.hosts=elasticsearch", \
  "-Ecluster.name=elasticsearch-cluster", \
  "-Epath.data=/usr/share/elasticsearch/data", \
  "-Epath.logs=/usr/share/elasticsearch/logs"]

# sysctl -w vm.max_map_count=262144 needs to be run on the *host* machine or ES won't start
#RUN sysctl -w vm.max_map_count=262144
#RUN echo "vm.max_map_count=262144" >> /etc/sysctl.conf

# http://derpturkey.com/elasticsearch-cluster-with-docker-engine-swarm-mode/
