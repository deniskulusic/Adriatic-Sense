(function () {
  // Respect user's motion preferences
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    console.info('[Lenis] Disabled due to prefers-reduced-motion.');
    document.documentElement.style.scrollBehavior = 'smooth';
    return;
  }

  // Check if Lenis is loaded
  if (typeof window.Lenis !== 'function') {
    console.warn('[Lenis] Lenis library not found. Using native scrolling.');
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

  window.__lenis = lenis; // Expose globally for debugging

  // Start the RAF loop
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  /* ======================================================
     HEADER + MENU LOGIC
     ====================================================== */
  const header = document.querySelector('header');
  const menu = document.querySelector('.menu-full');
  if (header) header.classList.add('header-loaded');
  if (!menu) return;

  let threshold = window.innerHeight; // 100vh

  // Helper to get scroll position (works with Lenis)
  const getY = () =>
    (window.__lenis && typeof window.__lenis.scroll === 'number')
      ? window.__lenis.scroll
      : (window.scrollY || document.documentElement.scrollTop || 0);

  const applyMenuState = () => {
    const y = getY();

    // A) Add/remove menu-filled when scrolling past viewport height - 100
    if (y > window.innerHeight - 100) {
      menu.classList.add('menu-filled');
    } else {
      menu.classList.remove('menu-filled');
    }

    // C) Invert menu after 100vh scroll
    if (y >= threshold) {
      menu.classList.add('inverted');
    } else {
      menu.classList.remove('inverted');
    }
  };

  // Update threshold on resize
  const onResize = () => {
    threshold = window.innerHeight;
    applyMenuState();
  };
  window.addEventListener('resize', onResize, { passive: true });

  // Hook into Lenis scroll or fallback
  if (typeof lenis.on === 'function') {
    lenis.on('scroll', applyMenuState);
  } else {
    window.addEventListener('scroll', applyMenuState, { passive: true });
  }

  // Run once on load
  applyMenuState();

  /* ======================================================
     PARALLAX VIA [data-lenis-speed]
     ====================================================== */
  const SCALE = 0.1; // Adjust for sensitivity

  lenis.on('scroll', ({ scroll }) => {
    const elements = document.querySelectorAll('[data-lenis-speed]');
    elements.forEach((el) => {
      const speed = parseFloat(el.dataset.lenisSpeed) || 0;
      el.style.transform = `translate3d(0, ${scroll * speed * SCALE}px, 0)`;
    });
  });
})();