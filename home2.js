(() => {
  const wheelFrame = document.getElementById("wheel-frame");
  const orbitLinks = Array.from(document.querySelectorAll(".orbit-link"));
  const topLinks = Array.from(document.querySelectorAll(".top-link[data-segment]"));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!orbitLinks.length) {
    return;
  }

  const normalizeKey = (value) =>
    (value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const segmentMap = new Map();

  orbitLinks.forEach((link) => {
    const key = normalizeKey(link.dataset.segment || link.textContent);
    link.dataset.segment = key;
    segmentMap.set(key, link);
  });

  const setActive = (link) => {
    const key = link.dataset.segment;

    orbitLinks.forEach((entry) => {
      entry.classList.toggle("is-active", entry.dataset.segment === key);
    });

    topLinks.forEach((entry) => {
      entry.classList.toggle("is-active", entry.dataset.segment === key);
    });
  };

  const resolveLink = (source) => {
    const key = normalizeKey(source.dataset.segment || source.textContent);
    return segmentMap.get(key) || source;
  };

  const defaultLink = orbitLinks.find((link) => link.dataset.segment === "prince") || orbitLinks[0];
  setActive(defaultLink);

  [...orbitLinks, ...topLinks].forEach((entry) => {
    entry.addEventListener("mouseenter", () => {
      setActive(resolveLink(entry));
    });

    entry.addEventListener("focus", () => {
      setActive(resolveLink(entry));
    });

    entry.addEventListener("click", () => {
      setActive(resolveLink(entry));
    });
  });

  if (wheelFrame && !prefersReducedMotion) {
    let isHoveringLink = false;

    const updateTilt = (event) => {
      if (isHoveringLink) return;

      const bounds = wheelFrame.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const distFromCenter = Math.sqrt(
        Math.pow(event.clientX - centerX, 2) + Math.pow(event.clientY - centerY, 2)
      );

      // Don't tilt if cursor is near the center (roughly the hub area)
      const hubRadius = bounds.width * 0.15;
      if (distFromCenter < hubRadius) return;

      const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
      const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
      const tiltX = offsetY * -4.8;
      const tiltY = offsetX * 6.8;

      wheelFrame.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      wheelFrame.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    };

    const resetTilt = () => {
      wheelFrame.style.setProperty("--tilt-x", "0deg");
      wheelFrame.style.setProperty("--tilt-y", "0deg");
    };

    orbitLinks.forEach((link) => {
      link.addEventListener("mouseenter", () => {
        isHoveringLink = true;
        resetTilt();
      });

      link.addEventListener("mouseleave", () => {
        isHoveringLink = false;
      });
    });

    wheelFrame.addEventListener("pointermove", updateTilt);
    wheelFrame.addEventListener("pointerleave", resetTilt);
  }
})();
