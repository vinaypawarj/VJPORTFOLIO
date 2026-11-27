(() => {
  document.documentElement.classList.add("experience-ready");
  const intro = document.querySelector("#portfolio-intro");
  const video = document.querySelector("#intro-video");
  const skip = document.querySelector("#skip-intro");
  const play = document.querySelector("#play-intro");
  const progress = document.querySelector("#intro-progress");
  const remaining = document.querySelector("#intro-remaining");
  const replayButtons = document.querySelectorAll("[data-replay-intro]");
  if (!intro || !video || typeof intro.showModal !== "function") return;
  const sessionKey = "vinay-portfolio-intro-v1";
  let previousFocus = null;
  let watchdog = 0;

  function rememberIntro() {
    try { sessionStorage.setItem(sessionKey, "seen"); } catch { /* Storage is optional. */ }
  }

  function finishIntro() {
    window.clearTimeout(watchdog);
    video.pause();
    if (intro.open) intro.close();
    document.body.classList.remove("intro-active");
    rememberIntro();
    if (previousFocus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
  }

  async function startIntro() {
    if (intro.open) return;
    previousFocus = document.activeElement;
    play.hidden = true;
    progress.value = 0;
    remaining.textContent = "10s";
    intro.showModal();
    document.body.classList.add("intro-active");
    video.muted = true;
    if (!video.getAttribute("src")) video.src = video.dataset.src;
    video.currentTime = 0;
    watchdog = window.setTimeout(finishIntro, 18000);
    try {
      await video.play();
    } catch {
      if (intro.open) play.hidden = false;
    }
  }

  replayButtons.forEach(button => {
    button.hidden = false;
    button.addEventListener("click", startIntro);
  });
  skip.addEventListener("click", finishIntro);
  intro.addEventListener("cancel", event => { event.preventDefault(); finishIntro(); });
  intro.addEventListener("close", () => {
    video.pause();
    window.clearTimeout(watchdog);
    document.body.classList.remove("intro-active");
  });
  play.addEventListener("click", async () => {
    try { await video.play(); play.hidden = true; } catch { finishIntro(); }
  });
  video.addEventListener("ended", finishIntro);
  video.addEventListener("error", finishIntro);
  video.addEventListener("timeupdate", () => {
    const duration = Number.isFinite(video.duration) ? video.duration : 10;
    progress.value = Math.min(10, video.currentTime * 10 / duration);
    remaining.textContent = `${Math.ceil(Math.max(0, duration - video.currentTime))}s`;
  });
  video.addEventListener("playing", () => {
    play.hidden = true;
    window.clearTimeout(watchdog);
    watchdog = window.setTimeout(finishIntro, 12000);
  });

  let seen = false;
  try { seen = sessionStorage.getItem(sessionKey) === "seen"; } catch { /* Continue without storage. */ }
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const directSectionLink = location.hash && location.hash !== "#home";
  if (!seen && !reduceMotion && !navigator.connection?.saveData && !directSectionLink) startIntro();

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
