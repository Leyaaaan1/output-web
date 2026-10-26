/* Tells the CSS that JavaScript is running (scroll animations only apply then) */
document.documentElement.classList.add('js');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Mobile menu ---------- */
const menuButton = document.querySelector('.menu');
const nav = document.getElementById('nav');

menuButton.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', isOpen);
});
nav.addEventListener('click', (event) => {
  if (event.target.closest('a')) {            // close the menu after choosing a link
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', false);
  }
});

/* ---------- Header shadow + highlight the current section in the menu ---------- */
const header = document.querySelector('header');
const navLinks = [...document.querySelectorAll('nav a[href^="#"]:not(.call)')];
const targets = navLinks.map((link) => document.querySelector(link.getAttribute('href')));

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 10);
  let current = 0;                             // last section whose top has passed the header
  targets.forEach((section, i) => {
    if (section && section.getBoundingClientRect().top <= 120) current = i;
  });
  navLinks.forEach((link, i) => link.classList.toggle('active', i === current));
}
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => { updateHeader(); ticking = false; });
    ticking = true;
  }
});
updateHeader();

/* ---------- Photo album: one photo per page, Previous / Next ---------- */
const slides = [...document.querySelectorAll('.gal-slide')];
const galCount = document.getElementById('gal-count');
const galAlbum = document.querySelector('.gal-album');
let page = 0;

function showPage(next, direction) {
  slides[page].hidden = true;
  slides[page].classList.remove('active');
  page = (next + slides.length) % slides.length;        // wraps around at both ends
  const slide = slides[page];
  slide.querySelector('img').loading = 'eager';
  slide.style.setProperty('--slide-from', direction > 0 ? '24px' : '-24px');
  slide.hidden = false;
  slide.classList.add('active');
  galCount.textContent = `Photo ${page + 1} of ${slides.length}`;
}

document.querySelectorAll('.gal-btn').forEach((button) => {
  button.addEventListener('click', () => {
    const direction = button.dataset.dir === 'next' ? 1 : -1;
    showPage(page + direction, direction);
  });
});

if (galAlbum) {
  galAlbum.addEventListener('keydown', (event) => {      // arrow keys when the album is focused
    if (event.key === 'ArrowRight') showPage(page + 1, 1);
    if (event.key === 'ArrowLeft') showPage(page - 1, -1);
  });
  let touchX = null;                                      // swipe on phones
  galAlbum.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  galAlbum.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) showPage(page + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
}

/* ---------- Fade in blocks as they scroll into view ---------- */
if (!reduceMotion && 'IntersectionObserver' in window) {
  const selector = '.card, .form-panel, .map, .yelp, .about-inner, .proof-inner, details, .gal-head, .gal-album, .gal-controls, .search, .path, .review, .fact, .areas';
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(selector).forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;   // already visible: leave alone
    const siblings = [...el.parentElement.children];
    el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 3) * 90}ms`; // small stagger in a row
    el.classList.add('reveal');
    observer.observe(el);
  });
}

/* ---------- Sales number counts up once ($28.5M) ---------- */
const stat = document.querySelector('.proof .num');
if (stat && !reduceMotion && 'IntersectionObserver' in window) {
  const parts = stat.textContent.trim().match(/^(\D*)([\d.]+)(\D*)$/);   // "$" + "28.5" + "M"
  if (parts) {
    const [, prefix, value, suffix] = parts;
    const end = parseFloat(value);
    const countObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      countObserver.disconnect();
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / 1200, 1);
        stat.textContent = `${prefix}${(end * t).toFixed(1)}${suffix}`;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    countObserver.observe(stat);
  }
}

/* ---------- "Open now / Closed" badge (office hours: daily 8am-7pm, Pahrump time) ---------- */
const badge = document.getElementById('open-badge');
if (badge) {
  const pahrump = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const isOpen = pahrump.getHours() >= 8 && pahrump.getHours() < 19;
  badge.textContent = isOpen ? 'Open now' : 'Closed now';
  badge.classList.add(isOpen ? 'open' : 'closed');
}

/* ---------- Floating Call button (shown on phones and tablets by the CSS) ---------- */
const call = document.createElement('a');
call.className = 'fab-call';
call.href = 'tel:2069196886';
call.textContent = 'Call Now';
document.body.appendChild(call);

/* ---------- Buttons that pre-select the "I'm looking to" choice in the contact form ---------- */
document.querySelectorAll('[data-intent]').forEach((link) => {
  link.addEventListener('click', () => {
    const select = document.getElementById('intent');
    if (select) select.value = link.dataset.intent;
  });
});

/* ---------- Contact form ----------
   To go live: create a free form endpoint (for example at formspree.io) and paste its URL into
   data-endpoint on <form id="form"> in index.html. Until then the form only shows a demo message. */
const form = document.getElementById('form');
const formMsg = document.getElementById('msg');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (form.elements.website.value) return;               // spam trap: real people leave it empty
  const endpoint = form.dataset.endpoint;
  if (!endpoint) {
    formMsg.textContent =
      'Thank you! This preview form is not connected to email yet, so please also call (206) 919-6886.';
    return;
  }
  formMsg.textContent = 'Sending...';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('Request failed');
    form.reset();
    formMsg.textContent = 'Thank you! Marci\u2019s team will be in touch soon.';
  } catch (error) {
    formMsg.textContent = 'Sorry, that did not send. Please call (206) 919-6886.';
  }
});