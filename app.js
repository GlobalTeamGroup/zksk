// ============================================================
//  ZKSK — app.js   (ScrollCanvas Engine — Frame-based)
//  864 frames, 7 pages, synced to native scroll
// ============================================================

const TOTAL_FRAMES = 864;
const PAGE_COUNT   = 7;
const LERP         = 0.02;
const CONCURRENCY  = 48;
const isMobile     = innerWidth < 768;
const FRAME_DIR    = isMobile ? 'frames-mobile' : 'frames-webp';

// ---- DOM refs ----
const canvas  = document.getElementById('scrollCanvas');
const ctx     = canvas.getContext('2d');
const pages   = Array.from(document.querySelectorAll('.page'));
const navLinks    = document.querySelectorAll('.desktop-nav .nav-link');
const mobileLinks = document.querySelectorAll('.mobile-nav .nav-link');

// ---- State ----
const frames = new Array(TOTAL_FRAMES);
let loadedCount  = 0;
let isReady      = false;
let currentFrame = 0;
let targetFrame  = 0;

// ---- Canvas resize ----
function resizeCanvas() {
  canvas.width  = innerWidth;
  canvas.height = innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================================
//  LOADER (created by JS, removed after all frames load)
// ============================================================
const loaderEl = document.createElement('div');
loaderEl.id = 'loader';
loaderEl.innerHTML = `
  <div class="loader-inner">
    <img src="logo.png" alt="ЗКСK" style="width:160px;height:160px;object-fit:contain;margin-bottom:12px">
    <div class="loader-logo">ЗКСK</div>
    <div class="loader-bar-wrap"><div class="loader-bar" id="loader-bar"></div></div>
    <div class="loader-pct" id="loader-pct">0%</div>
  </div>`;
document.body.appendChild(loaderEl);

const loaderCSS = document.createElement('style');
loaderCSS.textContent = `
  #loader {
    position:fixed; inset:0; z-index:9999;
    background:rgba(10,12,16,0.96);
    display:flex; align-items:center; justify-content:center;
    transition:opacity 0.8s ease;
    backdrop-filter:blur(8px);
  }
  #loader.fade-out { opacity:0; pointer-events:none; }
  .loader-inner { text-align:center; display:flex; flex-direction:column; align-items:center; gap:16px; }
  .loader-logo {
    font-family:'Montserrat',sans-serif;
    font-size:2.8rem; font-weight:700; letter-spacing:0.3em;
    color:#c9a84c;
    animation:loaderPulse 2s ease-in-out infinite;
  }
  @keyframes loaderPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  .loader-bar-wrap {
    width:260px; height:2px; background:rgba(201,168,76,.2);
    border-radius:2px; overflow:hidden;
  }
  .loader-bar {
    height:100%; width:0%;
    background:linear-gradient(90deg,#c9a84c,#e8c97a);
    border-radius:2px; transition:width 0.1s;
  }
  .loader-pct { font-size:.75rem; color:rgba(201,168,76,.6); letter-spacing:.15em; }
`;
document.head.appendChild(loaderCSS);

// ============================================================
//  FRAME LOADING
// ============================================================
function frameName(i) {
  return `${FRAME_DIR}/frame_${String(i + 1).padStart(6, '0')}.webp`;
}

async function loadFrame(idx) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      frames[idx] = img;
      loadedCount++;
      if (loadedCount === 1) { isReady = true; drawFrame(0); }
      const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
      const bar = document.getElementById('loader-bar');
      const pctEl = document.getElementById('loader-pct');
      if (bar) bar.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
      resolve();
    };
    img.onerror = () => { frames[idx] = null; loadedCount++; resolve(); };
    img.src = frameName(idx);
  });
}

async function loadAllFrames() {
  const queue = Array.from({ length: TOTAL_FRAMES }, (_, i) => i);
  async function worker() {
    while (queue.length > 0) {
      const idx = queue.shift();
      await loadFrame(idx);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
}

loadAllFrames().then(() => {
  isReady = true;
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => loader.remove(), 900);
  }
  if (pages[0]) pages[0].classList.add('is-active');
});

// ============================================================
//  DRAW FRAME (cover-fit to canvas)
// ============================================================
function drawFrame(idx) {
  const img = frames[Math.max(0, Math.min(idx, TOTAL_FRAMES - 1))];
  if (!img) return;
  const W = canvas.width, H = canvas.height;
  const r = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const iw = img.naturalWidth * r, ih = img.naturalHeight * r;
  const x = (W - iw) / 2, y = (H - ih) / 2;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, x, y, iw, ih);
  // Vignette
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.18, W/2, H/2, H*0.85);
  vig.addColorStop(0, 'rgba(10,12,16,0)');
  vig.addColorStop(1, 'rgba(10,12,16,0.7)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  // Bottom darkening
  const bot = ctx.createLinearGradient(0, H*0.6, 0, H);
  bot.addColorStop(0, 'rgba(10,12,16,0)');
  bot.addColorStop(1, 'rgba(10,12,16,0.85)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, H*0.6, W, H*0.4);
}

// ============================================================
//  SCROLL → FRAME MAPPING
// ============================================================
window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const progress = maxScroll > 0 ? scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

// ============================================================
//  RAF LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  currentFrame += (targetFrame - currentFrame) * LERP;
  if (isReady) drawFrame(Math.round(currentFrame));
}
animate();

// ============================================================
//  INTERSECTION OBSERVER — section activation
// ============================================================
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = pages.indexOf(entry.target);
      pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      navLinks.forEach((l, i) => l.classList.toggle('active', i === idx));
      mobileLinks.forEach((l, i) => l.classList.toggle('active', i === idx));
      // Scroll indicator
      const ind = document.getElementById('scroll-indicator');
      if (ind) ind.classList.toggle('hide', idx > 0);
    }
  });
}, { root: null, rootMargin: '-40% 0px -40% 0px' });

pages.forEach(p => observer.observe(p));

// ============================================================
//  SCROLL-TO-SECTION (nav clicks)
// ============================================================
document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    const idx = parseInt(el.dataset.page);
    if (pages[idx]) pages[idx].scrollIntoView({ behavior: 'smooth' });
    // Close mobile nav
    const mobileNav = document.getElementById('mobile-nav');
    const burger = document.getElementById('burger');
    if (mobileNav) mobileNav.classList.remove('open');
    if (burger) burger.classList.remove('open');
  });
});

document.querySelectorAll('a[href="#contacts"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    if (pages[6]) pages[6].scrollIntoView({ behavior: 'smooth' });
  });
});

// ============================================================
//  BURGER
// ============================================================
document.getElementById('burger').addEventListener('click', () => {
  document.getElementById('burger').classList.toggle('open');
  document.getElementById('mobile-nav').classList.toggle('open');
});

// NAVBAR SCROLL EFFECT removed — header stays translucent

// ============================================================
//  COUNTER ANIMATION
// ============================================================
const counters = document.querySelectorAll('.stat-num, .geo-stat-num');
const counterObserver = new IntersectionObserver((entries) => {
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
counters.forEach(c => counterObserver.observe(c));

// ============================================================
//  CONTACT FORM
// ============================================================
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('.btn-primary');
    if (btn) {
      btn.textContent = '✓ Заявка отправлена!';
      btn.style.background = 'linear-gradient(135deg,#2dd4a8,#1fa882)';
      setTimeout(() => {
        btn.textContent = 'Отправить заявку';
        btn.style.background = '';
        form.reset();
      }, 3500);
    }
  });
}

// ============================================================
//  GALLERY SCROLL (snap per item, full-width)
// ============================================================
(function() {
  const scroll = document.getElementById('gallery-scroll');
  const track = scroll ? scroll.querySelector('.gallery-track') : null;
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  const dotsWrap = document.getElementById('gallery-dots');
  if (!scroll || !track) return;

  // Enable CSS snap
  scroll.style.scrollSnapType = 'x mandatory';
  const items = track.querySelectorAll('.gallery-item');
  items.forEach(item => { item.style.scrollSnapAlign = 'start'; });

  // Create dots (one per photo)
  for (let i = 0; i < items.length; i++) {
    const dot = document.createElement('button');
    dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => scrollToItem(i));
    dotsWrap.appendChild(dot);
  }

  function scrollToItem(idx) {
    if (items[idx]) {
      scroll.scrollTo({ left: items[idx].offsetLeft, behavior: 'smooth' });
    }
  }

  function getActiveIdx() {
    const scrollLeft = scroll.scrollLeft;
    const itemW = items[0].offsetWidth + 10;
    return Math.round(scrollLeft / itemW);
  }

  function updateDots() {
    const idx = getActiveIdx();
    dotsWrap.querySelectorAll('.gallery-dot').forEach((d, i) =>
      d.classList.toggle('active', i === idx));
  }

  scroll.addEventListener('scroll', updateDots, { passive: true });

  prevBtn.addEventListener('click', () => {
    const idx = Math.max(0, getActiveIdx() - 1);
    scrollToItem(idx);
  });
  nextBtn.addEventListener('click', () => {
    const idx = Math.min(items.length - 1, getActiveIdx() + 1);
    scrollToItem(idx);
  });

  // Drag to scroll
  let isDragging = false, startX, scrollStart;
  scroll.addEventListener('mousedown', e => {
    isDragging = true; startX = e.pageX; scrollStart = scroll.scrollLeft;
    scroll.classList.add('grabbing');
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    e.preventDefault();
    scroll.scrollLeft = scrollStart - (e.pageX - startX);
  });
  window.addEventListener('mouseup', () => {
    isDragging = false; scroll.classList.remove('grabbing');
  });

  // ---- LIGHTBOX ----
  const srcs = Array.from(items).map(item => item.querySelector('img').src);
  let lightboxIdx = 0;
  let zoomLevel = 1;
  let panX = 0, panY = 0;

  // Create lightbox DOM
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `
    <button class="lightbox-close">✕</button>
    <button class="lightbox-nav lightbox-prev">←</button>
    <button class="lightbox-nav lightbox-next">→</button>
    <img class="lightbox-img" src="" alt="Gallery">
  `;
  document.body.appendChild(lb);

  const lbImg = lb.querySelector('.lightbox-img');
  const lbClose = lb.querySelector('.lightbox-close');
  const lbPrev = lb.querySelector('.lightbox-prev');
  const lbNext = lb.querySelector('.lightbox-next');

  function openLightbox(idx) {
    lightboxIdx = idx;
    lbImg.src = srcs[idx];
    resetZoom();
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.classList.remove('active');
    document.body.style.overflow = '';
    resetZoom();
  }

  function showPhoto(idx) {
    lightboxIdx = Math.max(0, Math.min(idx, srcs.length - 1));
    lbImg.src = srcs[lightboxIdx];
    resetZoom();
  }

  function resetZoom() {
    zoomLevel = 1; panX = 0; panY = 0;
    lbImg.style.transform = 'scale(1) translate(0px, 0px)';
    lbImg.classList.remove('zoomed');
  }

  function applyTransform() {
    lbImg.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
    lbImg.classList.toggle('zoomed', zoomLevel > 1);
  }

  // Click to open
  items.forEach((item, i) => {
    item.addEventListener('click', (e) => {
      if (isDragging) return;
      openLightbox(i);
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => showPhoto(lightboxIdx - 1));
  lbNext.addEventListener('click', () => showPhoto(lightboxIdx + 1));

  // Click background to close
  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });

  // Click image to toggle zoom
  lbImg.addEventListener('click', (e) => {
    e.stopPropagation();
    if (zoomLevel > 1) {
      resetZoom();
    } else {
      zoomLevel = 2.5;
      applyTransform();
    }
  });

  // Mouse wheel zoom
  lb.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomLevel = Math.max(1, Math.min(5, zoomLevel + (e.deltaY > 0 ? -0.3 : 0.3)));
    if (zoomLevel <= 1) { resetZoom(); return; }
    applyTransform();
  }, { passive: false });

  // Pan when zoomed
  let isPanning = false, panStartX, panStartY, panOriginX, panOriginY;
  lbImg.addEventListener('mousedown', (e) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    panOriginX = panX; panOriginY = panY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = panOriginX + (e.clientX - panStartX) / zoomLevel;
    panY = panOriginY + (e.clientY - panStartY) / zoomLevel;
    applyTransform();
  });
  window.addEventListener('mouseup', () => { isPanning = false; });

  // Touch pinch-to-zoom
  let lastTouchDist = 0;
  lbImg.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                                  e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  lbImg.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                               e.touches[0].clientY - e.touches[1].clientY);
      const delta = (dist - lastTouchDist) * 0.01;
      zoomLevel = Math.max(1, Math.min(5, zoomLevel + delta));
      lastTouchDist = dist;
      if (zoomLevel <= 1) { resetZoom(); return; }
      applyTransform();
    }
  }, { passive: false });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPhoto(lightboxIdx - 1);
    if (e.key === 'ArrowRight') showPhoto(lightboxIdx + 1);
  });
})();

