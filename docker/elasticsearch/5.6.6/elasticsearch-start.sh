#!/usr/bin/env bash
echo "Trying to start elasticsearch @ "`date`

#/usr/sbin/nginx -g "daemon off;"

sleep 5
echo "elasticsearch bailed out. Attempting restart @ "`date`
exit 1
