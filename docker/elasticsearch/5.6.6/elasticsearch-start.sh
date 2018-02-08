#!/usr/bin/env bash
echo "Trying to start elasticsearch @ "`date`

su-exec elasticsearch elasticsearch

sleep 5
echo "elasticsearch bailed out. Attempting restart @ "`date`
exit 1
