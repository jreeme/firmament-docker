#!/bin/bash
docker run -dt --name vita -h vita -p 8701:8701 -p 8080:8080 -p 8888:8888 sotera/vita_all_in_one:1.0

