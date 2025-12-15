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