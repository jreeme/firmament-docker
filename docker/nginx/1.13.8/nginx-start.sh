#!/usr/bin/env bash
echo "Trying to start nginx @ "`date`

/usr/sbin/nginx -g "daemon off;"

echo "nginx bailed out. Attempting restart @ "`date`
sleep 5
exit 1
