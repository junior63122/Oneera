# Détecte les commentaires « // … » placés au milieu d'une ligne de code et suivis d'encore du code :
# tout ce qui suit // est ignoré par JavaScript, donc ce code ne s'exécute jamais (cause des bugs B-01 et B-02).
import sys, re, glob
bad = 0
for f in sorted(glob.glob(sys.argv[1] + '/*.js')):
    for n, l in enumerate(open(f, encoding='utf-8'), 1):
        if l.lstrip().startswith('//'): continue  # ligne entièrement commentée : sans risque
        for m in re.finditer(r'(?<![:"\'`/\\])// ', l):
            tail = l[m.end():]
            if re.search(r"[;{}]\s*(const|let|var|if|return|SCREEN|PORTAL|setTimeout|add\(|push\()|\)\s*;\s*\w+\s*[.(=]", tail):
                print(f"{f}:{n}: {tail.strip()[:140]}"); bad += 1
            break
print('suspects :', bad)
sys.exit(1 if bad else 0)
