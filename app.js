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
//  GALLERY SCROLL
// ============================================================
(function() {
  const scroll = document.getElementById('gallery-scroll');
  const track = scroll ? scroll.querySelector('.gallery-track') : null;
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  const dotsWrap = document.getElementById('gallery-dots');
  if (!scroll || !track) return;

  const items = track.querySelectorAll('.gallery-item');
  const totalDots = Math.ceil(items.length / 3);

  // Create dots
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement('button');
    dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => scrollToGroup(i));
    dotsWrap.appendChild(dot);
  }

  function scrollToGroup(idx) {
    const item = items[idx * 3];
    if (item) scroll.scrollTo({ left: item.offsetLeft - 24, behavior: 'smooth' });
  }

  function updateDots() {
    const scrollLeft = scroll.scrollLeft;
    const itemWidth = items[0].offsetWidth + 16;
    const activeIdx = Math.min(Math.round(scrollLeft / (itemWidth * 3)), totalDots - 1);
    dotsWrap.querySelectorAll('.gallery-dot').forEach((d, i) =>
      d.classList.toggle('active', i === activeIdx));
  }

  scroll.addEventListener('scroll', updateDots, { passive: true });

  prevBtn.addEventListener('click', () => {
    const itemWidth = items[0].offsetWidth + 16;
    scroll.scrollBy({ left: -itemWidth * 3, behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', () => {
    const itemWidth = items[0].offsetWidth + 16;
    scroll.scrollBy({ left: itemWidth * 3, behavior: 'smooth' });
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
})();
