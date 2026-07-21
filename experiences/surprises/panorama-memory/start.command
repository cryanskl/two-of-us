#!/bin/bash

set -u
cd "$(dirname "$0")/../../.." || exit 1

node scripts/start.mjs --experience panorama-memory
status=$?

if [ "$status" -ne 0 ]; then
  echo
  read -r -p "启动失败。按回车键关闭窗口……"
fi

exit "$status"
