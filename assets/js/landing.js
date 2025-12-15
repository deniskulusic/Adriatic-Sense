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


const VH = () => window.innerHeight || document.documentElement.clientHeight;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const items = Array.from(document.querySelectorAll('.section-3-element-holder , .section-7-holder , .section-10-img-holder , .blog-element-holder'))
    .map(el => {
      const picture = el.querySelector('picture');
      const img = picture && picture.querySelector('img');
      if (!picture || !img) return null;

      const scale = parseFloat(img.dataset.scale || el.dataset.scale || 1.2);
      return {
        el, img, scale,
        height: 0,
        top: 0,
        extra: 0
      };
    })
    .filter(Boolean);

  const measure = () => {
    items.forEach(it => {
      const rect = it.el.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      it.height = rect.height;
      it.top = rect.top + scrollY;
      it.extra = (it.scale - 1) * it.height;
    });
  };

  measure();
  window.addEventListener('resize', () => requestAnimationFrame(measure), { passive: true });

  // ✅ This is what the raf() will call
  window.updateParallax = () => {
    const scrollY = window.scrollY || window.pageYOffset;
    const vh = VH();

    items.forEach(it => {
      const start = it.top - vh;
      const end   = it.top + it.height;
      const t = clamp((scrollY - start) / (end - start), 0, 1);
      const y = (0.5 - t) * it.extra;

      it.img.style.setProperty('--s', it.scale);
      it.img.style.setProperty('--y', `${y}px`);
    });
  };





  // rAF loop — drives Lenis updates
  function raf(time) {
  lenis.raf(time);

  // ✅ add this new line
  if (window.updateParallax) window.updateParallax();

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















      const menuBtn = document.querySelector(".han-menu-full");
const menuFULL = document.querySelector(".menu-full");

// Define mobile breakpoint
const isMobile = window.innerWidth < 768;

if (menuBtn && menuFULL) {
    // Variable to store scroll position for native fallback
    let nativeScrollPos = 0;

    menuBtn.addEventListener("click", () => {
      const isActive = menuFULL.classList.toggle("menu-active");

      // CHECK 1: Is Lenis active? (Use this for both Desktop AND Mobile if available)
      // We removed the "!isMobile" check because lenis.stop() is cleaner than CSS hacks on mobile
      if (typeof lenis !== "undefined" && lenis) {
        if (isActive) {
          lenis.stop();
        } else {
          lenis.start();
        }
        console.log("Lenis toggle active");
      } 
      
      // CHECK 2: Fallback (If Lenis is disabled due to Reduced Motion or error)
      else {
        if (isActive) {
          // LOCK: Record position -> Fix body -> Offset top
          nativeScrollPos = window.scrollY || window.pageYOffset;
          document.body.style.position = 'fixed';
          document.body.style.top = `-${nativeScrollPos}px`;
          document.body.style.width = '100%';
          document.body.style.overflow = 'hidden';
        } else {
          // UNLOCK: Remove styles -> Restore scroll position
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
          window.scrollTo(0, nativeScrollPos);
        }
        console.log("Native scroll toggle active");
      }
    });
  }
})();
