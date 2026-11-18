// Scoolea — site vitrine : menu mobile, en-tête au défilement, formulaire de contact.
(function () {
  'use strict';

  // Année du pied de page
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  // Bordure de l'en-tête dès qu'on fait défiler la page
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Menu mobile
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('menu-mobile');
  if (toggle && menu) {
    var setOpen = function (open) {
      menu.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    };
    toggle.addEventListener('click', function () { setOpen(!menu.classList.contains('open')); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  }

  // Formulaire de contact
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = form.querySelector('.form-status');
  var submit = form.querySelector('button[type=submit]');
  var done = document.querySelector('.form-done');
  var openedAt = Date.now();

  function showError(msg) {
    status.textContent = msg;
    status.className = 'form-status err';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';

    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
    data.delai = Math.round((Date.now() - openedAt) / 1000);

    if (!data.nom || !data.etablissement || !data.email) {
      showError('Merci de renseigner votre nom, votre établissement et votre e-mail.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      showError("L'adresse e-mail ne semble pas valide.");
      form.querySelector('#f-email').focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Envoi en cours…';

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok) throw new Error(body.error || '');
        });
      })
      .then(function () {
        form.hidden = true;
        done.hidden = false;
        done.setAttribute('tabindex', '-1');
        done.focus();
      })
      .catch(function (err) {
        showError(err.message || "L'envoi n'a pas abouti. Réessayez dans un instant.");
        submit.disabled = false;
        submit.textContent = 'Demander une démonstration';
      });
  });
})();
