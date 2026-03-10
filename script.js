(() => {
  const bgImg    = document.getElementById('bg-img');
  const hudFill  = document.getElementById('hud-fill');
  const hudValue = document.getElementById('hud-value');
  const zoomHud  = document.getElementById('zoom-hud');
  const zones    = [...document.querySelectorAll('[data-zone]')];
  const cards    = [...document.querySelectorAll('[data-reveal]')];
  const sections = [...document.querySelectorAll('.page-section')];

  // ── CONFIG ──────────────────────────────────────────
  const WHEEL_SENSITIVITY = 0.0008;  // scale change per px of deltaY
  const TRANSITION_FAST   = '0.08s linear';
  const TRANSITION_SLOW   = '0.6s cubic-bezier(0.16,1,0.3,1)';

  // ── FLOATING SIDEBAR ────────────────────────────────
  const sectionNames = {
    'biography': 'Biography',
    'the-prince': 'The Prince',
    'the-mandrake': 'The Mandrake',
    'discourses': 'Discourses',
    'florence': 'Florence',
    'medici': 'Medici',
    'correspondence': 'Correspondence',
    'further-readings': 'Further Readings',
    'about': 'About'
  };

  const sectionLinks = {
    'biography': 'index.html#biography',
    'the-prince': 'theprince.html',
    'the-mandrake': 'themandrake.html',
    'discourses': 'texts.html',
    'florence': 'florence.html',
    'medici': 'medici.html',
    'correspondence': 'correspondence.html',
    'further-readings': 'readings.html',
    'about': 'about.html'
  };

  const sidebar = document.createElement('div');
  sidebar.id = 'section-sidebar';
  sections.forEach((section, i) => {
    const label = document.createElement('a');
    label.className = 'section-label';
    label.dataset.index = i;
    label.textContent = sectionNames[section.id] || section.id;
    label.href = sectionLinks[section.id] || `#${section.id}`;
    sidebar.appendChild(label);
  });
  document.body.appendChild(sidebar);
  const sectionLabels = document.querySelectorAll('.section-label');

  // ── SECTION DETECTION ──────────────────────────────
  function updateCurrentSection() {
    const scrollY = window.scrollY + window.innerHeight * 0.3; // 30% from top
    let currentSection = sections[0];

    for (let section of sections) {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      if (scrollY >= sectionTop) {
        currentSection = section;
      } else {
        break;
      }
    }

    // Update sidebar active state
    sectionLabels.forEach((label, i) => {
      label.classList.remove('active');
      if (sections[i] === currentSection) {
        label.classList.add('active');
      }
    });
  }

  // Per-zone state — built from data attributes on each .zoom-zone element
  // ensure the background starts fully visible
  if (bgImg) bgImg.style.backgroundSize = 'contain';

  const zoneState = zones.map(el => ({
    el,
    originX:      el.dataset.originX   || '50%',
    originY:      el.dataset.originY   || '50%',
    minScale:     parseFloat(el.dataset.minScale  || 1),
    maxScale:     parseFloat(el.dataset.maxScale  || 2.2),
    currentScale: parseFloat(el.dataset.minScale  || 1),
  }));

  let activeZoneIdx = -1;
  let isInZone      = false;

  // ── HELPERS ──────────────────────────────────────────

  /** Return absolute top/bottom of an element in document coordinates. */
  function getZoneBounds(el) {
    const rect   = el.getBoundingClientRect();
    const top    = rect.top    + window.scrollY;
    const bottom = rect.bottom + window.scrollY;
    return { top, bottom };
  }

  /** Push the current scale + origin to the bg image and update the HUD. */
  function applyScale(zs, fast) {
    bgImg.style.transition     = fast ? `transform ${TRANSITION_FAST}` : `transform ${TRANSITION_SLOW}`;
    bgImg.style.transformOrigin = `${zs.originX} ${zs.originY}`;
    bgImg.style.transform       = `scale(${zs.currentScale.toFixed(4)})`;

    const pct = ((zs.currentScale - zs.minScale) / (zs.maxScale - zs.minScale)) * 100;
    if (hudFill) hudFill.style.width   = pct.toFixed(1) + '%';
    if (hudValue) hudValue.textContent  = zs.currentScale.toFixed(2) + '×';
  }

  /** Animate the background back to scale(1). */
  function resetScale(fast) {
    bgImg.style.transition = fast ? `transform ${TRANSITION_FAST}` : `transform ${TRANSITION_SLOW}`;
    bgImg.style.transform  = 'scale(1)';
    if (hudFill) hudFill.style.width    = '0%';
    if (hudValue) hudValue.textContent   = '1.00×';
  }

  /** Return the index of the zoom zone whose vertical midpoint contains the
   *  viewport centre, or -1 if none. */
  function getCurrentZoneIdx() {
    const sy = window.scrollY + window.innerHeight * 0.5;
    for (let i = 0; i < zoneState.length; i++) {
      const { top, bottom } = getZoneBounds(zoneState[i].el);
      if (sy >= top && sy <= bottom) return i;
    }
    return -1;
  }

  // ── SCROLL HANDLER ───────────────────────────────────

  function onScroll() {
    const idx = getCurrentZoneIdx();

    if (idx !== activeZoneIdx) {
      // Leaving a zone: restore the background
      if (activeZoneIdx >= 0) {
        resetScale(false);
        if (bgImg) bgImg.style.backgroundSize = 'contain';
      }

      activeZoneIdx = idx;
      isInZone      = idx >= 0;

      if (isInZone) {
        if (zoomHud) zoomHud.classList.add('active');
        if (bgImg) bgImg.style.backgroundSize = 'cover';
        applyScale(zoneState[idx], false);
      } else {
        if (zoomHud) zoomHud.classList.remove('active');
      }
    }

    // Reveal cards as they approach the viewport
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.82) {
        card.classList.add('visible');
      }
    });

    // Update current section indicator
    updateCurrentSection();
  }

  // ── WHEEL HANDLER ────────────────────────────────────

  function onWheel(e) {
    if (activeZoneIdx < 0) return;
    if (e.target.closest && e.target.closest('.zoom-box')) return;

    const zs    = zoneState[activeZoneIdx];
    const delta = e.deltaY * WHEEL_SENSITIVITY;
    zs.currentScale = Math.min(zs.maxScale, Math.max(zs.minScale, zs.currentScale + delta));
    applyScale(zs, true);

    // passive: true — page scroll continues uninterrupted alongside zoom
  }

  // ── INIT ─────────────────────────────────────────────

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel',  onWheel,  { passive: true });

  // Run once on load to catch any already-visible elements
  onScroll();

  // Ensure the biography card fades in without needing a scroll event
  setTimeout(() => {
    const bioCard = document.querySelector('#biography .card');
    if (bioCard) bioCard.classList.add('visible');
  }, 300);
})();
