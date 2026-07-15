#!/bin/bash

set -u
cd "$(dirname "$0")" || exit 1

node scripts/setup.mjs
status=$?

if [ "$status" -ne 0 ]; then
  echo
  read -r -p "安装未完成。按回车键关闭窗口……"
fi

exit "$status"
