FROM 52.0.211.45:5000/alpine:3.7

COPY dist /

VOLUME /data

WORKDIR /

EXPOSE 9000

# Remove dummy files from 52.0.211.45:5000/alpine:3.7
RUN \
  rm /var/local/supervisor/dummy.sh && \
  rm /etc/supervisor.d/dummy.conf

COPY portainer-start.sh /var/local/supervisor/
COPY portainer-supervisord.conf /etc/supervisor.d/

RUN chmod 755 /var/local/supervisor/nginx-start.sh

ENTRYPOINT ["/usr/bin/dumb-init","--"]
CMD ["/usr/bin/supervisord"]
