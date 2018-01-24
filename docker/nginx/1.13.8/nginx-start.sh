#!/usr/bin/env bash
echo "Trying to start nginx @ "`date`

/usr/sbin/nginx

echo "nginx bailed out. Attempting restart @ "`date`
sleep 5
exit 1
