########################################
# build
########################################
FROM 52.0.211.45:5000/alpine:3.7 AS build
ENV NODE_ENV=development

# Install needed packages. Notes:
#   * dumb-init: a proper init system for containers, to reap zombie children
#   * musl: standard C library
#   * linux-headers: commonly needed, and an unusual package name from Alpine.
#   * build-base: used so we include the basic development packages (gcc)
#   * bash: so we can access /bin/bash
#   * git: to ease up clones of repos
#   * ca-certificates: for SSL verification during Pip and easy_install
#   * python: the binaries themselves
#   * python-dev: are used for gevent e.g.
#   * py-setuptools: required only in major version 2, installs easy_install so we can install Pip.
ENV PACKAGES="\
  nodejs \
  nodejs-npm \
  wget \
  git \
  musl \
  linux-headers \
  build-base \
  python2 \
  python2-dev \
  py-setuptools \
"

RUN apk update

RUN apk add --no-cache $PACKAGES

RUN npm install -g yarn

  # make some useful symlinks that are expected to exist
RUN if [[ ! -e /usr/bin/python ]];        then ln -sf /usr/bin/python2.7 /usr/bin/python; fi && \
  if [[ ! -e /usr/bin/python-config ]]; then ln -sf /usr/bin/python2.7-config /usr/bin/python-config; fi && \
  if [[ ! -e /usr/bin/easy_install ]];  then ln -sf /usr/bin/easy_install-2.7 /usr/bin/easy_install; fi

  # Install and upgrade Pip
RUN easy_install pip && \
  pip install --upgrade pip && \
  if [[ ! -e /usr/bin/pip ]]; then ln -sf /usr/bin/pip2.7 /usr/bin/pip; fi

COPY amino3-server/ /src
WORKDIR /src

RUN yarn run build
#Set AMINO3_NO_LISTEN=TRUE and run server to pull and build client (use ARG so it doesn't wind up in image)
ARG AMINO3_NO_LISTEN=TRUE
#RUN /usr/bin/node server/server.js
RUN /usr/bin/node server/server.js && \
  find /src -name '*.map' -exec rm {} \; && \
  find /src -name '*.ts' -exec rm {} \; && \
  /usr/bin/npm prune --production

########################################
# production
########################################
FROM 52.0.211.45:5000/alpine:3.7 AS production

ENV PACKAGES="\
  nodejs \
  nodejs-npm \
"

RUN apk update

RUN apk add --no-cache $PACKAGES

LABEL maintainer="john.d.reeme@keywcorp.com"

ENV NODE_ENV=production

COPY --from=build /src/common /src/common/
COPY --from=build /src/dist /src/dist/
COPY --from=build /src/node_modules /src/node_modules/
COPY --from=build /src/server /src/server/
COPY --from=build /src/static /src/static/

EXPOSE 3000
STOPSIGNAL SIGTERM
WORKDIR /src

# Remove dummy files from 52.0.211.45:5000/alpine:3.7
RUN \
  rm /var/local/supervisor/dummy.sh && \
  rm /etc/supervisor.d/dummy.conf

COPY amino3-start.sh /var/local/supervisor/
COPY amino3-supervisord.conf /etc/supervisor.d/

RUN chmod 755 /var/local/supervisor/amino3-start.sh

ENTRYPOINT ["/usr/bin/dumb-init","--"]
CMD ["/usr/bin/supervisord"]
