function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

document.querySelectorAll("[data-explorer]").forEach((root) => {
  const search = root.querySelector("[data-filter-search]");
  const sortSelect = root.querySelector("[data-sort]");
  const items = [...root.querySelectorAll("[data-item]")];
  const container = root.querySelector("[data-items]");
  const countEls = [...root.querySelectorAll("[data-count]")];
  const empty = root.querySelector("[data-empty]");
  const resetButtons = [...root.querySelectorAll("[data-reset]")];
  if (!items.length) return;

  const chipGroups = new Map();
  root.querySelectorAll("[data-filter]").forEach((chip) => {
    if (chip instanceof HTMLSelectElement) return;
    const group = chip.getAttribute("data-filter");
    if (!group) return;
    if (!chipGroups.has(group)) chipGroups.set(group, []);
    chipGroups.get(group).push(chip);
  });

  const selectGroups = new Map();
  root.querySelectorAll("select[data-filter]").forEach((select) => {
    selectGroups.set(select.getAttribute("data-filter"), select);
  });

  const active = new Map();
  const params = new URLSearchParams(window.location.search);
  const initialSort = sortSelect?.value ?? "";

  for (const [group, chips] of chipGroups) {
    const value = params.get(group) ?? chips.find((c) => c.getAttribute("aria-pressed") === "true")?.getAttribute("data-value") ?? "all";
    active.set(group, value);
  }
  for (const [group, select] of selectGroups) {
    const value = params.get(group);
    if (value && [...select.options].some((o) => o.value === value)) {
      select.value = value;
    }
    active.set(group, select.value);
  }
  if (search instanceof HTMLInputElement && params.get("q")) search.value = params.get("q") ?? "";
  if (sortSelect && params.get("sort") && [...sortSelect.options].some((o) => o.value === params.get("sort"))) {
    sortSelect.value = params.get("sort") ?? sortSelect.value;
  }

  const applyPressed = () => {
    for (const [group, chips] of chipGroups) {
      const value = active.get(group) ?? "all";
      chips.forEach((chip) => chip.setAttribute("aria-pressed", String(chip.getAttribute("data-value") === value)));
    }
    for (const [group, select] of selectGroups) {
      select.value = active.get(group) ?? "";
    }
  };

  function sortItems() {
    if (!sortSelect) return;
    const option = sortSelect.selectedOptions[0];
    const key = option?.getAttribute("data-sort-key") ?? sortSelect.value;
    if (!key) return;
    const dir = option?.getAttribute("data-dir") ?? "asc";
    const attr = `data-sort-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    const valueOf = (el) => el.getAttribute(attr) ?? "";
    const dated = items.filter((el) => valueOf(el) !== "");
    const blank = items.filter((el) => valueOf(el) === "");
    const sorted = [...dated].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      const na = Number.parseFloat(av);
      const nb = Number.parseFloat(bv);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return dir === "desc" ? nb - na : na - nb;
      return dir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    (container ?? root).append(...sorted, ...blank);
  }

  function updateUrl() {
    const next = new URLSearchParams();
    const q = search instanceof HTMLInputElement ? search.value.trim() : "";
    if (q) next.set("q", q);
    for (const [group, value] of active) {
      if (value && value !== "all" && !(selectGroups.has(group) && value === "")) next.set(group, value);
    }
    if (sortSelect && sortSelect.value !== initialSort) next.set("sort", sortSelect.value);
    const qs = next.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }

  function apply() {
    const rawQuery = search instanceof HTMLInputElement ? search.value.trim() : "";
    const q = normalize(rawQuery);
    let visible = 0;
    for (const item of items) {
      let show = true;
      if (q && !normalize(item.getAttribute("data-search") ?? "").includes(q)) show = false;
      if (show) {
        for (const [group, value] of active) {
          if (!value || value === "all") continue;
          const tokens = (item.getAttribute(`data-${group}`) ?? "").toLowerCase().split(/\s+/);
          if (!tokens.includes(value)) {
            show = false;
            break;
          }
        }
      }
      item.style.display = show ? "" : "none";
      if (show) visible += 1;
    }
    countEls.forEach((el) => {
      el.textContent = String(visible);
    });
    empty?.classList.toggle("is-visible", visible === 0);
    const filtered =
      Boolean(rawQuery) ||
      [...active.values()].some((value) => value && value !== "all") ||
      Boolean(sortSelect && sortSelect.value !== initialSort);
    resetButtons.forEach((button) => {
      if (!button.closest(".empty")) button.classList.toggle("is-visible", filtered);
    });
    updateUrl();
  }

  chipGroups.forEach((chips, group) => {
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        active.set(group, chip.getAttribute("data-value") ?? "all");
        applyPressed();
        apply();
      });
    });
  });

  selectGroups.forEach((select, group) => {
    select.addEventListener("change", () => {
      active.set(group, select.value);
      applyPressed();
      apply();
    });
  });

  if (search instanceof HTMLInputElement) {
    search.addEventListener("input", apply);
    if (params.get("q")) {
      // keep focus at the end for deep links
      search.setSelectionRange(search.value.length, search.value.length);
    }
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      sortItems();
      updateUrl();
    });
  }

  resetButtons.forEach((resetButton) => resetButton.addEventListener("click", () => {
    if (search instanceof HTMLInputElement) search.value = "";
    for (const [group, chips] of chipGroups) {
      const allChip = chips.find((c) => c.getAttribute("data-value") === "all");
      active.set(group, allChip ? "all" : chips[0]?.getAttribute("data-value") ?? "all");
    }
    for (const [group, select] of selectGroups) {
      select.value = "";
      active.set(group, "");
    }
    if (sortSelect) sortSelect.value = initialSort;
    applyPressed();
    sortItems();
    apply();
    search?.focus();
  }));

  applyPressed();
  sortItems();
  apply();
});
