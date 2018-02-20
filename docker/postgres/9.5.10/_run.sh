#!/usr/bin/env bash
docker run -dt --name postgres -h postgres -p 5432:5432 52.0.211.45:5000/postgres:9.5.10
