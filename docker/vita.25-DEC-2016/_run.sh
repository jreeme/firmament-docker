#!/bin/bash
docker run -dt --name vita-strongloop -h vita-strongloop -p 27017:27017 -p 8701:8701 -p 8080:8080 -p 8888:8888 jreeme/vita:25-DEC-2016

