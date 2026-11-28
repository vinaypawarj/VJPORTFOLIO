(() => {
  const root = document.querySelector("#portfolio-chat");
  if (!root) return;
  const launcher = root.querySelector("#chat-launcher");
  const panel = root.querySelector("#chat-panel");
  const messages = root.querySelector("#chat-messages");
  const form = root.querySelector("#chat-form");
  const input = root.querySelector("#chat-input");
  const send = root.querySelector("#chat-send");
  const suggestions = root.querySelector("#chat-suggestions");
  let endpoint = "";
  try {
    const url = new URL(window.VINAY_CHAT_CONFIG?.endpoint);
    if (url.protocol === "https:") endpoint = url.href;
  } catch { /* The portfolio guide remains available before AI is configured. */ }
  let history = [];
  let pending = null;
  let openedOnce = false;
  const welcomes = [
    "Hey there! 👋 Welcome to Vinay’s portfolio.",
    "Hello, explorer! 🧭 Glad you stopped by.",
    "A warm welcome! ☀️ Let’s explore Vinay’s journey.",
    "Welcome aboard! 🚀 Discover what Vinay is learning and building.",
    "Hi and welcome! 🌟 A curious mind starts with a question.",
    "Good to see you! 😊 What would you like to discover today?",
    "Hello, curious mind! 💡 Let’s find what you’re looking for.",
    "Thanks for stopping by! 🙌 Take a look around.",
    "Welcome to Vinay’s corner of the web! 🌐 Let’s get started.",
    "Hey, welcome in! ✨ Ready to explore something new?"
  ];
  const welcomeKey = "vinay-chat-welcome-v1";
  let welcomeIndex = -1;
  try {
    const saved = parseInt(localStorage.getItem(welcomeKey), 10);
    if (Number.isInteger(saved) && saved >= 0 && saved < welcomes.length) welcomeIndex = saved;
  } catch { /* Greetings still rotate when storage is unavailable. */ }

  function welcomeMessage() {
    welcomeIndex = (welcomeIndex + 1) % welcomes.length;
    try { localStorage.setItem(welcomeKey, String(welcomeIndex)); } catch { /* Storage is optional. */ }
    const help = endpoint
      ? "I’m Vinay’s AI assistant. Ask about his portfolio, coding or study topics. How can I help?"
      : "I’m Vinay’s portfolio guide. I can help with his profile, skills, work and contact options. What would you like to explore?";
    return welcomes[welcomeIndex] + "\n\n" + help;
  }

  function scrollMessages() { messages.scrollTop = messages.scrollHeight; }

  function addMessage(role, text, links = []) {
    const article = document.createElement("article");
    article.className = "chat-message";
    article.dataset.role = role;
    const label = document.createElement("span");
    label.className = "chat-message-label";
    label.textContent = role === "user" ? "You" : endpoint ? "AI assistant" : "Portfolio guide";
    const body = document.createElement("div");
    body.className = "chat-message-body";
    // Text and code are rendered as text nodes, never as HTML from a visitor or model.
    text.split(/(```[\s\S]*?```)/g).filter(Boolean).forEach(part => {
      if (part.startsWith("```")) {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = part.slice(3, -3).replace(/^[\w+-]*\n/, "").trim();
        pre.append(code); body.append(pre);
      } else {
        const paragraph = document.createElement("p");
        paragraph.textContent = part; body.append(paragraph);
      }
    });
    if (links.length) {
      const actions = document.createElement("div");
      actions.className = "chat-message-links";
      links.forEach(([title, href]) => {
        const link = document.createElement("a"); link.textContent = title; link.href = href;
        if (href.startsWith("#")) link.addEventListener("click", () => setOpen(false));
        actions.append(link);
      });
      body.append(actions);
    }
    article.append(label, body); messages.append(article); scrollMessages();
  }

  function portfolioAnswer(question) {
    const q = question.toLowerCase();
    if (/contact|connect|email|whatsapp|instagram|linkedin|ಸಂಪರ್ಕ/.test(q)) return [
      "You can contact Vinay through the email, WhatsApp, Instagram, and LinkedIn links on this portfolio. Choose Contact below to see the options.", [["Contact Vinay", "#contact"]]
    ];
    if (/skill|learn|coding|research|ಕೌಶಲ/.test(q) && !/teach|explain|what is|how (?:do|to|can i)|write|code for/.test(q)) return [
      "Vinay is developing skills in coding, research, problem solving, and creative thinking. He is learning to build responsive, accessible web experiences, one experiment at a time.", [["Explore skills", "#skills"]]
    ];
    if (/project|portfolio|work|experience/.test(q) && !/homework|work out|write|explain/.test(q)) return [
      "Vinay’s selected-work section is ready for the projects and experiments he is developing. The current project cards are placeholders; completed project details have not been added yet.", [["View selected work", "#projects"]]
    ];
    if (/about|vinay|upsc|journey|who|ಯಾರು/.test(q) && !/explain|teach|syllabus|exam|question|study plan|prepare/.test(q)) return [
      "Vinay Pawar is a UPSC aspirant and aspiring developer. He enjoys understanding people and systems, solving practical problems, and turning ideas into useful digital experiences.", [["About Vinay", "#about"]]
    ];
    if (/^(hi|hello|hey|namaste|ನಮಸ್ಕಾರ)[!.\s]*$/.test(q)) return [
      "Hello! I can help you explore Vinay’s profile, skills, work, and contact options. What would you like to know?", []
    ];
    return ["General AI replies are not connected yet. I can answer questions about Vinay’s profile, skills, work, and contact options. For other questions, use Open ChatGPT below.", []];
  }

  function setOpen(open) {
    panel.hidden = !open;
    root.dataset.open = String(open);
    document.body.classList.toggle("chat-open", open);
    launcher.setAttribute("aria-expanded", String(open));
    if (open) {
      // Refresh only the welcome; reopening an active conversation keeps it intact.
      if (openedOnce && !messages.querySelector('[data-role="user"]')) resetChat();
      openedOnce = true;
      input.focus({ preventScroll: true }); scrollMessages();
    } else launcher.focus({ preventScroll: true });
  }

  function resetChat() {
    pending?.abort(); pending = null; history = [];
    messages.replaceChildren(); suggestions.hidden = false;
    input.value = ""; input.style.height = ""; setBusy(false);
    addMessage("assistant", welcomeMessage());
  }

  function setBusy(busy) {
    send.dataset.busy = String(busy);
    send.setAttribute("aria-label", busy ? "Stop reply" : "Send message");
    send.querySelector("svg").innerHTML = busy ? '<rect x="0" y="0" width="24" height="24" rx="4"/>' : '<path d="M12 19V5m-6 6 6-6 6 6"/>';
    root.dataset.busy = String(busy);
  }

  async function submitMessage(question) {
    question = question.trim().slice(0, 2000);
    if (!question || pending) return;
    suggestions.hidden = true;
    addMessage("user", question); input.value = ""; input.style.height = "";
    if (!endpoint) {
      const [answer, links] = portfolioAnswer(question);
      addMessage("assistant", answer, links); input.focus({ preventScroll: true }); return;
    }

    const controller = new AbortController(); pending = controller; setBusy(true);
    const thinking = document.createElement("p"); thinking.className = "chat-thinking";
    thinking.textContent = "Thinking…"; messages.append(thinking); scrollMessages();
    const timer = window.setTimeout(() => controller.abort("timeout"), 30000);
    try {
      const conversation = [...history, { role: "user", content: question }].slice(-9);
      while (conversation.length > 1 && conversation.reduce((length, message) => length + message.content.length, 0) > 19000) conversation.splice(0, 2);
      const response = await fetch(endpoint, {
        method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }), signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 429 ? "There are too many requests right now. Please try again in a minute." : "AI replies are temporarily unavailable. Please try again shortly.");
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("The assistant returned no reply. Please try again.");
      if (pending !== controller) return;
      const reply = data.reply.trim().slice(0, 14000);
      history = [...conversation, { role: "assistant", content: reply }].slice(-8);
      addMessage("assistant", reply);
    } catch (error) {
      if (pending !== controller) return;
      addMessage("assistant", controller.signal.aborted
        ? controller.signal.reason === "timeout" ? "That reply took too long. Please try a shorter question." : "Reply stopped. You can send another message."
        : error instanceof TypeError ? "I couldn’t connect to the AI service. Please try again shortly." : error.message);
    } finally {
      window.clearTimeout(timer); thinking.remove();
      if (pending === controller) { pending = null; setBusy(false); }
      scrollMessages();
    }
  }

  if (endpoint) {
    root.querySelector("#chat-mode").textContent = "AI assistant · Study, code & explore";
    root.querySelector("#chat-note").textContent = "AI can make mistakes. Messages are sent to the AI service.";
    root.querySelector("#chat-external").hidden = true;
    input.placeholder = "Ask a question…";
  }
  launcher.hidden = false;
  launcher.addEventListener("click", () => setOpen(panel.hidden));
  root.querySelector("#chat-close").addEventListener("click", () => setOpen(false));
  root.querySelector("#chat-reset").addEventListener("click", () => { resetChat(); input.focus(); });
  root.addEventListener("keydown", event => { if (event.key === "Escape" && !panel.hidden) setOpen(false); });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (pending) { pending.abort(); return; }
    submitMessage(input.value);
  });
  // The stop control remains usable even while the message field is empty.
  send.addEventListener("click", event => { if (pending) { event.preventDefault(); pending.abort(); } });
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault(); if (!pending) form.requestSubmit();
    }
  });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 106) + "px"; });
  suggestions.querySelectorAll("[data-chat-question]").forEach(button => button.addEventListener("click", () => submitMessage(button.dataset.chatQuestion)));
  resetChat();
})();
