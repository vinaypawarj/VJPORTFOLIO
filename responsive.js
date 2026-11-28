(() => {
  const header = document.querySelector(".site-header");
  const menu = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".navigation");
  const compactNavigation = window.matchMedia("(max-width: 900px)");
  function closeNavigation(restoreFocus = false) {
    if (!menu || !navigation) return;
    navigation.classList.remove("is-open");
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open navigation");
    if (restoreFocus) menu.focus({ preventScroll: true });
  }
  compactNavigation.addEventListener("change", () => closeNavigation());
  document.addEventListener("pointerdown", event => {
    if (navigation?.classList.contains("is-open") && !header?.contains(event.target)) closeNavigation();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && navigation?.classList.contains("is-open")) closeNavigation(true);
  });

  const chat = document.querySelector("#portfolio-chat");
  if (!chat) return;
  let frame = 0;
  function updateChatViewport() {
    frame = 0;
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    chat.style.setProperty("--chat-viewport-height", height + "px");
    chat.style.setProperty("--chat-viewport-top", (viewport?.offsetTop || 0) + "px");
    chat.dataset.compact = String(height < 480);
  }
  function scheduleViewportUpdate() {
    if (!frame) frame = window.requestAnimationFrame(updateChatViewport);
  }
  window.visualViewport?.addEventListener("resize", scheduleViewportUpdate);
  window.visualViewport?.addEventListener("scroll", scheduleViewportUpdate);
  window.addEventListener("resize", scheduleViewportUpdate, { passive: true });
  window.addEventListener("pageshow", scheduleViewportUpdate);
  updateChatViewport();
})();
