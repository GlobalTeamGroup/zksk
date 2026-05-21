/* ═══════════════════════════════════════════
   ZKSK — Cinematic Scroll Engine (Video-based)
   Uses HTML5 video.currentTime seek instead of image sequences.
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONFIG ── */
  const VIDEO_COUNT   = 9;
  const PAGES         = 6;
  const SCROLL_HEIGHT = 10800;           // total scrollable height (px)
  const LERP_FACTOR   = 0.06;

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
  let videos       = [];
  let videoDurations = [];
  let totalDuration  = 0;
  let loadedCount    = 0;
  let currentTime    = 0;  // global time (sum of all video durations)
  let targetTime     = 0;
  let activePage     = 0;
  let lastScroll     = 0;
  let headerHidden   = false;

  /* ── RESIZE ── */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    uiLayer.style.height = SCROLL_HEIGHT + 'px';
  }

  /* ── DRAW ── */
  function drawCurrentFrame() {
    // Find which video and what time within it
    let accumulated = 0;
    let videoIdx = 0;
    let localTime = 0;

    for (let i = 0; i < VIDEO_COUNT; i++) {
      if (currentTime < accumulated + videoDurations[i]) {
        videoIdx = i;
        localTime = currentTime - accumulated;
        break;
      }
      accumulated += videoDurations[i];
      if (i === VIDEO_COUNT - 1) {
        videoIdx = VIDEO_COUNT - 1;
        localTime = videoDurations[VIDEO_COUNT - 1];
      }
    }

    const video = videos[videoIdx];
    if (!video || video.readyState < 2) return;

    // Seek video
    const clampedTime = Math.max(0, Math.min(localTime, video.duration || 0));
    if (Math.abs(video.currentTime - clampedTime) > 0.03) {
      video.currentTime = clampedTime;
    }

    // Draw to canvas
    const cw = canvas.width / Math.min(window.devicePixelRatio || 1, 2);
    const ch = canvas.height / Math.min(window.devicePixelRatio || 1, 2);
    const iw = video.videoWidth;
    const ih = video.videoHeight;
    if (!iw || !ih) return;

    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(video, dx, dy, dw, dh);
  }

  /* ── PAGE ACTIVATION ── */
  function setActivePage(idx) {
    if (idx === activePage) return;
    activePage = idx;
    pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
    document.querySelectorAll('.nav-link').forEach(l =>
      l.classList.toggle('active', parseInt(l.dataset.page) === idx)
    );
    if (indicator) indicator.classList.toggle('hide', idx > 0);
  }

  /* ── SCROLL HANDLER ── */
  function onScroll() {
    const scrollY  = window.pageYOffset || document.documentElement.scrollTop;
    const progress = scrollY / Math.max(1, SCROLL_HEIGHT - window.innerHeight);
    targetTime     = progress * totalDuration;

    const pageIdx = Math.min(PAGES - 1, Math.floor(progress * PAGES));
    setActivePage(pageIdx);

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
    currentTime += (targetTime - currentTime) * LERP_FACTOR;
    drawCurrentFrame();
    requestAnimationFrame(loop);
  }

  /* ── LOAD VIDEOS ── */
  function loadVideos() {
    for (let i = 1; i <= VIDEO_COUNT; i++) {
      const video = document.createElement('video');
      video.src = `videos/${i}.mp4`;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      video.style.display = 'none';
      document.body.appendChild(video);

      video.addEventListener('loadedmetadata', () => {
        videoDurations[i - 1] = video.duration;
        loadedCount++;
        if (loadedCount >= VIDEO_COUNT) {
          totalDuration = videoDurations.reduce((a, b) => a + b, 0);
          preloader.classList.add('hidden');
        }
      });

      video.addEventListener('error', () => {
        videoDurations[i - 1] = 8; // fallback 8s
        loadedCount++;
        if (loadedCount >= VIDEO_COUNT) {
          totalDuration = videoDurations.reduce((a, b) => a + b, 0);
          preloader.classList.add('hidden');
        }
      });

      videos[i - 1] = video;
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
        if (mobileNav.classList.contains('open')) {
          mobileNav.classList.remove('open');
          burger.classList.remove('open');
        }
      });
    });

    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });

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
    loadVideos();
    setupNav();
    animateCounters();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    loop();
    setActivePage(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
