"""Ajoute aux liens CSS/JS des pages une empreinte du contenu (?v=xxxxxxxx).

Les fichiers de /assets/ sont mis en cache 7 jours par les navigateurs (voir public/_headers) :
sans cette empreinte, un visiteur verrait une nouvelle page avec l'ancienne feuille de style.
À lancer avant chaque déploiement :  python outils/versionner-assets.py
"""
import hashlib, pathlib, re

PUBLIC = pathlib.Path(__file__).resolve().parent.parent / 'public'
ASSETS = ['/assets/css/site.css', '/assets/js/site.js']

empreintes = {a: hashlib.sha256((PUBLIC / a.lstrip('/')).read_bytes()).hexdigest()[:8] for a in ASSETS}
for page in sorted(PUBLIC.glob('*.html')):
    texte = page.read_text(encoding='utf-8')
    nouveau = texte
    for a, h in empreintes.items():
        nouveau = re.sub(re.escape(a) + r'(\?v=[0-9a-f]+)?"', f'{a}?v={h}"', nouveau)
    if nouveau != texte:
        page.write_text(nouveau, encoding='utf-8', newline='')
        print('mis à jour :', page.name)
print('empreintes :', empreintes)
