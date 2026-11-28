(() => {
  const heading = document.querySelector(".hero h1");
  const intro = document.querySelector("#portfolio-intro");
  if (!heading) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const styles = [
    { family: "Manrope", fallback: "Arial, sans-serif", weight: 700, tracking: "-.055em", colours: ["#f6f4ef", "#ff6485"] },
    { family: "Playfair Display", fallback: "Georgia, serif", weight: 700, italic: true, tracking: "-.035em", colours: ["#ffe9b6", "#ffc96c"] },
    { family: "Space Grotesk", fallback: "Arial, sans-serif", weight: 700, tracking: "-.055em", colours: ["#b5edff", "#8abfff"] },
    { family: "Cormorant Garamond", fallback: "Georgia, serif", weight: 600, italic: true, tracking: "-.025em", colours: ["#ffe0ec", "#ffa6c6"] },
    { family: "Orbitron", fallback: "Arial, sans-serif", weight: 600, tracking: "-.045em", colours: ["#c6ffe4", "#78e6bc"] },
    { family: "Caveat", fallback: "cursive", weight: 700, tracking: "-.02em", colours: ["#e1ddff", "#bba8ff"] },
    { family: "Cinzel", fallback: "Georgia, serif", weight: 600, tracking: "-.055em", colours: ["#fff0ce", "#f6cb86"] },
    { family: "Sora", fallback: "Arial, sans-serif", weight: 700, tracking: "-.055em", colours: ["#c8fbff", "#81dfed"] },
    { family: "Great Vibes", fallback: "cursive", weight: 400, tracking: "0em", colours: ["#f0d7ff", "#e6a8ef"] },
    { family: "Bebas Neue", fallback: "Impact, sans-serif", weight: 400, tracking: ".015em", colours: ["#fff3ae", "#ffb578"] }
  ];
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  let index = 0;
  let timer = 0;
  let sizingFrame = 0;
  let prepared = false;
  let visible = false;

  function fitName() {
    sizingFrame = 0;
    if (!prepared || !context) return;
    heading.style.setProperty("--name-scale", "1");
    const computed = getComputedStyle(heading);
    const size = parseFloat(computed.fontSize);
    const tracking = parseFloat(computed.letterSpacing) || 0;
    context.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    const width = Math.max(...["Vinay", "Pawar."].map(word => {
      const metrics = context.measureText(word);
      const inkWidth = (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || metrics.width);
      return Math.max(metrics.width, inkWidth) + tracking * (word.length - 1) + size * .18;
    }));
    const scale = Math.min(1, Math.max(1, heading.clientWidth - 8) / Math.max(1, width));
    heading.style.setProperty("--name-scale", scale.toFixed(4));
  }

  function scheduleSizing() {
    if (!sizingFrame) sizingFrame = window.requestAnimationFrame(fitName);
  }

  function applyStyle() {
    const style = styles[index];
    heading.style.setProperty("--name-font", `"${style.family}", ${style.fallback}`);
    heading.style.setProperty("--name-weight", String(style.weight));
    heading.style.setProperty("--name-font-style", style.italic ? "italic" : "normal");
    heading.style.setProperty("--name-tracking", style.tracking);
    heading.style.setProperty("--name-first-colour", style.colours[0]);
    heading.style.setProperty("--name-second-colour", style.colours[1]);
    heading.dataset.nameStyle = String(index + 1);
    heading.dataset.nameTypeface = style.family;
    fitName();
  }

  function prepareName() {
    if (prepared) return;
    // Whole-word shaping lets handwritten fonts join their letters naturally.
    heading.querySelector(".name-first").textContent = "Vinay";
    heading.querySelector(".name-second").textContent = "Pawar.";
    heading.classList.add("name-cycle-ready");
    prepared = true;
    applyStyle();
  }

  function canRun() {
    if (!("IntersectionObserver" in window)) {
      const rect = heading.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < window.innerHeight;
    }
    return visible && !document.hidden && !intro?.open && !motion.matches && !["pending", "playing"].includes(heading.dataset.nameAnimation);
  }

  function stopCycle() {
    window.clearTimeout(timer); timer = 0;
    heading.classList.remove("is-font-changing");
    heading.dataset.fontCycle = motion.matches ? "static" : "paused";
  }

  function nextStyle() {
    timer = 0;
    if (!canRun()) { stopCycle(); return; }
    heading.classList.add("is-font-changing");
    timer = window.setTimeout(() => {
      timer = 0;
      if (!canRun()) { stopCycle(); return; }
      index = (index + 1) % styles.length;
      applyStyle();
      heading.classList.remove("is-font-changing");
      timer = window.setTimeout(nextStyle, 2820);
    }, 180);
  }

  function syncCycle() {
    if (!canRun()) { stopCycle(); return; }
    prepareName();
    heading.dataset.fontCycle = "running";
    if (!timer) timer = window.setTimeout(nextStyle, 3000);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      syncCycle();
    }, { threshold: .2 });
    observer.observe(heading);
  } else window.addEventListener("scroll", syncCycle, { passive: true });
  new MutationObserver(syncCycle).observe(heading, { attributes: true, attributeFilter: ["data-name-animation"] });
  intro?.addEventListener("close", syncCycle);
  document.addEventListener("visibilitychange", syncCycle);
  motion.addEventListener("change", syncCycle);
  window.addEventListener("pagehide", stopCycle);
  window.addEventListener("pageshow", syncCycle);
  window.addEventListener("resize", scheduleSizing, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(scheduleSizing).observe(heading.parentElement);
  if (document.fonts) {
    styles.forEach(style => {
      document.fonts.load(`${style.italic ? "italic " : ""}${style.weight} 100px "${style.family}"`, "Vinay Pawar.").then(scheduleSizing).catch(() => { /* Readable fallbacks remain available. */ });
    });
    document.fonts.addEventListener("loadingdone", scheduleSizing);
  }
  syncCycle();
})();
