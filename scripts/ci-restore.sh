#!/usr/bin/env bash
set -euo pipefail
# Isolated CI only. Never point this at production.
[[ ${DB_NAME:-} == rackelto_ci && ${DB_HOST:-} == 127.0.0.1 && ${GITHUB_ACTIONS:-} == true ]]
container=${1:?CI service container ID required}
[[ $container =~ ^[a-f0-9]{12,64}$ ]]
mkdir -p reports
backup=$(mktemp); trap 'rm -f "$backup"' EXIT
# Root credential belongs exclusively to the disposable CI MySQL container.
run() { docker exec -i -e MYSQL_PWD=ci_root_only "$container" mysql -uroot -N "$@"; }
docker exec -e MYSQL_PWD=ci_root_only "$container" mysqldump -uroot --single-transaction --no-tablespaces --hex-blob rackelto_ci > "$backup"
test -s "$backup"
run -e 'CREATE DATABASE rackelto_ci_restore'
run rackelto_ci_restore < "$backup"
for table in users partners work_orders ims_document_versions ims_controls ims_assurance_exports ims_filing_versions; do
  source=$(run rackelto_ci -e "SELECT COUNT(*) FROM $table")
  restored=$(run rackelto_ci_restore -e "SELECT COUNT(*) FROM $table")
  test "$source" = "$restored"
  echo "$table: $source rows restored" | tee -a reports/restore.txt
done
for table in ims_document_versions ims_filing_versions ims_assurance_exports; do
  source=$(run rackelto_ci -e "SELECT id,SHA2(content,256) FROM $table ORDER BY id")
  restored=$(run rackelto_ci_restore -e "SELECT id,SHA2(content,256) FROM $table ORDER BY id")
  test "$source" = "$restored"
  echo "$table: binary content hashes match" | tee -a reports/restore.txt
done
