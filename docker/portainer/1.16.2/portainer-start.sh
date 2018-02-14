#!/usr/bin/env bash
echo "Trying to start portainer @ "`date`

/portainer

echo "portainer bailed out. Attempting restart @ "`date`
sleep 5
exit 1
