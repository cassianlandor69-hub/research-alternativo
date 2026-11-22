const dialog = document.querySelector("[data-search-dialog]");
const input = document.querySelector("[data-search-input]");
const body = document.querySelector("[data-search-body]");
const triggers = document.querySelectorAll("[data-search-open]");

if (dialog instanceof HTMLDialogElement && input instanceof HTMLInputElement && body) {
  const defaultHTML = body.innerHTML;
  let index = null;
  let loading = false;
  let failed = false;
  let active = 0;
  let currentResults = [];

  const ICONS = {
    agencies:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    people:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" stroke-linecap="round"/></svg>',
    clients:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18v13H3zM8 7V4h8v3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    news:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h4" stroke-linecap="round"/></svg>',
  };

  const SECTIONS = [
    { key: "agencies", label: "Agencias", href: (item) => `/agencias/${item.slug}/`, icon: ICONS.agencies },
    { key: "people", label: "Personas", href: (item) => `/personas/#p-${item.id}`, icon: ICONS.people },
    { key: "clients", label: "Clientes", href: (item) => `/clientes/#c-${item.id}`, icon: ICONS.clients },
    { key: "news", label: "Noticias", href: (item) => `/noticias/#n-${item.id}`, icon: ICONS.news },
  ];

  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  async function load() {
    if (index || loading || failed) return;
    loading = true;
    try {
      const res = await fetch("/search.json");
      if (!res.ok) throw new Error(String(res.status));
      index = await res.json();
      for (const section of SECTIONS) {
        for (const item of index[section.key] ?? []) {
          item.hayName = normalize(item.name);
          item.hayTerms = normalize(`${item.name} ${item.terms ?? ""} ${item.sub ?? ""}`);
        }
      }
    } catch {
      failed = true;
    } finally {
      loading = false;
    }
  }

  function score(item, q) {
    if (item.hayName === q) return 120;
    if (item.hayName.startsWith(q)) return 90;
    if (item.hayName.includes(q)) return 70;
    if (item.hayTerms.includes(q)) return 40;
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words.every((w) => item.hayTerms.includes(w))) return 25;
    return -1;
  }

  function setActive(next) {
    if (!currentResults.length) return;
    active = (next + currentResults.length) % currentResults.length;
    currentResults.forEach((el, i) => el.classList.toggle("is-active", i === active));
    currentResults[active]?.scrollIntoView({ block: "nearest" });
  }

  function renderResults() {
    const q = normalize(input.value.trim());
    body.innerHTML = "";
    currentResults = [];
    active = 0;

    if (!q) {
      body.innerHTML = defaultHTML;
      currentResults = [...body.querySelectorAll(".search-result")];
      currentResults.forEach((el, i) => {
        el.addEventListener("mouseenter", () => setActive(i));
        el.addEventListener("click", () => navigate(el.getAttribute("data-href")));
      });
      return;
    }

    if (failed) {
      body.innerHTML = '<p class="search-empty">El índice de búsqueda no está disponible. Usa las páginas del directorio.</p>';
      return;
    }

    if (!index) {
      body.innerHTML = '<p class="search-empty">Cargando índice…</p>';
      load().then(renderResults);
      return;
    }

    const grouped = [];
    let total = 0;
    for (const section of SECTIONS) {
      const matches = (index[section.key] ?? [])
        .map((item) => ({ item, s: score(item, q) }))
        .filter((m) => m.s >= 0)
        .sort((a, b) => b.s - a.s || a.item.name.localeCompare(b.item.name))
        .slice(0, 5);
      if (matches.length) {
        grouped.push({ section, matches });
        total += matches.length;
      }
    }

    if (!total) {
      body.innerHTML = `<p class="search-empty">Sin resultados para “${escapeHtml(input.value.trim())}”.<br />Prueba con una agencia, una persona, una marca o un tema.</p>`;
      return;
    }

    for (const { section, matches } of grouped) {
      const label = document.createElement("p");
      label.className = "search-section-label";
      label.textContent = section.label;
      body.appendChild(label);

      for (const { item } of matches) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "search-result";
        button.innerHTML = `<span class="ico" aria-hidden="true">${section.icon}</span>
          <span class="txt"><span class="name"></span><span class="sub"></span></span>
          <span class="go">INTRO</span>`;
        button.querySelector(".name").textContent = item.name;
        button.querySelector(".sub").textContent = item.sub ?? "";
        const href = section.href(item);
        button.setAttribute("data-href", href);
        button.addEventListener("click", () => navigate(href));
        button.addEventListener("mouseenter", () => setActive(currentResults.indexOf(button)));
        body.appendChild(button);
        currentResults.push(button);
      }
    }
    setActive(0);
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  }

  function navigate(href) {
    if (!href) return;
    window.location.href = href;
  }

  function open() {
    if (dialog.open) return;
    dialog.showModal();
    input.value = "";
    body.innerHTML = defaultHTML;
    currentResults = [...body.querySelectorAll(".search-result")];
    currentResults.forEach((el, i) => {
      el.addEventListener("mouseenter", () => setActive(i));
      el.addEventListener("click", () => navigate(el.getAttribute("data-href")));
    });
    active = 0;
    load().then(() => input.focus());
    window.setTimeout(() => input.focus(), 10);
  }

  triggers.forEach((trigger) => trigger.addEventListener("click", open));

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (dialog.open) dialog.close();
      else open();
    }
    if (!dialog.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(active + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(active - 1);
    } else if (event.key === "Enter") {
      const el = currentResults[active];
      if (el) {
        event.preventDefault();
        navigate(el.getAttribute("data-href") ?? (el instanceof HTMLAnchorElement ? el.href : null));
      }
    }
  });

  input.addEventListener("input", renderResults);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    input.value = "";
    body.innerHTML = defaultHTML;
  });
}
