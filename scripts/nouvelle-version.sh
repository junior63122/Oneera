#!/usr/bin/env bash
# Crée une nouvelle version ONEERA sauvegardée, à lancer APRÈS que tous les tests passent (prototype/test/run-all.sh).
#  1. copie la page complète du prototype dans prototype/versions/<version>.html (retour immédiat possible, sans compiler) ;
#  2. pose une étiquette git annotée « prototype-<version> » (et « app-build-<n> » si un numéro de build est donné) ;
#  3. envoie les étiquettes sur GitHub (sauvegarde distante, téléchargeable en .zip depuis la page « Tags ») ;
#  4. fabrique une archive complète de l'historique (git bundle) dans backups/ — hors du dépôt, à garder ailleurs.
# Usage : scripts/nouvelle-version.sh v15 "Résumé de la version" [numéro de build iOS]
set -euo pipefail
V="${1:?version, ex. v15}"; MSG="${2:?résumé de la version}"; BUILD="${3:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
[ -z "$(git status --porcelain)" ] || { echo "Des changements ne sont pas enregistrés (commit) : enregistre-les d'abord."; exit 1; }
git rev-parse -q --verify "refs/tags/prototype-$V" >/dev/null && { echo "La version $V existe déjà."; exit 1; }
cp prototype/dist/index.html "prototype/versions/$V.html"
git add "prototype/versions/$V.html" && git commit -q -m "Version $V : $MSG" && echo "copie du prototype : prototype/versions/$V.html"
git tag -a "prototype-$V" -m "Prototype ONEERA $V — $MSG"
[ -n "$BUILD" ] && git tag -a "app-build-$BUILD" -m "App iOS ONEERA, build TestFlight $BUILD — $MSG"
BR="$(git branch --show-current)"
git push -q origin "$BR"
git push -q origin "prototype-$V" ${BUILD:+"app-build-$BUILD"} 2>/dev/null || echo "étiquettes gardées localement (envoi refusé par GitHub ici) : elles sont dans l'archive ci-dessous"
mkdir -p "$ROOT/../oneera-backups" && B="$ROOT/../oneera-backups/oneera-$V-$(date +%Y%m%d-%H%M).bundle"
git bundle create "$B" --all >/dev/null 2>&1 && echo "archive complète : $B"
echo "Version $V enregistrée et sauvegardée."
