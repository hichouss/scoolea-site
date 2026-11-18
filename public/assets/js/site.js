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

  // Animations d'apparition : sobres, désactivées si l'utilisateur préfère réduire les animations.
  // Sans JavaScript (ou sans IntersectionObserver), tout reste visible.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('anim');
    var groups = [
      '.section-head', '.compare-col', '.grid-3 > *', '.steps > .step', '.showcase-text',
      '.showcase > .browser', '.showcase > .paper', '.sec-item', '.price-card', '.contact-card', '.audience-item'
    ];
    var targets = [];
    groups.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el.closest('.hero')) return;
        // Décalage progressif entre les éléments frères d'une même grille
        var i = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.setProperty('--d', (Math.min(i, 5) * 80) + 'ms');
        el.classList.add('reveal');
        targets.push(el);
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('in');
        io.unobserve(el);
        // Une fois apparu, l'élément retrouve ses transitions normales (survol sans délai)
        setTimeout(function () { el.classList.remove('reveal', 'in'); el.style.removeProperty('--d'); }, 1200);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  }

  // Barre d'action mobile : visible après le héros, masquée sur le formulaire et le pied de page
  var cta = document.querySelector('.mobile-cta');
  var heroActions = document.querySelector('.hero-actions');
  if (cta && heroActions && 'IntersectionObserver' in window) {
    var seen = { hero: true, contact: false, footer: false };
    var update = function () {
      var show = !seen.hero && !seen.contact && !seen.footer;
      cta.classList.toggle('show', show);
      cta.setAttribute('aria-hidden', String(!show));
      cta.querySelector('a').tabIndex = show ? 0 : -1;
    };
    var watch = function (el, key) {
      if (!el) return;
      new IntersectionObserver(function (entries) {
        seen[key] = entries[0].isIntersecting;
        update();
      }).observe(el);
    };
    watch(heroActions, 'hero');
    watch(document.getElementById('contact'), 'contact');
    watch(document.querySelector('.site-footer'), 'footer');
  }

  // Menu : souligne la section en cours de lecture
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.main-nav a[href^="#"]'));
  if (navLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('active'); });
        if (byId[e.target.id]) byId[e.target.id].classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
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
