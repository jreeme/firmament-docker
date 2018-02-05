FROM elasticsearch:2.4.6-alpine

RUN apk update && apk upgrade
RUN apk add curl wget bash openssl
RUN rm -rf /var/cache/apk/*
RUN echo "http.cors.enabled: true" >> /usr/share/elasticsearch/config/elasticsearch.yml
RUN echo "http.cors.allow-headers: \"*\"" >> /usr/share/elasticsearch/config/elasticsearch.yml
RUN echo "http.cors.allow-origin: \"*\"" >> /usr/share/elasticsearch/config/elasticsearch.yml
RUN echo "http.cors.allow-methods: OPTIONS, HEAD, GET, POST, PUT, DELETE" >> /usr/share/elasticsearch/config/elasticsearch.yml

