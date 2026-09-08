/* =========================================================
   script.js — Interactivity for the portfolio
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Loader ---------- */
  const loader = document.getElementById("loader");
  window.addEventListener("load", () => {
    setTimeout(() => loader.classList.add("done"), 400);
  });
  // fallback in case 'load' already fired
  setTimeout(() => loader.classList.add("done"), 2200);

  /* ---------- Theme toggle (light / dark) ---------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("kc-theme", theme);
    } catch (e) {}
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      themeToggle.setAttribute(
        "aria-label",
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      );
    }
    // Lets three-bg.js (and anything else) know the visual theme changed
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }

  if (themeToggle) {
    // sync the button state with whatever the head script already applied
    themeToggle.setAttribute("aria-pressed", currentTheme() === "light" ? "true" : "false");
    themeToggle.addEventListener("click", () => {
      applyTheme(currentTheme() === "light" ? "dark" : "light");
    });
  }

  /* ---------- Nav: scroll state ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Nav: mobile toggle ---------- */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinks.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Nav: active link on scroll ---------- */
  const sections = document.querySelectorAll("main section[id]");
  const navLinkEls = document.querySelectorAll(".nav-link");
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinkEls.forEach((l) => {
            l.classList.toggle("active", l.getAttribute("href") === `#${id}`);
          });
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  sections.forEach((s) => navObserver.observe(s));

  /* ---------- Scroll cue ---------- */
  const scrollCue = document.getElementById("scrollCue");
  if (scrollCue) {
    scrollCue.addEventListener("click", () => {
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  /* ---------- Shared claw-mark helper (used by cursor trail, click, and the portrait reveal) ---------- */
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CLAW_SVG = `
    <svg viewBox="0 0 100 100">
      <path d="M18 12 Q30 50 14 88" />
      <path d="M40 4  Q53 50 38 96" />
      <path d="M62 12 Q75 50 60 88" />
    </svg>`;

  function spawnClaw(x, y, angleDeg, isClick) {
    const el = document.createElement("div");
    el.className = "claw-mark" + (isClick ? " claw-mark--click" : "");
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty("--rot", `${angleDeg}deg`);
    el.innerHTML = CLAW_SVG;
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
    // safety cleanup in case animationend doesn't fire
    setTimeout(() => el.remove(), 900);
  }

  /* ---------- Reveal-on-scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal, .reveal-line");
  revealEls.forEach((el, i) => {
    if (!el.style.getPropertyValue("--delay")) {
      el.style.setProperty("--delay", `${Math.min(i % 6, 5) * 0.08}s`);
    }
  });
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));

  /* ---------- Custom cursor glow ---------- */
  const cursorGlow = document.getElementById("cursorGlow");
  const isTouch = window.matchMedia("(hover: none)").matches;

  if (cursorGlow && !isTouch) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let gx = cx;
    let gy = cy;

    window.addEventListener("mousemove", (e) => {
      cx = e.clientX;
      cy = e.clientY;
      cursorGlow.classList.add("active");
    });

    const hoverTargets = "a, button, .skill-card, .badge, .exp-card, .contact-card, .timeline-card";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverTargets)) cursorGlow.classList.add("hovering");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverTargets)) cursorGlow.classList.remove("hovering");
    });

    function raf() {
      gx += (cx - gx) * 0.18;
      gy += (cy - gy) * 0.18;
      cursorGlow.style.left = `${gx}px`;
      cursorGlow.style.top = `${gy}px`;
      requestAnimationFrame(raf);
    }
    raf();
  }

  /* ---------- Claw scratch cursor trail (Black Panther style) ---------- */
  if (!isTouch && !reducedMotion) {
    // Trailing scratches while moving fast enough
    let lastX = null;
    let lastY = null;
    let lastSpawn = 0;

    window.addEventListener(
      "mousemove",
      (e) => {
        const now = performance.now();
        if (lastX === null) {
          lastX = e.clientX;
          lastY = e.clientY;
          return;
        }
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dist = Math.hypot(dx, dy);

        // only scratch when moving with some speed, and throttle spawn rate
        if (dist > 34 && now - lastSpawn > 90) {
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
          spawnClaw(e.clientX, e.clientY, angle);
          lastSpawn = now;
          lastX = e.clientX;
          lastY = e.clientY;
        } else if (dist > 6) {
          lastX = e.clientX;
          lastY = e.clientY;
        }
      },
      { passive: true }
    );

    // Click uses the same claw-mark effect as the movement trail, just smaller
    window.addEventListener("click", (e) => {
      const angle = Math.random() * 360;
      spawnClaw(e.clientX, e.clientY, angle, true);

      const flash = document.createElement("div");
      flash.className = "claw-flash";
      document.body.appendChild(flash);
      flash.addEventListener("animationend", () => flash.remove(), { once: true });
      setTimeout(() => flash.remove(), 700);

      if (cursorGlow) {
        cursorGlow.classList.add("hovering");
        setTimeout(() => cursorGlow.classList.remove("hovering"), 200);
      }
    });
  }

  /* ---------- Portrait power-up pulse on click ---------- */
  const portraitFrame = document.querySelector(".portrait-frame");
  if (portraitFrame) {
    portraitFrame.addEventListener("click", () => {
      portraitFrame.classList.add("portrait-pulse");
      setTimeout(() => portraitFrame.classList.remove("portrait-pulse"), 750);
    });
  }

  /* ---------- Card tilt + glow-follow ---------- */
  const tiltCards = document.querySelectorAll(".skill-card, .exp-card, .contact-card, .badge, .timeline-card");
  tiltCards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${px}%`);
      card.style.setProperty("--my", `${py}%`);

      const rx = ((py - 50) / 50) * -4;
      const ry = ((px - 50) / 50) * 4;
      card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });

  /* ---------- Smooth anchor scrolling ----------
     Every section aligns the same way: its top edge sits just below
     the nav, so Skills lines up the same as Experience and the rest. */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (targetId.length < 2) return;
      const section = document.querySelector(targetId);
      if (!section) return;
      e.preventDefault();

      const navHeight = nav.getBoundingClientRect().height;
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const top = sectionTop - navHeight;

      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    });
  });
});