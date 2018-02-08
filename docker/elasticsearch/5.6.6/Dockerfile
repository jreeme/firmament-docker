FROM 52.0.211.45:5000/alpine-jre:3.7-8

## Install elasticsearch 5.6.7
# ensure elasticsearch user exists
RUN addgroup -S elasticsearch && adduser -S -G elasticsearch elasticsearch

# grab su-exec for easy step-down from root
# and bash for "bin/elasticsearch" among others
RUN apk add --no-cache 'su-exec>=0.2' openssl && rm -rf /var/cache/apk/*

WORKDIR /usr/share/elasticsearch
ENV PATH /usr/share/elasticsearch/bin:$PATH

ENV ELASTICSEARCH_VERSION 5.6.7
ENV ELASTICSEARCH_TARBALL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ELASTICSEARCH_VERSION}.tar.gz"

RUN set -ex; \
	\
	apk add --no-cache --virtual .fetch-deps \
		ca-certificates \
		gnupg \
		openssl \
		tar \
	; \
	\
	wget -O elasticsearch.tar.gz "$ELASTICSEARCH_TARBALL"; \
	\
	tar -xf elasticsearch.tar.gz --strip-components=1; \
	rm elasticsearch.tar.gz; \
	\
	apk del .fetch-deps; \
	\
	mkdir -p ./plugins; \
	for path in \
		./data \
		./logs \
		./config \
		./config/scripts \
	; do \
		mkdir -p "$path"; \
		chown -R elasticsearch:elasticsearch "$path"; \
	done; \
	\
# we shouldn't need much RAM to test --version (default is 2gb, which gets Jenkins in trouble sometimes)
	export ES_JAVA_OPTS='-Xms32m -Xmx32m'; \
	if [ "${ELASTICSEARCH_VERSION%%.*}" -gt 1 ]; then \
		elasticsearch --version; \
	fi

COPY config ./config
EXPOSE 9200 9300

STOPSIGNAL SIGTERM
#VOLUME /usr/share/elasticsearch/data

### End elasticsearch install

RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install -b ingest-attachment

# Remove dummy files from 52.0.211.45:5000/alpine:3.7
RUN \
  rm /var/local/supervisor/dummy.sh && \
  rm /etc/supervisor.d/dummy.conf

COPY elasticsearch-start.sh /var/local/supervisor/
COPY elasticsearch-supervisord.conf /etc/supervisor.d/

RUN chmod 755 /var/local/supervisor/elasticsearch-start.sh

ENTRYPOINT ["/usr/bin/dumb-init","--"]
CMD ["/usr/bin/supervisord"]

## http://derpturkey.com/elasticsearch-cluster-with-docker-engine-swarm-mode/
