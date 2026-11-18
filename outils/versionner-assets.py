"""Ajoute aux liens vers /assets/ des pages une empreinte du contenu (?v=xxxxxxxx).

Les fichiers de /assets/ (feuille de style, script, images) sont mis en cache 7 jours par les
navigateurs (voir public/_headers) : sans cette empreinte, un visiteur verrait une nouvelle page
avec l'ancienne feuille de style ou d'anciennes captures d'écran.
À lancer avant chaque déploiement :  python outils/versionner-assets.py
"""
import hashlib, pathlib, re

PUBLIC = pathlib.Path(__file__).resolve().parent.parent / 'public'
# Tout lien local vers /assets/… (src, href, content), avec ou sans empreinte existante
# Les polices sont exclues : la feuille de style les charge sans empreinte, et le préchargement
# dans la page doit utiliser exactement la même adresse pour ne pas télécharger la police deux fois.
LIEN = re.compile(r"""(/assets/[A-Za-z0-9_./-]+\.(?:css|js|png|jpg|jpeg|webp|svg))(\?v=[0-9a-f]+)?(?=["'\s)])""")

cache = {}
def empreinte(chemin):
    if chemin not in cache:
        fichier = PUBLIC / chemin.lstrip('/')
        cache[chemin] = hashlib.sha256(fichier.read_bytes()).hexdigest()[:8] if fichier.is_file() else None
    return cache[chemin]

def remplacer(m):
    h = empreinte(m.group(1))
    return f'{m.group(1)}?v={h}' if h else m.group(0)

for page in sorted(PUBLIC.glob('*.html')):
    texte = page.read_text(encoding='utf-8')
    nouveau = LIEN.sub(remplacer, texte)
    if nouveau != texte:
        page.write_text(nouveau, encoding='utf-8', newline='')
        print('mis à jour :', page.name)
manquants = [c for c, h in cache.items() if h is None]
print(len(cache), 'fichiers versionnés' + (' | introuvables : ' + ', '.join(manquants) if manquants else ''))
