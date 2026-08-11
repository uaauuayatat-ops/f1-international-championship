/* ============================================================
   F1 INTERNATIONAL CHAMPIONSHIP — app.js
   ------------------------------------------------------------
   Lógica compartida por todo el sitio:
   - Base de datos COMPARTIDA en Firebase Firestore (seed = data.js).
     Ya no es localStorage: todos los que entran ven los mismos
     datos, y los cambios del panel de admin se ven en vivo para
     cualquiera que tenga el sitio abierto (ver firebase-config.js).
   - Cálculo automático de puntos, cuotas y power ranking
   - Render de cada página según body[data-page]
   - Menú, modo oscuro, buscadores, animaciones
   ============================================================ */

const AUTH_KEY = "f1_admin_session";
const ADMIN_PASSWORD = "f1admin2027"; // demo únicamente, ver README

/* ----------------------------------------------------------
   1) BASE DE DATOS COMPARTIDA (Firebase Firestore)
   ------------------------------------------------------------
   Un único documento ("f1champ/estado") guarda todo el estado
   del sitio. loadDB() lo trae (y lo crea con el seed de data.js
   la primera vez). saveDB(db) lo sobreescribe entero. subscribeDB()
   escucha cambios en vivo hechos por cualquier visitante/admin y
   vuelve a pintar la página con los datos nuevos, sin recargar.
   ---------------------------------------------------------- */
function firestoreDoc() { return firestoreDB.collection("f1champ").doc("estado"); }

function buildSeed() {
  return {
    season: SEASON_LABEL,
    teams: structuredClone(DEFAULT_TEAMS),
    drivers: structuredClone(DEFAULT_DRIVERS).map(d => ({ ...d, recentPositions: d.recentPositions || [] })),
    calendar: structuredClone(DEFAULT_CALENDAR),
    news: structuredClone(DEFAULT_NEWS),
    history: [], // campeones por temporada (se completa al finalizar una)
  };
}

async function loadDB() {
  try {
    const snap = await firestoreDoc().get();
    if (snap.exists) return snap.data();
    const seed = buildSeed();
    await firestoreDoc().set(seed);
    return seed;
  } catch (err) {
    console.error("No se pudo conectar con la base de datos compartida:", err);
    showDbError();
    return buildSeed();
  }
}

async function saveDB(db) {
  try {
    await firestoreDoc().set(db);
  } catch (err) {
    console.error("Error guardando en la base de datos compartida:", err);
    alert("No se pudo guardar. Revisá tu conexión o la configuración de js/firebase-config.js.");
  }
}
/* ----------------------------------------------------------
   Actualizar Firestore con el contenido de data.js
   ---------------------------------------------------------- */
async function syncFromDataJS() {
  if (!confirm("¿Reemplazar la base de datos de Firebase con el contenido actual de data.js?")) return;

  try {
    DB = buildSeed();
    await saveDB(DB);
    alert("✅ Firebase se actualizó correctamente desde data.js.");
    renderCurrentPage();
  } catch (err) {
    console.error(err);
    alert("❌ Error al actualizar Firebase.");
  }
}
/* Escucha cambios en vivo (de cualquier visitante) y repinta la
   página actual. Ignora el "eco" de nuestros propios guardados. */
function subscribeDB() {
  if (typeof firestoreDB === "undefined") return;
  firestoreDoc().onSnapshot({ includeMetadataChanges: true }, (snap) => {
    if (!snap.exists || snap.metadata.hasPendingWrites) return;
    DB = snap.data();
    renderCurrentPage();
  }, (err) => console.error("Error escuchando cambios en vivo:", err));
}

function showDbError() {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;bottom:16px;left:16px;right:16px;max-width:480px;background:#a80500;color:#fff;padding:12px 16px;border-radius:8px;font-size:.8rem;z-index:3000;";
  el.textContent = "No se pudo conectar con la base de datos compartida. Revisá js/firebase-config.js (ver README) — mientras tanto se muestran datos de fábrica sin guardar.";
  document.body.appendChild(el);
}

function showLoader() {
  const el = document.createElement("div");
  el.id = "global-loader";
  el.innerHTML = `<div class="loader-spinner"></div><span>Cargando datos del campeonato…</span>`;
  document.body.appendChild(el);
}
function hideLoader() {
  const el = document.getElementById("global-loader");
  if (!el) return;
  el.classList.add("hide");
  setTimeout(() => el.remove(), 400);
}

let DB = null;

/* ----------------------------------------------------------
   2) HELPERS GENERALES
   ---------------------------------------------------------- */
function getTeam(id) { return DB.teams.find(t => t.id === id) || null; }
function getDriver(id) { return DB.drivers.find(d => d.id === id) || null; }
function teamName(id) { const t = getTeam(id); return t ? t.name : "Sin equipo"; }
function teamColor(id) { const t = getTeam(id); return t ? t.color : "#8a8d93"; }

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function fmtDate(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m-1]} de ${y}`;
}
function fmtDateShort(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return `${d} ${MESES[m-1].slice(0,3)}`;
}
function raceStatus(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(iso + "T00:00:00");
  const diffDays = Math.round((d - today) / 86400000);

  if (diffDays < 0) return "finalizado";
  if (diffDays <= 30) return "proximo";
  return "pendiente";
}

function statusLabel(s) {
  return s === "finalizado" ? "Finalizado" : s === "proximo" ? "Próximo" : "Pendiente";
}

/* ----------------------------------------------------------
   3) STANDINGS (pilotos / constructores)
   ---------------------------------------------------------- */
function driverStandings() {
  const arr = DB.drivers.filter(d => d.teamId || d.status !== "libre" || true); // se listan todos
  const sorted = [...arr].sort((a,b) => b.season.points - a.season.points);
  const leaderPoints = sorted[0] ? sorted[0].season.points : 0;
  return sorted.map((d, i) => ({ ...d, pos: i+1, gap: leaderPoints - d.season.points }));
}
function constructorStandings() {
  const sorted = [...DB.teams].sort((a,b) => b.points - a.points);
  return sorted.map((t, i) => ({ ...t, pos: i+1 }));
}

/* ----------------------------------------------------------
   4) RECÁLCULO AUTOMÁTICO (se dispara desde el panel admin)
   ---------------------------------------------------------- */
function recalcTeams() {
  DB.teams.forEach(t => { t.points = 0; t.wins = 0; t.poles = 0; t.podiums = 0; });
  DB.drivers.forEach(d => {
    if (!d.teamId) return;
    const t = getTeam(d.teamId);
    if (!t) return;
    t.points += d.season.points;
    t.wins += d.season.wins;
    t.poles += d.season.poles;
    t.podiums += d.season.podiums;
  });
}

/* Cuotas: fórmula de simulación deportiva (NO apuestas reales).
   Pondera puntos, victorias, podios, poles, consistencia reciente,
   penaliza abandonos y suma la fuerza del equipo actual. */
function recalcOdds() {
  const teamStrength = {};
  const maxTeamPts = Math.max(1, ...DB.teams.map(t => t.points));
  DB.teams.forEach(t => teamStrength[t.id] = (t.points / maxTeamPts) * 10);

  const scores = DB.drivers.map(d => {
    if (
  d.season.points === 0 &&
  d.season.wins === 0 &&
  d.season.podiums === 0 &&
  d.season.poles === 0 &&
  d.recentPositions.length === 0
) {
  return { d, score: 0 };
    }
    const recent = d.recentPositions.slice(-5);
    const recentAvg = recent.length ? recent.reduce((a,b)=>a+b,0)/recent.length : 20;
    const consistencyBonus = recent.length ? Math.max(0, 10 - recentAvg) : 0;
    const strength = teamStrength[d.teamId] || 0;
    const score = 10
      + d.season.points * 1.0
      + d.season.wins * 8
      + d.season.podiums * 4
      + d.season.poles * 3
      + consistencyBonus * 1.5   // resultados recientes pesan más
      - d.season.dnf * 3
      + strength;
    return { d, score: Math.max(1, score) };
  });

  const totalScore = scores.reduce((a,b) => a + b.score, 0);
  scores.forEach(({ d, score }) => {
    const probability = Math.round((score / totalScore) * 1000) / 10; // %
    const rawOdds = Math.max(1.00, Math.round((100 / probability) * 100) / 100);
    d.oddsPrev = d.odds;
    d.odds = isFinite(rawOdds) ? Math.min(rawOdds, 200) : 200;
    d.probability = probability;
    d.oddsHistory = [...(d.oddsHistory || []), d.odds].slice(-10);
  });
}
function recalcConstructorOdds() {
  // Máximo de puntos que puede conseguir un piloto en una carrera
  const maxPointsPerDriver = Math.max(...POINTS_SYSTEM);

  // Carreras que todavía no terminaron
  let remainingRaces = 0;

  DB.calendar.forEach(race => {
    if (!race.results?.r1) remainingRaces++;
    if (!race.results?.r2) remainingRaces++;
  });

  // Calculamos los puntos máximos que todavía podría conseguir
  // cada constructor con sus pilotos actuales.
  const possibilities = DB.teams.map(team => {
    const teamDrivers = DB.drivers.filter(d => d.teamId === team.id);

    const maxRemainingPoints =
      remainingRaces *
      teamDrivers.length *
      maxPointsPerDriver;

    return {
      team,
      currentPoints: team.points || 0,
      maxPossiblePoints:
        (team.points || 0) + maxRemainingPoints
    };
  });

  // Constructor actualmente líder
  const leader = [...possibilities]
    .sort((a, b) => b.currentPoints - a.currentPoints)[0];

  // Comprobamos si el líder ya es campeón matemáticamente
  const isChampion = leader &&
    possibilities
      .filter(x => x.team.id !== leader.team.id)
      .every(x => leader.currentPoints > x.maxPossiblePoints);

  // Si ya es campeón matemáticamente
  if (isChampion) {
    possibilities.forEach(({ team }) => {
      team.oddsPrev = team.odds;

      if (team.id === leader.team.id) {
        team.probability = 100;
        team.odds = 1.00;
        team.champion = true;
      } else {
        team.probability = 0;
        team.odds = 150;
        team.champion = false;
      }
    });

    return;
  }

  // Si todavía no está definido el campeonato,
  // calculamos las probabilidades normalmente.
  const total = DB.teams.reduce(
    (sum, team) => sum + Math.max(1, team.points || 0),
    0
  );

  DB.teams.forEach(team => {
    const probability =
      Math.round(
        (Math.max(1, team.points || 0) / total) * 1000
      ) / 10;

    team.oddsPrev = team.odds;

    // Puede bajar hasta 1.01.
    // El 1.00 queda reservado exclusivamente
    // para un campeón matemáticamente confirmado.
    const rawOdds = Math.max(
      1.01,
      Math.round((100 / probability) * 100) / 100
    );

    team.odds = isFinite(rawOdds) ? Math.min(rawOdds, 150) : 150;
    team.probability = probability;
    team.champion = false;
  });
}
/* Power Ranking: clasificación independiente basada en ritmo
   reciente, poles y consistencia (no depende de los puntos). */
function recalcPower() {
  DB.drivers.forEach(d => { d.powerRankPrev = d.powerRank; });
  const scored = DB.drivers.map(d => {
    const recent = d.recentPositions.slice(-5);
    const recentAvg = recent.length ? recent.reduce((a,b)=>a+b,0)/recent.length : 99;
    const errorPenalty = d.season.dnf * 2;
    const poleBonus = d.season.poles * 1.5;
    const score = recentAvg - poleBonus + errorPenalty; // menor = mejor
    return { d, score };
  }).sort((a,b) => a.score - b.score);
  scored.forEach(({d}, i) => { d.powerRank = i + 1; });
}

function recalcAll() {
  recalcTeams();
  // recalcOdds(); // Desactivado para mantener cuotas manuales
  recalcPower();
  saveDB(DB);
}
/* Cargar resultado de una carrera (R1 o R2 de una fecha) */
function submitRaceResult(round, raceKey, orderIds, dnfIds, poleId, fastLapId) {
  orderIds.forEach((id, idx) => {
    const d = getDriver(id);
    if (!d) return;
    const pts = POINTS_SYSTEM[idx] || 0;
    d.season.points += pts;
    if (idx === 0) d.season.wins++;
    if (idx < 3) d.season.podiums++;
    d.recentPositions = [...(d.recentPositions||[]), idx+1].slice(-8);
  });
  dnfIds.forEach(id => {
    const d = getDriver(id);
    if (!d) return;
    d.season.dnf++;
    d.recentPositions = [...(d.recentPositions||[]), 20].slice(-8);
  });
  if (poleId) { const d = getDriver(poleId); if (d) d.season.poles++; }
  if (fastLapId) { const d = getDriver(fastLapId); if (d) d.season.fastLaps++; }

  const race = DB.calendar.find(r => r.round === round);

// acá NO va nada de noticias
   
recalcTeams();
recalcOdds();
recalcConstructorOdds();
recalcPower();
saveDB(DB);
}

/* ----------------------------------------------------------
   5) UI: menú, modo oscuro, año, header scroll
   ---------------------------------------------------------- */
function initChrome() {
  // Año dinámico si hace falta en footer
  document.querySelectorAll("[data-season]").forEach(el => el.textContent = DB.season);

  // Menú móvil
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      menu.classList.toggle("open");
      toggle.classList.toggle("open");
    });
    menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      menu.classList.remove("open"); toggle.classList.remove("open");
    }));
  }

  // Modo oscuro (el sitio ya es oscuro por defecto; esto permite un modo "claro" opcional)
  const modeBtn = document.querySelector(".mode-toggle");
  const savedMode = localStorage.getItem("f1_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedMode);
  if (modeBtn) {
    modeBtn.textContent = savedMode === "dark" ? "☀️" : "🌙";
    modeBtn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("f1_theme", next);
      modeBtn.textContent = next === "dark" ? "☀️" : "🌙";
    });
  }

  // Sombra de header al hacer scroll
  const header = document.querySelector(".site-header");
  if (header) {
    window.addEventListener("scroll", () => {
      header.classList.toggle("scrolled", window.scrollY > 10);
    });
  }

  // Marcar link activo
  const page = document.body.dataset.page;
  document.querySelectorAll(".nav-menu a[data-nav]").forEach(a => {
    if (a.dataset.nav === page) a.classList.add("active");
  });
}

/* Contadores animados (para Inicio / Estadísticas) */
function animateCounters() {
  document.querySelectorAll("[data-counter]").forEach(el => {
    const target = parseFloat(el.dataset.counter);
    const decimals = el.dataset.counter.includes(".") ? 1 : 0;
    let cur = 0;
    const step = target / 40;
    const tick = () => {
      cur += step;
      if (cur >= target) { el.textContent = target.toFixed(decimals); return; }
      el.textContent = cur.toFixed(decimals);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/* Flecha de tendencia de cuota */
function trendArrow(current, prev) {
  if (prev == null || current == null) return `<span class="trend flat">—</span>`;
  if (current < prev) return `<span class="trend up">▼ baja</span>`; // cuota baja = más favorito
  if (current > prev) return `<span class="trend down">▲ sube</span>`;
  return `<span class="trend flat">— sin cambios</span>`;
}
function powerTrendArrow(rank, prevRank) {
  if (prevRank == null) return `<span class="trend flat">—</span>`;
  if (rank < prevRank) return `<span class="trend up">▲ +${prevRank-rank}</span>`;
  if (rank > prevRank) return `<span class="trend down">▼ -${rank-prevRank}</span>`;
  return `<span class="trend flat">— igual</span>`;
}

/* ----------------------------------------------------------
   6) RENDER: INICIO
   ---------------------------------------------------------- */
function renderHome() {
  const leader = [...DB.drivers]
  .filter(d => d.odds != null)
  .sort((a, b) => a.odds - b.odds)[0];
  const el = id => document.getElementById(id);

  if (el("home-favorito")) {
    el("home-favorito").innerHTML = leader ? `
      <div class="fav-driver">
        <div class="fav-number" style="color:${teamColor(leader.teamId)}">#${leader.number}</div>
        <div>
          <div class="fav-name">${leader.name}</div>
          <div class="fav-team">${teamName(leader.teamId)}</div>
        </div>
      </div>
      <div class="fav-odds">Cuota <strong>${leader.odds ?? "—"}</strong> · ${leader.probability ?? 0}% prob.</div>
    ` : "";
  }

  const nextRace = DB.calendar.find(r => !(r.results.r1 && r.results.r2));
  if (el("home-proximo") && nextRace) {
    el("home-proximo").innerHTML = `
      <div class="next-gp">
        <span class="flag-big">${nextRace.flag}</span>
        <div>
          <div class="next-gp-name">GP de ${nextRace.circuit}</div>
          <div class="next-gp-date">Ronda ${nextRace.round} · ${fmtDate(nextRace.r1)} y ${fmtDate(nextRace.r2)}</div>
        </div>
      </div>`;
  }

  if (el("home-noticias")) {
    el("home-noticias").innerHTML = DB.news.slice(0,3).map(n => newsCardHTML(n)).join("");
  }

  if (el("home-fichajes")) {
    const confirmed = DB.drivers.filter(d => d.status === "confirmado" && d.teamId).slice(0,6);
    el("home-fichajes").innerHTML = confirmed.map(d => `
      <div class="mini-driver-card">
        <span class="dot" style="background:${teamColor(d.teamId)}"></span>
        <span class="mini-name">${d.name}</span>
        <span class="mini-team">${teamName(d.teamId)}</span>
      </div>`).join("");
  }

  if (el("home-update")) {
    el("home-update").textContent = "Cuotas y clasificaciones actualizadas — pretemporada " + DB.season;
  }
}

/* ----------------------------------------------------------
   7) RENDER: NOTICIAS
   ---------------------------------------------------------- */
function newsCardHTML(n) {
  return `
    <article class="card news-card fade-up">
      <div class="news-img" style="background-image:url('${n.image}')"></div>
      <div class="news-body">
        <span class="badge">${n.category}</span>
        <h3>${n.title}</h3>
        <p class="news-date">${fmtDate(n.date)}</p>
        <p class="news-text">${n.text}</p>
      </div>
    </article>`;
}
function renderNews() {
  const wrap = document.getElementById("news-list");
  if (!wrap) return;
  const cats = ["Todas", ...new Set(DB.news.map(n => n.category))];
  const filterBar = document.getElementById("news-filters");
  if (filterBar) {
    filterBar.innerHTML = cats.map(c => `<button class="chip" data-cat="${c}">${c}</button>`).join("");
    filterBar.querySelectorAll(".chip").forEach(btn => btn.addEventListener("click", () => {
      filterBar.querySelectorAll(".chip").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.dataset.cat;
      const items = cat === "Todas" ? DB.news : DB.news.filter(n=>n.category===cat);
      wrap.innerHTML = items.map(newsCardHTML).join("") || `<p class="empty">No hay noticias en esta categoría.</p>`;
    }));
    filterBar.querySelector(".chip").classList.add("active");
  }
  wrap.innerHTML = DB.news.map(newsCardHTML).join("");
}

/* ----------------------------------------------------------
   8) RENDER: MERCADO DE PILOTOS
   ---------------------------------------------------------- */
function driverMiniCard(d) {
  const statusBadge = d.status === "confirmado"
    ? `<span class="badge badge-ok">✅ Confirmado</span>`
    : d.status === "rumor"
      ? `<span class="badge badge-warn">⏳ Rumor</span>`
      : `<span class="badge badge-info">❓ Asiento disponible</span>`;
  const rumorTxt = d.rumorTeams && d.rumorTeams.length
    ? `<p class="rumor-teams">Suenan: ${d.rumorTeams.map(teamName).join(", ")}</p>` : "";
  return `
    <a href="piloto.html?id=${d.id}" class="card driver-card fade-up">
      <div class="driver-photo" style="border-color:${teamColor(d.teamId)}">
        <span>${d.flag || "🏁"}</span>
      </div>
      <div class="driver-num" style="color:${teamColor(d.teamId)}">#${d.number ?? "-"}</div>
      <h3>${d.name}</h3>
      <p class="driver-team">${teamName(d.teamId)}</p>
      <p class="driver-country">${d.country}</p>
      ${statusBadge}
      ${rumorTxt}
    </a>`;
}
function renderMarket() {
  const wrap = document.getElementById("market-groups");
  if (!wrap) return;
  const groups = [
    { key: "confirmado", title: "✅ Confirmados", items: DB.drivers.filter(d=>d.status==="confirmado") },
    { key: "rumor", title: "⏳ Rumores", items: DB.drivers.filter(d=>d.status==="rumor") },
    { key: "libre", title: "❓ Asientos disponibles", items: DB.drivers.filter(d=>d.status==="libre") },
  ];
  wrap.innerHTML = groups.map(g => `
    <section class="market-group">
      <h2 class="section-title">${g.title} <span class="count">${g.items.length}</span></h2>
      <div class="grid-cards">${g.items.map(driverMiniCard).join("") || '<p class="empty">Sin datos.</p>'}</div>
    </section>`).join("");
}

/* ----------------------------------------------------------
   9) RENDER: CAMPEONATO DE PILOTOS
   ---------------------------------------------------------- */
function renderDriversStandings() {
  const tbody = document.getElementById("drivers-table-body");
  if (!tbody) return;
  const ds = driverStandings();
  tbody.innerHTML = ds.map(d => `
    <tr>
      <td class="pos">${d.pos}</td>
      <td class="driver-cell">
        <a href="piloto.html?id=${d.id}">
          <span class="team-dot" style="background:${teamColor(d.teamId)}"></span>
          ${d.name} <span class="num">#${d.number ?? "-"}</span>
        </a>
      </td>
      <td>${teamName(d.teamId)}</td>
      <td class="strong">${d.season.points}</td>
      <td>${d.season.wins}</td>
      <td>${d.season.poles}</td>
      <td>${d.season.podiums}</td>
      <td>${d.season.dnf}</td>
      <td>${d.season.fastLaps}</td>
      <td>${d.pos === 1 ? "—" : "-" + d.gap}</td>
      <td>${d.odds ?? "—"}</td>
      <td>${trendArrow(d.odds, d.oddsPrev)}</td>
    </tr>`).join("");
}

/* ----------------------------------------------------------
   10) RENDER: CAMPEONATO DE CONSTRUCTORES
   ---------------------------------------------------------- */
function renderConstructorsStandings() {
  const tbody = document.getElementById("constructors-table-body");
  if (!tbody) return;
  const cs = constructorStandings();
  tbody.innerHTML = cs.map(t => `
    <tr>
      <td class="pos">${t.pos}</td>
      <td class="driver-cell"><span class="team-dot" style="background:${t.color}"></span>${t.name}</td>
      <td class="strong">${t.points}</td>
      <td>${t.wins}</td>
      <td>${t.poles}</td>
      <td>${t.podiums}</td>
      <td>${t.odds ?? "—"}</td>
    </tr>`).join("");
}

/* ----------------------------------------------------------
   11) RENDER: CUOTAS SIMULADAS
   ---------------------------------------------------------- */
function renderOdds() {
  const wrap = document.getElementById("odds-list");
  if (!wrap) return;
  const ds = driverStandings().filter(d => d.odds != null).sort((a,b)=>a.odds-b.odds);
  wrap.innerHTML = ds.map(d => `
    <div class="card odds-card fade-up">
      <div class="odds-top">
        <span class="team-dot" style="background:${teamColor(d.teamId)}"></span>
        <a href="piloto.html?id=${d.id}"><strong>${d.name}</strong></a>
        <span class="odds-team">${teamName(d.teamId)}</span>
      </div>
      <div class="odds-mid">
        <div class="odds-value">${d.odds}</div>
        <div class="odds-prob">${d.probability}% prob. campeón</div>
        ${trendArrow(d.odds, d.oddsPrev)}
      </div>
      <canvas class="odds-spark" data-history='${JSON.stringify(d.oddsHistory||[])}' height="40"></canvas>
    </div>`).join("");
  // mini sparklines
  wrap.querySelectorAll(".odds-spark").forEach(c => drawSparkline(c, JSON.parse(c.dataset.history)));
}
function drawSparkline(canvas, values) {
  if (!values || values.length < 2) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.clientWidth || 260;
  const h = canvas.height;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  ctx.clearRect(0,0,w,h);
  ctx.beginPath();
  ctx.strokeStyle = "#e10600";
  ctx.lineWidth = 2;
  values.forEach((v,i) => {
    const x = (i/(values.length-1)) * w;
    const y = h - ((v-min)/range) * (h-6) - 3;
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.stroke();
}

/* ----------------------------------------------------------
   12) RENDER: POWER RANKING
   ---------------------------------------------------------- */
function renderPowerRanking() {
  const wrap = document.getElementById("power-list");
  if (!wrap) return;
  const top10 = [...DB.drivers].sort((a,b)=>a.powerRank-b.powerRank).slice(0,10);
  wrap.innerHTML = top10.map(d => `
    <div class="card power-row fade-up">
      <div class="power-rank">${d.powerRank}</div>
      <span class="team-dot" style="background:${teamColor(d.teamId)}"></span>
      <a href="piloto.html?id=${d.id}" class="power-name">${d.name}</a>
      <span class="power-team">${teamName(d.teamId)}</span>
      ${powerTrendArrow(d.powerRank, d.powerRankPrev)}
    </div>`).join("");
}

/* ----------------------------------------------------------
   13) RENDER: CALENDARIO
   ---------------------------------------------------------- */
function renderCalendar() {

  const wrap = document.getElementById("calendar-list");

  if (!wrap) return;

  wrap.innerHTML = DB.calendar.map(r => {

    let s;

    // Si las dos carreras del GP ya tienen resultados
    if (r.results?.r1 && r.results?.r2) {
      s = "finalizado";

    // Si ya terminó una de las dos carreras
    } else if (r.results?.r1 || r.results?.r2) {
      s = "proximo";

    // Si todavía no hay resultados, usamos la fecha
    } else {
      s = raceStatus(r.r2);
    }

    return `
      <div class="card calendar-card fade-up status-${s}">
        <div class="cal-round">R${r.round}</div>
        <div class="cal-flag">${r.flag}</div>

        <div class="cal-info">
          <h3>${r.circuit}</h3>
          <p>Clasificación + Carrera sábado: ${fmtDateShort(r.r1)}</p>
          <p>Clasificación + Carrera domingo: ${fmtDateShort(r.r2)}</p>
        </div>

        <span class="badge badge-${s}">
          ${statusLabel(s)}
        </span>
      </div>
    `;

  }).join("");

}
/* ----------------------------------------------------------
   14) RENDER: ESTADÍSTICAS
   ---------------------------------------------------------- */
function topBy(getter, n=5) {
  return [...DB.drivers].sort((a,b)=>getter(b)-getter(a)).slice(0,n);
}
function statList(list, getter, unit="") {
  return list.map((d,i) => `
    <li><span class="rank">${i+1}</span> <a href="piloto.html?id=${d.id}">${d.name}</a>
      <span class="stat-val">${getter(d)}${unit}</span></li>`).join("");
}
function renderStats() {
  const map = {
    "stat-wins": topBy(d=>d.season.wins+d.career.wins, 5),
    "stat-poles": topBy(d=>d.season.poles+d.career.poles, 5),
    "stat-podiums": topBy(d=>d.season.podiums+d.career.podiums, 5),
    "stat-fastlaps": topBy(d=>d.season.fastLaps+d.career.fastLaps, 5),
    "stat-points": topBy(d=>d.season.points, 5),
    "stat-dnf": topBy(d=>d.season.dnf+d.career.dnf, 5),
  };
  Object.entries(map).forEach(([id, list]) => {
    const el = document.getElementById(id);
    if (!el) return;
    let getter;
    if (id === "stat-wins") getter = d=>d.season.wins+d.career.wins;
    else if (id === "stat-poles") getter = d=>d.season.poles+d.career.poles;
    else if (id === "stat-podiums") getter = d=>d.season.podiums+d.career.podiums;
    else if (id === "stat-fastlaps") getter = d=>d.season.fastLaps+d.career.fastLaps;
    else if (id === "stat-points") getter = d=>d.season.points;
    else if (id === "stat-dnf") getter = d=>d.season.dnf+d.career.dnf;
    el.innerHTML = statList(list, getter);
  });

  const hist = document.getElementById("history-list");
  if (hist) {
    hist.innerHTML = DB.history.length
      ? DB.history.map(h => `
        <div class="card history-card">
          <h3>${h.season}</h3>
          <p>🏆 Campeón de pilotos: <strong>${h.driverChampion}</strong></p>
          <p>🥈 Subcampeón: ${h.driverSecond}</p>
          <p>🥉 Tercer lugar: ${h.driverThird}</p>
          <p>🏗️ Campeón de constructores: <strong>${h.teamChampion}</strong></p>
        </div>`).join("")
      : `<p class="empty">Todavía no hay temporadas finalizadas. El historial se completa automáticamente al cerrar una temporada desde el panel de administración.</p>`;
  }
}

/* ----------------------------------------------------------
   15) RENDER: PERFIL DE PILOTO
   ---------------------------------------------------------- */
function renderDriverProfile() {
  const wrap = document.getElementById("driver-profile");
  if (!wrap) return;
  const params = new URLSearchParams(location.search);
  const d = getDriver(params.get("id"));
  if (!d) { wrap.innerHTML = `<p class="empty">Piloto no encontrado.</p>`; return; }
  document.title = `${d.name} — F1 International Championship`;

  wrap.innerHTML = `
    <div class="profile-hero" style="--team-color:${teamColor(d.teamId)}">
      <div class="profile-photo">${d.flag || "🏁"}</div>
      <div>
        <h1>${d.name}</h1>
        <p class="profile-sub">${teamName(d.teamId)} · #${d.number ?? "-"} · ${d.country}</p>
        ${d.odds != null ? `<p class="profile-odds">Cuota actual: <strong>${d.odds}</strong> · ${d.probability}% prob. de campeón</p>` : ""}
      </div>
    </div>
    <p class="profile-bio">${d.bio}</p>
    <div class="profile-grid">
      <div class="card stat-box"><span>Edad</span><strong>${d.age ?? "—"}</strong></div>
      <div class="card stat-box"><span>Temporadas</span><strong>${d.seasons ?? "—"}</strong></div>
      <div class="card stat-box"><span>Mejor resultado</span><strong>${d.bestResult ?? "—"}</strong></div>
      <div class="card stat-box"><span>Victorias</span><strong>${d.season.wins + d.career.wins}</strong></div>
      <div class="card stat-box"><span>Podios</span><strong>${d.season.podiums + d.career.podiums}</strong></div>
      <div class="card stat-box"><span>Poles</span><strong>${d.season.poles + d.career.poles}</strong></div>
      <div class="card stat-box"><span>Vueltas rápidas</span><strong>${d.season.fastLaps + d.career.fastLaps}</strong></div>
      <div class="card stat-box"><span>Abandonos</span><strong>${d.season.dnf + d.career.dnf}</strong></div>
      <div class="card stat-box"><span>Puntos (temporada)</span><strong>${d.season.points}</strong></div>
      <div class="card stat-box"><span>Puntos (histórico)</span><strong>${d.career.points}</strong></div>
    </div>
    <h2 class="section-title">Evolución de cuota</h2>
    <canvas id="driver-chart" height="90"></canvas>
  `;
  if (d.oddsHistory && d.oddsHistory.length > 1 && window.Chart) {
    new Chart(document.getElementById("driver-chart"), {
      type: "line",
      data: {
        labels: d.oddsHistory.map((_,i)=>`T${i+1}`),
        datasets: [{ label: "Cuota", data: d.oddsHistory, borderColor: "#e10600", backgroundColor: "rgba(225,6,0,.15)", tension: .35, fill: true }],
      },
      options: { plugins: { legend: { display:false } }, scales: { y: { reverse: false, grid: { color:"#232323" }, ticks:{color:"#c8c8c8"} }, x:{ grid:{color:"#1a1a1a"}, ticks:{color:"#c8c8c8"} } } },
    });
  }
}

/* ----------------------------------------------------------
   16) BUSCADORES (pilotos / equipos)
   ---------------------------------------------------------- */
function initSearch(inputId, cardsSelector, containerSelector) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll(containerSelector + " " + cardsSelector).forEach(card => {
      const txt = card.textContent.toLowerCase();
      card.style.display = txt.includes(q) ? "" : "none";
    });
  });
}

/* ----------------------------------------------------------
   17) INIT
   ---------------------------------------------------------- */
function renderCurrentPage() {
  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "news") renderNews();
  if (page === "market") { renderMarket(); initSearch("market-search", ".driver-card", "#market-groups"); }
  if (page === "drivers") renderDriversStandings();
  if (page === "constructors") renderConstructorsStandings();
  if (page === "odds") renderOdds();
  if (page === "power") renderPowerRanking();
  if (page === "calendar") renderCalendar();
  if (page === "stats") renderStats();
  if (page === "driver") renderDriverProfile();
  if (page === "admin" && isAdminLogged()) renderAdminAll(); // en admin, la primera carga la hace initAdmin()
  animateCounters();
}

document.addEventListener("DOMContentLoaded", async () => {
  showLoader();
  DB = await loadDB();
  hideLoader();
  initChrome();
  const page = document.body.dataset.page;
  if (page === "admin") {
    initAdmin(); // maneja login + primer render del panel
    animateCounters();
  } else {
    renderCurrentPage(); // ya incluye animateCounters()
  }
  subscribeDB();
});
