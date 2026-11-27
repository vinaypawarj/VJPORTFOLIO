(() => {
  document.documentElement.classList.add("experience-ready");
  const intro = document.querySelector("#portfolio-intro");
  const remainingLabel = document.querySelector("#intro-remaining");
  const DURATION = 10000;

  if (intro && remainingLabel && typeof intro.showModal === "function") {
    let remaining = DURATION;
    let startedAt = 0;
    let endTimer = 0;
    let countdownTimer = 0;
    let previousFocus = null;
    const soundtrack = document.querySelector("#intro-soundtrack");
    const soundToggle = document.querySelector("#intro-sound-toggle");
    let soundEnabled = true;
    let soundAttempt = 0;

    function showSoundState(state) {
      intro.dataset.sound = state;
      if (!soundToggle) return;
      soundToggle.hidden = false;
      const playing = state === "playing";
      soundToggle.setAttribute("aria-pressed", String(playing));
      soundToggle.setAttribute("aria-label", playing ? "Mute intro sound" : "Enable intro sound");
      soundToggle.querySelector("span").textContent = playing ? "Sound on" : "Enable sound";
    }

    function stopSound(reset = false) {
      soundAttempt += 1;
      if (!soundtrack) return;
      soundtrack.pause();
      if (reset) { try { soundtrack.currentTime = 0; } catch { /* The clip may still be loading. */ } }
    }

    function playSound() {
      if (!soundtrack || !soundEnabled || !intro.open || document.hidden) return;
      const attempt = ++soundAttempt;
      const elapsed = DURATION - remaining + (endTimer ? performance.now() - startedAt : 0);
      try { soundtrack.currentTime = Math.max(0, Math.min(elapsed / 1000, 9.99)); } catch { /* Start when ready. */ }
      soundtrack.volume = .5;
      const playback = soundtrack.play();
      if (playback?.then) playback.then(() => {
        if (attempt !== soundAttempt || !intro.open || document.hidden || !soundEnabled) return;
        showSoundState("playing");
      }).catch(() => {
        if (attempt === soundAttempt && intro.open) showSoundState("blocked");
      });
    }

    function clearTimers() {
      window.clearTimeout(endTimer);
      window.clearInterval(countdownTimer);
      endTimer = 0;
      countdownTimer = 0;
    }

    function finishIntro() {
      clearTimers();
      stopSound(true);
      if (intro.open) intro.close();
      intro.classList.remove("intro-running", "intro-paused");
      document.body.classList.remove("intro-active");
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
    }

    function resumeIntro() {
      if (!intro.open || document.hidden || endTimer) return;
      intro.classList.remove("intro-paused");
      startedAt = performance.now();
      endTimer = window.setTimeout(finishIntro, remaining);
      countdownTimer = window.setInterval(() => {
        const seconds = Math.max(0, Math.ceil((remaining - (performance.now() - startedAt)) / 1000));
        remainingLabel.textContent = seconds + "s";
      }, 100);
      playSound();
    }

    function pauseIntro() {
      if (!intro.open) return;
      if (endTimer) remaining = Math.max(0, remaining - (performance.now() - startedAt));
      clearTimers();
      stopSound();
      intro.classList.add("intro-paused");
    }

    function startIntro() {
      clearTimers();
      previousFocus = document.activeElement === intro ? previousFocus : document.activeElement;
      remaining = DURATION;
      remainingLabel.textContent = "10s";
      soundEnabled = true;
      stopSound(true);
      showSoundState("ready");
      intro.style.setProperty("--intro-duration", DURATION + "ms");
      intro.classList.remove("intro-running", "intro-paused");
      if (!intro.open) intro.showModal();
      document.body.classList.add("intro-active");
      // One opening sequence per document; reloads create a new sequence.
      void intro.offsetWidth;
      intro.classList.add("intro-running");
      intro.focus({ preventScroll: true });
      if (document.hidden) intro.classList.add("intro-paused");
      else resumeIntro();
    }

    intro.addEventListener("cancel", event => { event.preventDefault(); finishIntro(); });
    intro.addEventListener("close", () => {
      if (intro.open) return;
      clearTimers();
      stopSound(true);
      intro.classList.remove("intro-running", "intro-paused");
      document.body.classList.remove("intro-active");
    });
    intro.querySelectorAll("img").forEach(img => {
      img.addEventListener("error", () => { img.hidden = true; }, { once: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseIntro();
      else resumeIntro();
    });
    window.addEventListener("pagehide", pauseIntro);
    window.addEventListener("pageshow", event => { if (event.persisted && intro.open) resumeIntro(); });
    soundToggle?.addEventListener("click", () => {
      if (soundtrack && !soundtrack.paused) {
        soundEnabled = false;
        stopSound();
        showSoundState("muted");
      } else {
        soundEnabled = true;
        playSound();
      }
    });

    // Every page opening gets the introduction, including reloads and section links.
    startIntro();
  }


  // The three words animate on their first visible appearance, once per opening.
  (() => {
    const motto = document.querySelector("#portfolio-motto");
    if (!motto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    motto.dataset.mottoAnimation = "pending";
    let played = false;
    let visible = false;
    let observer = null;
    function revealMotto() {
      if (played || document.hidden || intro?.open) return;
      if (!observer) {
        const rect = motto.getBoundingClientRect();
        visible = rect.bottom > 0 && rect.top < window.innerHeight;
      }
      if (!visible) return;
      played = true;
      motto.dataset.mottoAnimation = "playing";
      observer?.disconnect();
      window.removeEventListener("scroll", revealMotto);
      window.setTimeout(() => { motto.dataset.mottoAnimation = "complete"; }, 1600);
    }
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); revealMotto(); }, { threshold: .2 });
      observer.observe(motto);
    } else window.addEventListener("scroll", revealMotto, { passive: true });
    intro?.addEventListener("close", revealMotto);
    document.addEventListener("visibilitychange", revealMotto);
    revealMotto();
  })();

  // The main name writes only the first time it is actually viewed in this browser.
  (() => {
    const heading = document.querySelector(".hero h1");
    if (!heading) return;
    const storageKey = "vinay-name-writing-v2";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === "seen"; } catch { /* Storage is optional. */ }
    if (seen || reducedMotion) {
      heading.dataset.nameAnimation = seen ? "seen" : "static";
      return;
    }

    heading.dataset.nameAnimation = "pending";
    let played = false;
    let visible = false;
    let observer = null;

    function writeMainName() {
      if (played || document.hidden || (intro && intro.open)) return;
      if (!observer) {
        const rect = heading.getBoundingClientRect();
        visible = rect.bottom > 0 && rect.top < window.innerHeight;
      }
      if (!visible) return;
      played = true;
      heading.dataset.nameAnimation = "playing";
      try { localStorage.setItem(storageKey, "seen"); } catch { /* Keep one-shot behaviour for this page. */ }
      if (observer) observer.disconnect();
      window.removeEventListener("scroll", writeMainName);
      window.setTimeout(() => { heading.dataset.nameAnimation = "complete"; }, 5000);
    }

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        writeMainName();
      }, { threshold: .25 });
      observer.observe(heading);
    } else {
      window.addEventListener("scroll", writeMainName, { passive: true });
    }
    if (intro) intro.addEventListener("close", writeMainName);
    document.addEventListener("visibilitychange", writeMainName);
    writeMainName();
  })();

  const feedback = document.querySelector("#testimonials");
  const feedbackNames = [...document.querySelectorAll(".testimonial-item h3")];
  const editingFeedback = new URLSearchParams(location.search).get("editTestimonials") === "1";
  if (feedback && feedbackNames.length && !editingFeedback && feedbackNames.every(name => /^Sample Person\s/.test(name.textContent))) feedback.hidden = true;

  const sections = document.querySelectorAll("main > section[id]");
  const links = document.querySelectorAll(".navigation a[href^='#']");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      const active = entries.find(entry => entry.isIntersecting);
      if (!active) return;
      links.forEach(link => {
        if (link.hash === `#${active.target.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-15% 0px -60% 0px", threshold: 0 });
    sections.forEach(section => observer.observe(section));
  }
})();
