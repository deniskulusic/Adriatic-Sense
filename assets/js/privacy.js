// Respect reduced-motion: skip Lenis if user prefers less motion
    const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced && typeof Lenis === 'function') {
      const lenis = new Lenis({
        duration: 1.1,           // feel free to tweak
        smoothWheel: true,
        smoothTouch: false,
        // easing: (t) => 1 - Math.pow(1 - t, 3), // optional custom easing
      });

      // rAF loop drives Lenis
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      // Make in-page links use Lenis (with optional sticky-header offset)
      const STICKY_OFFSET = 56; // change if your header height differs
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('href');
          if (id.length < 2) return;
          const el = document.querySelector(id);
          if (!el) return;
          e.preventDefault();
          lenis.scrollTo(el, { offset: -STICKY_OFFSET });
          history.pushState(null, '', id);
        });
      });

      // Optional: if page loads with a hash, smooth to it
      if (location.hash) {
        const el = document.querySelector(location.hash);
        if (el) setTimeout(() => lenis.scrollTo(el, { offset: -STICKY_OFFSET }), 50);
      }

      // For console debugging
      window.__lenis = lenis;
    } else {
      // Gentle native fallback
      document.documentElement.style.scrollBehavior = 'smooth';
      console.info('[Lenis] Skipped (reduced-motion or script unavailable).');
    }