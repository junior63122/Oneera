"""Analyse d'un plan illustré ONEERA (à la construction de l'app) : repère la végétation (arbres, massifs, palmiers)
et les sources lumineuses (enseignes, écrans, néons) pour les animer à l'écran. Coordonnées en % du plan.
Fonctionne pour toute nouvelle carte sans réglage : il suffit que l'image soit déclarée dans venues.js."""
from PIL import Image
import colorsys, json, sys

def analyse(path, W=540):
    im = Image.open(path).convert('RGBA'); w0, h0 = im.size; H = round(h0 * W / w0)
    px = im.resize((W, H), Image.BILINEAR).load()
    cell = 5; veg, lit = [], []
    for cy in range(0, H - cell, cell):
        for cx in range(0, W - cell, cell):
            g = l = n = 0
            for y in range(cy, cy + cell):
                for x in range(cx, cx + cell):
                    r, gg, b, a = px[x, y]
                    if a < 200: continue
                    n += 1
                    h, s, v = colorsys.rgb_to_hsv(r / 255, gg / 255, b / 255)
                    if .13 <= h <= .40 and s > .22 and .10 < v < .64 and gg >= r: g += 1     # feuillage (verts foncés / olive ; la pelouse claire est exclue)
                    if s > .42 and v > .80 and (h > .78 or h < .02): l += 1                    # couleur vive et lumineuse (néon, écran, enseigne)
            if n < cell * cell * .6: continue
            if g / n > .42: veg.append([(cx + cell / 2) / W * 100, (cy + cell / 2) / H * 100, g / n])
            if l / n > .45: lit.append([(cx + cell / 2) / W * 100, (cy + cell / 2) / H * 100, l / n])
    # réduction : une tache par voisinage (~2,5 % du plan), les plus marquées d'abord
    def thin(pts, d, k):
        out = []
        for p in sorted(pts, key=lambda q: -q[2]):
            if all((p[0] - q[0]) ** 2 + ((p[1] - q[1]) * h0 / w0) ** 2 > d * d for q in out): out.append(p)
            if len(out) >= k: break
        return [[round(p[0], 1), round(p[1], 1), round(p[2], 2)] for p in out]
    return {'veg': thin(veg, 1.9, 120), 'lit': thin(lit, 2.4, 40)}

if __name__ == '__main__':
    print(json.dumps({k: analyse(v) for k, v in (a.split('=') for a in sys.argv[1:])}))
