FROM postgres:9.5.10-alpine
MAINTAINER John Reeme <john.reeme@keywcorp.com>

ENV POSTGRES_PASSWORD password

COPY hive-schema-1.2.0.postgres.sql /var/tmp/
COPY hive-txn-schema-0.13.0.postgres.sql /var/tmp/
COPY init-hive-db.sh /docker-entrypoint-initdb.d/

