#!/usr/bin/env bash
echo "[dummy process] Supervisor called me @ "`date`" (sleeping 5)"

sleep 5

>&2 echo "[dummy process] Test error output @ "`date`" (sleeping 1)"

sleep 1

#/bin/bash

echo "[dummy process] Bailing out @"`date`" (exit code 1)"
exit 1
