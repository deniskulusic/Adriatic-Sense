(function () {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
        document.documentElement.style.scrollBehavior = 'smooth';
        return;
    }

    // Initialize Lenis
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // More standard "smooth" easing
        smoothWheel: true,
        smoothTouch: false
    });

    // --- OPTIMIZED PARALLAX ---

    // Cache window height
    let vh = window.innerHeight;

    const items = Array.from(document.querySelectorAll('.section-3-element-holder, .section-7-holder, .section-10-img-holder, .blog-element-holder, .blog-holder'))
        .map(el => {
            const picture = el.querySelector('picture');
            const img = picture && picture.querySelector('img');
            if (!picture || !img) return null;

            // Use a lower default scale if not defined to reduce pixelation
            const scale = parseFloat(img.dataset.scale || el.dataset.scale || 1.15);

            return {
                el,
                img,
                scale,
                height: 0,
                top: 0,
                extra: 0
            };
        })
        .filter(Boolean);

    const measure = () => {
        vh = window.innerHeight; // Update cached VH
        const scrollY = window.scrollY;

        items.forEach(it => {
            const rect = it.el.getBoundingClientRect();
            it.height = rect.height;
            // Calculate absolute top position relative to document
            it.top = rect.top + scrollY;
            it.extra = (it.scale - 1) * it.height;
        });
    };

    // Run measure initially
    measure();

    const updateParallax = () => {
        // Get scroll from Lenis if available for better sync, fallback to window
        const scrollY = lenis.scroll || window.scrollY;

        items.forEach(it => {
            // Logic: Is the item visible in the viewport?
            // Start = Item enters bottom of screen
            // End = Item leaves top of screen
            const start = it.top - vh;
            const end = it.top + it.height;

            // Optimization: Only calculate if near viewport
            if (scrollY >= start - 100 && scrollY <= end + 100) {
                const progress = (scrollY - start) / (end - start);
                // Clamp between 0 and 1
                const t = Math.max(0, Math.min(1, progress));

                const y = (0.5 - t) * it.extra;

                // Apply transform directly (more performant than CSS vars for high-fps)
                // Or keep your CSS var approach if you prefer:
                it.img.style.setProperty('--y', `${y}px`);
                // We do NOT update scale here, let CSS hover handle scale to avoid conflict
            }
        });
    };

    // Update measurements on resize
    window.addEventListener('resize', measure);

    // --- ANIMATION LOOP ---
    function raf(time) {
        lenis.raf(time);
        updateParallax();
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // --- CONNECT ANCHOR LINKS ---
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const id = link.getAttribute('href');
            if (id && id !== "#") lenis.scrollTo(id);
        });
    });







    /* ======================================================
          INIT GLOBAL ELEMENTS
      ====================================================== */
    let WindowHeight = window.innerHeight;




    /* ======================================================
           ANIMATING ELEMENTS LOGIC INITIALIZATION
        ====================================================== */
    // 1. CONFIG: Add all parallax groups here
    const parallaxGroups = [
        {
            wrapper: ".blog-page-wrapper",
            elements: ".blog-page-wrapper img",
            factors: [0.1],
            mode: "scaleTranslate", // NEW animation
            initialScale: 1.2,
            translateRange: 300
        },


    ];


    /* ======================================================
       RESPONSIVE SCALING
    ====================================================== */
    function getResponsiveScale() {
        const maxW = 1920;
        const minW = 850;

        if (window.innerWidth >= maxW) return 1;
        if (window.innerWidth <= minW) return 0.5;

        const pct = (window.innerWidth - minW) / (maxW - minW);
        return 0.5 + (pct * 0.5);
    }

    let responsiveScale = getResponsiveScale();
    window.addEventListener("resize", () => {
        responsiveScale = getResponsiveScale();
    });


    /* ======================================================
       SETUP
    ====================================================== */
    parallaxGroups.forEach(g => {
        g.wrapperEl = document.querySelector(g.wrapper);
        g.elementsEl = document.querySelectorAll(g.elements);
        g.offsetTop = window.pageYOffset + g.wrapperEl.getBoundingClientRect().top;
    });

    window.addEventListener("resize", () => {
        parallaxGroups.forEach(g => {
            g.offsetTop = window.pageYOffset + g.wrapperEl.getBoundingClientRect().top;
        });
    });


    /* ======================================================
       TRANSFORM MERGING
    ====================================================== */
    function mergeTransform(el, newTranslateY) {
        let existing = el.style.transform;

        // If no inline transform, read “transform” from CSS rules (NOT the computed matrix)
        if (!existing) {
            existing = el.getAttribute("data-original-transform");
            if (!existing) {
                // Extract raw CSS transform using computed style *but keep the string before conversion*
                const style = el.getAttribute("style") || "";
                const cssTransform = style.match(/transform:\s*([^;]+)/);

                if (cssTransform) {
                    existing = cssTransform[1].trim();
                } else {
                    // LAST RESORT: use computed transform ONLY if not "none"
                    const computed = window.getComputedStyle(el).transform;
                    existing = computed === "none" ? "" : computed;
                }
            }
        }

        // Remove old translateY()
        existing = (existing || "").replace(/translateY\([^)]*\)/g, "").trim();

        // Final combine
        if (!existing || existing === "none") {
            return `translateY(${newTranslateY}px)`;
        }

        return `${existing} translateY(${newTranslateY}px)`.trim();
    }


    /* ======================================================
       EXTRA: CLAMP FUNCTION
    ====================================================== */
    function clamp2(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

/* ======================================================
            ANIMATING ELEMENTS LOGIC TRIGGER
        ====================================================== */

        parallaxGroups.forEach(g => {
            const rect = g.wrapperEl.getBoundingClientRect();

            // Visibility check
            if (rect.top - 1.5 * WindowHeight < 0 &&
                rect.top + g.wrapperEl.clientHeight + 0.5 * WindowHeight > 0) {

                g.elementsEl.forEach((el, i) => {

                    const factor = g.factors[i];
                    if (factor === undefined) return;

                    /* -----------------------------------------
                        MODE 1: OLD PARALLAX (translate only)
                    ----------------------------------------- */
                    if (g.mode === "parallax") {
                        const val = factor * responsiveScale * (g.offsetTop - scroll);
                        el.style.transform = mergeTransform(el, val);
                        return;
                    }

                    /* -----------------------------------------
                        MODE 2: NEW SCALE + TRANSLATE ANIMATION
                    ----------------------------------------- */
                    if (g.mode === "scaleTranslate") {

                        const it = {
                            img: el,
                            top: g.offsetTop,
                            height: g.wrapperEl.clientHeight,
                            scale: g.initialScale || 1.2,
                            extra: g.translateRange || 300
                        };

                        const distanceFromTop = it.top - scroll;
                        const totalDistance = vh + it.height;
                        const distanceCovered = vh - distanceFromTop;

                        const percent = clamp2(distanceCovered / totalDistance, 0, 1);

                        // Scale calculation remains absolute (visual fit)
                        const currentScale =
                            it.scale - ((it.scale - 1) * percent);

                        // --- MODIFIED LOGIC HERE ---
                        // We apply responsiveScale to the translation range (it.extra)
                        const scaledExtra = it.extra * responsiveScale;

                        const translateY =
                            -(scaledExtra / 2) + (scaledExtra * percent);

                        it.img.style.transform =
                            `translate3d(0, ${translateY}px, 0) scale(${currentScale})`;

                        return;
                    }

                });
            }
        });
    /* ======================================================
       SCROLL TRIGGER
    ====================================================== */
    lenis.on('scroll', ({ scroll }) => {

        /* ======================================================
            ANIMATING ELEMENTS LOGIC TRIGGER
        ====================================================== */
        const vh = window.innerHeight;

        parallaxGroups.forEach(g => {
            const rect = g.wrapperEl.getBoundingClientRect();

            // Visibility check
            if (rect.top - 1.5 * WindowHeight < 0 &&
                rect.top + g.wrapperEl.clientHeight + 0.5 * WindowHeight > 0) {

                g.elementsEl.forEach((el, i) => {

                    const factor = g.factors[i];
                    if (factor === undefined) return;

                    /* -----------------------------------------
                        MODE 1: OLD PARALLAX (translate only)
                    ----------------------------------------- */
                    if (g.mode === "parallax") {
                        const val = factor * responsiveScale * (g.offsetTop - scroll);
                        el.style.transform = mergeTransform(el, val);
                        return;
                    }

                    /* -----------------------------------------
                        MODE 2: NEW SCALE + TRANSLATE ANIMATION
                    ----------------------------------------- */
                    if (g.mode === "scaleTranslate") {

                        const it = {
                            img: el,
                            top: g.offsetTop,
                            height: g.wrapperEl.clientHeight,
                            scale: g.initialScale || 1.2,
                            extra: g.translateRange || 300
                        };

                        const distanceFromTop = it.top - scroll;
                        const totalDistance = vh + it.height;
                        const distanceCovered = vh - distanceFromTop;

                        const percent = clamp2(distanceCovered / totalDistance, 0, 1);

                        // Scale calculation remains absolute (visual fit)
                        const currentScale =
                            it.scale - ((it.scale - 1) * percent);

                        // --- MODIFIED LOGIC HERE ---
                        // We apply responsiveScale to the translation range (it.extra)
                        const scaledExtra = it.extra * responsiveScale;

                        const translateY =
                            -(scaledExtra / 2) + (scaledExtra * percent);

                        it.img.style.transform =
                            `translate3d(0, ${translateY}px, 0) scale(${currentScale})`;

                        return;
                    }

                });
            }
        });
    })
})();