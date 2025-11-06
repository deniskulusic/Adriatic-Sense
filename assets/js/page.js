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
  let WindowHeight=window.innerHeight;

  lenis.on('scroll', ({ scroll }) => {
    const elements = document.querySelectorAll('[data-lenis-speed]');
    elements.forEach((el) => {
      const speed = parseFloat(el.dataset.lenisSpeed) || 0;
      if(scroll < 1.5*WindowHeight)
      el.style.transform = `translate3d(0, ${scroll * speed * SCALE}px, 0)`;
    });


  const halfPage = document.body.scrollHeight / 2;

  if (scroll >= halfPage) {
    document.querySelector(".inqury").classList.add('active-inq'); // add class when past halfway
    document.querySelector(".menu-full").classList.add('active-inq'); // add class when past halfway
  } else {
    document.querySelector(".inqury").classList.remove('active-inq'); // remove class when above halfway
    document.querySelector(".menu-full").classList.remove('active-inq'); // add class when past halfway
  }
  });







/* =======================================================
        // 1. SHARED CURSOR LOGIC (for the main slider)
        // ======================================================= */
const cursor = document.createElement('div');
cursor.className = 'drag-cursor';
cursor.setAttribute('aria-hidden', 'true');
// MODIFICATION: Add plus icon and ring elements
cursor.innerHTML = `
    <span class="label">scroll</span>
    <span class="plus-icon">+</span>
    <div class="ring" aria-hidden="true"></div>
`;
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
    // Use style properties for smooth transformation
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';
    cursor.style.transform = `translate(-50%, -50%) scale(${cursorScale})`;
    cursorRAF = requestAnimationFrame(cursorLoop);
}
window.addEventListener('touchstart', () => hideCursor(), { passive: true });

// Helper to set cursor mode
function setCursorMode(mode) {
    cursor.classList.remove('cursor-mode-drag', 'cursor-mode-scroll', 'cursor-mode-plus');
    cursor.classList.add(`cursor-mode-${mode}`);
    // Update label text
    if (mode === 'drag' || mode === 'scroll') {
        cursor.querySelector('.label').textContent = mode;
    }
}


/* =======================================================
    // 2. PROGRESS BAR LOGIC (Independent)
    // ======================================================= */

const currentSlideCountEl = document.getElementById('currentSlideCount');
const totalSlideCountEl = document.getElementById('totalSlideCount');
const progressBarIndicator = document.getElementById('progressBarIndicator');

function updateProgressBarUI(currentIndex, totalSlides) {
    if (totalSlides === 0) return;
    
    const current = currentIndex + 1;
    // Calculate progress percentage: the bar should fully fill on the LAST slide
    const progress = (current / totalSlides) * 100;

    // Update text counts
    currentSlideCountEl.textContent = "0" + current;
    totalSlideCountEl.textContent = "0" + totalSlides;

    // Update progress indicator width
    progressBarIndicator.style.width = `${progress}%`;
}


/* =======================================================
    // 3. MAIN SLIDER FUNCTIONALITY (Drag & Snap)
    // ======================================================= */

function initSlider(root){
    const viewport = root.querySelector('.slider-viewport');
    const track    = root.querySelector('.slider-track');
    const btnPrev = root.querySelector('.slider-btn.prev');
    const btnNext = root.querySelector('.slider-btn.next');
    const cards = Array.from(root.querySelectorAll('.card'));

    if(!viewport || !track) return;
    
    const isButtonsOnly = root.classList.contains('buttons-only');
    const dragEnabled = !isButtonsOnly && root.dataset.drag !== 'false';

    let offset = 0;           
    let baseOffset = 0;
    let maxScroll = 0;
    let stops = [];
    let momentumRAF = null;

    function measure(){
        const viewW = viewport.clientWidth;

        if (cards.length === 0) {
            baseOffset = 0;
            maxScroll = 0;
            stops = [0];
            return;
        }

        const first = cards[0];
        const last  = cards[cards.length - 1];

        const csFirst = getComputedStyle(first);
        const csLast  = getComputedStyle(last);

        // Calculate total track width and offsets
        const firstLeftOuter = first.offsetLeft - (parseFloat(csFirst.marginLeft) || 0);
        const lastRightOuter = last.offsetLeft + last.offsetWidth + (parseFloat(csLast.marginRight) || 0);
        const totalWidth = lastRightOuter - firstLeftOuter;

        baseOffset = -firstLeftOuter;
        maxScroll = Math.max(0, totalWidth - viewW);

        // Precompute snap positions (aligned to the left edge of each card)
        stops = cards.map(card => {
            const cs = getComputedStyle(card);
            const leftOuter = card.offsetLeft - (parseFloat(cs.marginLeft) || 0);
            return clamp(-leftOuter); // Ensure stops are clamped
        });
        
        // Keep offset within bounds
        offset = clamp(offset);
    }

    function clamp(x){
        const min = baseOffset - maxScroll;
        const max = baseOffset;
        return Math.max(min, Math.min(max, x));
    }

    function render(){
        track.style.transform = `translateX(${offset}px)`;
        
        // Update buttons
        if (btnPrev) btnPrev.disabled = (offset >= baseOffset - 0.5);
        if (btnNext) btnNext.disabled = (offset <= (baseOffset - maxScroll) + 0.5);
        
        // Update Progress Bar
        let currentIndexForProgress = 0;
        // Find the index of the card whose stop position is closest to the current offset
        let minDiff = Infinity;
        let closestIndex = 0;

        stops.forEach((stop, index) => {
            const diff = Math.abs(stop - offset);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = index;
            }
        });
        
        updateProgressBarUI(closestIndex, cards.length);
    }

    function update(){
        measure();
        // Initial run: align to base offset (first card)
        if (Math.abs(offset) < 0.001 && Math.abs(baseOffset) > 0.001) {
            offset = baseOffset;
        }
        render();
    }

    // Snap logic: Find the next/previous *full card* stop position
    function findNextStop(current){
        const currentCardIndex = stops.findIndex(s => Math.abs(s - current) < 1);
        if (currentCardIndex !== -1 && currentCardIndex < stops.length - 1) {
             return stops[currentCardIndex + 1];
        }
        // Find the first card stop position *to the left* of the current position (if not currently snapped)
        let nextStop = current;
        for (let i = stops.length - 1; i >= 0; i--) {
            if (stops[i] < current - 1) { // Stop is further left than current view
                nextStop = stops[i];
                break;
            }
        }
        return clamp(nextStop);
    }

    function findPrevStop(current){
        const currentCardIndex = stops.findIndex(s => Math.abs(s - current) < 1);
        if (currentCardIndex > 0) {
             return stops[currentCardIndex - 1];
        }
        // Find the first card stop position *to the right* of the current position (if not currently snapped)
        let prevStop = current;
        for (let i = 0; i < stops.length; i++) {
            if (stops[i] > current + 1) { // Stop is further right than current view
                prevStop = stops[i];
                break;
            }
        }
        return clamp(prevStop);
    }
    
    function next(){
        offset = findNextStop(offset);
        render();
    }
    function prev(){
        offset = findPrevStop(offset);
        render();
    }

    // Attach button listeners
    if (btnNext) btnNext.addEventListener('click', next);
    if (btnPrev) btnPrev.addEventListener('click', prev);

    // Resize & Load handling
    const roViewport = new ResizeObserver(update);
    const roTrack    = new ResizeObserver(update);
    roViewport.observe(viewport);
    roTrack.observe(track);
    window.addEventListener('load', update);
    update();
    
    
    /* --- Cursor and Dragging Logic (From User Input) --- */

    if (isButtonsOnly) {
        viewport.addEventListener('pointerenter', () => { 
            showCursor(); 
            setCursorMode('plus');
        });
        viewport.addEventListener('pointerleave', () => { 
            hideCursor(); 
            targetScale=1; 
        });
        viewport.addEventListener('pointermove', (e) => { 
            targetX = e.clientX; 
            targetY = e.clientY; 
        });
        return; 
    }

    // ======= Dragging only if enabled =======
    if (!dragEnabled) return; 

    let isDragging = false;
    let startX = 0, startOffset = 0, lastX = 0, lastTs = 0, velocity = 0;
    const DRAG_THRESHOLD = 3;

    function stopMomentum(){ if (momentumRAF!=null) cancelAnimationFrame(momentumRAF); momentumRAF=null; }
    function startMomentum(){
        stopMomentum();
        const decay = 0.95;
        const minVel = 0.05;
        const frame = () => {
            velocity *= decay;
            if (Math.abs(velocity) < minVel) { stopMomentum(); return; }
            // Apply momentum, clamp, and render
            offset = clamp(offset + velocity * 16); 
            render();

            // Stop momentum if we hit the edge
            if (offset === 0 || offset === (baseOffset - maxScroll)) { 
                velocity = 0; // stop the velocity abruptly
                stopMomentum(); 
                return; 
            }
            momentumRAF = requestAnimationFrame(frame);
        };
        momentumRAF = requestAnimationFrame(frame);
    }

    // Cursor bubble (only for draggable sliders)
    viewport.addEventListener('pointerenter', () => { 
        showCursor(); 
        setCursorMode('scroll'); 
    });
    viewport.addEventListener('pointerleave', () => { hideCursor(); targetScale=1; });
    viewport.addEventListener('pointermove', (e) => { targetX = e.clientX; targetY = e.clientY; });

    // Pointer events for drag
    viewport.addEventListener('pointerdown', (e) => {
        // 🆕 Allow links to be clickable — don't start drag if pointer down on an <a>
        const anchor = e.target.closest('a');
        if (anchor) {
            return; // let the browser handle the link normally
        }

        if (e.button !== 0 && e.pointerType === 'mouse') return;
        viewport.setPointerCapture(e.pointerId);
        stopMomentum();
        isDragging = true;
        startX = lastX = e.clientX;
        startOffset = offset;
        lastTs = performance.now();
        velocity = 0;
        setCursorMode('drag'); 
        targetScale = 0.9;
        viewport.classList.add('dragging');
        e.preventDefault();
    });

    viewport.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const now = performance.now();
        const dxRaw = e.clientX - startX;

        const dxBase = Math.abs(dxRaw) < DRAG_THRESHOLD ? 0 : dxRaw;
        const dx = dxBase * 1; // Drag dampening

        offset = clamp(startOffset + dx);
        render();

        const dt = now - lastTs || 16;
        velocity = (e.clientX - lastX) / dt;
        lastX = e.clientX;
        lastTs = now;

        const speed = Math.min(Math.abs(velocity) * 30, 1);
        targetScale = 1 - speed * 0.35;
    });

    function endDrag(){
        if (!isDragging) return;
        isDragging = false;
        viewport.classList.remove('dragging');
        setCursorMode('scroll'); 
        targetScale = 1;
        
        // Start momentum only if it wasn't a static click and we are not at the edge
        if (Math.abs(velocity) > 0.01 && offset > (baseOffset - maxScroll) + 1 && offset < baseOffset - 1) { 
            startMomentum();
        } else {
            // Snap back if momentum is negligible
            offset = clamp(offset); // Re-clamp just in case
            render();
        }
        velocity = 0; // Reset velocity after drag ends
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('lostpointercapture', endDrag);

    track.addEventListener('dragstart', (e) => e.preventDefault());
}

// Initialize all sliders
document.querySelectorAll('.slider').forEach(initSlider);




/* ================= GALLERY LOGIC (DYNAMIC SLIDER) ================= */

// DOM elements
const gallery = document.querySelector('.fullscreen-gallery');
const galleryTrack = document.querySelector('.gallery-track'); // NEW: The track element
const closeBtn = document.querySelector('.gallery-close-btn');
const prevBtn = document.querySelector('.gallery-prev');
const nextBtn = document.querySelector('.gallery-next');
const galleryCounter = document.querySelector('.gallery-counter');

// State
let allImageUrls = [];
let currentIndex = -1;
let totalSlides = 0;
const TRANSITION_DURATION = 700;

// --- Core Functions ---

function collectAllImageUrls() {
    const cards = document.querySelectorAll('.opens-gallery .card');
    allImageUrls = Array.from(cards)
        .map(card => {
            const style = card.style.backgroundImage;
            return style ? style.replace(/url\(['"]?(.*?)['"]?\)/i, '$1') : null;
        })
        .filter(url => url);
    
    totalSlides = allImageUrls.length;
}

// NEW: Function to dynamically build the gallery track
function buildGallerySlides() {
    collectAllImageUrls();
    galleryTrack.innerHTML = ''; // Clear existing content

    allImageUrls.forEach(url => {
        const slide = document.createElement('div');
        slide.classList.add('gallery-slide');

        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Gallery image';

        slide.appendChild(img);
        galleryTrack.appendChild(slide);
    });
}

// 2. Update the gallery view (Modified for sliding the track)
function updateGallery(immediate = false) {
    if (currentIndex < 0 || currentIndex >= totalSlides) return;

    // Calculate the translation distance (e.g., -100vw for index 1, -200vw for index 2)
    const offset = currentIndex * -100; // In percentage/vw

    // Set transition speed
    galleryTrack.style.transitionDuration = immediate ? '0ms' : `${TRANSITION_DURATION}ms`;
    
    // Apply the transformation
    galleryTrack.style.transform = `translateX(${offset}vw)`;

    // Update buttons and counter
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === totalSlides - 1;
    galleryCounter.textContent = `${currentIndex + 1}/${totalSlides}`;
}

// 3. Open the gallery
function openGallery(startIndex) {
    currentIndex = startIndex;
    
    gallery.classList.add('is-open');
    gallery.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Jump instantly to the starting slide
    updateGallery(true); 
}

// 4. Close the gallery
function closeGallery() {
    gallery.classList.remove('is-open');
    gallery.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

// --- Event Handlers ---

// Navigation (Simply changes index and calls update)
function navigate(direction) {
    let newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < totalSlides) {
        currentIndex = newIndex;
        updateGallery(false); // Animate the slide
    }
}

// 1. Article click handler (to open the gallery)
document.querySelectorAll('.opens-gallery .card').forEach((card, index) => {
    card.style.cursor = 'pointer'; 
    card.addEventListener('click', (e) => {
        // 🆕 Allow links inside cards to be clickable
        const anchor = e.target.closest('a');
        if (anchor) {
            return; // don't open gallery if a link was clicked
        }

        // Ensure slides are built before opening
        if (totalSlides === 0) buildGallerySlides(); 
        openGallery(index);
    });
});

// 2. Gallery button event listeners
closeBtn.addEventListener('click', closeGallery);
prevBtn.addEventListener('click', () => navigate(-1));
nextBtn.addEventListener('click', () => navigate(1));

// 3. Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!gallery.classList.contains('is-open')) return;

    if (e.key === 'Escape') {
        closeGallery();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); 
        navigate(-1);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault(); 
        navigate(1);
    }
});

// Initial Setup: Build the slides when the page loads
window.addEventListener('load', buildGallerySlides);




 const acordation=document.getElementsByClassName('faq');
for(i=0;i<acordation.length;i++){
  
    acordation[i].addEventListener('click',function(){
      var faqa=this.classList.contains("active");
        var elems = document.querySelectorAll(".faq.active");
        
        
        
[].forEach.call(elems, function(el) {
    el.classList.remove("active");
});

if(faqa) {
  this.classList.remove("active");
        }
        else{
          this.classList.add("active");
        }
    })
}
document.querySelector(".info-more .click-underline").addEventListener('click',function(){
   document.querySelector(".info-under").classList.toggle("info-active")  ;
    this.classList.toggle("info-active")  ;
})


})();