// === Delad logik för idé/todo-listor (ideer.html, todo.html) ===
// Förväntar markup: #formTitle, #ideaForm, #i_title, #i_desc, #saveBtn,
// #cancelBtn, #tagPicker, #filterPicker, #ideaList, #emptyMsg, #status
// Valfritt om enablePrio: #i_prio (select med values 1/2/3)
// Valfritt om enableDueDate: #i_due (input type="date")

const SV_WEEKDAYS_SHORT = ["sön","mån","tis","ons","tor","fre","lör"];
const SV_MONTHS_SHORT = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];
const PRIO_INFO = {
  1: { label: "Hög",   emoji: "🔴", cls: "prio-1" },
  2: { label: "Medel", emoji: "🟡", cls: "prio-2" },
  3: { label: "Låg",   emoji: "🟢", cls: "prio-3" }
};

function _parseDueDate(s) {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
function formatDueDateSv(s) {
  const due = _parseDueDate(s);
  if (!due) return "";
  const today = new Date(); today.setHours(0,0,0,0);
  const diffDays = Math.round((due - today) / 86400000);
  const dm = due.getDate() + " " + SV_MONTHS_SHORT[due.getMonth()];
  if (diffDays < 0) return "Försenad: " + dm;
  if (diffDays === 0) return "Idag";
  if (diffDays === 1) return "Imorgon";
  if (diffDays <= 7) return SV_WEEKDAYS_SHORT[due.getDay()] + " " + dm;
  const sameYear = due.getFullYear() === today.getFullYear();
  return dm + (sameYear ? "" : " " + due.getFullYear());
}

function initTaskList(opts) {
  const cfg = Object.assign({
    collection: "ideer",
    navKey: "ideer",
    defaultTags: [],
    storePrefix: null,
    formTitleNew: "Ny",
    formTitleEdit: "Redigera",
    saveBtnNew: "Spara",
    saveBtnEdit: "Spara ändringar",
    addPlaceholder: "Nytt delmål...",
    confirmRemoveItem: "Ta bort?",
    emptyText: null,
    itemsLabel: "objekt",
    statusReady: null,
    enablePrio: false,
    enableDueDate: false,
    enableCalendar: false,
    calendarLabel: "📅 Spara i kalender (kräver datum)",
    lockedTag: null,        // Om satt: sidan visar bara poster med denna tagg,
                            // filter-picker göms, nya poster får taggen automatiskt.
    lockedTagBackHref: null // Href för "← Alla områden"-länken (visas om satt)
  }, opts || {});
  const storePrefix = cfg.storePrefix || cfg.collection;
  const TAGS_STORE = storePrefix + ".customTags";
  const REMOVED_STORE = storePrefix + ".removedDefaults";
  const FILTER_STORE = storePrefix + ".filter";
  const COLLAPSED_STORE = storePrefix + ".collapsed";

  const statusEl   = document.getElementById("status");
  const emptyMsgEl = document.getElementById("emptyMsg");
  if (emptyMsgEl && cfg.emptyText) emptyMsgEl.textContent = cfg.emptyText;

  let items = [];
  let db = null;
  let editingId = null;
  let selectedTags = new Set(cfg.lockedTag ? [cfg.lockedTag] : []);
  let customTags = [];
  let removedDefaults = [];
  let activeFilter = null;
  let collapsedIds = new Set();

  try {
    customTags = JSON.parse(localStorage.getItem(TAGS_STORE) || "[]");
    if (!Array.isArray(customTags)) customTags = [];
  } catch(e) { customTags = []; }
  try {
    removedDefaults = JSON.parse(localStorage.getItem(REMOVED_STORE) || "[]");
    if (!Array.isArray(removedDefaults)) removedDefaults = [];
  } catch(e) { removedDefaults = []; }
  if (cfg.lockedTag) {
    activeFilter = cfg.lockedTag;
  } else {
    try { activeFilter = localStorage.getItem(FILTER_STORE) || null; } catch(e) {}
  }
  try {
    const arr = JSON.parse(localStorage.getItem(COLLAPSED_STORE) || "[]");
    if (Array.isArray(arr)) collapsedIds = new Set(arr);
  } catch(e) { collapsedIds = new Set(); }
  function saveCollapsed() {
    try { localStorage.setItem(COLLAPSED_STORE, JSON.stringify([...collapsedIds])); } catch(e) {}
  }

  if (!document.getElementById("task-list-arkiv-css")) {
    const css = document.createElement("style");
    css.id = "task-list-arkiv-css";
    css.textContent = `
      .idea-done-toggle{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);cursor:pointer;user-select:none;padding:4px 8px;border:1px solid var(--line);border-radius:999px;background:#fff;flex:0 0 auto}
      .idea-done-toggle input{accent-color:var(--accent,#3a7c87);width:14px;height:14px;cursor:pointer;margin:0}
      .idea.done{opacity:.65;background:#fafafa}
      .idea.done .idea-title{text-decoration:line-through;color:var(--muted)}
      details.todos-arkiv{margin-top:24px;border-top:1px dashed var(--line);padding-top:12px}
      details.todos-arkiv > summary{cursor:pointer;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:700;list-style:none;padding:6px 0;user-select:none;display:flex;align-items:center;gap:8px}
      details.todos-arkiv > summary::-webkit-details-marker{display:none}
      details.todos-arkiv > summary::before{content:"▸";display:inline-block;transition:transform .15s;font-size:11px}
      details.todos-arkiv[open] > summary::before{transform:rotate(90deg)}
      .todos-arkiv-list{display:flex;flex-direction:column;gap:14px;margin-top:12px}
      .idea-collapse-btn{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid var(--line);background:#fff;border-radius:6px;cursor:pointer;color:var(--muted);font-size:12px;line-height:1;padding:0;transition:transform .15s,background .15s,color .15s}
      .idea-collapse-btn:hover{background:var(--accent-soft,#f5f0e6);color:var(--accent,#3a7c87)}
      .idea-collapse-btn .chev{display:inline-block;transition:transform .15s}
      .idea.collapsed .idea-collapse-btn .chev{transform:rotate(-90deg)}
      .idea.collapsed .idea-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .idea-body{display:flex;flex-direction:column;gap:0}
      .idea.collapsed .idea-body{display:none}
      .idea-head{display:flex;flex-direction:column;gap:6px}
      .idea-top{display:flex;align-items:flex-start;gap:8px;width:100%}
      .idea-top .idea-title{flex:1 1 auto;min-width:0;word-break:break-word;margin:0}
      .idea-top .idea-actions{flex:0 0 auto;margin-left:auto;display:flex;gap:4px}
      .idea-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
      .idea-meta:empty{display:none}
    `;
    document.head.appendChild(css);
  }

  function allTags() {
    const removed = new Set(removedDefaults);
    const set = new Set();
    cfg.defaultTags.forEach(t => { if (!removed.has(t)) set.add(t); });
    customTags.forEach(t => set.add(t));
    items.forEach(i => (i.tags || []).forEach(t => set.add(t)));
    return [...set];
  }

  function deleteTag(t) {
    if (!confirm("Ta bort taggen \"" + t + "\"?\n(Befintliga poster behåller den, men den föreslås inte längre.)")) return;
    if (cfg.defaultTags.includes(t)) {
      if (!removedDefaults.includes(t)) removedDefaults.push(t);
      try { localStorage.setItem(REMOVED_STORE, JSON.stringify(removedDefaults)); } catch(e) {}
    }
    const ci = customTags.indexOf(t);
    if (ci >= 0) {
      customTags.splice(ci, 1);
      try { localStorage.setItem(TAGS_STORE, JSON.stringify(customTags)); } catch(e) {}
    }
    selectedTags.delete(t);
    if (activeFilter === t) { activeFilter = null; saveFilter(); }
    renderTagPicker();
    renderFilter();
  }

  function renderTagPicker() {
    const root = document.getElementById("tagPicker");
    if (!root) return;
    root.innerHTML = "";
    allTags().forEach(t => {
      const p = document.createElement("span");
      p.className = "tag-pill" + (selectedTags.has(t) ? " selected" : "");
      const label = document.createElement("span");
      label.textContent = t;
      label.onclick = () => {
        if (selectedTags.has(t)) selectedTags.delete(t); else selectedTags.add(t);
        renderTagPicker();
      };
      p.appendChild(label);
      const x = document.createElement("span");
      x.className = "tag-x";
      x.textContent = "×";
      x.title = "Ta bort taggen";
      x.onclick = (ev) => { ev.stopPropagation(); deleteTag(t); };
      p.appendChild(x);
      root.appendChild(p);
    });
    const add = document.createElement("span");
    add.className = "tag-pill tag-add";
    add.textContent = "+ Ny tagg";
    add.onclick = () => {
      const name = prompt("Ny tagg:");
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      if (!customTags.includes(trimmed) && !cfg.defaultTags.includes(trimmed)) {
        customTags.push(trimmed);
        try { localStorage.setItem(TAGS_STORE, JSON.stringify(customTags)); } catch(e) {}
      }
      selectedTags.add(trimmed);
      renderTagPicker();
      renderFilter();
    };
    root.appendChild(add);
  }

  function renderFilter() {
    const root = document.getElementById("filterPicker");
    if (!root) return;
    root.innerHTML = "";
    if (cfg.lockedTag) {
      // Låst läge: visa bara en återgå-länk och etikett för nuvarande område
      root.classList.add("tag-row-locked");
      if (cfg.lockedTagBackHref) {
        const back = document.createElement("a");
        back.className = "tag-pill tag-back";
        back.href = cfg.lockedTagBackHref;
        back.textContent = "← Alla områden";
        root.appendChild(back);
      }
      const label = document.createElement("span");
      label.className = "tag-pill selected";
      label.textContent = cfg.lockedTag;
      label.title = "Filtrerat på detta område";
      root.appendChild(label);
      return;
    }
    const allBtn = document.createElement("span");
    allBtn.className = "tag-pill" + (!activeFilter ? " selected" : "");
    allBtn.textContent = "Alla";
    allBtn.onclick = () => { activeFilter = null; saveFilter(); renderFilter(); renderList(); };
    root.appendChild(allBtn);
    allTags().forEach(t => {
      const p = document.createElement("span");
      p.className = "tag-pill" + (activeFilter === t ? " selected" : "");
      p.textContent = t;
      p.onclick = () => { activeFilter = (activeFilter === t ? null : t); saveFilter(); renderFilter(); renderList(); };
      root.appendChild(p);
    });
  }
  function saveFilter() {
    if (cfg.lockedTag) return; // Sparas inte i låst läge
    try {
      if (activeFilter) localStorage.setItem(FILTER_STORE, activeFilter);
      else localStorage.removeItem(FILTER_STORE);
    } catch(e) {}
  }

  function resetForm() {
    editingId = null;
    document.getElementById("formTitle").textContent = cfg.formTitleNew;
    document.getElementById("saveBtn").textContent = cfg.saveBtnNew;
    document.getElementById("cancelBtn").style.display = "none";
    document.getElementById("ideaForm").reset();
    selectedTags = new Set(cfg.lockedTag ? [cfg.lockedTag] : []);
    if (cfg.enablePrio) {
      const sel = document.getElementById("i_prio");
      if (sel) sel.value = "2";
    }
    if (cfg.enableDueDate) {
      const inp = document.getElementById("i_due");
      if (inp) inp.value = "";
    }
    if (cfg.enableCalendar) {
      const cb = document.getElementById("i_calendar");
      if (cb) cb.checked = false;
    }
    renderTagPicker();
  }
  document.getElementById("cancelBtn").addEventListener("click", resetForm);

  // Håll "Spara i kalender" synkad med datum: kryssa i automatiskt när datum
  // sätts (vanligaste fallet), avmarkera om datum töms, och vid försök att
  // kryssa utan datum – fokusera datumfältet.
  if (cfg.enableCalendar) {
    const dueInp = document.getElementById("i_due");
    const calCb  = document.getElementById("i_calendar");
    if (dueInp && calCb) {
      const syncFromDate = () => {
        if (dueInp.value) calCb.checked = true;
        else calCb.checked = false;
      };
      dueInp.addEventListener("change", syncFromDate);
      dueInp.addEventListener("input", syncFromDate);
      calCb.addEventListener("change", () => {
        if (calCb.checked && !dueInp.value) {
          calCb.checked = false;
          alert("Välj datum (Klart senast) först.");
          dueInp.focus();
          try { dueInp.showPicker && dueInp.showPicker(); } catch (e) {}
        }
      });
    }
  }

  document.getElementById("ideaForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!db) { alert("Ansluter, vänta..."); return; }
    const title = document.getElementById("i_title").value.trim();
    const desc  = document.getElementById("i_desc").value.trim();
    if (!title) return;
    const data = { title, desc, tags: [...selectedTags], updatedAt: Date.now() };
    if (cfg.enablePrio) {
      const sel = document.getElementById("i_prio");
      data.prio = sel ? parseInt(sel.value, 10) || 2 : 2;
    }
    if (cfg.enableDueDate) {
      const inp = document.getElementById("i_due");
      data.dueDate = (inp && inp.value) ? inp.value : null;
    }
    if (cfg.enableCalendar) {
      const cb = document.getElementById("i_calendar");
      const wantsCal = !!(cb && cb.checked);
      if (wantsCal && !data.dueDate) {
        alert("Välj datum (Klart senast) för att spara i kalendern.");
        return;
      }
      data.inCalendar = wantsCal;
    }
    if (editingId) {
      db.collection(cfg.collection).doc(editingId).set(data, { merge: true })
        .then(resetForm).catch(err => alert("Fel: " + err.message));
    } else {
      data.tasks = [];
      data.createdAt = Date.now();
      db.collection(cfg.collection).add(data)
        .then(resetForm).catch(err => alert("Fel: " + err.message));
    }
  });

  function startEdit(item) {
    editingId = item.id;
    document.getElementById("formTitle").textContent = cfg.formTitleEdit;
    document.getElementById("saveBtn").textContent = cfg.saveBtnEdit;
    document.getElementById("cancelBtn").style.display = "";
    document.getElementById("i_title").value = item.title || "";
    document.getElementById("i_desc").value = item.desc || "";
    if (cfg.enablePrio) {
      const sel = document.getElementById("i_prio");
      if (sel) sel.value = String(item.prio || 2);
    }
    if (cfg.enableDueDate) {
      const inp = document.getElementById("i_due");
      if (inp) inp.value = item.dueDate || "";
    }
    if (cfg.enableCalendar) {
      const cb = document.getElementById("i_calendar");
      // Default till true för poster med datum där inCalendar inte är satt
      // (t.ex. äldre data eller poster skapade innan auto-synken).
      if (cb) {
        if (item.inCalendar === false) cb.checked = false;
        else cb.checked = !!item.dueDate;
      }
    }
    selectedTags = new Set(item.tags || []);
    if (cfg.lockedTag) selectedTags.add(cfg.lockedTag);
    renderTagPicker();
    document.getElementById("ideaForm").scrollIntoView({ behavior:"smooth", block:"start" });
  }

  function removeItem(id) {
    if (!db) return;
    if (!confirm(cfg.confirmRemoveItem)) return;
    db.collection(cfg.collection).doc(id).delete().catch(err => alert("Fel: " + err.message));
  }

  function toggleItemDone(id, done) {
    if (!db) return;
    db.collection(cfg.collection).doc(id).update({
      done: !!done,
      doneAt: done ? Date.now() : null,
      updatedAt: Date.now()
    }).catch(err => alert("Fel: " + err.message));
  }

  function addTask(item, text) {
    const trimmed = (text || "").trim();
    if (!trimmed) return;
    const tasks = [...(item.tasks || []), {
      id: "t_" + Date.now() + "_" + Math.floor(Math.random()*1000),
      text: trimmed, done: false
    }];
    db.collection(cfg.collection).doc(item.id).update({ tasks, updatedAt: Date.now() })
      .catch(err => alert("Fel: " + err.message));
  }
  function toggleTask(item, taskId, done) {
    const tasks = (item.tasks || []).map(t => t.id === taskId ? { ...t, done } : t);
    db.collection(cfg.collection).doc(item.id).update({ tasks, updatedAt: Date.now() })
      .catch(err => console.error(err));
  }
  function removeTask(item, taskId) {
    const tasks = (item.tasks || []).filter(t => t.id !== taskId);
    db.collection(cfg.collection).doc(item.id).update({ tasks, updatedAt: Date.now() })
      .catch(err => console.error(err));
  }
  function editTaskText(item, taskId, newText) {
    const trimmed = (newText || "").trim();
    if (!trimmed) return;
    const tasks = (item.tasks || []).map(t => t.id === taskId ? { ...t, text: trimmed } : t);
    db.collection(cfg.collection).doc(item.id).update({ tasks, updatedAt: Date.now() })
      .catch(err => alert("Fel: " + err.message));
  }

  function beginInlineEdit(row, txt, item, task) {
    const input = document.createElement("textarea");
    input.value = task.text;
    input.className = "task-edit";
    input.rows = 1;
    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.padding = "6px 8px";
    input.style.fontSize = "14px";
    input.style.fontFamily = "inherit";
    input.style.lineHeight = "1.4";
    input.style.border = "1px solid var(--line)";
    input.style.borderRadius = "6px";
    input.style.resize = "vertical";
    input.style.overflow = "hidden";
    input.style.minHeight = "60px";
    row.replaceChild(input, txt);
    const autosize = () => {
      input.style.height = "auto";
      input.style.height = Math.max(60, input.scrollHeight) + "px";
    };
    input.addEventListener("input", autosize);
    input.focus();
    input.select();
    // Kör autosize efter att elementet är i DOM så scrollHeight är korrekt.
    setTimeout(autosize, 0);
    let done = false;
    const commit = () => {
      if (done) return; done = true;
      const v = input.value.trim();
      if (v && v !== task.text) editTaskText(item, task.id, v);
      else row.replaceChild(txt, input); // återställ om ingen ändring (annars kommer onSnapshot)
    };
    const cancel = () => {
      if (done) return; done = true;
      row.replaceChild(txt, input);
    };
    input.onblur = commit;
    input.onkeydown = e => {
      // Enter sparar, Shift+Enter (eller Ctrl/Cmd+Enter) skapar radbrytning.
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        input.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
  }

  function renderList() {
    const list = document.getElementById("ideaList");
    list.innerHTML = "";
    let shown = items;
    if (activeFilter) shown = items.filter(i => (i.tags || []).includes(activeFilter));
    const sortActive = (a, b) => {
      if (cfg.enablePrio) {
        const pa = parseInt(a.prio, 10) || 2;
        const pb = parseInt(b.prio, 10) || 2;
        if (pa !== pb) return pa - pb;
      }
      if (cfg.enableDueDate) {
        const da = _parseDueDate(a.dueDate); const db_ = _parseDueDate(b.dueDate);
        const ta = da ? da.getTime() : Infinity;
        const tb = db_ ? db_.getTime() : Infinity;
        if (ta !== tb) return ta - tb;
      }
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    };
    const active = shown.filter(i => !i.done).sort(sortActive);
    const done = shown.filter(i => i.done).sort((a, b) => (b.doneAt || b.updatedAt || 0) - (a.doneAt || a.updatedAt || 0));
    if (emptyMsgEl) emptyMsgEl.style.display = (active.length + done.length) ? "none" : "";

    active.forEach(item => list.appendChild(buildCard(item)));

    if (done.length) {
      const arkiv = document.createElement("details");
      arkiv.className = "todos-arkiv";
      const sum = document.createElement("summary");
      sum.textContent = "📁 Arkiv (" + done.length + ")";
      arkiv.appendChild(sum);
      const dList = document.createElement("div");
      dList.className = "todos-arkiv-list";
      done.forEach(item => dList.appendChild(buildCard(item)));
      arkiv.appendChild(dList);
      list.appendChild(arkiv);
    }
  }

  function buildCard(item) {
      const card = document.createElement("div");
      const isCollapsed = collapsedIds.has(item.id);
      card.className = "idea" + (item.done ? " done" : "") + (isCollapsed ? " collapsed" : "");

      const head = document.createElement("div");
      head.className = "idea-head";

      const topRow = document.createElement("div");
      topRow.className = "idea-top";
      const metaRow = document.createElement("div");
      metaRow.className = "idea-meta";

      const collapseBtn = document.createElement("button");
      collapseBtn.type = "button";
      collapseBtn.className = "idea-collapse-btn";
      collapseBtn.title = isCollapsed ? "Visa innehåll" : "Dölj innehåll";
      collapseBtn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      collapseBtn.innerHTML = '<span class="chev">▾</span>';
      collapseBtn.onclick = (ev) => {
        ev.stopPropagation();
        if (collapsedIds.has(item.id)) collapsedIds.delete(item.id);
        else collapsedIds.add(item.id);
        saveCollapsed();
        const nowCollapsed = collapsedIds.has(item.id);
        card.classList.toggle("collapsed", nowCollapsed);
        collapseBtn.title = nowCollapsed ? "Visa innehåll" : "Dölj innehåll";
        collapseBtn.setAttribute("aria-expanded", nowCollapsed ? "false" : "true");
      };
      topRow.appendChild(collapseBtn);

      const title = document.createElement("h3");
      title.className = "idea-title";
      title.textContent = item.title;
      title.style.cursor = "pointer";
      title.title = "Klicka för att fälla ihop/expandera";
      title.onclick = () => collapseBtn.click();
      topRow.appendChild(title);

      const doneLbl = document.createElement("label");
      doneLbl.className = "idea-done-toggle";
      doneLbl.title = item.done ? "Återaktivera" : "Markera som klar";
      const doneCb = document.createElement("input");
      doneCb.type = "checkbox";
      doneCb.checked = !!item.done;
      doneCb.onchange = () => toggleItemDone(item.id, doneCb.checked);
      doneLbl.appendChild(doneCb);
      doneLbl.appendChild(document.createTextNode(item.done ? "Klar" : "Klar?"));
      metaRow.appendChild(doneLbl);

      if (cfg.enablePrio) {
        const info = PRIO_INFO[parseInt(item.prio, 10) || 2];
        if (info) {
          const badge = document.createElement("span");
          badge.className = "prio-badge " + info.cls;
          badge.textContent = info.emoji + " " + info.label;
          metaRow.appendChild(badge);
        }
      }
      if (cfg.enableDueDate && item.dueDate) {
        const due = _parseDueDate(item.dueDate);
        const today = new Date(); today.setHours(0,0,0,0);
        let extra = "";
        if (due) {
          if (due < today) extra = " due-overdue";
          else if (due.getTime() === today.getTime()) extra = " due-today";
        }
        const badge = document.createElement("span");
        badge.className = "due-badge" + extra;
        badge.textContent = "📅 " + formatDueDateSv(item.dueDate);
        metaRow.appendChild(badge);
      }
      if (cfg.enableCalendar && item.inCalendar && item.dueDate) {
        const calBadge = document.createElement("span");
        calBadge.className = "cal-badge";
        calBadge.textContent = "📆 I kalender";
        calBadge.title = "Visas under månad i sommarkalendern";
        metaRow.appendChild(calBadge);
      }

      const actions = document.createElement("div");
      actions.className = "idea-actions";
      const edit = document.createElement("button");
      edit.className = "icon-btn"; edit.textContent = "✎"; edit.title = "Redigera";
      edit.onclick = () => startEdit(item);
      const del = document.createElement("button");
      del.className = "icon-btn"; del.textContent = "✕"; del.title = "Ta bort";
      del.onclick = () => removeItem(item.id);
      actions.appendChild(edit); actions.appendChild(del);
      topRow.appendChild(actions);

      head.appendChild(topRow);
      head.appendChild(metaRow);
      card.appendChild(head);

      if (item.desc) {
        const desc = document.createElement("div");
        desc.className = "idea-desc";
        desc.textContent = item.desc;
        card.appendChild(desc);
      }

      if (item.tags && item.tags.length) {
        const tagsEl = document.createElement("div");
        tagsEl.className = "idea-tags";
        item.tags.forEach(t => {
          const tag = document.createElement("span");
          tag.className = "idea-tag";
          tag.textContent = t;
          tagsEl.appendChild(tag);
        });
        card.appendChild(tagsEl);
      }

      const tasks = item.tasks || [];
      if (tasks.length) {
        const total = tasks.length;
        const done = tasks.filter(t => t.done).length;
        const prog = document.createElement("div");
        prog.className = "progress";
        prog.textContent = done + "/" + total + " klara";
        card.appendChild(prog);
        const bar = document.createElement("div");
        bar.className = "progress-bar";
        const fill = document.createElement("div");
        fill.style.width = (total ? Math.round(done/total*100) : 0) + "%";
        bar.appendChild(fill);
        card.appendChild(bar);
      }

      const taskWrap = document.createElement("div");
      taskWrap.className = "idea-tasks";
      tasks.forEach(t => {
        const row = document.createElement("div");
        row.className = "idea-task" + (t.done ? " done" : "");
        const cb = document.createElement("input");
        cb.type = "checkbox"; cb.checked = !!t.done;
        cb.onchange = () => toggleTask(item, t.id, cb.checked);
        row.appendChild(cb);
        const txt = document.createElement("span");
        txt.className = "task-text";
        txt.textContent = t.text;
        txt.style.cursor = "text";
        txt.title = "Klicka för att redigera";
        txt.onclick = () => beginInlineEdit(row, txt, item, t);
        row.appendChild(txt);
        const ed = document.createElement("button");
        ed.className = "icon-btn"; ed.textContent = "✎"; ed.title = "Redigera text";
        ed.onclick = () => beginInlineEdit(row, txt, item, t);
        row.appendChild(ed);
        const rm = document.createElement("button");
        rm.className = "icon-btn"; rm.textContent = "✕"; rm.title = "Ta bort";
        rm.onclick = () => removeTask(item, t.id);
        row.appendChild(rm);
        taskWrap.appendChild(row);
      });
      card.appendChild(taskWrap);

      const addForm = document.createElement("form");
      addForm.className = "task-add";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = cfg.addPlaceholder;
      const addBtn = document.createElement("button");
      addBtn.type = "submit"; addBtn.className = "btn btn-ghost btn-sm";
      addBtn.textContent = "+ Lägg till";
      addForm.appendChild(input); addForm.appendChild(addBtn);
      addForm.onsubmit = ev => {
        ev.preventDefault();
        addTask(item, input.value);
        input.value = "";
      };
      card.appendChild(addForm);

      return card;
  }

  if (typeof renderNav === "function") renderNav(cfg.navKey);
  renderTagPicker();
  renderFilter();

  initApp(d => {
    db = d;
    db.collection(cfg.collection).onSnapshot(snap => {
      items = [];
      snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      if (statusEl) statusEl.textContent = items.length + " " + cfg.itemsLabel;
      renderTagPicker();
      renderFilter();
      renderList();
    }, err => {
      if (statusEl) statusEl.textContent = "Firestore-fel: " + err.message;
    });
  }, { onError: e => { if (statusEl) statusEl.textContent = e.message; } });
}
