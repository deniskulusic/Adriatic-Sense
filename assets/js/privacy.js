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