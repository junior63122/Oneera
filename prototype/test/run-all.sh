#!/usr/bin/env bash
# Lance TOUTE la batterie de tests ONEERA et écrit un résumé lisible.
# Prérequis : base de test (scripts/dev-db.sh), serveur API sur :8787, prototype servi sur :8090.
# Usage : prototype/test/run-all.sh <dossier-de-sortie>
set -u
OUT="${1:-/tmp/oneera-run}"; mkdir -p "$OUT"
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"; PROTO="${PROTO:-$(cd "$HERE/.." && pwd)}"
API=http://127.0.0.1:8787; SUM="$OUT/RESUME.txt"; : > "$SUM"
line() { printf '%-22s %s\n' "$1" "$2" | tee -a "$SUM"; }
echo "Exécution du $(date '+%d/%m/%Y %H:%M')" | tee -a "$SUM"
# serveur (tests unitaires et d'intégration)
( cd "$ROOT/packages/backend" && TEST_DATABASE_URL=postgres://oneera@127.0.0.1:55432/postgres npx vitest run --no-file-parallelism > "$OUT/backend.log" 2>&1 )
line "serveur (vitest)" "$(grep -E '^ +Tests ' "$OUT/backend.log" | tr -s ' ' | sed 's/^ //')"
# app : suites de bout en bout (navigateur réel)
for t in scenarios qav5 qa2 qafx bounds rot3d kb e2e-portal e2e-live e2e-chat e2e2 e2e-recap e2e-contacts realleak xss-client personas; do
  timeout 600 node "$PROTO/test/$t.js" "$API" > "$OUT/$t.log" 2>&1; code=$?
  res=$(grep -E '^[0-9]+/[0-9]+$' "$OUT/$t.log" | tail -1); fails=$(grep -cE '^FAIL|ÉCHEC' "$OUT/$t.log")
  errs=$(grep -E 'erreurs JS|errs \[|erreurs \[' "$OUT/$t.log" | tail -1 | cut -c1-60)
  line "$t" "${res:-—} · échecs ${fails} · code ${code} ${errs:+· $errs}"
done
for t in looks search bubble; do # ces suites prennent un dossier de captures, pas l'adresse du serveur
  timeout 600 node "$PROTO/test/$t.js" "$OUT/$t" > "$OUT/$t.log" 2>&1; line "$t" "$(tail -1 "$OUT/$t.log")"; done
timeout 900 node "$PROTO/test/monkey.js" 6 400 > "$OUT/monkey.log" 2>&1; line "monkey (6×400)" "$(tail -1 "$OUT/monkey.log")"
timeout 900 node "$PROTO/test/fuzz-api.mjs" "$API" 4000 > "$OUT/fuzz.log" 2>&1; line "fuzzing API (4000)" "$(tail -1 "$OUT/fuzz.log")"
python3 "$PROTO/tools/commentcheck.py" "$PROTO/src" > "$OUT/comments.log" 2>&1; line "commentaires piégés" "$(tail -1 "$OUT/comments.log")"
echo "Fin $(date '+%H:%M')" | tee -a "$SUM"
