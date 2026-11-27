(() => {
  const music = document.querySelector("#portfolio-music");
  const frame = document.querySelector("#music-frame");
  const close = document.querySelector("#music-close");
  const toggle = music?.querySelector("summary");
  if (!music || !frame || !close || !toggle) return;

  function stopMusic() {
    // Removing the player stops the sound, including when the panel is closed.
    frame.replaceChildren();
    music.open = false;
  }

  music.addEventListener("toggle", () => {
    if (!music.open) {
      frame.replaceChildren();
      return;
    }
    if (document.hidden || frame.querySelector("iframe")) return;

    const videoId = music.dataset.videoId;
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return;
    const source = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    source.search = new URLSearchParams({
      autoplay: "1", controls: "1", playsinline: "1", loop: "1", playlist: videoId, rel: "0"
    }).toString();
    const player = document.createElement("iframe");
    player.src = source.href;
    player.title = "Portfolio music: Soft Inspiring Background Music for Presentation";
    player.width = "320";
    player.height = "200";
    player.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    player.allowFullscreen = true;
    player.referrerPolicy = "strict-origin-when-cross-origin";
    frame.append(player);
  });

  close.addEventListener("click", () => {
    stopMusic();
    toggle.focus({ preventScroll: true });
  });
  music.addEventListener("keydown", event => {
    if (event.key === "Escape" && music.open) {
      stopMusic();
      toggle.focus({ preventScroll: true });
    }
  });
  // Never leave a hidden YouTube player running behind another tab or the intro.
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopMusic(); });
  window.addEventListener("pagehide", stopMusic);
})();
