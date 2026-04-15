function showConfigValidation(message, isError) {
  dom.configValidationMsg.textContent = message;
  dom.configValidationMsg.classList.toggle("error", Boolean(isError));
}

function validateRawDraft() {
  let parsed = null;
  try {
    parsed = JSON.parse(dom.configRawEditor.value || "{}");
  } catch {
    configDraftValid = false;
    dom.saveConfigModalBtn.disabled = true;
    showConfigValidation("JSON 语法错误，无法保存。", true);
    return false;
  }

  const selectedName = dom.modelSelect.value;
  const normalized = normalizeDraft(parsed, selectedName);
  if (!Array.isArray(normalized.stages) || !Array.isArray(normalized.events) || !Array.isArray(normalized.observation_points)) {
    configDraftValid = false;
    dom.saveConfigModalBtn.disabled = true;
    showConfigValidation("配置必须包含 stages/events/observation_points 数组。", true);
    return false;
  }

  configDraft = normalized;
  configDraftValid = true;
  dom.saveConfigModalBtn.disabled = false;
  showConfigValidation("配置有效，可保存。", false);
  return true;
}

function getRowSortTime(row) {
  if (row.kind === "stage") {
    return toInt(row.start_time, 0);
  }
  return toInt(row.time, 0);
}

function sortVisualRows() {
  visualRows.sort((a, b) => {
    const dt = getRowSortTime(a) - getRowSortTime(b);
    if (dt !== 0) {
      return dt;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
  });
}

function draftToVisualRows(draft) {
  const rows = [];

  for (const stg of draft.stages || []) {
    rows.push({
      rowKey: `${stg.id}_${Date.now()}`,
      kind: "stage",
      id: stg.id,
      name: stg.name,
      start_time: toInt(stg.start_time, 0),
      end_time: toInt(stg.end_time, toInt(stg.start_time, 0)),
      time: 0,
      description: stg.description || "",
    });
  }

  for (const evt of draft.events || []) {
    rows.push({
      rowKey: `${evt.id}_${Date.now()}`,
      kind: "event",
      id: evt.id,
      name: evt.name,
      start_time: 0,
      end_time: 0,
      time: toInt(evt.time, 0),
      description: evt.description || "",
    });
  }

  for (const obs of draft.observation_points || []) {
    rows.push({
      rowKey: `${obs.id}_${Date.now()}`,
      kind: "observation",
      id: obs.id,
      name: obs.name,
      start_time: 0,
      end_time: 0,
      time: toInt(obs.time, -Math.max(0, toInt(obs.new_countdown, 0))),
      description: obs.description || "",
    });
  }

  visualRows = rows;
  sortVisualRows();
}

function visualRowsToDraft() {
  const selectedName = dom.modelSelect.value;
  const draft = {
    version: 2,
    name: selectedName,
    stages: [],
    events: [],
    observation_points: [],
    rocket_meta: deepClone(configDraft.rocket_meta || {}),
    fuel_editor: deepClone(configDraft.fuel_editor || { version: 1, node_values: {}, curves: {} }),
    engine_layout: deepClone(configDraft.engine_layout || { version: 1, reserved: true }),
  };

  for (const row of visualRows) {
    if (row.kind === "stage") {
      const start = toInt(row.start_time, 0);
      const end = Math.max(start, toInt(row.end_time, start));
      draft.stages.push({
        id: String(row.id || "").trim() || `stg_${Date.now()}`,
        name: String(row.name || "未命名阶段"),
        start_time: start,
        end_time: end,
        description: String(row.description || ""),
      });
      continue;
    }

    if (row.kind === "event") {
      draft.events.push({
        id: String(row.id || "").trim() || `evt_${Date.now()}`,
        name: String(row.name || "未命名事件"),
        time: toInt(row.time, 0),
        description: String(row.description || ""),
      });
      continue;
    }

    const time = toInt(row.time, 0);
    draft.observation_points.push({
      id: String(row.id || "").trim() || `obs_${Date.now()}`,
      name: String(row.name || "未命名观察点"),
      time,
      new_countdown: Math.max(0, -time),
      description: String(row.description || ""),
    });
  }

  draft.stages.sort((a, b) => a.start_time - b.start_time);
  draft.events.sort((a, b) => a.time - b.time);
  draft.observation_points.sort((a, b) => a.time - b.time);

  return normalizeDraft(draft, selectedName);
}

function syncRawFromVisual() {
  configDraft = visualRowsToDraft();
  configDraftValid = true;
  if (isModalVisible(dom.configModal)) {
    configDraftDirty = true;
  }
  dom.saveConfigModalBtn.disabled = false;
  dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
  showConfigValidation("可视化编辑已同步，可直接保存。", false);
}

function pushVisualUndo() {
  visualUndoStack.push(JSON.stringify(visualRows));
  if (visualUndoStack.length > 120) {
    visualUndoStack.shift();
  }
}

function undoVisualChange() {
  if (visualUndoStack.length === 0) {
    return;
  }
  const raw = visualUndoStack.pop();
  try {
    visualRows = JSON.parse(raw);
    syncRawFromVisual();
    renderVisualEditor();
    toast("已撤回一次修改", "info");
  } catch {
    // ignore
  }
}

function scheduleVisualSortRerender() {
  if (visualSortTimer) {
    clearTimeout(visualSortTimer);
  }
  visualSortTimer = setTimeout(() => {
    renderVisualEditor();
  }, 160);
}

const TYPE_ICON_BY_KIND = {
  stage: "stage.svg",
  event: "event.svg",
  observation: "observe.svg",
};

function makeTypeButton(currentRow, kind, label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "type-btn";
  btn.title = label;
  btn.setAttribute("aria-label", label);

  const icon = document.createElement("span");
  icon.className = "icon-mask";
  icon.setAttribute("aria-hidden", "true");
  const iconName = TYPE_ICON_BY_KIND[kind] || "stage.svg";
  icon.style.setProperty("--icon-url", `url('/assets/${iconName}')`);
  btn.appendChild(icon);

  btn.classList.toggle("active", currentRow.kind === kind);
  btn.addEventListener("click", () => {
    if (currentRow.kind === kind) {
      return;
    }
    pushVisualUndo();
    const pivot = getRowSortTime(currentRow);
    currentRow.kind = kind;
    if (kind === "stage") {
      currentRow.start_time = pivot;
      currentRow.end_time = Math.max(pivot, pivot + 10);
      currentRow.time = 0;
    } else {
      currentRow.time = pivot;
      currentRow.start_time = 0;
      currentRow.end_time = 0;
    }
    syncRawFromVisual();
    renderVisualEditor();
  });
  return btn;
}

function renderVisualRow(row, index) {
  const line = document.createElement("div");
  line.className = "visual-row";

  const typeCell = document.createElement("div");
  typeCell.className = "type-switch";
  typeCell.appendChild(makeTypeButton(row, "stage", "阶段"));
  typeCell.appendChild(makeTypeButton(row, "event", "事件"));
  typeCell.appendChild(makeTypeButton(row, "observation", "观察点"));
  line.appendChild(typeCell);

  const idInput = document.createElement("input");
  idInput.className = "row-input";
  idInput.value = row.id || "";
  idInput.placeholder = "id";
  idInput.addEventListener("focus", () => pushVisualUndo());
  idInput.addEventListener("input", () => {
    row.id = idInput.value;
    syncRawFromVisual();
  });
  line.appendChild(idInput);

  const nameInput = document.createElement("input");
  nameInput.className = "row-input";
  nameInput.value = row.name || "";
  nameInput.placeholder = "名称";
  nameInput.addEventListener("focus", () => pushVisualUndo());
  nameInput.addEventListener("input", () => {
    row.name = nameInput.value;
    syncRawFromVisual();
  });
  line.appendChild(nameInput);

  const timeWrap = document.createElement("div");
  timeWrap.className = `cell-time ${row.kind === "stage" ? "dual" : "single"}`;

  if (row.kind === "stage") {
    const startInput = document.createElement("input");
    startInput.type = "number";
    startInput.className = "row-time";
    startInput.value = String(toInt(row.start_time, 0));
    startInput.placeholder = "开始";
    startInput.addEventListener("focus", () => pushVisualUndo());
    startInput.addEventListener("input", () => {
      row.start_time = toInt(startInput.value, 0);
      if (toInt(row.end_time, row.start_time) < row.start_time) {
        row.end_time = row.start_time;
      }
      syncRawFromVisual();
      scheduleVisualSortRerender();
    });

    const endInput = document.createElement("input");
    endInput.type = "number";
    endInput.className = "row-time";
    endInput.value = String(toInt(row.end_time, toInt(row.start_time, 0)));
    endInput.placeholder = "结束";
    endInput.addEventListener("focus", () => pushVisualUndo());
    endInput.addEventListener("input", () => {
      row.end_time = toInt(endInput.value, toInt(row.start_time, 0));
      syncRawFromVisual();
    });

    timeWrap.appendChild(startInput);
    timeWrap.appendChild(endInput);
  } else {
    const timeInput = document.createElement("input");
    timeInput.type = "number";
    timeInput.className = "row-time";
    timeInput.value = String(toInt(row.time, 0));
    timeInput.placeholder = row.kind === "event" ? "时间" : "观察时间";
    timeInput.addEventListener("focus", () => pushVisualUndo());
    timeInput.addEventListener("input", () => {
      row.time = toInt(timeInput.value, 0);
      syncRawFromVisual();
      scheduleVisualSortRerender();
    });
    timeWrap.appendChild(timeInput);
  }

  line.appendChild(timeWrap);

  const descInput = document.createElement("input");
  descInput.className = "row-desc";
  descInput.value = row.description || "";
  descInput.placeholder = "介绍";
  descInput.addEventListener("focus", () => pushVisualUndo());
  descInput.addEventListener("input", () => {
    row.description = descInput.value;
    syncRawFromVisual();
  });
  line.appendChild(descInput);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn row-delete";
  deleteBtn.textContent = "×";
  deleteBtn.title = "删除";
  deleteBtn.addEventListener("click", () => {
    pushVisualUndo();
    visualRows.splice(index, 1);
    syncRawFromVisual();
    renderVisualEditor();
  });
  line.appendChild(deleteBtn);

  return line;
}

function renderVisualEditor() {
  if (!configDraft) {
    return;
  }

  sortVisualRows();
  dom.visualList.innerHTML = "";
  visualRows.forEach((row, index) => {
    dom.visualList.appendChild(renderVisualRow(row, index));
  });
}

function setConfigTab(tab) {
  if (tab === "visual" && !validateRawDraft()) {
    toast("请先修复 JSON，再切换到可视化编辑。", "error");
    return;
  }

  configTab = tab === "visual" ? "visual" : "raw";
  dom.configRawPane.classList.toggle("hidden", configTab !== "raw");
  dom.configVisualPane.classList.toggle("hidden", configTab !== "visual");
  dom.configTabRawBtn.classList.toggle("active", configTab === "raw");
  dom.configTabVisualBtn.classList.toggle("active", configTab === "visual");

  if (configTab === "visual") {
    draftToVisualRows(configDraft);
    syncRawFromVisual();
    renderVisualEditor();
  }
}

function openConfigModal() {
  const modelName = dom.modelSelect.value;
  if (!modelName || !modelsCache[modelName]) {
    toast("请先选择型号", "error");
    return;
  }

  configDraft = normalizeDraft(modelsCache[modelName], modelName);
  visualUndoStack = [];
  dom.configModalTitle.textContent = `型号配置编辑 · ${modelName}`;
  dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
  dom.recoverableConfigToggle.checked = configDraft.rocket_meta.recovery_capable !== false;
  setRecoverableConfigText(dom.recoverableConfigToggle.checked);
  validateRawDraft();
  setConfigTab("visual");
  dom.configModal.classList.remove("hidden");
  configDraftDirty = false;
}

function closeConfigModal(force = false) {
  if (!force && configDraftDirty) {
    openUnsavedConfirmDialog({
      title: "配置尚未保存",
      message: "当前型号配置有未保存修改，是否保存后关闭？",
      onSave: () => saveConfigModal(),
      onDiscard: () => {
        configDraftDirty = false;
        dom.configModal.classList.add("hidden");
        return true;
      },
    });
    return false;
  }
  dom.configModal.classList.add("hidden");
  return true;
}

async function saveConfigModal() {
  if (configTab === "raw" && !validateRawDraft()) {
    toast("JSON 无效，无法保存。", "error");
    return false;
  }

  if (configTab === "visual") {
    syncRawFromVisual();
  }

  const selectedModel = dom.modelSelect.value;
  const payload = normalizeDraft(configDraft, selectedModel);
  payload.name = selectedModel;

  const res = await adminFetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || "保存失败", "error");
    return false;
  }

  modelsCache[payload.name] = payload;
  toast(`配置已保存: ${payload.name}`, "success");
  await fetchModels();
  configDraftDirty = false;
  closeConfigModal(true);
  return true;
}

function addVisualItem() {
  if (!configDraft) {
    return;
  }
  pushVisualUndo();
  visualRows.push({
    rowKey: `row_${Date.now()}`,
    kind: "stage",
    id: `item_${Date.now()}`,
    name: "新条目",
    start_time: 0,
    end_time: 10,
    time: 0,
    description: "",
  });
  syncRawFromVisual();
  renderVisualEditor();
}

function openPropellantModal() {
  if (!configDraft) {
    return;
  }
  propellantSnapshot = deepClone(configDraft.rocket_meta || {});
  renderPropellantFields();
  dom.propellantModal.classList.remove("hidden");
  propellantDirty = false;
}

function closePropellantModal(force = false) {
  if (!force && propellantDirty) {
    openUnsavedConfirmDialog({
      title: "加注参数尚未保存",
      message: "当前加注参数有未保存修改，是否保存后关闭？",
      onSave: () => savePropellantModal(),
      onDiscard: () => {
        if (configDraft && propellantSnapshot) {
          configDraft.rocket_meta = deepClone(propellantSnapshot);
          dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
          showConfigValidation("已放弃加注参数修改。", false);
        }
        propellantDirty = false;
        propellantSnapshot = null;
        dom.propellantModal.classList.add("hidden");
        return true;
      },
    });
    return false;
  }
  propellantDirty = false;
  propellantSnapshot = null;
  dom.propellantModal.classList.add("hidden");
  return true;
}

const LIQUID_PROPELLANT_OPTIONS = [
  { value: "n2o4_udmh", label: "四氧化二氮 + 偏二甲肼", oxidizer: "四氧化二氮", fuel: "偏二甲肼" },
  { value: "lox_rp1", label: "液氧 + 煤油", oxidizer: "液氧", fuel: "煤油" },
  { value: "lox_lh2", label: "液氧 + 液氢", oxidizer: "液氧", fuel: "液氢" },
  { value: "lox_ch4", label: "液氧 + 甲烷", oxidizer: "液氧", fuel: "甲烷" },
  { value: "lox_ethanol", label: "液氧 + 乙醇", oxidizer: "液氧", fuel: "乙醇" },
];

function getDefaultLiquidPropellant() {
  return LIQUID_PROPELLANT_OPTIONS[1] || LIQUID_PROPELLANT_OPTIONS[0];
}

function findLiquidPropellantOption(oxidizer, fuel) {
  const oxidizerName = String(oxidizer || "").trim();
  const fuelName = String(fuel || "").trim();
  return LIQUID_PROPELLANT_OPTIONS.find((item) => item.oxidizer === oxidizerName && item.fuel === fuelName)
    || getDefaultLiquidPropellant();
}

function applyLiquidPropellantOption(targetFuel, optionValue) {
  const option = LIQUID_PROPELLANT_OPTIONS.find((item) => item.value === optionValue) || getDefaultLiquidPropellant();
  targetFuel.phase = "液体";
  targetFuel.oxidizer = option.oxidizer;
  targetFuel.fuel = option.fuel;
  return option;
}

function ensureFuelSeed(rawFuel) {
  const seed = normalizeFuelSpec(rawFuel || {});
  if (seed.phase !== "液体" && seed.phase !== "固体") {
    seed.phase = "液体";
  }
  if (seed.phase === "液体") {
    const option = findLiquidPropellantOption(seed.oxidizer, seed.fuel);
    seed.oxidizer = option.oxidizer;
    seed.fuel = option.fuel;
  }
  return seed;
}

function getSolidPropellantText(seed) {
  const oxidizerName = String(seed?.oxidizer || "").trim();
  const fuelName = String(seed?.fuel || "").trim();
  if (oxidizerName && fuelName && oxidizerName !== fuelName) {
    return `${oxidizerName} + ${fuelName}`;
  }
  return oxidizerName || fuelName || "";
}

function setBoosterUiState(enabled) {
  if (dom.boosterEnabledText) {
    dom.boosterEnabledText.textContent = enabled ? "有助推器" : "无助推器";
  }
  if (dom.boosterCountWrap) {
    dom.boosterCountWrap.classList.toggle("hidden", !enabled);
  }
  if (!enabled && dom.boosterCountInput) {
    dom.boosterCountInput.value = "0";
  }
}

function createPropellantRow(rowLabel, fuelSeed, onCommit) {
  const row = document.createElement("div");
  row.className = "propellant-grid-row";

  const label = document.createElement("span");
  label.className = "row-label";
  label.textContent = rowLabel;
  row.appendChild(label);

  const phaseSelect = document.createElement("select");
  ["液体", "固体"].forEach((phase) => {
    const option = document.createElement("option");
    option.value = phase;
    option.textContent = phase;
    phaseSelect.appendChild(option);
  });
  row.appendChild(phaseSelect);

  const propellantCell = document.createElement("div");
  propellantCell.className = "propellant-cell";
  row.appendChild(propellantCell);

  const comboSelect = document.createElement("select");
  LIQUID_PROPELLANT_OPTIONS.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    comboSelect.appendChild(option);
  });
  propellantCell.appendChild(comboSelect);

  const solidInput = document.createElement("input");
  solidInput.type = "text";
  solidInput.placeholder = "请输入固体推进剂";
  propellantCell.appendChild(solidInput);

  const currentFuel = ensureFuelSeed(fuelSeed);
  solidInput.value = getSolidPropellantText(currentFuel);

  function commit(markDirty = false) {
    if (markDirty) {
      propellantDirty = true;
    }
    onCommit(currentFuel);
  }

  function refreshMode(markDirty = false) {
    const isLiquid = phaseSelect.value === "液体";
    if (isLiquid) {
      const selected = applyLiquidPropellantOption(currentFuel, comboSelect.value);
      comboSelect.value = selected.value;
      comboSelect.classList.remove("hidden");
      solidInput.classList.add("hidden");
    } else {
      currentFuel.phase = "固体";
      comboSelect.classList.add("hidden");
      solidInput.classList.remove("hidden");
      currentFuel.oxidizer = String(solidInput.value || "").trim();
      currentFuel.fuel = "";
    }
    commit(markDirty);
  }

  phaseSelect.value = currentFuel.phase;
  comboSelect.value = currentFuel.phase === "液体"
    ? findLiquidPropellantOption(currentFuel.oxidizer, currentFuel.fuel).value
    : getDefaultLiquidPropellant().value;
  refreshMode(false);

  phaseSelect.addEventListener("change", () => {
    if (phaseSelect.value === "固体" && currentFuel.phase !== "固体") {
      solidInput.value = "";
    }
    refreshMode(true);
  });

  comboSelect.addEventListener("change", () => {
    if (phaseSelect.value !== "液体") {
      return;
    }
    refreshMode(true);
  });

  solidInput.addEventListener("input", () => {
    if (phaseSelect.value !== "固体") {
      return;
    }
    currentFuel.phase = "固体";
    currentFuel.oxidizer = String(solidInput.value || "").trim();
    currentFuel.fuel = "";
    commit(true);
  });

  return row;
}

function ensureRocketMeta() {
  if (!configDraft.rocket_meta) {
    configDraft.rocket_meta = normalizeDraft({}, configDraft.name).rocket_meta;
  }
}

function renderPropellantFields() {
  ensureRocketMeta();

  const meta = configDraft.rocket_meta;
  const stageCount = Math.max(1, toInt(meta.stage_count, 1));
  dom.rocketStageCountInput.value = String(stageCount);
  const boosterEnabled = Boolean(meta.boosters?.enabled);
  dom.boosterEnabledInput.checked = boosterEnabled;
  dom.boosterCountInput.value = String(Math.max(0, toInt(meta.boosters?.count, 0)));
  setBoosterUiState(boosterEnabled);

  if (!meta.boosters || typeof meta.boosters !== "object") {
    meta.boosters = { enabled: false, count: 0, fuels: [] };
  }

  while ((meta.stages || []).length < stageCount) {
    const defaultFuel = getDefaultLiquidPropellant();
    meta.stages.push({
      stage_index: meta.stages.length + 1,
      fuels: [normalizeFuelSpec({ phase: "液体", oxidizer: defaultFuel.oxidizer, fuel: defaultFuel.fuel })],
    });
  }
  meta.stages = meta.stages.slice(0, stageCount);

  dom.propellantStageList.innerHTML = "";

  const header = document.createElement("div");
  header.className = "propellant-grid-head";
  header.innerHTML = "<span>级数</span><span>类型</span><span>推进剂</span>";
  dom.propellantStageList.appendChild(header);

  meta.stages.forEach((stage, index) => {
    const existingFuel = Array.isArray(stage.fuels) && stage.fuels.length > 0
      ? stage.fuels[0]
      : normalizeFuelSpec(getDefaultLiquidPropellant());
    const row = createPropellantRow(`第 ${index + 1} 级`, existingFuel, (nextFuel) => {
      stage.fuels = [normalizeFuelSpec(nextFuel)];
    });
    dom.propellantStageList.appendChild(row);
  });

  if (boosterEnabled) {
    const boosterFuel = Array.isArray(meta.boosters.fuels) && meta.boosters.fuels.length > 0
      ? meta.boosters.fuels[0]
      : normalizeFuelSpec(getDefaultLiquidPropellant());
    const boosterRow = createPropellantRow("助推器", boosterFuel, (nextFuel) => {
      meta.boosters.fuels = [normalizeFuelSpec(nextFuel)];
    });
    dom.propellantStageList.appendChild(boosterRow);
  }
}

function savePropellantModal() {
  ensureRocketMeta();
  const meta = configDraft.rocket_meta;

  const stageCount = Math.max(1, toInt(dom.rocketStageCountInput.value, 1));
  meta.stage_count = stageCount;
  meta.stages = (meta.stages || []).slice(0, stageCount);

  while (meta.stages.length < stageCount) {
    const defaultFuel = getDefaultLiquidPropellant();
    meta.stages.push({
      stage_index: meta.stages.length + 1,
      fuels: [normalizeFuelSpec({ phase: "液体", oxidizer: defaultFuel.oxidizer, fuel: defaultFuel.fuel })],
    });
  }

  meta.stages = meta.stages.map((stage, index) => ({
    stage_index: index + 1,
    fuels: Array.isArray(stage.fuels) && stage.fuels.length > 0
      ? [ensureFuelSeed(stage.fuels[0])]
      : [normalizeFuelSpec(getDefaultLiquidPropellant())],
  }));

  const boosterEnabled = Boolean(dom.boosterEnabledInput.checked);
  const boosterCount = boosterEnabled ? Math.max(0, toInt(dom.boosterCountInput.value, 0)) : 0;
  const boosterFuelSeed = Array.isArray(meta.boosters?.fuels) && meta.boosters.fuels.length > 0
    ? ensureFuelSeed(meta.boosters.fuels[0])
    : normalizeFuelSpec(getDefaultLiquidPropellant());

  meta.boosters = {
    enabled: boosterEnabled,
    count: boosterCount,
    fuels: boosterEnabled ? [boosterFuelSeed] : [],
  };

  setBoosterUiState(boosterEnabled);

  syncRawFromVisual();
  propellantDirty = false;
  propellantSnapshot = null;
  closePropellantModal(true);
  toast("加注参数已更新", "success");
  return true;
}

function formatFuelChannelLabel(fuel) {
  const phase = String(fuel?.phase || "液体");
  if (phase === "固体") {
    const name = String(fuel?.oxidizer || fuel?.fuel || "").trim() || "自定义推进剂";
    return `${phase} ${name}`;
  }
  const oxidizerName = String(fuel?.oxidizer || "").trim() || "-";
  const fuelName = String(fuel?.fuel || "").trim() || "-";
  return `${phase} ${oxidizerName}+${fuelName}`;
}

function deriveFuelChannels(rocketMeta) {
  const channels = [];
  const stageList = Array.isArray(rocketMeta?.stages) ? rocketMeta.stages : [];

  stageList.forEach((stage) => {
    const fuels = Array.isArray(stage.fuels) ? stage.fuels : [];
    fuels.forEach((fuel, index) => {
      const id = `stage${stage.stage_index}_${index}`;
      const label = `第${stage.stage_index}级 ${formatFuelChannelLabel(fuel)}`;
      channels.push({ id, label });
    });
  });

  if (rocketMeta?.boosters?.enabled) {
    const fuels = Array.isArray(rocketMeta.boosters.fuels) ? rocketMeta.boosters.fuels : [];
    fuels.forEach((fuel, index) => {
      const id = `booster_${index}`;
      const label = `助推器 ${formatFuelChannelLabel(fuel)}`;
      channels.push({ id, label });
    });
  }

  if (channels.length === 0) {
    channels.push({ id: "default", label: "主推进剂" });
  }

  return channels;
}

function buildFuelNodes(draft) {
  const nodes = [];

  for (const stage of draft.stages || []) {
    nodes.push({ key: `stage:${stage.id}:start`, time: toInt(stage.start_time, 0), name: `${stage.name} 开始` });
    nodes.push({ key: `stage:${stage.id}:end`, time: toInt(stage.end_time, 0), name: `${stage.name} 结束` });
  }

  for (const event of draft.events || []) {
    nodes.push({ key: `event:${event.id}`, time: toInt(event.time, 0), name: event.name });
  }

  for (const obs of draft.observation_points || []) {
    nodes.push({ key: `observation:${obs.id}`, time: toInt(obs.time, 0), name: `${obs.name} (观察点)` });
  }

  nodes.sort((a, b) => (a.time - b.time) || a.name.localeCompare(b.name, "zh-CN"));
  return nodes;
}

function ensureFuelStructure(draft) {
  if (!draft.fuel_editor || typeof draft.fuel_editor !== "object") {
    draft.fuel_editor = { version: 1, node_values: {}, curves: {} };
  }
  if (!draft.fuel_editor.node_values || typeof draft.fuel_editor.node_values !== "object") {
    draft.fuel_editor.node_values = {};
  }
  if (!draft.fuel_editor.curves || typeof draft.fuel_editor.curves !== "object") {
    draft.fuel_editor.curves = {};
  }

  fuelNodes = buildFuelNodes(draft);
  fuelChannels = deriveFuelChannels(draft.rocket_meta || {});

  for (const node of fuelNodes) {
    if (!draft.fuel_editor.node_values[node.key] || typeof draft.fuel_editor.node_values[node.key] !== "object") {
      draft.fuel_editor.node_values[node.key] = {};
    }
    for (const channel of fuelChannels) {
      if (!Object.prototype.hasOwnProperty.call(draft.fuel_editor.node_values[node.key], channel.id)) {
        draft.fuel_editor.node_values[node.key][channel.id] = -1;
      }
      draft.fuel_editor.node_values[node.key][channel.id] = clampPercent(draft.fuel_editor.node_values[node.key][channel.id], -1);
    }
  }

  for (const channel of fuelChannels) {
    if (!Array.isArray(draft.fuel_editor.curves[channel.id])) {
      draft.fuel_editor.curves[channel.id] = [];
    }
  }
}

function interpolate(points, time) {
  if (!Array.isArray(points) || points.length === 0) {
    return 0;
  }
  if (time <= points[0].time) {
    return points[0].value;
  }
  if (time >= points[points.length - 1].time) {
    return points[points.length - 1].value;
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a.time <= time && time <= b.time) {
      const total = b.time - a.time || 1;
      const ratio = (time - a.time) / total;
      return a.value + (b.value - a.value) * ratio;
    }
  }
  return points[points.length - 1].value;
}

function resolveChannelPoints(draft, channelId) {
  const entries = [];
  for (const node of fuelNodes) {
    const raw = clampPercent(draft.fuel_editor.node_values[node.key]?.[channelId], -1);
    if (raw >= 0) {
      entries.push({ time: node.time, value: raw });
    }
  }

  const unique = new Map();
  for (const p of entries) {
    unique.set(p.time, p.value);
  }

  const points = Array.from(unique.entries()).map(([time, value]) => ({ time: Number(time), value: Number(value) }));

  if (points.length === 0) {
    points.push({ time: -10800, value: 0 });
    points.push({ time: -600, value: 100 });
    points.push({ time: 0, value: 100 });
  }

  const hasT0 = points.some((p) => p.time === 0);
  if (!hasT0) {
    points.push({ time: 0, value: 100 });
  }

  const minNodeTime = fuelNodes.length > 0 ? fuelNodes[0].time : -10800;
  if (!points.some((p) => p.time <= minNodeTime)) {
    points.push({ time: minNodeTime, value: 0 });
  }

  points.sort((a, b) => a.time - b.time);
  return points;
}

function resolveChannelAtNodes(draft, channelId) {
  const explicitPoints = resolveChannelPoints(draft, channelId);
  const resolved = {};

  for (const node of fuelNodes) {
    const raw = clampPercent(draft.fuel_editor.node_values[node.key]?.[channelId], -1);
    if (raw >= 0) {
      resolved[node.key] = raw;
    } else {
      resolved[node.key] = Math.max(0, Math.min(100, Math.round(interpolate(explicitPoints, node.time))));
    }
  }

  return resolved;
}

function syncCurvesFromNodeValues(draft) {
  for (const channel of fuelChannels) {
    const points = resolveChannelPoints(draft, channel.id);
    draft.fuel_editor.curves[channel.id] = points;
  }
}

function renderFuelTable() {
  ensureFuelStructure(fuelEditDraft);

  const table = dom.fuelTable;
  table.innerHTML = "";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const headNode = document.createElement("th");
  headNode.textContent = "节点";
  headRow.appendChild(headNode);

  const headTime = document.createElement("th");
  headTime.textContent = "时间(s)";
  headRow.appendChild(headTime);

  for (const channel of fuelChannels) {
    const th = document.createElement("th");
    th.textContent = channel.label;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (const node of fuelNodes) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = node.name;
    tr.appendChild(tdName);

    const tdTime = document.createElement("td");
    tdTime.textContent = `T${node.time >= 0 ? "+" : ""}${node.time}`;
    tr.appendChild(tdTime);

    for (const channel of fuelChannels) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "-1";
      input.max = "100";
      const raw = clampPercent(fuelEditDraft.fuel_editor.node_values[node.key]?.[channel.id], -1);
      input.value = String(raw);
      input.title = "-1 表示自动插值";
      input.addEventListener("input", () => {
        fuelDirty = true;
        fuelEditDraft.fuel_editor.node_values[node.key][channel.id] = clampPercent(input.value, -1);
        syncCurvesFromNodeValues(fuelEditDraft);
        renderFuelCurve();
      });
      td.appendChild(input);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
}

function curveCanvasMetrics() {
  const canvas = dom.fuelCurveCanvas;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const targetWidth = rect.width > 10 ? rect.width : Math.max(480, canvas.clientWidth || 0, canvas.width / ratio);
  const targetHeight = rect.height > 10 ? rect.height : 360;
  const pixelWidth = Math.round(targetWidth * ratio);
  const pixelHeight = Math.round(targetHeight * ratio);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = canvas.width / ratio;
  const height = canvas.height / ratio;

  return {
    ctx,
    width,
    height,
    padLeft: 58,
    padRight: 28,
    padTop: 24,
    padBottom: 34,
  };
}

function timeDomain() {
  const times = fuelNodes.map((n) => n.time);
  let minTime = times.length > 0 ? Math.min(...times) : -10800;
  let maxTime = times.length > 0 ? Math.max(...times) : 0;
  if (minTime === maxTime) {
    maxTime = minTime + 60;
  }
  return { minTime, maxTime };
}

function getCurrentCurveChannelId() {
  return String(dom.fuelCurveChannelSelect.value || (fuelChannels[0] ? fuelChannels[0].id : ""));
}

function renderFuelCurve() {
  ensureFuelStructure(fuelEditDraft);

  const channelId = getCurrentCurveChannelId();
  const points = Array.isArray(fuelEditDraft.fuel_editor.curves[channelId])
    ? fuelEditDraft.fuel_editor.curves[channelId]
    : [];

  const m = curveCanvasMetrics();
  const { ctx, width, height, padLeft, padRight, padTop, padBottom } = m;

  ctx.clearRect(0, 0, width, height);

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const { minTime, maxTime } = timeDomain();

  const toX = (time) => padLeft + ((time - minTime) / (maxTime - minTime)) * plotW;
  const toY = (value) => padTop + ((100 - value) / 100) * plotH;

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i += 1) {
    const y = padTop + (i / 10) * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }

  for (let i = 0; i <= 8; i += 1) {
    const x = padLeft + (i / 8) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, height - padBottom);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop);
  ctx.lineTo(padLeft, height - padBottom);
  ctx.lineTo(width - padRight, height - padBottom);
  ctx.stroke();

  if (points.length > 0) {
    ctx.strokeStyle = "#4fd2ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, index) => {
      const x = toX(p.time);
      const y = toY(p.value);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    points.forEach((p, index) => {
      const x = toX(p.time);
      const y = toY(p.value);
      ctx.beginPath();
      ctx.fillStyle = curveDragState && curveDragState.index === index && curveDragState.channelId === channelId ? "#ffd16e" : "#4fd2ff";
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = '12px "Manrope"';
  ctx.fillText("0", padLeft - 18, height - padBottom + 4);
  ctx.fillText("100", padLeft - 26, padTop + 4);
  ctx.fillText(`T${minTime >= 0 ? "+" : ""}${minTime}`, padLeft, height - 8);
  ctx.fillText(`T${maxTime >= 0 ? "+" : ""}${maxTime}`, width - padRight - 80, height - 8);
}

function findCurvePointAtPosition(x, y) {
  const channelId = getCurrentCurveChannelId();
  const points = fuelEditDraft.fuel_editor.curves[channelId] || [];
  const m = curveCanvasMetrics();
  const { width, height, padLeft, padRight, padTop, padBottom } = m;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const { minTime, maxTime } = timeDomain();

  const toX = (time) => padLeft + ((time - minTime) / (maxTime - minTime)) * plotW;
  const toY = (value) => padTop + ((100 - value) / 100) * plotH;

  for (let i = 0; i < points.length; i += 1) {
    const px = toX(points[i].time);
    const py = toY(points[i].value);
    const dx = px - x;
    const dy = py - y;
    if ((dx * dx + dy * dy) <= 64) {
      return { index: i, channelId };
    }
  }
  return null;
}

function updateCurvePointByPointer(clientX, clientY) {
  if (!curveDragState) {
    return;
  }
  const channelId = curveDragState.channelId;
  const points = fuelEditDraft.fuel_editor.curves[channelId] || [];
  const point = points[curveDragState.index];
  if (!point) {
    return;
  }

  const rect = dom.fuelCurveCanvas.getBoundingClientRect();
  const m = curveCanvasMetrics();
  const { width, height, padTop, padBottom } = m;
  const localY = (clientY - rect.top) * (height / rect.height);

  const plotH = height - padTop - padBottom;
  const y = Math.max(padTop, Math.min(height - padBottom, localY));
  const value = Math.max(0, Math.min(100, Math.round(100 - ((y - padTop) / plotH) * 100)));

  point.value = value;
  fuelDirty = true;

  for (const node of fuelNodes) {
    const v = Math.round(interpolate(points, node.time));
    fuelEditDraft.fuel_editor.node_values[node.key][channelId] = Math.max(0, Math.min(100, v));
  }

  renderFuelTable();
  renderFuelCurve();
}

function setFuelTab(tab) {
  fuelTab = tab === "curve" ? "curve" : "list";
  dom.fuelListPane.classList.toggle("hidden", fuelTab !== "list");
  dom.fuelCurvePane.classList.toggle("hidden", fuelTab !== "curve");
  dom.fuelTabListBtn.classList.toggle("active", fuelTab === "list");
  dom.fuelTabCurveBtn.classList.toggle("active", fuelTab === "curve");
  if (fuelTab === "curve") {
    renderFuelCurve();
    requestAnimationFrame(() => {
      renderFuelCurve();
      setTimeout(() => {
        if (!dom.fuelModal.classList.contains("hidden") && fuelTab === "curve") {
          renderFuelCurve();
        }
      }, 80);
    });
  }
}

function getDraftFromModel(modelName) {
  if (!modelName || !modelsCache[modelName]) {
    return null;
  }
  return normalizeDraft(modelsCache[modelName], modelName);
}

function openFuelModal(source) {
  const modelName = dom.modelSelect.value;
  if (!modelName) {
    toast("请先选择型号", "error");
    return;
  }

  if (source === "config" && configDraft) {
    fuelEditDraft = deepClone(configDraft);
    fuelEditSource = "config";
  } else {
    const fromModel = getDraftFromModel(modelName);
    if (!fromModel) {
      toast("当前型号配置不存在", "error");
      return;
    }
    fuelEditDraft = fromModel;
    fuelEditSource = "model";
  }
  fuelEditModelName = modelName;

  ensureFuelStructure(fuelEditDraft);
  syncCurvesFromNodeValues(fuelEditDraft);

  dom.fuelCurveChannelSelect.innerHTML = fuelChannels
    .map((item) => `<option value="${item.id}">${item.label}</option>`)
    .join("");

  renderFuelTable();
  setFuelTab("list");
  dom.fuelModal.classList.remove("hidden");
  fuelDirty = false;
}

function closeFuelModal(force = false) {
  if (!force && fuelDirty) {
    openUnsavedConfirmDialog({
      title: "燃料配置尚未保存",
      message: "当前燃料编辑有未保存修改，是否保存后关闭？",
      onSave: () => saveFuelModal(),
      onDiscard: () => {
        fuelDirty = false;
        return closeFuelModal(true);
      },
    });
    return false;
  }
  dom.fuelModal.classList.add("hidden");
  curveDragState = null;
  return true;
}

async function saveFuelModal() {
  if (!fuelEditDraft) {
    return false;
  }

  if (fuelEditSource === "config" && configDraft) {
    configDraft.fuel_editor = deepClone(fuelEditDraft.fuel_editor);
    dom.configRawEditor.value = JSON.stringify(configDraft, null, 2);
    configDraftDirty = true;
    dom.saveConfigModalBtn.disabled = false;
    showConfigValidation("燃料配置已更新，请保存型号配置以落盘。", false);
    toast("燃料配置已写入当前型号草稿", "success");
    fuelDirty = false;
    closeFuelModal(true);
    return true;
  }

  const payload = normalizeDraft(fuelEditDraft, fuelEditModelName);
  payload.name = fuelEditModelName;

  const res = await adminFetch("/api/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) {
    toast(data.message || "保存燃料配置失败", "error");
    return false;
  }

  modelsCache[payload.name] = payload;
  toast("燃料配置已保存", "success");
  fuelDirty = false;
  closeFuelModal(true);
  return true;
}
