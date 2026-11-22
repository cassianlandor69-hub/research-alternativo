const header = document.querySelector("[data-header]");

function syncHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 6);
}
syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

// Mobile navigation
const navToggle = document.querySelector("[data-nav-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");

function closeNav() {
  mobileNav?.classList.remove("is-open");
  navToggle?.setAttribute("aria-expanded", "false");
  navToggle?.setAttribute("aria-label", "Abrir menú");
}

navToggle?.addEventListener("click", () => {
  const open = !mobileNav?.classList.contains("is-open");
  mobileNav?.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
});

mobileNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeNav));

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) closeNav();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNav();
});

// Scroll reveal
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = [...document.querySelectorAll(".reveal")];
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((el) => el.classList.add("is-in"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
  );
  revealItems.forEach((el) => io.observe(el));
}

// Chart tooltips
const tip = document.createElement("div");
tip.className = "chart-tip";
tip.setAttribute("role", "status");
document.body.appendChild(tip);

let activeTip = null;

function placeTip(event) {
  const x = Math.min(Math.max(event.clientX, 84), window.innerWidth - 84);
  const y = Math.max(event.clientY - 10, 54);
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

document.addEventListener("pointerover", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-tip]") : null;
  if (!target || !target.getAttribute("data-tip")) return;
  activeTip = target;
  tip.textContent = target.getAttribute("data-tip") ?? "";
  tip.classList.add("is-visible");
  placeTip(event);
});

document.addEventListener("pointermove", (event) => {
  if (activeTip) placeTip(event);
});

document.addEventListener("pointerout", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-tip]") : null;
  if (!target || target !== activeTip) return;
  const related = event.relatedTarget;
  if (related instanceof Node && target.contains(related)) return;
  activeTip = null;
  tip.classList.remove("is-visible");
});

window.addEventListener("scroll", () => {
  activeTip = null;
  tip.classList.remove("is-visible");
}, { passive: true });

// Donut ↔ legend highlight
document.querySelectorAll("[data-donut]").forEach((donut) => {
  const segments = [...donut.querySelectorAll("[data-segment]")];
  const rows = [...donut.querySelectorAll("[data-legend-key]")];

  const focus = (key) => {
    segments.forEach((seg) => {
      const on = !key || seg.getAttribute("data-segment") === key;
      seg.style.opacity = on ? "0.95" : "0.18";
      seg.style.strokeWidth = seg.getAttribute("data-segment") === key ? "21" : "17";
    });
    rows.forEach((row) => row.classList.toggle("is-active", row.getAttribute("data-legend-key") === key));
  };

  const clear = () => {
    segments.forEach((seg) => {
      seg.style.opacity = "0.92";
      seg.style.strokeWidth = "17";
    });
    rows.forEach((row) => row.classList.remove("is-active"));
  };

  rows.forEach((row) => {
    row.addEventListener("pointerenter", () => focus(row.getAttribute("data-legend-key")));
    row.addEventListener("pointerleave", clear);
  });

  segments.forEach((seg) => {
    seg.addEventListener("pointerenter", () => focus(seg.getAttribute("data-segment")));
    seg.addEventListener("pointerleave", clear);
  });
});
