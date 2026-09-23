const storageKey = "zfl16-movable-type-workshop";

const starterInventory = [
  { id: crypto.randomUUID(), char: "山", style: "宋体旧字", size: 30, quantity: 4, wear: "微磨" },
  { id: crypto.randomUUID(), char: "月", style: "宋体旧字", size: 30, quantity: 3, wear: "旧痕" },
  { id: crypto.randomUUID(), char: "风", style: "楷体木刻", size: 28, quantity: 2, wear: "微磨" },
  { id: crypto.randomUUID(), char: "花", style: "楷体木刻", size: 28, quantity: 2, wear: "新" },
  { id: crypto.randomUUID(), char: "茶", style: "黑体铅字", size: 24, quantity: 3, wear: "旧痕" },
  { id: crypto.randomUUID(), char: "雨", style: "仿宋细字", size: 22, quantity: 4, wear: "新" }
];

const defaultState = {
  inventory: starterInventory,
  selectedTypeId: starterInventory[0].id,
  selectedCell: null,
  placements: [],
  phrases: ["山花茶", "风雨"],
  drafts: [],
  settings: {
    paperSize: "postcard",
    flowMode: "horizontal",
    gridGap: 8,
    workTitle: "晚风小笺"
  }
};

let state = loadState();
let notice = "";

const els = {
  paperSize: document.querySelector("#paperSize"),
  flowMode: document.querySelector("#flowMode"),
  gridGap: document.querySelector("#gridGap"),
  workTitle: document.querySelector("#workTitle"),
  stage: document.querySelector("#stage"),
  typeList: document.querySelector("#typeList"),
  typeForm: document.querySelector("#typeForm"),
  charInput: document.querySelector("#charInput"),
  styleInput: document.querySelector("#styleInput"),
  sizeInput: document.querySelector("#sizeInput"),
  quantityInput: document.querySelector("#quantityInput"),
  wearInput: document.querySelector("#wearInput"),
  inventorySearch: document.querySelector("#inventorySearch"),
  styleFilter: document.querySelector("#styleFilter"),
  selectedTypeLabel: document.querySelector("#selectedTypeLabel"),
  shortageBadge: document.querySelector("#shortageBadge"),
  usageList: document.querySelector("#usageList"),
  draftList: document.querySelector("#draftList"),
  placedCount: document.querySelector("#placedCount"),
  inventoryCount: document.querySelector("#inventoryCount"),
  saveDraftBtn: document.querySelector("#saveDraftBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  clearBoardBtn: document.querySelector("#clearBoardBtn"),
  phraseForm: document.querySelector("#phraseForm"),
  phraseInput: document.querySelector("#phraseInput"),
  phraseList: document.querySelector("#phraseList"),
  phraseCount: document.querySelector("#phraseCount"),
  statusNotice: document.querySelector("#statusNotice")
};

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      settings: { ...defaultState.settings, ...parsed.settings }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function getGrid() {
  const size = state.settings.paperSize;
  if (size === "bookmark") return { cols: 7, rows: 18 };
  if (size === "square") return { cols: 12, rows: 12 };
  return { cols: 16, rows: 10 };
}

function placementKey(row, col) {
  return `${row}:${col}`;
}

function getSelectedType() {
  return state.inventory.find((item) => item.id === state.selectedTypeId) || null;
}

function getUsage() {
  return state.placements.reduce((acc, placement) => {
    acc[placement.typeId] = (acc[placement.typeId] || 0) + 1;
    return acc;
  }, {});
}

function renderSettings() {
  els.paperSize.value = state.settings.paperSize;
  els.flowMode.value = state.settings.flowMode;
  els.gridGap.value = state.settings.gridGap;
  els.workTitle.value = state.settings.workTitle;
}

function renderStyleFilter() {
  const current = els.styleFilter.value || "all";
  const styles = [...new Set(state.inventory.map((item) => item.style))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  els.styleFilter.innerHTML = `<option value="all">全部风格</option>${styles
    .map((style) => `<option value="${escapeHtml(style)}">${escapeHtml(style)}</option>`)
    .join("")}`;
  els.styleFilter.value = styles.includes(current) ? current : "all";
}

function renderInventory() {
  const keyword = els.inventorySearch.value.trim();
  const style = els.styleFilter.value;
  const usage = getUsage();
  const items = state.inventory.filter((item) => {
    const matchesKeyword = !keyword || `${item.char}${item.style}${item.wear}`.includes(keyword);
    const matchesStyle = style === "all" || item.style === style;
    return matchesKeyword && matchesStyle;
  });

  els.inventoryCount.textContent = `${state.inventory.length}枚字模`;
  els.typeList.innerHTML = items
    .map((item) => {
      const used = usage[item.id] || 0;
      const selected = item.id === state.selectedTypeId ? "selected" : "";
      return `
        <article class="type-card ${selected}" draggable="true" data-type-id="${item.id}">
          <div class="glyph" style="font-size:${Math.min(item.size, 36)}px">${escapeHtml(item.char)}</div>
          <div class="type-meta">
            <strong>${escapeHtml(item.char)} · ${escapeHtml(item.style)}</strong>
            <span>${item.size}px · ${escapeHtml(item.wear)} · 已用${used}/${item.quantity}</span>
          </div>
          <button class="mini-btn" title="删除字模" data-delete-type="${item.id}" type="button">×</button>
        </article>
      `;
    })
    .join("");
}

function renderStage() {
  const { cols, rows } = getGrid();
  const map = new Map(state.placements.map((item) => [placementKey(item.row, item.col), item]));
  els.stage.className = `stage ${state.settings.paperSize}`;
  els.stage.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  els.stage.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  els.stage.style.gap = `${state.settings.gridGap}px`;
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const placement = map.get(placementKey(row, col));
      const type = placement ? state.inventory.find((item) => item.id === placement.typeId) : null;
      const vertical = state.settings.flowMode === "vertical" ? "vertical" : "";
      const selected = state.selectedCell && state.selectedCell.row === row && state.selectedCell.col === col ? "selected" : "";
      cells.push(`
        <button class="cell ${type ? "used" : ""} ${vertical} ${selected}" data-row="${row}" data-col="${col}" type="button" aria-label="第${row + 1}行第${col + 1}列"${selected ? ' aria-current="true"' : ""}>
          ${type ? escapeHtml(type.char) : ""}
        </button>
      `);
    }
  }
  els.stage.innerHTML = cells.join("");
}

function renderUsage() {
  const usage = getUsage();
  const entries = state.inventory.filter((item) => usage[item.id]);
  els.placedCount.textContent = `${state.placements.length}个落字`;

  const shortages = entries.filter((item) => usage[item.id] > item.quantity);
  els.shortageBadge.textContent = shortages.length ? `${shortages.length}处超量` : "数量充足";
  els.shortageBadge.className = `badge ${shortages.length ? "warn" : "ok"}`;

  els.usageList.innerHTML =
    entries
      .map((item) => {
        const used = usage[item.id];
        const warn = used > item.quantity ? "warn" : "";
        return `
          <div class="usage-item ${warn}">
            <strong>${escapeHtml(item.char)} ${escapeHtml(item.style)}</strong>
            <span>${used}/${item.quantity}</span>
          </div>
        `;
      })
      .join("") || `<p class="empty">还没有落字。</p>`;
}

function renderStatus() {
  const selectedType = getSelectedType();
  const cell = state.selectedCell;
  const cellText = cell ? `第${cell.row + 1}行第${cell.col + 1}列` : "未选择格子";
  els.selectedTypeLabel.textContent = selectedType
    ? `当前：${selectedType.char} · ${selectedType.style} · 起始格：${cellText}`
    : `未选择字模 · 起始格：${cellText}`;
  els.statusNotice.textContent = notice;
  els.statusNotice.className = `notice ${notice ? "show" : ""}`;
}

function renderPhrases() {
  els.phraseCount.textContent = `${state.phrases.length}条词组`;
  els.phraseList.innerHTML = state.phrases
    .map(
      (text) => `
        <article class="phrase-item">
          <strong>${escapeHtml(text)}</strong>
          <div class="phrase-actions">
            <button type="button" data-apply-phrase="${escapeHtml(text)}">应用</button>
            <button type="button" class="ghost" data-delete-phrase="${escapeHtml(text)}">移除</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDrafts() {
  els.draftList.innerHTML =
    state.drafts
      .map(
        (draft) => `
          <article class="draft-item">
            <strong>${escapeHtml(draft.title)}</strong>
            <span>${draft.placements.length}个落字 · ${(draft.phrases || []).length}条词组 · ${new Date(draft.savedAt).toLocaleString("zh-CN")}</span>
            <div class="draft-actions">
              <button type="button" data-load-draft="${draft.id}">载入</button>
              <button type="button" data-delete-draft="${draft.id}">删除</button>
            </div>
          </article>
        `
      )
      .join("") || `<p class="empty">还没有保存草稿。</p>`;
}

function renderAll() {
  saveState();
  renderSettings();
  renderStyleFilter();
  renderInventory();
  renderStage();
  renderUsage();
  renderPhrases();
  renderStatus();
  renderDrafts();
}

function placeType(row, col, typeId = state.selectedTypeId) {
  state.selectedCell = { row, col };
  if (!typeId) {
    renderAll();
    return;
  }
  const existingIndex = state.placements.findIndex((item) => item.row === row && item.col === col);
  if (existingIndex >= 0) {
    if (state.placements[existingIndex].typeId === typeId) {
      state.placements.splice(existingIndex, 1);
    } else {
      state.placements[existingIndex].typeId = typeId;
    }
  } else {
    state.placements.push({ row, col, typeId });
  }
  renderAll();
}

function addPhrase(event) {
  event.preventDefault();
  const text = els.phraseInput.value.trim();
  if (text.length < 2 || text.length > 6) {
    notice = "词组需要2到6个字。";
    renderAll();
    return;
  }
  if (state.phrases.includes(text)) {
    notice = `词组「${text}」已经在列表中。`;
    renderAll();
    return;
  }
  state.phrases.push(text);
  els.phraseForm.reset();
  notice = `词组「${text}」已保存，共${text.length}字。`;
  renderAll();
}

function pickTypeForChar(char, usage) {
  // 优先同字同风格（沿用当前选中字模的风格），其次同字其它未用尽的风格
  const selected = getSelectedType();
  const candidates = state.inventory
    .filter((item) => item.char === char && (usage[item.id] || 0) < item.quantity)
    .sort((a, b) => {
      const score = (item) =>
        (selected && item.id === selected.id ? 2 : 0) + (selected && item.style === selected.style ? 1 : 0);
      return score(b) - score(a);
    });
  return candidates[0]?.id || null;
}

function planPhrase(text, row, col) {
  const { cols, rows } = getGrid();
  const vertical = state.settings.flowMode === "vertical";
  const map = new Map(state.placements.map((item) => [placementKey(item.row, item.col), item]));
  const usage = getUsage();
  const steps = [];
  for (let i = 0; i < text.length; i += 1) {
    const targetRow = vertical ? row + i : row;
    const targetCol = vertical ? col : col + i;
    if (targetRow < 0 || targetRow >= rows || targetCol < 0 || targetCol >= cols) {
      return { error: `第${i + 1}字「${text[i]}」越出纸张边界（${vertical ? "竖排向下" : "横排向右"}，不折行），整次未应用。`, char: text[i] };
    }
    const char = text[i];
    const sameChar = state.inventory.filter((item) => item.char === char);
    if (sameChar.length === 0) {
      return { error: `第${i + 1}字「${char}」没有字模，整次未应用。`, char };
    }
    // 路径上的旧字会被覆盖，先释放它占用的库存再分配
    const existing = map.get(placementKey(targetRow, targetCol));
    if (existing) usage[existing.typeId] = (usage[existing.typeId] || 0) - 1;
    const typeId = pickTypeForChar(char, usage);
    if (!typeId) {
      return { error: `第${i + 1}字「${char}」的全部字模都已用尽，整次未应用。`, char };
    }
    usage[typeId] = (usage[typeId] || 0) + 1;
    steps.push({ row: targetRow, col: targetCol, typeId });
  }
  return { steps, map };
}

function applyPhrase(text) {
  if (!state.selectedCell) {
    notice = "请先在版面上点击一个格子作为词组起始格。";
    renderAll();
    return;
  }
  const { row, col } = state.selectedCell;
  const plan = planPhrase(text, row, col);
  if (plan.error) {
    notice = plan.error;
    renderAll();
    return;
  }
  plan.steps.forEach((step) => {
    const key = placementKey(step.row, step.col);
    const existing = plan.map.get(key);
    if (existing) {
      existing.typeId = step.typeId;
    } else {
      state.placements.push({ row: step.row, col: step.col, typeId: step.typeId });
      plan.map.set(key, { row: step.row, col: step.col, typeId: step.typeId });
    }
  });
  const anchor = getSelectedType();
  const sameStyle = anchor ? plan.steps.filter((step) => state.inventory.find((item) => item.id === step.typeId)?.style === anchor.style).length : 0;
  notice = `词组「${text}」已从第${row + 1}行第${col + 1}列连续落字${text.length}格${
    anchor ? `，其中${sameStyle}格沿用「${anchor.style}」风格` : ""
  }。`;
  renderAll();
}

function addType(event) {
  event.preventDefault();
  const item = {
    id: crypto.randomUUID(),
    char: els.charInput.value.trim(),
    style: els.styleInput.value.trim(),
    size: Number(els.sizeInput.value),
    quantity: Number(els.quantityInput.value),
    wear: els.wearInput.value
  };
  if (!item.char || !item.style) return;
  state.inventory.unshift(item);
  state.selectedTypeId = item.id;
  els.typeForm.reset();
  els.sizeInput.value = 24;
  els.quantityInput.value = 3;
  renderAll();
}

function saveDraft() {
  const title = state.settings.workTitle.trim() || "未命名作品";
  state.drafts.unshift({
    id: crypto.randomUUID(),
    title,
    settings: structuredClone(state.settings),
    placements: structuredClone(state.placements),
    phrases: structuredClone(state.phrases),
    savedAt: new Date().toISOString()
  });
  state.drafts = state.drafts.slice(0, 8);
  renderAll();
}

function exportPreview() {
  const { cols, rows } = getGrid();
  const cell = state.settings.paperSize === "bookmark" ? 44 : 56;
  const gap = state.settings.gridGap;
  const margin = 48;
  const width = cols * cell + (cols - 1) * gap + margin * 2;
  const height = rows * cell + (rows - 1) * gap + margin * 2 + 70;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffaf1";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#2f2921";
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, width - 36, height - 36);
  ctx.fillStyle = "#22201c";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(state.settings.workTitle || "未命名作品", margin, 50);
  ctx.font = "bold 30px serif";
  state.placements.forEach((placement) => {
    const type = state.inventory.find((item) => item.id === placement.typeId);
    if (!type) return;
    const x = margin + placement.col * (cell + gap);
    const y = margin + 45 + placement.row * (cell + gap);
    ctx.fillStyle = "#2f2921";
    ctx.fillRect(x, y, cell, cell);
    ctx.fillStyle = "#fff5df";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${Math.min(type.size + 8, 42)}px serif`;
    ctx.fillText(type.char, x + cell / 2, y + cell / 2);
  });
  const link = document.createElement("a");
  link.download = `${state.settings.workTitle || "movable-type"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.paperSize.addEventListener("change", () => {
  state.settings.paperSize = els.paperSize.value;
  const { cols, rows } = getGrid();
  state.placements = state.placements.filter((item) => item.row < rows && item.col < cols);
  if (state.selectedCell && (state.selectedCell.row >= rows || state.selectedCell.col >= cols)) {
    state.selectedCell = null;
  }
  renderAll();
});

els.flowMode.addEventListener("change", () => {
  state.settings.flowMode = els.flowMode.value;
  renderAll();
});

els.gridGap.addEventListener("input", () => {
  state.settings.gridGap = Number(els.gridGap.value);
  renderAll();
});

els.workTitle.addEventListener("input", () => {
  state.settings.workTitle = els.workTitle.value;
  saveState();
});

els.typeForm.addEventListener("submit", addType);
els.phraseForm.addEventListener("submit", addPhrase);
els.inventorySearch.addEventListener("input", renderInventory);
els.styleFilter.addEventListener("change", renderInventory);
els.saveDraftBtn.addEventListener("click", saveDraft);
els.exportBtn.addEventListener("click", exportPreview);
els.clearBoardBtn.addEventListener("click", () => {
  state.placements = [];
  renderAll();
});

els.typeList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-type]");
  if (deleteButton) {
    const typeId = deleteButton.dataset.deleteType;
    state.inventory = state.inventory.filter((item) => item.id !== typeId);
    state.placements = state.placements.filter((item) => item.typeId !== typeId);
    if (state.selectedTypeId === typeId) state.selectedTypeId = state.inventory[0]?.id || null;
    renderAll();
    return;
  }
  const card = event.target.closest("[data-type-id]");
  if (!card) return;
  state.selectedTypeId = card.dataset.typeId;
  renderAll();
});

els.typeList.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-type-id]");
  if (!card) return;
  event.dataTransfer.setData("text/plain", card.dataset.typeId);
});

els.stage.addEventListener("dragover", (event) => {
  if (event.target.closest(".cell")) event.preventDefault();
});

els.stage.addEventListener("drop", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  event.preventDefault();
  placeType(Number(cell.dataset.row), Number(cell.dataset.col), event.dataTransfer.getData("text/plain"));
});

els.stage.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");
  if (!cell) return;
  placeType(Number(cell.dataset.row), Number(cell.dataset.col));
});

els.phraseList.addEventListener("click", (event) => {
  const applyButton = event.target.closest("[data-apply-phrase]");
  const deleteButton = event.target.closest("[data-delete-phrase]");
  if (applyButton) {
    applyPhrase(applyButton.dataset.applyPhrase);
  }
  if (deleteButton) {
    const text = deleteButton.dataset.deletePhrase;
    state.phrases = state.phrases.filter((item) => item !== text);
    notice = `词组「${text}」已移除。`;
    renderAll();
  }
});

els.draftList.addEventListener("click", (event) => {
  const loadButton = event.target.closest("[data-load-draft]");
  const deleteButton = event.target.closest("[data-delete-draft]");
  if (loadButton) {
    const draft = state.drafts.find((item) => item.id === loadButton.dataset.loadDraft);
    if (!draft) return;
    state.settings = structuredClone(draft.settings);
    state.placements = structuredClone(draft.placements);
    state.phrases = structuredClone(draft.phrases || []);
    state.selectedCell = null;
    notice = `草稿「${draft.title}」已载入，含${state.phrases.length}条词组。`;
    renderAll();
  }
  if (deleteButton) {
    state.drafts = state.drafts.filter((item) => item.id !== deleteButton.dataset.deleteDraft);
    renderAll();
  }
});

renderAll();
