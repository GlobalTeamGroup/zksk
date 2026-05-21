/* ═══════════════════════════════════════════
   ZKSK — Cinematic Scroll Engine
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONFIG ── */
  const TOTAL_FRAMES  = 864;
  const PAGES         = 6;
  const FRAMES_PER_PG = TOTAL_FRAMES / PAGES;      // 150
  const SCROLL_HEIGHT = TOTAL_FRAMES * 12;          // px per frame
  const LERP_FACTOR   = 0.035;
  const MOBILE_BP     = 768;

  /* ── ELEMENTS ── */
  const canvas    = document.getElementById('scrollCanvas');
  const ctx       = canvas.getContext('2d');
  const uiLayer   = document.getElementById('ui-layer');
  const pages     = Array.from(document.querySelectorAll('.page'));
  const preloader = document.getElementById('preloader');
  const indicator = document.getElementById('scroll-indicator');
  const header    = document.getElementById('site-header');
  const burger    = document.getElementById('burger');
  const mobileNav = document.getElementById('mobile-nav');

  /* ── STATE ── */
  let images       = [];
  let loaded       = 0;
  let currentFrame = 0;
  let targetFrame  = 0;
  let activePage   = 0;
  let lastScroll   = 0;
  let headerHidden = false;
  let rafId        = null;

  /* ── HELPERS ── */
  function isMobile() { return window.innerWidth <= MOBILE_BP; }

  function framePath(i) {
    const dir = isMobile() ? 'mobile' : 'desktop';
    const num = String(i + 1).padStart(4, '0');
    return `frames/${dir}/frame_${num}.jpg`;
  }

  /* ── RESIZE ── */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    uiLayer.style.height = SCROLL_HEIGHT + 'px';
    drawFrame(Math.round(currentFrame));
  }

  /* ── DRAW ── */
  function drawFrame(idx) {
    idx = Math.max(0, Math.min(TOTAL_FRAMES - 1, idx));
    const img = images[idx];
    if (!img || !img.complete || !img.naturalWidth) return;

    const cw = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const ch = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /* ── PAGE ACTIVATION ── */
  function setActivePage(idx) {
    if (idx === activePage) return;
    activePage = idx;
    pages.forEach((p, i) => {
      p.classList.toggle('is-active', i === idx);
    });
    // Update nav
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', parseInt(l.dataset.page) === idx);
    });
    // Scroll indicator
    if (indicator) {
      indicator.classList.toggle('hide', idx > 0);
    }
  }

  /* ── SCROLL HANDLER ── */
  function onScroll() {
    const scrollY  = window.pageYOffset || document.documentElement.scrollTop;
    const progress = scrollY / (SCROLL_HEIGHT - window.innerHeight);
    targetFrame    = progress * (TOTAL_FRAMES - 1);

    // Page index
    const pageIdx = Math.min(PAGES - 1, Math.floor(progress * PAGES));
    setActivePage(pageIdx);

    // Header hide/show
    const goingDown = scrollY > lastScroll && scrollY > 200;
    if (goingDown && !headerHidden) {
      header.style.transform = 'translateX(-50%) translateY(-120%)';
      headerHidden = true;
    } else if (!goingDown && headerHidden) {
      header.style.transform = 'translateX(-50%) translateY(0)';
      headerHidden = false;
    }
    lastScroll = scrollY;
  }

  /* ── ANIMATION LOOP ── */
  function loop() {
    currentFrame += (targetFrame - currentFrame) * LERP_FACTOR;
    drawFrame(Math.round(currentFrame));
    rafId = requestAnimationFrame(loop);
  }

  /* ── LOAD FRAMES ── */
  function loadFrames() {
    const batchSize = 6;
    let queue = 0;

    function loadNext(i) {
      if (i >= TOTAL_FRAMES) return;
      const img = new Image();
      img.onload = img.onerror = function () {
        loaded++;
        queue--;
        // Update preloader
        if (loaded >= Math.min(30, TOTAL_FRAMES)) {
          preloader.classList.add('hidden');
        }
        // Continue loading
        const next = i + 1;
        if (next < TOTAL_FRAMES && queue < batchSize) {
          loadNext(next);
        }
      };
      img.src = framePath(i);
      images[i] = img;
      queue++;
    }

    // Prioritize first 30 frames for fast start
    for (let i = 0; i < Math.min(batchSize, TOTAL_FRAMES); i++) {
      loadNext(i);
    }
  }

  /* ── NAV CLICKS ── */
  function setupNav() {
    document.querySelectorAll('[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageIdx = parseInt(link.dataset.page);
        const scrollTo = (pageIdx / PAGES) * SCROLL_HEIGHT;
        window.scrollTo({ top: scrollTo, behavior: 'smooth' });
        // Close mobile nav
        if (mobileNav.classList.contains('open')) {
          mobileNav.classList.remove('open');
          burger.classList.remove('open');
        }
      });
    });

    // Burger
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });

    // CTA links
    document.querySelectorAll('a[href="#contacts"]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const scrollTo = (5 / PAGES) * SCROLL_HEIGHT;
        window.scrollTo({ top: scrollTo, behavior: 'smooth' });
      });
    });
  }

  /* ── COUNTER ANIMATION ── */
  function animateCounters() {
    const counters = document.querySelectorAll('.stat-num, .geo-stat-num');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = 'true';
          const text = entry.target.textContent;
          const match = text.match(/(\d+)/);
          if (match) {
            const target = parseInt(match[1]);
            const suffix = text.replace(match[1], '');
            let current = 0;
            const step = Math.ceil(target / 40);
            const interval = setInterval(() => {
              current = Math.min(current + step, target);
              entry.target.textContent = current + suffix;
              if (current >= target) clearInterval(interval);
            }, 30);
          }
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => observer.observe(c));
  }

  /* ── INIT ── */
  function init() {
    resize();
    loadFrames();
    setupNav();
    animateCounters();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);

    // Start render loop
    loop();

    // Initial state
    setActivePage(0);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

