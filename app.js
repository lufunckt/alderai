const STORAGE_KEY = "otc-local-dashboard-v1";

function createDefaultState() {
  return {
    selectedClientId: "c1",
    filter: "all",
    clients: [
      {
        id: "c1",
        name: "Studio Aurora",
        color: "#ff7b72",
        accent: "#6dd3ff",
        records: [
          { id: "r1", date: "2026-04-05", amount: 1800, paid: false },
          { id: "r2", date: "2026-03-14", amount: 460, paid: true },
        ],
      },
      {
        id: "c2",
        name: "Loja Caju",
        color: "#705df2",
        accent: "#ffd166",
        records: [{ id: "r3", date: "2026-04-12", amount: 920, paid: false }],
      },
    ],
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.clients)) return createDefaultState();
    return parsed;
  } catch (_error) {
    return createDefaultState();
  }
}

const state = loadState();

const els = {
  clientSearch: document.getElementById("clientSearch"),
  clientCountBadge: document.getElementById("clientCountBadge"),
  clientList: document.getElementById("clientList"),
  statsBand: document.getElementById("statsBand"),
  receivableBoard: document.getElementById("receivableBoard"),
  clientSpotlight: document.getElementById("clientSpotlight"),
  recordList: document.getElementById("recordList"),
  clientFormTitle: document.getElementById("clientFormTitle"),
  recordFormTitle: document.getElementById("recordFormTitle"),
  clientId: document.getElementById("clientId"),
  clientName: document.getElementById("clientName"),
  recordId: document.getElementById("recordId"),
  recordDate: document.getElementById("recordDate"),
  recordValue: document.getElementById("recordValue"),
  recordPaid: document.getElementById("recordPaid"),
  deleteClientBtn: document.getElementById("deleteClientBtn"),
  deleteRecordBtn: document.getElementById("deleteRecordBtn"),
  dockHomeBtn: document.getElementById("dockHomeBtn"),
  dockClientBtn: document.getElementById("dockClientBtn"),
  dockRecordBtn: document.getElementById("dockRecordBtn"),
  dockResetBtn: document.getElementById("dockResetBtn"),
  toast: document.getElementById("toast"),
};

let toastTimer = null;

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1500);
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "Sem data";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function initials(name) {
  return String(name || "OTC")
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

function colorPair(name) {
  const palette = [
    ["#ff7b72", "#6dd3ff"],
    ["#705df2", "#ffd166"],
    ["#0fa67c", "#ffb3c1"],
    ["#ff8fab", "#62c6a8"],
    ["#ff9f1c", "#4cc9f0"],
  ];
  const seed = String(name || "OTC")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function getSelectedClient() {
  return state.clients.find((client) => client.id === state.selectedClientId) || null;
}

function isMobile() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function scrollToElement(element) {
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setDockActive(target) {
  [els.dockHomeBtn, els.dockClientBtn, els.dockRecordBtn, els.dockResetBtn].forEach((button) => {
    button?.classList.remove("dock-btn-active");
  });
  target?.classList.add("dock-btn-active");
}

function getClientTotals(client) {
  const paid = client.records.filter((record) => record.paid).reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const pending = client.records.filter((record) => !record.paid).reduce((sum, record) => sum + Number(record.amount || 0), 0);
  return {
    paid,
    pending,
    total: paid + pending,
    countOpen: client.records.filter((record) => !record.paid).length,
    nextDue:
      [...client.records]
        .filter((record) => !record.paid && record.date)
        .sort((a, b) => a.date.localeCompare(b.date))[0] || null,
  };
}

function filteredClients() {
  const query = els.clientSearch.value.trim().toLowerCase();
  if (!query) return state.clients;
  return state.clients.filter((client) => client.name.toLowerCase().includes(query));
}

function renderStats() {
  const records = state.clients.flatMap((client) => client.records);
  const paid = records.filter((record) => record.paid).reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const pending = records.filter((record) => !record.paid).reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const average = records.length ? (paid + pending) / records.length : 0;

  els.statsBand.innerHTML = [
    ["Clientes", state.clients.length],
    ["Ja pagaram", formatMoney(paid)],
    ["A receber", formatMoney(pending)],
    ["Media por registro", formatMoney(average)],
  ]
    .map(
      ([label, value]) => `
        <div class="stat-line">
          <span>${esc(label)}</span>
          <strong>${esc(value)}</strong>
        </div>
      `
    )
    .join("");
}

function renderReceivableBoard() {
  const pending = state.clients
    .flatMap((client) =>
      client.records
        .filter((record) => !record.paid)
        .map((record) => ({ ...record, clientName: client.name, color: client.color }))
    )
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (!pending.length) {
    els.receivableBoard.innerHTML = `<div class="empty-state">Nada em aberto. O mural OTC esta zerado.</div>`;
    return;
  }

  els.receivableBoard.innerHTML = pending
    .slice(0, 12)
    .map(
      (record) => `
        <div class="receivable-pill" style="box-shadow: inset 0 0 0 2px rgba(0,0,0,0.04), 0 0 0 3px ${esc(record.color)}22;">
          <span>${esc(record.clientName)}</span>
          <strong>${esc(formatMoney(record.amount))}</strong>
          <span>${esc(formatDate(record.date))}</span>
        </div>
      `
    )
    .join("");
}

function renderClientList() {
  const clients = filteredClients();
  els.clientCountBadge.textContent = String(state.clients.length);

  if (!clients.length) {
    els.clientList.innerHTML = `<div class="empty-state">Nenhum cliente encontrado.</div>`;
    return;
  }

  els.clientList.innerHTML = clients
    .map((client) => {
      const totals = getClientTotals(client);
      return `
        <button
          type="button"
          class="client-card ${client.id === state.selectedClientId ? "active" : ""}"
          data-client-id="${client.id}"
          style="--client-color:${esc(client.color)}; --client-accent:${esc(client.accent)};"
        >
          <div class="client-header">
            <div class="avatar">${esc(initials(client.name))}</div>
            <div class="client-meta">
              <strong>${esc(client.name)}</strong>
              <span>${esc(totals.nextDue ? `Vence em ${formatDate(totals.nextDue.date)}` : "Sem pendencias")}</span>
            </div>
          </div>
          <div class="record-footer">
            <span class="pill">${esc(`${totals.countOpen} em aberto`)}</span>
            <span class="pill">${esc(formatMoney(totals.pending))}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderSpotlight() {
  const client = getSelectedClient();
  if (!client) {
    els.clientSpotlight.innerHTML = `
      <div class="spotlight-content">
        <p class="eyebrow">Painel vazio</p>
        <h3>Crie seu primeiro cliente.</h3>
        <div class="empty-state">Depois basta registrar data, saldo devedor e marcar quando pagar.</div>
      </div>
    `;
    return;
  }

  const totals = getClientTotals(client);
  els.clientSpotlight.innerHTML = `
    <div class="spotlight-content">
      <div class="spotlight-top">
        <div class="client-header">
          <div class="avatar" style="--client-color:${esc(client.color)}; --client-accent:${esc(client.accent)};">${esc(initials(client.name))}</div>
          <div class="client-meta">
            <p class="eyebrow">Cliente selecionado</p>
            <h2>${esc(client.name)}</h2>
            <span>${esc(totals.countOpen ? `${totals.countOpen} saldo(s) em aberto` : "Tudo em dia")}</span>
          </div>
        </div>
        <span class="pill">OTC</span>
      </div>

      <div class="money-grid">
        <div class="money-item">
          <span>Ja gastou com voce</span>
          <strong>${esc(formatMoney(totals.paid))}</strong>
        </div>
        <div class="money-item">
          <span>Saldo devedor</span>
          <strong>${esc(formatMoney(totals.pending))}</strong>
        </div>
        <div class="money-item">
          <span>Proxima data</span>
          <strong>${esc(totals.nextDue ? formatDate(totals.nextDue.date) : "Sem pendencia")}</strong>
        </div>
      </div>

      <div class="notes-box">Esse card mostra exatamente o que importa: quanto o cliente ja pagou, quanto ainda deve e qual e a proxima data aberta.</div>
    </div>
  `;
}

function visibleRecord(record) {
  if (state.filter === "paid") return record.paid;
  if (state.filter === "pending") return !record.paid;
  return true;
}

function renderRecords() {
  const client = getSelectedClient();
  if (!client) {
    els.recordList.innerHTML = `<div class="empty-state">Selecione um cliente para ver os registros.</div>`;
    return;
  }

  const records = [...client.records]
    .sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return (a.date || "").localeCompare(b.date || "");
    })
    .filter(visibleRecord);

  if (!records.length) {
    els.recordList.innerHTML = `<div class="empty-state">Nenhum registro nesse filtro.</div>`;
    return;
  }

  els.recordList.innerHTML = records
    .map(
      (record) => `
        <article class="record-item ${record.paid ? "paid" : ""}">
          <div class="record-main">
            <div>
              <strong>${record.paid ? "Pago" : "Saldo em aberto"}</strong>
              <span>${esc(formatDate(record.date))}</span>
            </div>
            <strong class="record-value">${esc(formatMoney(record.amount))}</strong>
          </div>
          <div class="record-footer">
            <span class="pill">${record.paid ? "Pago" : "Pendente"}</span>
            <div class="filter-row">
              <button class="mini-btn ${record.paid ? "warn" : "success"}" type="button" data-toggle-record="${record.id}">
                ${record.paid ? "Marcar pendente" : "Marcar pago"}
              </button>
              <button class="mini-btn" type="button" data-edit-record="${record.id}">Editar</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function fillClientForm(client) {
  els.clientId.value = client?.id || "";
  els.clientName.value = client?.name || "";
  els.clientFormTitle.textContent = client ? `Editando ${client.name}` : "Novo cliente";
  els.deleteClientBtn.disabled = !client;
}

function fillRecordForm(record) {
  els.recordId.value = record?.id || "";
  els.recordDate.value = record?.date || todayIso();
  els.recordValue.value = record?.amount ?? "";
  els.recordPaid.checked = Boolean(record?.paid);
  els.recordFormTitle.textContent = record ? "Editar registro" : "Novo registro";
  els.deleteRecordBtn.disabled = !record;
}

function clearClientForm() {
  fillClientForm(null);
}

function clearRecordForm() {
  fillRecordForm(null);
}

function render() {
  renderStats();
  renderReceivableBoard();
  renderClientList();
  renderSpotlight();
  renderRecords();
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

document.getElementById("newClientBtn").addEventListener("click", () => {
  clearClientForm();
  if (isMobile()) scrollToElement(document.getElementById("clientForm"));
  setDockActive(els.dockClientBtn);
  els.clientName.focus();
});

document.getElementById("clearClientFormBtn").addEventListener("click", () => {
  clearClientForm();
  showToast("Formulario limpo");
});

document.getElementById("clearRecordFormBtn").addEventListener("click", () => {
  clearRecordForm();
  showToast("Registro limpo");
});

document.getElementById("resetDataBtn").addEventListener("click", () => {
  if (!window.confirm("Resetar os dados salvos?")) return;
  const fresh = createDefaultState();
  state.selectedClientId = fresh.selectedClientId;
  state.filter = fresh.filter;
  state.clients = fresh.clients;
  saveState();
  clearClientForm();
  clearRecordForm();
  render();
  showToast("Dados resetados");
});

els.clientSearch.addEventListener("input", renderClientList);

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    saveState();
    render();
  });
});

document.getElementById("clientForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.clientName.value.trim();
  if (!name) return;

  const [color, accent] = colorPair(name);
  if (els.clientId.value) {
    const client = state.clients.find((item) => item.id === els.clientId.value);
    if (!client) return;
    client.name = name;
    client.color = color;
    client.accent = accent;
    showToast("Cliente atualizado");
  } else {
    const client = {
      id: makeId("client"),
      name,
      color,
      accent,
      records: [],
    };
    state.clients.unshift(client);
    state.selectedClientId = client.id;
    showToast("Cliente criado");
  }
  saveState();
  fillClientForm(getSelectedClient());
  render();
});

els.deleteClientBtn.addEventListener("click", () => {
  const client = getSelectedClient();
  if (!client) return;
  if (!window.confirm(`Excluir ${client.name}?`)) return;
  state.clients = state.clients.filter((item) => item.id !== client.id);
  state.selectedClientId = state.clients[0]?.id || null;
  saveState();
  clearClientForm();
  clearRecordForm();
  render();
  showToast("Cliente excluido");
});

document.getElementById("recordForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const client = getSelectedClient();
  if (!client) {
    showToast("Crie ou selecione um cliente");
    return;
  }

  const payload = {
    id: els.recordId.value || makeId("record"),
    date: els.recordDate.value,
    amount: Number(els.recordValue.value || 0),
    paid: els.recordPaid.checked,
  };

  if (!payload.date || payload.amount <= 0) {
    showToast("Preencha data e saldo");
    return;
  }

  const existing = client.records.find((record) => record.id === payload.id);
  if (existing) {
    existing.date = payload.date;
    existing.amount = payload.amount;
    existing.paid = payload.paid;
    showToast("Registro atualizado");
  } else {
    client.records.unshift(payload);
    showToast("Registro salvo");
  }
  saveState();
  clearRecordForm();
  render();
});

els.deleteRecordBtn.addEventListener("click", () => {
  const client = getSelectedClient();
  if (!client || !els.recordId.value) return;
  if (!window.confirm("Excluir esse registro?")) return;
  client.records = client.records.filter((record) => record.id !== els.recordId.value);
  saveState();
  clearRecordForm();
  render();
  showToast("Registro excluido");
});

els.clientList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-client-id]");
  if (!button) return;
  state.selectedClientId = button.dataset.clientId;
  saveState();
  fillClientForm(getSelectedClient());
  clearRecordForm();
  render();
  if (isMobile()) {
    scrollToElement(document.getElementById("clientSpotlight"));
    setDockActive(els.dockHomeBtn);
  }
});

els.recordList.addEventListener("click", (event) => {
  const client = getSelectedClient();
  if (!client) return;

  const toggleButton = event.target.closest("[data-toggle-record]");
  if (toggleButton) {
    const record = client.records.find((item) => item.id === toggleButton.dataset.toggleRecord);
    if (!record) return;
    record.paid = !record.paid;
    saveState();
    render();
    showToast(record.paid ? "Marcado como pago" : "Marcado como pendente");
    return;
  }

  const editButton = event.target.closest("[data-edit-record]");
  if (editButton) {
    const record = client.records.find((item) => item.id === editButton.dataset.editRecord);
    if (!record) return;
    fillRecordForm(record);
    if (isMobile()) {
      scrollToElement(document.getElementById("recordForm"));
      setDockActive(els.dockRecordBtn);
    }
  }
});

els.dockHomeBtn?.addEventListener("click", () => {
  scrollToElement(document.querySelector(".hero"));
  setDockActive(els.dockHomeBtn);
});

els.dockClientBtn?.addEventListener("click", () => {
  clearClientForm();
  scrollToElement(document.getElementById("clientEditor"));
  setDockActive(els.dockClientBtn);
  els.clientName.focus();
});

els.dockRecordBtn?.addEventListener("click", () => {
  clearRecordForm();
  scrollToElement(document.getElementById("recordEditor"));
  setDockActive(els.dockRecordBtn);
  els.recordDate.focus();
});

els.dockResetBtn?.addEventListener("click", () => {
  document.getElementById("resetDataBtn").click();
  setDockActive(els.dockResetBtn);
});

clearClientForm();
clearRecordForm();
render();
