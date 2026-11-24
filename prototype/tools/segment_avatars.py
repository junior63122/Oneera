# Segmentation vêtements/cheveux/peau des personnages HQ (SegFormer b2 « clothes », ONNX, CPU)
import numpy as np, onnxruntime as ort, sys
from PIL import Image, ImageFilter
D = '/tmp/claude-0/-home-user-Oneera/e47acb2e-3cca-5354-8da8-dc5b80c26757/scratchpad/'
SRC = D + 'proto2/a/c/'
import json
CFG = json.load(open(D + 'seg/cfg.json'))
sess = ort.InferenceSession(D + 'hfseg/model.onnx', providers=['CPUExecutionProvider'])
MAP = {2: 2, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 4: 3, 7: 3, 17: 3, 5: 4, 6: 4, 9: 5, 10: 5}
def seg(im, S):
    W, H = im.size; s = S / max(W, H); w, h = int(W * s), int(H * s)
    bg = Image.new('RGB', (S, S), (235, 235, 240)); rgba = im.resize((w, h), Image.LANCZOS); ox, oy = (S - w) // 2, (S - h) // 2
    bg.paste(rgba, (ox, oy), rgba)
    x = (np.asarray(bg, np.float32) / 255 - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    lg = sess.run(None, {sess.get_inputs()[0].name: x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]  # (18, S/4, S/4)
    # upsample logits bilinéaire jusqu'au carré, puis recadrage
    up = np.stack([np.asarray(Image.fromarray(c).resize((S, S), Image.BILINEAR)) for c in lg.astype(np.float32)])
    return up[:, oy:oy + h, ox:ox + w], (w, h)
def run(k):
    im = Image.open(SRC + k + '.webp').convert('RGBA'); W, H = im.size
    lgA, (w, h) = seg(im, 1024)
    # passe de détail sur le haut du corps (tête, cheveux, haut) : meilleure frontière visage / cheveux
    top = im.crop((0, 0, W, int(H * .5))); lgB, (wb, hb) = seg(top, 1024)
    lgA_full = np.stack([np.asarray(Image.fromarray(c).resize((W, H), Image.BILINEAR)) for c in lgA])
    lgB_full = np.stack([np.asarray(Image.fromarray(c).resize((W, int(H * .5)), Image.BILINEAR)) for c in lgB])
    lgA_full[:, :int(H * .5)] = (lgA_full[:, :int(H * .5)] + 2 * lgB_full) / 3
    cls = lgA_full.argmax(0); a = np.asarray(im)[:, :, 3] > 100
    out = np.zeros((H, W), np.uint8)
    for src, dst in MAP.items(): out[cls == src] = dst
    out[~a] = 0
    # contraintes de position (bandes vérifiées à l'œil) : un « haut » hors de sa zone est des cheveux (au-dessus / sur les côtés) ou le bas
    c = CFG.get(k, {}); yy, xx = np.mgrid[0:H, 0:W]; yy = yy / H; xx = xx / W
    if 'top' in c:
        t = c['top']; x0, x1 = (t[2], t[3]) if len(t) >= 4 else (0, 1); bad = (out == 3) & ((yy < t[0]) | (yy > t[1]) | (xx < x0) | (xx > x1))
        out[bad & (yy < .5)] = 2 if 'noHair' not in c else 0
        if 'bot' in c: out[bad & (yy >= .5) & (yy >= c['bot'][0]) & (yy <= c['bot'][1])] = 4
        out[(out == 3) & bad] = 0 if False else out[(out == 3) & bad]
    if 'hair' in c: out[(out == 2) & (yy > c['hair'][1] + .08)] = 0
    # bord cheveux / front : un pixel « cheveux » couleur de peau redevient peau (évite les taches claires sur le visage)
    rgb = np.asarray(im.convert('RGB')).astype(float); sk = rgb[out == 1]
    if len(sk):
        mu = sk.mean(0); d = np.sqrt(((rgb - mu) ** 2).sum(-1)); out[(out == 2) & (d < 38)] = 1
    img = Image.fromarray(out * 40).filter(ImageFilter.ModeFilter(5)); out = (np.asarray(img) // 40).astype(np.uint8); out[~a] = 0
    Image.fromarray(out).save(D + 'hfseg/' + k + '_lab.png')
    m = Image.fromarray(out).resize(Image.open(SRC + k + '_m.webp').size, Image.NEAREST); m.save(D + 'hfseg/' + k + '_m_lab.png')
    return im, out
if __name__ == '__main__':
    COL = np.array([[0, 0, 0], [255, 120, 200], [255, 220, 0], [0, 200, 255], [60, 220, 80], [255, 80, 40]])
    tiles = []
    for k in sys.argv[1:] or ['rousse', 'lins', 'noir', 'c31', 'short', 'c30', 'metisse']:
        im, lb = run(k); rgb = np.asarray(im.convert('RGB')).astype(float); over = rgb.copy(); msk = lb > 0; over[msk] = rgb[msk] * .35 + COL[lb[msk]] * .65
        t = Image.new('RGB', (im.width * 2, im.height), 'white'); t.paste(im.convert('RGB'), (0, 0)); t.paste(Image.fromarray(over.astype(np.uint8)), (im.width, 0)); t.thumbnail((440, 640)); tiles.append(t); print(k, flush=True)
    Wt = sum(t.width for t in tiles); o = Image.new('RGB', (Wt, 640), 'white'); x = 0
    for t in tiles: o.paste(t, (x, 0)); x += t.width
    o.save(D + 'hfseg/masks.jpg', quality=82)
