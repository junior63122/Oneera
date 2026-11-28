#!/usr/bin/env python3
"""Ramène les valeurs d'interface au design system (DESIGN.md) : couleurs, tailles de police, rayons,
espacements, durées. Usage : designtokens.py <dossier src> [--dry]
Les fichiers de contenu (avatars, illustrations, données, effets, portail) ne sont pas touchés.
Écrit un rapport des divergences restantes (couleurs trop éloignées de tout jeton) sur la sortie standard."""
import re, sys, glob, os, collections, colorsys

SRC = sys.argv[1]; DRY = '--dry' in sys.argv
SKIP = re.compile(r'avatar|v6av|v7av|_decor|data\.js|venues|fx\.js|portal|before|map\.js')
FILES = [f for f in glob.glob(os.path.join(SRC, '*.js')) + [os.path.join(SRC, 'style.css')] if not SKIP.search(os.path.basename(f))]

# Couleurs d'interface : ancienne valeur → jeton (remplacements exacts des valeurs non conformes AA).
EXACT = {'#4F6BF5': '#4A67F5', '#6E8BF7': '#4A67F5', '#4A63E8': '#3D5AFE', '#16A34A': '#12863D', '#22C55E': '#12863D', '#0B7A3B': '#12863D',
         '#E58A00': '#A86500', '#9A5800': '#A86500', '#B86E00': '#A86500', '#F59E0B': '#A86500', '#E5484D': '#E1292F', '#B42318': '#E1292F', '#C62828': '#E1292F', '#C0392B': '#E1292F',
         '#6B7084': '#696E81', '#9AA0B4': '#696E81', '#8A8FA6': '#696E81', '#9196AA': '#696E81', '#8B5CF6': '#8452F5', '#6D3FD8': '#8452F5',
         '#F1F2F7': '#F3F5FB', '#F6F7FB': '#F3F5FB', '#ECEEF5': '#F3F5FB', '#EEF0F5': '#F3F5FB', '#EEF0F6': '#F3F5FB', '#F0F1F6': '#E6E8F0', '#ECEEF6': '#E6E8F0', '#D5D8E2': '#E6E8F0', '#E9EEFD': '#EEF1FF', '#EEF2FF': '#EEF1FF', '#F3F5FF': '#EEF1FF',
         '#4B5165': '#5B6075', '#22252E': '#1C1F2A', '#1E2230': '#1C1F2A', '#1C1C21': '#1C1F2A'}
TOKENS = ['#4A67F5', '#3D5AFE', '#1C1F2A', '#5B6075', '#696E81', '#E6E8F0', '#F3F5FB', '#FFFFFF', '#12863D', '#E4F6EA', '#A86500', '#FFF1DC', '#E1292F', '#FDECEC', '#8452F5', '#EEF1FF', '#000000']
DECOR = {'#E5484D', '#E58A00', '#16A34A'}  # gardées dans les halos et marqueurs (jamais en texte) : voir DESIGN.md § 1

FS = [11, 12, 13, 15, 17, 20, 28, 34]
SP = [4, 8, 12, 16, 24, 32]
def near(v, scale): return min(scale, key=lambda s: (abs(s - v), -s))
def radius(v):
    if v >= 999: return 999
    if v <= 5: return 4 if v > 2 else v
    if v <= 9: return 8
    if v <= 13: return 12
    if v <= 19: return 16
    if v <= 24: return 24
    return 999  # au-delà : éléments ronds (avatars, boutons ronds) → cercle exact
def dur(sec):
    if sec >= .6: return sec  # animations d'ambiance : libres
    return min([.15, .25, .35], key=lambda d: abs(d - sec))

stats = collections.Counter(); left = collections.Counter()
for f in FILES:
    t = open(f).read(); o = t
    def col(m):
        h = m.group(0).upper(); h6 = h if len(h) == 7 else '#' + ''.join(c * 2 for c in h[1:])
        if h6 in EXACT: stats['couleur'] += 1; return EXACT[h6]
        if h6 not in TOKENS and h6 not in DECOR: left[h6] += 1
        return m.group(0)
    t = re.sub(r'#[0-9a-fA-F]{6}\b', col, t)
    t = re.sub(r'font-size:\s*([0-9.]+)px', lambda m: (stats.update(['police']) or f'font-size:{near(float(m.group(1)), FS)}px') if float(m.group(1)) < 40 else m.group(0), t)
    t = re.sub(r'border-radius:\s*([0-9.]+)px(?=\s*[;"`}])', lambda m: (stats.update(['rayon']) or f'border-radius:{radius(float(m.group(1)))}px'), t)
    t = re.sub(r'((?:padding|margin|gap):\s*)(\d+)px(?=\s*[;"`}])', lambda m: m.group(0) if int(m.group(2)) <= 3 else (stats.update(['espacement']) or f'{m.group(1)}{near(int(m.group(2)), SP)}px'), t)
    t = re.sub(r'(transition:[^;"`]*?)(\d*\.\d+|\d+)s\b', lambda m: (stats.update(['durée']) or f'{m.group(1)}{dur(float(m.group(2))):g}s'), t)
    t = re.sub(r'font-weight:\s*(\d+)', lambda m: (stats.update(['graisse']) or f'font-weight:{min([600, 700, 800], key=lambda w: abs(w - int(m.group(1))))}') if int(m.group(1)) >= 500 else m.group(0), t)
    if t != o and not DRY: open(f, 'w').write(t)
print('remplacements :', dict(stats))
print('couleurs d’interface hors jetons restantes (à revoir à la main) :', len(left))
for k, v in left.most_common(25): print('  ', k, v)
