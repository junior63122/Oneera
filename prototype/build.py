import os, shutil
R = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(R, 'src', f), encoding='utf-8').read()
css = src('style.css')
js = '\n'.join(src(f) for f in ['data.js', 'core.js', 'venues.js', 'map.js', 'fx.js', 'avatar.js', 'onboard.js', 'avatar_ui.js', 'visitor.js', 'modes.js', 'discover.js', 'i18n.js', 'staff.js', 'dash.js', 'analytics.js', 'report.js', 'v5.js', 'v5dash.js', 'app.js'])
head = '''<title>Prototype ONEERA</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&display=swap">
'''
page = head + '<style>\n' + css + '\n</style>\n<script>\n' + js.replace('</script', '<\\/script') + '\n</script>\n'
out = os.path.join(R, 'dist'); os.makedirs(out, exist_ok=True)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(page)
open(os.path.join(out, 'local.html'), 'w', encoding='utf-8').write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' + head + '<style>\n' + css + '\n</style></head><body><script>\n' + js + '\n</script></body></html>')
if os.path.exists(os.path.join(out, 'a')): shutil.rmtree(os.path.join(out, 'a'))
shutil.copytree(os.path.join(R, 'a'), os.path.join(out, 'a'), ignore=shutil.ignore_patterns('incitation.webp', 'avatar_stage.webp', 'bdf_hd.webp'))
print('ok', len(page) // 1024, 'Ko')
