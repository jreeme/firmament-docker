#!/usr/bin/env bash
git clone https://github.com/jreeme/amino3-server
docker build -t 52.0.211.45:5000/amino3:latest .
rm -rf amino3-server
