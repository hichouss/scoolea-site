// POST /api/contact — formulaire « Demander une démonstration » du site vitrine.
// Fonction Cloudflare Pages : envoie la demande par e-mail via Resend.
//
// Variables à définir dans Cloudflare Pages (Paramètres > Variables et secrets) :
//   RESEND_API_KEY  (secret)  clé API Resend
//   CONTACT_TO                adresse qui reçoit les demandes, par ex. contact@scoolea.com
//   CONTACT_FROM              expéditeur vérifié dans Resend, par ex. "Site Scoolea <site@scoolea.com>"

const LIMITS = { nom: 100, etablissement: 150, email: 150, telephone: 30, fonction: 60, apprenants: 40, message: 2000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// Texte brut sur une ligne (pas de retour à la ligne : pas d'injection d'en-têtes ni de mise en forme).
function clean(value, max) {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    return json({ error: "Le formulaire n'est pas encore disponible. Écrivez-nous directement par e-mail." }, 503);
  }

  const type = request.headers.get('Content-Type') || '';
  if (!type.includes('application/json')) return json({ error: 'Requête invalide.' }, 415);
  if (Number(request.headers.get('Content-Length') || 0) > 20000) return json({ error: 'Message trop long.' }, 413);

  let data;
  try { data = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }

  // Robots : champ piège rempli, ou formulaire envoyé en moins de 3 secondes. On répond « OK » sans rien envoyer.
  // Sans « delai » (ou avec une valeur non numérique), la requête ne vient pas du formulaire : robot.
  if ((data.site_web && String(data.site_web).trim()) || !(Number(data.delai) >= 3)) return json({ ok: true });

  const f = {
    nom: clean(data.nom, LIMITS.nom),
    etablissement: clean(data.etablissement, LIMITS.etablissement),
    email: clean(data.email, LIMITS.email),
    telephone: clean(data.telephone, LIMITS.telephone),
    fonction: clean(data.fonction, LIMITS.fonction),
    apprenants: clean(data.apprenants, LIMITS.apprenants),
    // Le message garde ses retours à la ligne.
    message: String(data.message ?? '').replace(/\r\n?/g, '\n').trim().slice(0, LIMITS.message),
  };

  if (!f.nom || !f.etablissement || !f.email) {
    return json({ error: 'Merci de renseigner votre nom, votre établissement et votre e-mail.' }, 400);
  }
  if (!EMAIL_RE.test(f.email)) return json({ error: "L'adresse e-mail ne semble pas valide." }, 400);

  const text = [
    'Nouvelle demande de démonstration depuis scoolea.com',
    '',
    `Nom : ${f.nom}`,
    `Établissement : ${f.etablissement}`,
    `Fonction : ${f.fonction || '—'}`,
    `E-mail : ${f.email}`,
    `Téléphone : ${f.telephone || '—'}`,
    `Nombre d'apprenants : ${f.apprenants || '—'}`,
    '',
    'Message :',
    f.message || '—',
    '',
    '— Répondre à cet e-mail écrit directement à la personne.',
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: f.email,
      subject: `Demande de démonstration — ${f.etablissement}`,
      text,
    }),
  });

  if (!res.ok) {
    console.error('Resend', res.status, await res.text().catch(() => ''));
    return json({ error: "L'envoi n'a pas abouti. Réessayez dans un instant ou écrivez-nous par e-mail." }, 502);
  }
  return json({ ok: true });
}

export function onRequest() {
  return json({ error: 'Méthode non autorisée.' }, 405);
}
