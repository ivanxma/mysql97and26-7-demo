#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
runtime_root="$project_root/.mysql-embedded"
mysql_root="$runtime_root/mysql-26.7.0-macos15-arm64"
data_dir="$runtime_root/data"
socket="$runtime_root/mysql.sock"
pid_file="$runtime_root/mysql.pid"
log_file="$runtime_root/mysql-error.log"
port=3306

server="$mysql_root/bin/mysqld"
client="$mysql_root/bin/mysql"

if [[ ! -x "$server" ]]; then
  echo "Embedded MySQL 26.7.0 is missing: $server" >&2
  exit 1
fi

if [[ -f "$pid_file" ]] && kill -0 "$(<"$pid_file")" 2>/dev/null; then
  echo "Embedded MySQL is already running on localhost:$port."
  exit 0
fi

mkdir -p "$data_dir" "$runtime_root/mysql-files"
if [[ ! -d "$data_dir/mysql" ]]; then
  if ! "$server" --initialize-insecure --basedir="$mysql_root" --datadir="$data_dir" \
    --log-error="$log_file"; then
    echo "MySQL 26.7.0 could not initialize; see $log_file" >&2
    exit 1
  fi
  if [[ ! -d "$data_dir/mysql" ]]; then
    echo "MySQL 26.7.0 could not initialize; see $log_file" >&2
    exit 1
  fi
fi

rm -f "$socket" "$pid_file"
"$server" --basedir="$mysql_root" --datadir="$data_dir" --port="$port" \
  --socket="$socket" --pid-file="$pid_file" --log-error="$log_file" \
  --secure-file-priv="$runtime_root/mysql-files" --daemonize

for _ in {1..30}; do
  if "$client" --protocol=socket --socket="$socket" -uroot -e 'SELECT 1' >/dev/null 2>&1; then
    "$client" --protocol=socket --socket="$socket" -uroot < "$project_root/scripts/seed-demo.sql"
    echo "Embedded MySQL 26.7.0 is running on localhost:$port."
    exit 0
  fi
  sleep 1
done

echo "MySQL did not become ready; see $log_file" >&2
exit 1
