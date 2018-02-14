FROM 52.0.211.45:5000/alpine:3.7

COPY dist /
COPY portainer-start.sh /var/local/supervisor/
COPY portainer-supervisord.conf /etc/supervisor.d/

VOLUME /data

WORKDIR /

EXPOSE 9000

# Remove dummy files from 52.0.211.45:5000/alpine:3.7
RUN \
  rm /var/local/supervisor/dummy.sh && \
  rm /etc/supervisor.d/dummy.conf

RUN chmod 755 /var/local/supervisor/portainer-start.sh

ENTRYPOINT ["/usr/bin/dumb-init","--"]
CMD ["/usr/bin/supervisord"]
