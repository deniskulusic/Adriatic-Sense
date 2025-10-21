(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // If user prefers reduced motion, skip Lenis entirely (accessibility first)
  if (prefersReduced) {
    console.info('[Lenis] Disabled due to prefers-reduced-motion.');
    document.documentElement.style.scrollBehavior = 'smooth';
    return;
  }

  if (typeof window.Lenis !== 'function') {
    console.warn('[Lenis] CDN failed or unavailable. Falling back to native scrolling.');
    return;
  }

  // Initialize Lenis
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    lerp: 0.1,
    smoothWheel: true,
    smoothTouch: false
  });
    // Collect targets
    const textEls  = Array.from(document.querySelectorAll('.reveal-text'));
    const imageEls = Array.from(document.querySelectorAll('.reveal-image'));
    const targets  = [...textEls, ...imageEls];

    if (!targets.length) return;

    // Optional: lightweight stagger for siblings
    const applyStagger = (els, base = 70) => {
      els.forEach((el, i) => {
        if (!el.matches('.reveal-text')) return;
        el.dataset.stagger = "1";
        el.style.setProperty('--stagger', `${i * base}ms`);
      });
    };

    // Group consecutive reveal-text siblings for nicer stagger
    let group = [];
    const flushGroup = () => { if (group.length) { applyStagger(group); group = []; } };
    textEls.forEach((el, i) => {
      const prev = textEls[i - 1];
      if (prev && prev.parentElement === el.parentElement) {
        group.push(el);
        if (!group.includes(prev)) group.unshift(prev);
      } else {
        flushGroup();
        group = [el];
      }
    });
    flushGroup();

    // If reduced motion, just mark them visible and bail
    if (prefersReduced) {
      targets.forEach(el => el.classList.add('is-inview'));
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          // Unobserve once revealed (one-time animation)
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      // Reveal a bit before fully on screen for a snappier feel
      rootMargin: '0px 0px -15% 0px',
      threshold: 0.12
    });

    targets.forEach(t => io.observe(t));

    // Optional: if you use Lenis, ensure IO gets regular rAF ticks (helps on some mobile browsers)
    // Your rAF already runs; but we can ping IO’s internal checks during scroll:
    if (window.__lenis) {
      window.__lenis.on('scroll', () => { /* no-op; forces layout/paint cadence with Lenis */ });
    }
  // rAF loop — drives Lenis updates
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Optional: scroll to hash on load if URL contains one (with header offset)
  const stickyOffset = 64; // header height in px
  if (window.location.hash) {
    const el = document.querySelector(window.location.hash);
    if (el) {
      setTimeout(() => lenis.scrollTo(el, { offset: -stickyOffset }), 50);
    }
  }

  // Enhance all in-page anchor links to use Lenis
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const el = document.querySelector(targetId);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -stickyOffset });
      history.pushState(null, '', targetId); // optional
    });
  });

  // Expose for debugging in the console
  window.__lenis = lenis;

  /* ===== BASIC ===== */
  const header = document.querySelector('header');
  if (header) header.classList.add('header-loaded');

  // Parallax via [data-lenis-speed]
  const SCALE = 0.1;
  lenis.on('scroll', ({ scroll }) => {
    document.querySelectorAll('[data-lenis-speed]').forEach((el) => {
      const speed = parseFloat(el.dataset.lenisSpeed) || 0;
      el.style.transform = `translate3d(0, ${scroll * speed * SCALE}px, 0)`;
    });
  });


 // ========== Shared cursor bubble ==========
  const cursor = document.createElement('div');
  cursor.className = 'drag-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = `<span class="label">scroll</span><div class="ring" aria-hidden="true"></div>`;
  document.body.appendChild(cursor);

  let cursorRAF = null;
  let cursorX = 0, cursorY = 0;
  let targetX = 0, targetY = 0;
  let cursorScale = 1, targetScale = 1;

  function showCursor(){ cursor.classList.add('show'); if(cursorRAF==null) cursorLoop(); }
  function hideCursor(){ cursor.classList.remove('show'); if(cursorRAF!=null){ cancelAnimationFrame(cursorRAF); cursorRAF=null; } }

  function cursorLoop(){
    cursorX += (targetX - cursorX) * 0.18;
    cursorY += (targetY - cursorY) * 0.18;
    cursorScale += (targetScale - cursorScale) * 0.15;
    cursor.style.left = cursorX + 'px';
    cursor.style.top  = cursorY + 'px';
    cursor.style.transform = `translate(-50%, -50%) scale(${cursorScale})`;
    cursorRAF = requestAnimationFrame(cursorLoop);
  }

  // Hide helper on touch
  window.addEventListener('touchstart', () => hideCursor(), { passive: true });

  // ========== Slider initializer ==========
  function initSlider(root){
    const viewport = root.querySelector('.slider-viewport');
    const track    = root.querySelector('.slider-track');
    if(!viewport || !track) return;

    const btnPrev = root.querySelector('.slider-btn.prev');
    const btnNext = root.querySelector('.slider-btn.next');

    let offset = 0;           // current translateX in px (<= 0)
    let maxScroll = 0;        // positive number of px we can scroll to the left
    let isDragging = false;
    let startX = 0;
    let startOffset = 0;
    let lastX = 0;
    let lastTs = 0;
    let velocity = 0;         // px/ms
    let momentumRAF = null;

    const DRAG_THRESHOLD = 3; // px before we consider it a drag (prevents "jump")

    function measure(){
      // Compute the real scrollable width from layout
      // scrollWidth includes margins/gaps as laid out by CSS (better than constants)
      const totalWidth = track.scrollWidth;
      const viewW = viewport.clientWidth;
      maxScroll = Math.max(0, totalWidth - viewW);
      // Clamp current offset to new bounds
      offset = clampOffset(offset);
    }

    function clampOffset(x){
      const v = (x ?? offset);
      // offset is negative or 0; rightmost is 0, leftmost is -maxScroll
      return Math.max(-maxScroll, Math.min(0, v));
    }

    function render(){
      track.style.transform = `translateX(${offset}px)`;
      if (btnPrev) btnPrev.disabled = (offset >= 0);
      if (btnNext) btnNext.disabled = (-offset >= maxScroll - 0.5);
    }

    function update(){
      measure();
      render();
    }

    function next(){ offset = clampOffset(offset - stepGuess()); render(); }
    function prev(){ offset = clampOffset(offset + stepGuess()); render(); }

    // If you still want step buttons, guess a step by first card width (fallback 300)
    function stepGuess(){
      const firstCard = track.querySelector('.card');
      return firstCard ? (firstCard.getBoundingClientRect().width +
                         parseFloat(getComputedStyle(firstCard).marginRight||0) +
                         parseFloat(getComputedStyle(firstCard).marginLeft||0)) : 300;
    }

    // Momentum
    function stopMomentum(){ if (momentumRAF!=null) cancelAnimationFrame(momentumRAF); momentumRAF=null; }
    function startMomentum(){
      stopMomentum();
      const decay = 0.95;
      const minVel = 0.05; // px/ms
      const frame = () => {
        velocity *= decay;
        if (Math.abs(velocity) < minVel){
          stopMomentum();
          return;
        }
        const before = offset;
        offset = clampOffset(offset + velocity * 16); // ~16ms per frame
        render();
        // If we hit an edge, kill momentum immediately
        if (offset === 0 || offset === -maxScroll) {
          stopMomentum();
          return;
        }
        // If nothing changed (rare), stop
        if (offset === before){ stopMomentum(); return; }
        momentumRAF = requestAnimationFrame(frame);
      };
      momentumRAF = requestAnimationFrame(frame);
    }

    // Pointer Events (covers mouse, touch, pen)
    viewport.addEventListener('pointerenter', () => { showCursor(); cursor.querySelector('.label').textContent='scroll'; });
    viewport.addEventListener('pointerleave', () => { hideCursor(); targetScale=1; });

    viewport.addEventListener('pointermove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    });

    viewport.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return; // left button only for mouse
      viewport.setPointerCapture(e.pointerId);
      stopMomentum();
      isDragging = true;
      startX = lastX = e.clientX;
      startOffset = offset;
      lastTs = performance.now();
      velocity = 0;
      cursor.querySelector('.label').textContent='drag';
      targetScale = 0.9;
      // prevent text/image selection
      viewport.classList.add('dragging');
      e.preventDefault();
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const now = performance.now();
      const dxRaw = e.clientX - startX;

      // Apply threshold to avoid initial “jump”
      const dx = Math.abs(dxRaw) < DRAG_THRESHOLD ? 0 : dxRaw;
      offset = clampOffset(startOffset + dx);
      render();

      const dt = now - lastTs || 16;
      velocity = (e.clientX - lastX) / dt; // px/ms
      lastX = e.clientX;
      lastTs = now;

      // Scale cursor with speed (faster => smaller)
      const speed = Math.min(Math.abs(velocity) * 30, 1);
      targetScale = 1 - speed * 0.35;
    });

    function endDrag(){
      if (!isDragging) return;
      isDragging = false;
      viewport.classList.remove('dragging');
      cursor.querySelector('.label').textContent='scroll';
      targetScale = 1;

      // If we are at the edge, don't bother starting momentum
      if (offset === 0 || offset === -maxScroll) { velocity = 0; return; }
      startMomentum();
    }

    viewport.addEventListener('pointerup',   endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('lostpointercapture', endDrag);

    // Buttons
    if (btnNext) btnNext.addEventListener('click', next);
    if (btnPrev) btnPrev.addEventListener('click', prev);

    // Resize-aware (handles responsive images/content)
    const roViewport = new ResizeObserver(() => update());
    const roTrack    = new ResizeObserver(() => update());
    roViewport.observe(viewport);
    roTrack.observe(track);
    window.addEventListener('load', update); // ensure images are loaded
    update();
  }

  // Initialize all .slider sections
  document.querySelectorAll('.slider').forEach(initSlider);


















  const growSections = Array.from(document.querySelectorAll('.grow-section'));
  if (growSections.length) {
    const toPx = (val) => {
      if (typeof val !== 'string') return Number(val) || 0;
      if (val.endsWith('vh')) return (parseFloat(val) / 100) * window.innerHeight;
      if (val.endsWith('vw')) return (parseFloat(val) / 100) * window.innerWidth;
      if (val.endsWith('px')) return parseFloat(val);
      return parseFloat(val) || 0;
    };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp  = (a, b, t) => a + (b - a) * t;

    const state = growSections.map((section) => {
      const pin   = section.querySelector('.pin');
      const frame = section.querySelector('.frame');
      const video = frame ? frame.querySelector('img') : null;

      // Frame (container) scale range
      const startScale = parseFloat(section.dataset.growStart || 0.7);
      const endScale   = parseFloat(section.dataset.growEnd   || 1.0);

      // Video: its own range + a curve exponent to change the pace
      const vStart = parseFloat(section.dataset.videoStart ?? startScale);
      const vEnd   = parseFloat(section.dataset.videoEnd   ?? endScale);
      const vCurve = parseFloat(section.dataset.videoCurve || 1); // 1=linear, <1 ease-out, >1 ease-in

      const distStr = section.dataset.growDistance
        || getComputedStyle(section).getPropertyValue('--grow-distance')
        || '120vh';
      let growDistance = toPx(distStr);

      // Sync section height (pin duration)
      section.style.setProperty('--grow-distance', `${growDistance}px`);
      section.style.height = `calc(100vh + ${growDistance}px)`;

      // Initial transforms (in case CSS didn’t set them)
      if (frame && !frame.style.transform) frame.style.transform = `scale(${startScale})`;
      if (video && !video.style.transform) video.style.transform = `scale(${vStart})`;

      return { section, pin, frame, video, startScale, endScale, vStart, vEnd, vCurve, growDistance };
    });

    function updateGrow() {
      state.forEach((s) => {
        if (!s.section || !s.frame) return;
        const rect = s.section.getBoundingClientRect();

        // Base progress while pinned
        const p = clamp((-rect.top) / s.growDistance, 0, 1);

        // Frame: linear
        const frameScale = lerp(s.startScale, s.endScale, p);
        s.frame.style.transform = `scale(${frameScale})`;
        if (frameScale >= 1) {
          document.querySelector(".overlay").classList.add('overlay-text-active');
        }
        // Video: apply curve to change pace
        const pv = Math.pow(p, s.vCurve); // <1 = faster at start, >1 = slower at start
        const videoScale = lerp(s.vStart, s.vEnd, clamp(pv, 0, 1));
        if (s.video) s.video.style.transform = `scale(${videoScale})`;
      });
    }

    function recomputeDistances() {
      state.forEach((s) => {
        const distStr = s.section.dataset.growDistance
          || getComputedStyle(s.section).getPropertyValue('--grow-distance')
          || '120vh';
        s.growDistance = toPx(distStr);
        s.section.style.setProperty('--grow-distance', `${s.growDistance}px`);
        s.section.style.height = `calc(100vh + ${s.growDistance}px)`;
      });
      updateGrow();
    }

    // Hook into Lenis + resize
    if (window.__lenis) window.__lenis.on('scroll', updateGrow);
    window.addEventListener('resize', recomputeDistances);
    updateGrow();
  }


 document.querySelector(".han-menu-full").addEventListener("click", function(){
  document.querySelector(".menu-full").classList.toggle("menu-active");
 });
 const menu = document.querySelector('.menu-full');
    if (!menu) return;

    let threshold = window.innerHeight; // 100vh
    const getY = () =>
      (window.__lenis && typeof window.__lenis.scroll === 'number')
        ? window.__lenis.scroll
        : (window.scrollY || document.documentElement.scrollTop || 0);

    const apply = () => {
      const y = getY();
      if (y >= threshold) {
        menu.classList.add('inverted');
      } else {
        menu.classList.remove('inverted');
      }
    };

    // Keep threshold in sync with viewport changes
    const onResize = () => {
      threshold = window.innerHeight;
      apply();
    };
    window.addEventListener('resize', onResize, { passive: true });

    // Hook into Lenis if available; otherwise fall back to native scroll
    if (window.__lenis && typeof window.__lenis.on === 'function') {
      window.__lenis.on('scroll', apply);
    } else {
      window.addEventListener('scroll', apply, { passive: true });
    }

    // Run once on load
    apply();
  
})();
