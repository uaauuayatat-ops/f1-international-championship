/* ============================================================
   F1 INTERNATIONAL CHAMPIONSHIP — admin.js
   ------------------------------------------------------------
   Panel de administración. Todo corre en el navegador; los
   cambios se guardan en la base de datos compartida de Firestore
   (ver js/firebase-config.js), así que se ven para todos los
   que entren al sitio, no solo en esta computadora. La contraseña
   es una barrera básica para uso entre amigos, NO seguridad real
   — no la uses con datos sensibles. Ver README para cómo cambiarla.
   ============================================================ */

function isAdminLogged() { return sessionStorage.getItem(AUTH_KEY) === "1"; }

function initAdmin() {
  const loginBox = document.getElementById("admin-login");
  const panel = document.getElementById("admin-panel");
  if (!loginBox || !panel) return;

  function showPanel() {
    loginBox.classList.add("hidden");
    panel.classList.remove("hidden");
    renderAdminAll();
  }

  if (isAdminLogged()) showPanel();

  document.getElementById("admin-login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("admin-password").value;
    const errorEl = document.getElementById("admin-login-error");
    if (val === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      showPanel();
    } else {
      errorEl.textContent = "Contraseña incorrecta.";
    }
  });

  document.getElementById("admin-logout")?.addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    panel.classList.add("hidden");
    loginBox.classList.remove("hidden");
  });

  // Tabs
  document.querySelectorAll(".admin-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

function renderAdminAll() {
  renderAdminDriversList();
  renderAdminDriverForm();
  renderAdminTeamsList();
  renderAdminNewsList();
  renderAdminCalendar();
  renderAdminOddsPower();
  renderAdminSeason();
}

/* ---------------- PILOTOS ---------------- */
function renderAdminDriverForm() {
  const teamSelect = document.getElementById("driver-team-select");
  if (teamSelect) {
    teamSelect.innerHTML = `<option value="">Sin equipo (libre)</option>` +
      DB.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  }
  const editSelect = document.getElementById("driver-edit-select");
  if (editSelect) {
    editSelect.innerHTML = `<option value="">— Nuevo piloto —</option>` +
      DB.drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
  }
}

function renderAdminDriversList() {
  const list = document.getElementById("admin-drivers-list");
  if (!list) return;
  list.innerHTML = DB.drivers.map(d => `
    <div class="admin-row">
      <span class="team-dot" style="background:${teamColor(d.teamId)}"></span>
      <strong>${d.name}</strong> #${d.number ?? "-"} — ${teamName(d.teamId)}
      <span class="badge">${d.status}</span>
      <button class="btn-mini" onclick="editDriverForm('${d.id}')">Editar</button>
      <button class="btn-mini danger" onclick="deleteDriver('${d.id}')">Eliminar</button>
    </div>`).join("");
}

document.addEventListener("submit", (e) => {
  if (e.target.id === "driver-form") {
    e.preventDefault();
    saveDriverFromForm();
  }
  if (e.target.id === "news-form") {
    e.preventDefault();
    saveNewsFromForm();
  }
  if (e.target.id === "result-form") {
    e.preventDefault();
    saveResultFromForm();
  }
  if (e.target.id === "season-form") {
    e.preventDefault();
    closeSeasonFromForm();
  }
  if (e.target.id === "circuit-form") {
    e.preventDefault();
    addCircuitFromForm();
  }
});

function editDriverForm(id) {
  const d = getDriver(id);
  if (!d) return;
  document.getElementById("driver-edit-select").value = id;
  document.getElementById("driver-name").value = d.name;
  document.getElementById("driver-number").value = d.number ?? "";
  document.getElementById("driver-country").value = d.country ?? "";
  document.getElementById("driver-flag").value = d.flag ?? "";
  document.getElementById("driver-team-select").value = d.teamId ?? "";
  document.getElementById("driver-status").value = d.status;
  document.getElementById("driver-bio").value = d.bio ?? "";
  window.scrollTo({ top: document.getElementById("driver-form").offsetTop - 100, behavior: "smooth" });
}

function saveDriverFromForm() {
  const id = document.getElementById("driver-edit-select").value;
  const name = document.getElementById("driver-name").value.trim();
  if (!name) return;
  const number = parseInt(document.getElementById("driver-number").value) || null;
  const country = document.getElementById("driver-country").value.trim();
  const flag = document.getElementById("driver-flag").value.trim();
  const teamId = document.getElementById("driver-team-select").value || null;
  const status = document.getElementById("driver-status").value;
  const bio = document.getElementById("driver-bio").value.trim();

  if (id) {
    const d = getDriver(id);
    Object.assign(d, { name, number, country, flag, teamId, status, bio });
  } else {
    DB.drivers.push({
      id: "d" + Date.now(), name, number, country, flag, teamId, status, rumorTeams: [],
      age: null, seasons: 0, bestResult: "—", bio,
      career: { wins:0, podiums:0, poles:0, fastLaps:0, dnf:0, points:0 },
      season: { wins:0, podiums:0, poles:0, fastLaps:0, dnf:0, points:0 },
      odds: null, oddsPrev: null, probability: null, oddsHistory: [], powerRank: DB.drivers.length+1, powerRankPrev: DB.drivers.length+1,
      recentPositions: [],
    });
  }
  recalcAll();
  document.getElementById("driver-form").reset();
  renderAdminAll();
  toast("Piloto guardado ✔");
}

function deleteDriver(id) {
  if (!confirm("¿Eliminar este piloto?")) return;
  DB.drivers = DB.drivers.filter(d => d.id !== id);
  recalcAll();
  renderAdminAll();
  toast("Piloto eliminado");
}

/* ---------------- EQUIPOS ---------------- */
function renderAdminTeamsList() {
  const list = document.getElementById("admin-teams-list");
  if (!list) return;
  list.innerHTML = DB.teams.map(t => `
    <div class="admin-row">
      <span class="team-dot" style="background:${t.color}"></span>
      <strong>${t.name}</strong> — ${t.points} pts
      <label class="inline-label">Cuota
        <input type="number" step="0.1" value="${t.odds}" onchange="updateTeamOdds('${t.id}', this.value)">
      </label>
    </div>`).join("");
}
function updateTeamOdds(id, value) {
  const t = getTeam(id);
  if (t) t.odds = parseFloat(value) || t.odds;
  saveDB(DB);
  toast("Cuota de equipo actualizada");
}

/* ---------------- NOTICIAS ---------------- */
function renderAdminNewsList() {
  const list = document.getElementById("admin-news-list");
  if (!list) return;
  list.innerHTML = DB.news.map(n => `
    <div class="admin-row">
      <strong>${n.title}</strong> <span class="badge">${n.category}</span> ${fmtDate(n.date)}
      <button class="btn-mini danger" onclick="deleteNews(${n.id})">Eliminar</button>
    </div>`).join("");
}
function saveNewsFromForm() {
  const title = document.getElementById("news-title").value.trim();
  const category = document.getElementById("news-category").value.trim() || "General";
  const image = document.getElementById("news-image").value.trim() || "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1200&auto=format&fit=crop";
  const text = document.getElementById("news-text").value.trim();
  if (!title || !text) return;
  DB.news.unshift({ id: Date.now(), title, category, image, text, date: new Date().toISOString().slice(0,10) });
  saveDB(DB);
  document.getElementById("news-form").reset();
  renderAdminAll();
  toast("Noticia publicada ✔");
}
function deleteNews(id) {
  DB.news = DB.news.filter(n => n.id !== id);
  saveDB(DB);
  renderAdminAll();
}

/* ---------------- CALENDARIO / RESULTADOS ---------------- */
function renderAdminCalendar() {
  const roundSelect = document.getElementById("result-round-select");
  if (roundSelect) {
    roundSelect.innerHTML = DB.calendar.map(r => `<option value="${r.round}">R${r.round} — ${r.circuit}</option>`).join("");
  }
  const orderWrap = document.getElementById("result-order-wrap");
  if (orderWrap) {
    orderWrap.innerHTML = DB.drivers.map((d,i) => `
      <div class="order-row">
        <span>${i+1}°</span>
        <select data-order-idx="${i}">
          <option value="">—</option>
          ${DB.drivers.map(x => `<option value="${x.id}">${x.name}</option>`).join("")}
        </select>
        <label><input type="checkbox" data-dnf="${i}"> DNF</label>
      </div>`).join("");
  }
  const poleSelect = document.getElementById("result-pole-select");
  const flSelect = document.getElementById("result-fl-select");
  [poleSelect, flSelect].forEach(sel => {
    if (sel) sel.innerHTML = `<option value="">—</option>` + DB.drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
  });

  const list = document.getElementById("admin-calendar-list");
  if (list) {
    list.innerHTML = DB.calendar.map(r => `
      <div class="admin-row">
        R${r.round} — ${r.flag} ${r.circuit} (${fmtDateShort(r.r1)} / ${fmtDateShort(r.r2)})
        ${r.results.r1 ? " · R1 cargado" : ""} ${r.results.r2 ? " · R2 cargado" : ""}
      </div>`).join("");
  }
}
function saveResultFromForm() {
  const round = parseInt(document.getElementById("result-round-select").value);
  const raceKey = document.getElementById("result-race-key").value;
  const orderIds = [];
  const dnfIds = [];
  document.querySelectorAll("[data-order-idx]").forEach((sel, i) => {
    const dnfChecked = document.querySelector(`[data-dnf="${i}"]`)?.checked;
    if (!sel.value) return;
    if (dnfChecked) dnfIds.push(sel.value); else orderIds.push(sel.value);
  });
  const poleId = document.getElementById("result-pole-select").value || null;
  const fastLapId = document.getElementById("result-fl-select").value || null;
  if (!orderIds.length) { alert("Cargá al menos un puesto."); return; }
  submitRaceResult(round, raceKey, orderIds, dnfIds, poleId, fastLapId);
  renderAdminAll();
  toast("Resultado cargado y clasificaciones recalculadas ✔");
}
function addCircuitFromForm() {
  const circuit = document.getElementById("circuit-name").value.trim();
  const flag = document.getElementById("circuit-flag").value.trim();
  const r1 = document.getElementById("circuit-r1").value;
  const r2 = document.getElementById("circuit-r2").value;
  if (!circuit || !r1 || !r2) return;
  DB.calendar.push({ round: DB.calendar.length + 1, circuit, flag, r1, r2, results: { r1: null, r2: null } });
  saveDB(DB);
  document.getElementById("circuit-form").reset();
  renderAdminAll();
  toast("Circuito agregado ✔");
}

/* ---------------- CUOTAS / POWER RANKING MANUAL ---------------- */
function renderAdminOddsPower() {
  const list = document.getElementById("admin-odds-power-list");
  if (!list) return;
  list.innerHTML = DB.drivers.map(d => `
    <div class="admin-row">
      <strong>${d.name}</strong>
      <label class="inline-label">Cuota <input type="number" step="0.01" value="${d.odds ?? ''}" onchange="updateDriverOdds('${d.id}', this.value)"></label>
      <label class="inline-label">Power Rank <input type="number" value="${d.powerRank}" onchange="updateDriverPower('${d.id}', this.value)"></label>
    </div>`).join("");
}
function updateDriverOdds(id, value) {
  const d = getDriver(id);
  if (d) { d.oddsPrev = d.odds; d.odds = parseFloat(value) || d.odds; }
  saveDB(DB);
  toast("Cuota manual actualizada");
}
function updateDriverPower(id, value) {
  const d = getDriver(id);
  if (d) { d.powerRankPrev = d.powerRank; d.powerRank = parseInt(value) || d.powerRank; }
  saveDB(DB);
  toast("Power ranking manual actualizado");
}

/* ---------------- TEMPORADAS ---------------- */
function renderAdminSeason() {
  const label = document.getElementById("current-season-label");
  if (label) label.textContent = DB.season;
}
function closeSeasonFromForm() {
  if (!confirm("Esto archiva la temporada actual en el historial y reinicia los puntos para la próxima. ¿Continuar?")) return;
  const ds = driverStandings();
  const cs = constructorStandings();
  DB.history.unshift({
    season: DB.season,
    driverChampion: ds[0]?.name ?? "—",
    driverSecond: ds[1]?.name ?? "—",
    driverThird: ds[2]?.name ?? "—",
    teamChampion: cs[0]?.name ?? "—",
  });
  const newLabel = document.getElementById("new-season-label").value.trim();
  if (newLabel) DB.season = newLabel;
  DB.drivers.forEach(d => {
    d.career.wins += d.season.wins; d.career.podiums += d.season.podiums;
    d.career.poles += d.season.poles; d.career.fastLaps += d.season.fastLaps;
    d.career.dnf += d.season.dnf; d.career.points += d.season.points;
    d.season = { wins:0, podiums:0, poles:0, fastLaps:0, dnf:0, points:0 };
    d.recentPositions = [];
  });
  DB.calendar.forEach(r => { r.results = { r1: null, r2: null }; });
  recalcAll();
  renderAdminAll();
  toast("Temporada archivada. ¡Arrancó la nueva!");
}

/* ---------------- Mensaje flotante ---------------- */
function toast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2500);
}
