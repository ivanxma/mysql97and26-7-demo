#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
runtime_root="$project_root/.mysql-embedded"
mysql_root="$runtime_root/mysql-26.7.0-macos15-arm64"
socket="$runtime_root/mysql.sock"

"$mysql_root/bin/mysqladmin" --protocol=socket --socket="$socket" -uroot shutdown
echo "Embedded MySQL stopped."
