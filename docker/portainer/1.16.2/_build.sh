#!/usr/bin/env bash
git clone https://github.com/portainer/portainer
sed -i "s/build_all 'linux-amd64 linux-arm linux-arm64 linux-ppc64le linux-s390x darwin-amd64 windows-amd64'/build_all 'linux-amd64'/" portainer/build.sh
sed -i "s/FROM portainer\/base/FROM 52.0.211.45:5000\/alpine:3.7/" portainer/build/linux/Dockerfile
cd $PWD/portainer
yarn
PATH=/home/jreeme/src/firmament-docker/docker/portainer/1.16.2/portainer/node_modules/.bin:$PATH ./build.sh 1.16.2
docker tag portainer/portainer:linux-amd64 52.0.211.45:5000/portainer:1.16.2
rm -rf $PWD/portainer

