/* ============================================================
   F1 INTERNATIONAL CHAMPIONSHIP — app.js
   ------------------------------------------------------------
   Lógica compartida por todo el sitio:
   - Base de datos COMPARTIDA en Firebase Firestore (seed = data.js).
   - Cálculo automático de puntos, cuotas y power ranking
   - Render de cada página según body[data-page]
   - Menú, modo oscuro, buscadores, animaciones
   - DUELO INTERNO: cuotas de rivalidad entre compañeros
   ============================================================ */

const AUTH_KEY = "f1_admin_session";
const ADMIN_PASSWORD = "f1admin2027";

/* ----------------------------------------------------------
   1) BASE DE DATOS COMPARTIDA (Firebase Firestore)
   ---------------------------------------------------------- */
function firestoreDoc() { return firestoreDB.collection("f1champ").doc("estado"); }

function buildSeed() {
  return {
    season: SEASON_LABEL,
    teams: structuredClone(DEFAULT_TEAMS),
    drivers: structuredClone(DEFAULT_DRIVERS).map(d => ({ ...d, recentPositions: d.recentPositions || [] })),
    calendar: structuredClone(DEFAULT_CALENDAR),
    news: structuredClone(DEFAULT_NEWS),
    history: structuredClone(DEFAULT_HISTORY),
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

async function syncFromDataJS() {
  if (!confirm("¿Reemplazar la base de datos de Firebase con el contenido actual de data.js?")) return;
  try {
    DB = buildSeed();
    await saveDB(DB);
    alert("Firebase se actualizó correctamente desde data.js.");
    renderCurrentPage();
  } catch (err) {
    console.error(err);
    alert("Error al actualizar Firebase.");
  }
}

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
  el.textContent = "No se pudo conectar con la base de datos compartida. Revisá js/firebase-config.js — mientras tanto se muestran datos de fábrica sin guardar.";
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
function getTeam(id) {
  return DB.teams.find(t => t.id === id) || null;
}

function getDriver(id) {
  return DB.drivers.find(d => d.id === id) || null;
}

function teamName(id) {
  const t = getTeam(id);
  return t ? t.name : "Sin equipo";
}

function teamColor(id) {
  const t = getTeam(id);
  return t ? t.color : "#8a8d93";
}

function teamLogo(id) {
  const t = getTeam(id);
  return t && t.logo ? t.logo : "";
}

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
  const arr = DB.drivers.filter(d => d.teamId || d.status !== "libre" || true);
  const sorted = [...arr].sort((a,b) => b.season.points - a.season.points);
  const leaderPoints = sorted[0] ? sorted[0].season.points : 0;
  return sorted.map((d, i) => ({
    ...d, pos: i+1, gap: leaderPoints - d.season.points,
    champion: DB.mathematicalChampion && d.id === DB.mathematicalChampion
  }));
}
function constructorStandings() {
  const sorted = [...DB.teams].sort((a,b) => b.points - a.points);
  return sorted.map((t, i) => ({ ...t, pos: i+1, champion: t.champion === true }));
}

/* ----------------------------------------------------------
   4) RECÁLCULO AUTOMÁTICO
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

function recalcOdds() {
  const drivers = DB.drivers || [];
  if (!drivers.length || !DB.calendar) return;

  const startingOddsMap = {
    alexander: 3.50, coffin: 2.60, carreon: 3.90, moran: 4.60,
    acosta: 8.50, mauricio: 12.00, vidal: 19.00, pichardo: 23.00,
    osorio: 26.00, flores: 29.00, maximo: 31.00, caceres: 34.00,
    jeanfranco: 41.00, raneri: 51.00, camilo: 67.00, dave: 81.00,
    chichar: 101.00, tapara: 105.00, luca: 107.00,
    hernandez: 55.00, fabian: 102.00,
    yzaac: 110.00, ianfalla: 63.00, ventura: 102.00,
    santiago: 102.00, hitan: 102.00, jose: 102.00, agustin: 102.00
  };

  function getDriverId(d) {
    return String(d.id || d.driverId || d.slug || d.key || "").toLowerCase().trim();
  }

  drivers.forEach(d => {
    const id = getDriverId(d);
    if (startingOddsMap[id] !== undefined) d.startingOdds = startingOddsMap[id];
  });

  let completedRaces = 0;
  let remainingRaces = 0;
  DB.calendar.forEach(race => {
    const r1Done = race.results?.r1?.orderIds?.length > 0;
    const r2Done = race.results?.r2?.orderIds?.length > 0;
    if (r1Done) completedRaces++; else remainingRaces++;
    if (r2Done) completedRaces++; else remainingRaces++;
  });

  if (remainingRaces <= 0) return;

  const maxPointsPerRace = Math.max(...POINTS_SYSTEM);
  const maxPointsRemaining = remainingRaces * maxPointsPerRace;

  /* --- PRE-TEMPORADA: usar cuotas fijas de data.js --- */
  if (completedRaces === 0) {
    drivers.forEach(d => {
      const id = getDriverId(d);
      if (["libre1","libre2","libre3","libre4"].includes(id)) { d.odds = null; d.probability = null; return; }
      const startOdds = startingOddsMap[id] ?? d.startingOdds ?? d.odds ?? 50;
      d.oddsPrev = startOdds;
      d.odds = startOdds;
      d.probability = Math.round((100 / startOdds) * 10) / 10;
      d.oddsHistory = [startOdds];
      d.oddsPointsReference = 0;
    });
    DB.mathematicalChampion = null;
    return;
  }

  const sorted = [...drivers]
    .filter(d => !["libre1","libre2","libre3","libre4"].includes(getDriverId(d)))
    .sort((a, b) => (b.season?.points || 0) - (a.season?.points || 0));

  const leader = sorted[0];
  if (!leader) return;
  const leaderPoints = leader.season?.points || 0;

  const mathematicallyAlive = new Set();
  sorted.forEach(d => {
    const points = d.season?.points || 0;
    if (points + maxPointsRemaining > leaderPoints) mathematicallyAlive.add(d);
  });

  let mathematicalChampion = null;
  const leaderCanBeCaught = sorted.some(d => {
    if (d === leader) return false;
    return (d.season?.points || 0) + maxPointsRemaining >= leaderPoints;
  });
  if (!leaderCanBeCaught) mathematicalChampion = leader;

  const totalRaces = completedRaces + remainingRaces;
  const seasonProgress = totalRaces > 0 ? completedRaces / totalRaces : 0;

  drivers.forEach(d => {
    const id = getDriverId(d);
    const isFreeDriver = ["libre1","libre2","libre3","libre4"].includes(id);
    if (isFreeDriver) { d.odds = null; d.probability = null; return; }

    if (mathematicalChampion && d === mathematicalChampion) {
      d.oddsPrev = typeof d.odds === "number" ? d.odds : d.startingOdds || 2.00;
      d.odds = 1.00; d.probability = 100;
      d.oddsHistory = [...(d.oddsHistory || []), 1.00].slice(-10);
      d.oddsPointsReference = d.season?.points || 0;
      return;
    }

    if (!mathematicallyAlive.has(d)) {
      d.oddsPrev = typeof d.odds === "number" ? d.odds : d.startingOdds || 200;
      d.odds = 200.00; d.probability = 0;
      d.oddsHistory = [...(d.oddsHistory || []), 200.00].slice(-10);
      d.oddsPointsReference = d.season?.points || 0;
      return;
    }

    const points = d.season?.points || 0;
    const wins = d.season?.wins || 0;
    const podiums = d.season?.podiums || 0;
    const poles = d.season?.poles || 0;
    const fastestLaps = d.season?.fastestLaps || 0;
    const retirements = d.season?.retirements || d.season?.dnf || d.season?.dnfs || 0;
    const recent = Array.isArray(d.recentPositions) ? d.recentPositions : [];

    const previousPoints = typeof d.oddsPointsReference === "number" ? d.oddsPointsReference : points;
    const pointsGained = points - previousPoints;

    let recentForm = 0;
    if (recent.length) {
      const recentAvg = recent.reduce((sum, pos) => sum + pos, 0) / recent.length;
      recentForm = Math.max(0, Math.min(1, (15 - recentAvg) / 14));
    }

    const deficit = Math.max(0, leaderPoints - points);
    const deficitRatio = Math.min(1, deficit / Math.max(1, maxPointsRemaining));

    /* ---------- PERFORMANCE SCORE ----------
       Rango real: -0.40 (muy mal) a +0.80 (dominante).
       Un favorito que no gana ni sube al podio sube de cuota.
       Un underdog que gana carreras baja fuerte. */
    let performanceScore = 0;
    performanceScore += Math.min(wins, 8) * 0.10;
    performanceScore += Math.min(podiums, 12) * 0.04;
    performanceScore += Math.min(poles, 10) * 0.02;
    performanceScore += Math.min(fastestLaps, 10) * 0.01;
    performanceScore += recentForm * 0.15;
    performanceScore -= Math.min(retirements, 8) * 0.035;
    performanceScore = Math.max(-0.40, Math.min(0.80, performanceScore));

    /* ---------- POINTS INFLUENCE ----------
       Cuanto más grande es la ventaja del líder, más fuerte el efecto.
       Al inicio de temporada los puntos pesan menos, al final pesan más. */
    const pointsInfluence = deficitRatio * (0.20 + seasonProgress * 0.80);

    /* Performance multiplier: fav que rinde mal → odds suben.
       Underdog que rinde bien → odds bajan. */
    let performanceMultiplier = 1 - performanceScore;
    performanceMultiplier = Math.max(0.55, Math.min(1.50, performanceMultiplier));

    /* Points multiplier: quien va abajo tiene cuotas más altas. */
    let pointsMultiplier = 1 + pointsInfluence * 1.50;

    /* ---------- LEADER BONUS ----------
       El líder recibe una reducción de cuota proporcional a su ventaja. */
    if (d === leader) {
      const second = sorted.length > 1 ? sorted[1] : null;
      const secondPoints = second?.season?.points || 0;
      const gapToSecond = Math.max(0, leaderPoints - secondPoints);
      const leaderAdvantageRatio = maxPointsRemaining > 0 ? Math.min(1, gapToSecond / maxPointsRemaining) : 1;
      let leaderReduction = 0.05;
      leaderReduction += leaderAdvantageRatio * 0.15;
      leaderReduction += seasonProgress * 0.05;
      leaderReduction = Math.max(0.03, Math.min(0.25, leaderReduction));
      pointsMultiplier *= 1 - leaderReduction;
    } else {
      /* BRACKET DE DÉFICIT — más agresivo que antes */
      if (deficitRatio < 0.10) pointsMultiplier *= 0.92;
      else if (deficitRatio < 0.25) pointsMultiplier *= 1.00;
      else if (deficitRatio < 0.45) pointsMultiplier *= 1.12;
      else if (deficitRatio < 0.65) pointsMultiplier *= 1.28;
      else if (deficitRatio < 0.85) pointsMultiplier *= 1.45;
      else pointsMultiplier *= 1.65;
    }

    /* ---------- BASE ODDS ----------
       Se usa startingOdds la primera vez, luego el odds actual como base.
       Esto permite que las cuotas converjan hacia el rendimiento real. */
    let baseOdds = d.startingOdds;
    if (typeof baseOdds !== "number" || !isFinite(baseOdds)) {
      baseOdds = (typeof d.odds === "number" && isFinite(d.odds)) ? d.odds : 50;
    }
    baseOdds = Math.max(1.05, Math.min(200, baseOdds));

    /* Si ya hay odds calculadas, las usamos como base (no partimos de starting cada vez) */
    if (completedRaces > 0 && typeof d.odds === "number" && isFinite(d.odds) && d.odds > 0) {
      baseOdds = d.odds;
    }

    let newOdds = baseOdds * performanceMultiplier * pointsMultiplier;

    /* ---------- BONUS / PENALIDAD POR ÚLTIMA CARRERA ---------- */
    if (d !== leader) {
      if (pointsGained <= 0) newOdds *= 1.12;
      else if (pointsGained >= 27) newOdds *= 0.90;
      else if (pointsGained >= 19) newOdds *= 0.94;
    }

    /* ---------- PISO VS LÍDER ----------
       Nadie puede tener mejor cuota que el líder a menos que lo esté superando. */
    if (d !== leader) {
      const leaderOdds = typeof leader.odds === "number" ? leader.odds : leader.startingOdds || 2.60;
      const pointsGap = leaderPoints - points;
      if (pointsGap >= 5) {
        const minimumOdds = leaderOdds * (1 + pointsGap * 0.02);
        newOdds = Math.max(newOdds, minimumOdds);
      }
    }

    /* ---------- DAMPING (movimiento máximo por ciclo) ----------
       Mucho más amplio que antes para que los cambios se noten.
       Al inicio de temporada se mueve más (mercado se está formando).
       Al final, más estable (ya hay certeza). */
    const previousOdds = typeof d.odds === "number" ? d.odds : baseOdds;
    const maxOddsMovement = seasonProgress < 0.15 ? 0.25
                          : seasonProgress < 0.35 ? 0.20
                          : seasonProgress < 0.60 ? 0.15
                          : 0.10;
    newOdds = Math.max(previousOdds * (1 - maxOddsMovement), Math.min(previousOdds * (1 + maxOddsMovement), newOdds));

    newOdds = Math.max(1.05, Math.min(200, newOdds));
    newOdds = Math.round(newOdds * 100) / 100;

    d.oddsPrev = typeof d.odds === "number" ? d.odds : startingOdds;
    d.odds = newOdds;
    d.probability = Math.round((100 / newOdds) * 10) / 10;
    d.oddsHistory = [...(d.oddsHistory || []), newOdds].slice(-10);
    d.oddsPointsReference = d.season?.points || 0;
  });

  if (mathematicalChampion) {
    DB.mathematicalChampion = mathematicalChampion.id || mathematicalChampion.driverId || mathematicalChampion.slug;
  } else {
    DB.mathematicalChampion = null;
  }
}

function recalcConstructorOdds() {
  const maxPointsPerDriver = Math.max(...POINTS_SYSTEM);
  let remainingRaces = 0;
  DB.calendar.forEach(race => {
    if (!race.results?.r1) remainingRaces++;
    if (!race.results?.r2) remainingRaces++;
  });

  const totalRaces = DB.calendar.length * 2;
  const completedRaces = totalRaces - remainingRaces;
  const seasonProgress = totalRaces > 0 ? completedRaces / totalRaces : 0;

  const maxPointsRemaining = remainingRaces * 2 * maxPointsPerDriver;

  /* --- PRE-TEMPORADA: usar cuotas fijas de data.js --- */
  if (completedRaces === 0) {
    DB.teams.forEach(team => {
      const startOdds = team.odds || 50;
      team.oddsPrev = startOdds;
      team.odds = startOdds;
      team.probability = Math.round((100 / startOdds) * 10) / 10;
      team.champion = false;
    });
    return;
  }

  const possibilities = DB.teams.map(team => {
    const teamDrivers = DB.drivers.filter(d => d.teamId === team.id);
    const maxRemaining = remainingRaces * teamDrivers.length * maxPointsPerDriver;
    return { team, teamDrivers, currentPoints: team.points || 0, maxPossiblePoints: (team.points || 0) + maxRemaining };
  });

  const leader = [...possibilities].sort((a, b) => b.currentPoints - a.currentPoints)[0];
  const isChampion = leader && possibilities.filter(x => x.team.id !== leader.team.id).every(x => leader.currentPoints > x.maxPossiblePoints);

  if (isChampion) {
    possibilities.forEach(({ team }) => {
      team.oddsPrev = team.odds;
      if (team.id === leader.team.id) { team.probability = 100; team.odds = 1.00; team.champion = true; }
      else { team.probability = 0; team.odds = 150; team.champion = false; }
    });
    return;
  }

  /* ---------- SCORING POR EQUIPO ----------
     Cada equipo recibe un score que combina:
     1. Puntos actuales (peso crece con la temporada)
     2. Rendimiento de pilotos (wins, podios, poles)
     3. Odds promedio de los pilotos (proxy de fuerza del auto)
     4. Momentum: diferencia de puntos ganados vs esperados */
  const teamScores = possibilities.map(({ team, teamDrivers, currentPoints }) => {
    let score = 0;

    /* 1) Puntos: normalizados contra el líder */
    const leaderPts = leader.currentPoints;
    const ptsScore = leaderPts > 0 ? currentPoints / leaderPts : (1 / DB.teams.length);
    score += ptsScore * (0.20 + seasonProgress * 0.55);

    /* 2) Rendimiento de pilotos combinado */
    let driverPerf = 0;
    teamDrivers.forEach(d => {
      const w = d.season?.wins || 0;
      const p = d.season?.podiums || 0;
      const pol = d.season?.poles || 0;
      const fl = d.season?.fastestLaps || 0;
      const ret = d.season?.dnf || d.season?.dnfs || d.season?.retirements || 0;
      driverPerf += Math.min(w, 8) * 3;
      driverPerf += Math.min(p, 12) * 1.5;
      driverPerf += Math.min(pol, 10) * 0.8;
      driverPerf += Math.min(fl, 10) * 0.4;
      driverPerf -= Math.min(ret, 8) * 1.2;
    });
    const maxDriverPerf = Math.max(1, ...possibilities.map(p => {
      let m = 0;
      p.teamDrivers.forEach(d => {
        m += Math.min(d.season?.wins || 0, 8) * 3;
        m += Math.min(d.season?.podiums || 0, 12) * 1.5;
        m += Math.min(d.season?.poles || 0, 10) * 0.8;
        m += Math.min(d.season?.fastestLaps || 0, 10) * 0.4;
        m -= Math.min(d.season?.dnf || d.season?.dnfs || d.season?.retirements || 0, 8) * 1.2;
      });
      return m;
    }));
    score += (driverPerf / maxDriverPerf) * (0.10 + seasonProgress * 0.20);

    /* 3) Odds promedio de pilotos: mejor auto = menor cuota */
    const driverOdds = teamDrivers
      .map(d => (typeof d.odds === "number" && d.odds > 0) ? d.odds : d.startingOdds || 50);
    const avgOdds = driverOdds.reduce((a, b) => a + b, 0) / Math.max(1, driverOdds.length);
    const oddsScore = Math.max(0, Math.min(1, (1 / Math.log(avgOdds + 1)) * 2));
    score += oddsScore * 0.15;

    /* 4) Momentum: cuánto supera o defiende respecto a lo esperado */
    if (seasonProgress > 0) {
      const expectedPts = teamDrivers.reduce((sum, d) => {
        const driverStartOdds = d.startingOdds || 50;
        const impliedStrength = 1 / Math.log(driverStartOdds + 1);
        return sum + impliedStrength;
      }, 0);
      const totalAllDrivers = DB.drivers.reduce((sum, d) => {
        const o = d.startingOdds || 50;
        return sum + 1 / Math.log(o + 1);
      }, 0);
      const expectedRatio = expectedPts / Math.max(1, totalAllDrivers);
      const actualRatio = leaderPts > 0 ? currentPoints / leaderPts : 0;
      const momentum = (actualRatio - expectedRatio) * 5;
      score += momentum * (0.05 + seasonProgress * 0.10);
    }

    return { team, score: Math.max(0.01, score) };
  });

  /* ---------- CONVERTIR SCORES A CUOTAS ---------- */
  const totalScore = teamScores.reduce((s, t) => s + t.score, 0);

  teamScores.forEach(({ team, score }) => {
    const rawProb = (score / totalScore) * 100;
    const probability = Math.round(rawProb * 10) / 10;
    team.oddsPrev = team.odds;
    const rawOdds = Math.max(1.01, Math.round((100 / Math.max(0.1, probability)) * 100) / 100);
    team.odds = isFinite(rawOdds) ? Math.min(rawOdds, 150) : 150;
    team.probability = probability;
    team.champion = false;
  });
}

function recalcPower() {
  DB.drivers.forEach(d => { d.powerRankPrev = d.powerRank; });
  const scored = DB.drivers.map(d => {
    const recent = d.recentPositions.slice(-5);
    const recentAvg = recent.length ? recent.reduce((a,b)=>a+b,0)/recent.length : 99;
    const errorPenalty = d.season.dnf * 2;
    const poleBonus = d.season.poles * 1.5;
    const score = recentAvg - poleBonus + errorPenalty;
    return { d, score };
  }).sort((a,b) => a.score - b.score);
  scored.forEach(({d}, i) => { d.powerRank = i + 1; });
}

function recalcAll() {
  recalcTeams();
  recalcPower();
  saveDB(DB);
}

function checkMathematicalChampion() {
  const drivers = DB.drivers || [];
  if (!drivers.length || !DB.calendar) return null;
  let remainingRaces = 0;
  DB.calendar.forEach(race => {
    if (!race.results?.r1?.orderIds?.length) remainingRaces++;
    if (!race.results?.r2?.orderIds?.length) remainingRaces++;
  });
  if (remainingRaces <= 0) return null;
  const maxPointsRemaining = remainingRaces * Math.max(...POINTS_SYSTEM);
  const sorted = [...drivers].sort((a, b) => b.season.points - a.season.points);
  const leader = sorted[0];
  const canStillCatch = sorted.slice(1).some(d => d.season.points + maxPointsRemaining > leader.season.points);
  if (!canStillCatch) return leader;
  return null;
}

function renderMathematicalChampion() {
  const championEl = document.getElementById("mathematical-champion");
  if (!championEl) return;
  const champion = DB.mathematicalChampion ? getDriver(DB.mathematicalChampion) : null;
  if (!champion) { championEl.innerHTML = ""; return; }
  championEl.innerHTML = `
    <div class="card mathematical-champion">
      <div class="champion-icon">🏆</div>
      <div>
        <span class="badge badge-ok">CAMPEÓN MATEMÁTICO</span>
        <h2>${champion.name}</h2>
        <p>${teamName(champion.teamId)} · ${champion.season.points} puntos</p>
      </div>
    </div>`;
}

function renderConstructorChampion() {
  const el = document.getElementById("constructor-champion");
  if (!el) return;
  const champTeam = DB.teams.find(t => t.champion === true);
  if (!champTeam) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <div class="card mathematical-champion">
      <div class="champion-icon">🏭</div>
      <div>
        <span class="badge badge-ok">CONSTRUCTOR CAMPEÓN</span>
        <h2>${champTeam.name}</h2>
        <p>${champTeam.points} puntos</p>
      </div>
    </div>`;
}

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
  if (race) race.results[raceKey] = { orderIds, dnfIds, poleId, fastLapId, loadedAt: new Date().toISOString() };

  recalcTeams();
  recalcOdds();
  recalcConstructorOdds();
  recalcPower();

  const mathematicalChampion = checkMathematicalChampion();
  if (mathematicalChampion) DB.mathematicalChampion = mathematicalChampion.id;

  saveDB(DB);
}

/* ----------------------------------------------------------
   5) UI: menú, modo oscuro, año, header scroll
   ---------------------------------------------------------- */
function initChrome() {
  document.querySelectorAll("[data-season]").forEach(el => el.textContent = DB.season);

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

  const header = document.querySelector(".site-header");
  if (header) {
    window.addEventListener("scroll", () => {
      header.classList.toggle("scrolled", window.scrollY > 10);
    });
  }

  const page = document.body.dataset.page;
  document.querySelectorAll(".nav-menu a[data-nav]").forEach(a => {
    if (a.dataset.nav === page) a.classList.add("active");
  });
}

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

function trendArrow(current, prev) {
  if (prev == null || current == null) return `<span class="trend flat">—</span>`;
  if (current < prev) return `<span class="trend up">▼ baja</span>`;
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
  renderMathematicalChampion();
  renderConstructorChampion();
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
         <img src="${teamLogo(d.teamId)}" class="team-logo">
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
    <tr class="${d.champion ? 'champion-row' : ''}">
      <td class="pos">${d.pos}</td>
      <td class="driver-cell">
        <a href="piloto.html?id=${d.id}">
          <img src="${teamLogo(d.teamId)}" class="team-logo" alt="${teamName(d.teamId)}">
          ${d.name} <span class="num">#${d.number ?? "-"}</span>
          ${d.champion ? '<span class="champion-badge">🏆 Campeón</span>' : ''}
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
    <tr class="${t.champion ? 'champion-row' : ''}">
      <td class="pos">${t.pos}</td>
      <td class="driver-cell">
        <img src="${t.logo || ''}" class="team-logo" alt="${t.name}">
        ${t.name}
        ${t.champion ? '<span class="champion-badge">🏆 Campeón</span>' : ''}
      </td>
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
      <img src="${teamLogo(d.teamId)}" class="team-logo">
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
   11-B) DUELO INTERNO — Cuotas de rivalidad entre compañeros
   ---------------------------------------------------------- */

/**
 * Calcula un "score" de fortaleza para un piloto dentro de su equipo.
 * Se usa para determinar quién es favorito en un duelo contra su compañero.
 *
 * Factores ponderados:
 *  - Cuota de campeonato (40%) → menor cuota = mejor piloto
 *  - Power ranking (25%) → mejor posición = mejor piloto
 *  - Puntos de temporada (15%) → más puntos = mejor rendimiento
 *  - Forma reciente (15%) → posición promedio reciente
 *  - Consistencia (5%) → menos DNFs = más confiable
 */
function calcRivalryScore(driver) {
  if (!driver) return 0;
  let score = 0;

  const odds = driver.odds;
  if (odds != null && odds > 0 && odds < 200) {
    const oddsScore = Math.max(0, Math.min(100, (Math.log(100 / odds) / Math.log(100)) * 100));
    score += oddsScore * 0.25;
  } else {
    score += 5 * 0.25;
  }

  const totalDrivers = DB.drivers.filter(d => d.teamId && d.status !== "libre").length || 28;
  const rank = driver.powerRank || totalDrivers;
  const rankScore = Math.max(0, 100 * Math.exp(-0.15 * (rank - 1)));
  score += rankScore * 0.20;

  const maxPoints = Math.max(...DB.drivers.map(d => d.season?.points || 0), 1);
  const ptsScore = (driver.season?.points || 0) / maxPoints;
  score += ptsScore * 25;

  const recent = Array.isArray(driver.recentPositions) ? driver.recentPositions.slice(-5) : [];
  if (recent.length > 0) {
    const avgPos = recent.reduce((a, b) => a + b, 0) / recent.length;
    const formScore = Math.max(0, Math.min(1, (15 - avgPos) / 14));
    score += formScore * 20;
  } else {
    score += 5;
  }

  const wins = driver.season?.wins || 0;
  const podiums = driver.season?.podiums || 0;
  const winScore = Math.min(wins * 15 + podiums * 5, 100);
  score += winScore * 0.05;

  const allDnfs = (driver.season?.dnf || 0) + (driver.career?.dnf || 0);
  const dnfPenalty = Math.min(allDnfs * 3, 30);
  score -= dnfPenalty;

  return Math.max(0, score);
}

/**
 * Calcula cuotas de rivalidad justas entre dos compañeros de equipo.
 * Devuelve { oddsA, oddsB, favorite } donde favorite = id del favorito.
 *
 * La cuota de cada piloto refleja la probabilidad de terminar
 * por delante de su compañero en una carrera cualquiera.
 */
function calcRivalryOdds(driverA, driverB, team) {
  /* --- PRE-TEMPORADA: usar cuotas fijas de data.js --- */
  if (team && typeof team.rivalryA === "number" && typeof team.rivalryB === "number") {
    let completedRaces = 0;
    if (DB.calendar) {
      DB.calendar.forEach(race => {
        if (race.results?.r1?.orderIds?.length > 0) completedRaces++;
        if (race.results?.r2?.orderIds?.length > 0) completedRaces++;
      });
    }
    if (completedRaces === 0) {
      const favorite = team.rivalryA <= team.rivalryB ? driverA.id : driverB.id;
      return { oddsA: team.rivalryA, oddsB: team.rivalryB, favorite };
    }
  }

  const scoreA = calcRivalryScore(driverA);
  const scoreB = calcRivalryScore(driverB);
  const total = scoreA + scoreB;

  if (total === 0) return { oddsA: 2.00, oddsB: 2.00, favorite: null };

  const probA = scoreA / total;
  const probB = scoreB / total;

  /* House edge del 4% — realista para apuestas deportivas */
  const margin = 0.96;

  let oddsA = Math.round((1 / probA) * margin * 100) / 100;
  let oddsB = Math.round((1 / probB) * margin * 100) / 100;

  /* AMPLIFICADOR MODERADO — separa más cuando hay claro favorito */
  const diff = Math.abs(probA - probB);
  if (diff > 0.10) {
    const amplify = 1 + diff * 0.25;
    if (probA > probB) {
      oddsA = Math.round((oddsA / amplify) * 100) / 100;
      oddsB = Math.round((oddsB * (1 + diff * 0.15)) * 100) / 100;
    } else {
      oddsB = Math.round((oddsB / amplify) * 100) / 100;
      oddsA = Math.round((oddsA * (1 + diff * 0.15)) * 100) / 100;
    }
  }

  oddsA = Math.max(1.05, Math.min(40, oddsA));
  oddsB = Math.max(1.05, Math.min(40, oddsB));

  const favorite = scoreA >= scoreB ? driverA.id : driverB.id;

  return { oddsA, oddsB, favorite };
}

/**
 * Genera el HTML de una tarjeta de rivalidad entre dos compañeros.
 */
function rivalryCardHTML(team, driverA, driverB) {
  const { oddsA, oddsB, favorite } = calcRivalryOdds(driverA, driverB, team);

  const isFavA = favorite === driverA.id;
  const isFavB = favorite === driverB.id;

  /* Clase "favorite" para el que tiene menor cuota */
  const classA = isFavA ? "rivalry-favorite" : "";
  const classB = isFavB ? "rivalry-favorite" : "";

  /* Color del equipo para el borde/acentos */
  const tc = team.color || "#e10600";

  /* Calcular porcentaje de barras */
  const total = oddsA + oddsB;
  const pctA = Math.round((1 / oddsA) / ((1 / oddsA) + (1 / oddsB)) * 100);
  const pctB = 100 - pctA;

  return `
    <div class="rivalry-card" style="--team-color:${tc}">
      <div class="rivalry-header">
        <img src="${team.logo}" alt="${team.name}" class="rivalry-team-logo">
        <span class="rivalry-team-name">${team.name}</span>
      </div>
      <div class="rivalry-body">
        <div class="rivalry-driver rivalry-left ${classA}">
          <div class="rivalry-flag">${driverA.flag || "🏁"}</div>
          <div class="rivalry-driver-info">
            <span class="rivalry-number" style="color:${tc}">#${driverA.number ?? "-"}</span>
            <span class="rivalry-name">${driverA.name}</span>
          </div>
          <div class="rivalry-odds-value">${oddsA.toFixed(2)}</div>
        </div>

        <div class="rivalry-vs">
          <div class="rivalry-vs-circle" style="border-color:${tc}">
            <span>VS</span>
          </div>
          <div class="rivalry-bar">
            <div class="rivalry-bar-a" style="width:${pctA}%;background:${tc}"></div>
            <div class="rivalry-bar-b" style="width:${pctB}%;background:${tc};opacity:0.4"></div>
          </div>
          <div class="rivalry-bar-labels">
            <span>${pctA}%</span>
            <span>${pctB}%</span>
          </div>
        </div>

        <div class="rivalry-driver rivalry-right ${classB}">
          <div class="rivalry-flag">${driverB.flag || "🏁"}</div>
          <div class="rivalry-driver-info">
            <span class="rivalry-number" style="color:${tc}">#${driverB.number ?? "-"}</span>
            <span class="rivalry-name">${driverB.name}</span>
          </div>
          <div class="rivalry-odds-value">${oddsB.toFixed(2)}</div>
        </div>
      </div>
    </div>`;
}

/**
 * Renderiza todas las rivalidades (un duelo por cada equipo con 2 pilotos).
 */
function renderRivalries() {
  const wrap = document.getElementById("rivalry-list");
  if (!wrap) return;

  const html = DB.teams.map(team => {
    const drivers = DB.drivers.filter(d => d.teamId === team.id && d.status === "confirmado");

    if (drivers.length < 2) return "";

    /* Si hay más de 2 pilotos confirmados en un equipo,
       tomamos los 2 mejores según power ranking */
    const sorted = [...drivers].sort((a, b) => (a.powerRank || 99) - (b.powerRank || 99));
    const driverA = sorted[0];
    const driverB = sorted[1];

    return rivalryCardHTML(team, driverA, driverB);
  }).join("");

  wrap.innerHTML = html || `<p class="empty">No hay equipos con dos pilotos confirmados para generar duelos.</p>`;
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
      <img src="${teamLogo(d.teamId)}" class="team-logo">
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
    if (r.results?.r1 && r.results?.r2) s = "finalizado";
    else if (r.results?.r1 || r.results?.r2) s = "proximo";
    else s = raceStatus(r.r2);

    return `
      <div class="card calendar-card fade-up status-${s}">
        <div class="cal-round">R${r.round}</div>
        <div class="cal-flag">${r.flag}</div>
        <div class="cal-info">
          <h3>${r.circuit}</h3>
          <p>Clasificación + Carrera sábado: ${fmtDateShort(r.r1)}</p>
          <p>Clasificación + Carrera domingo: ${fmtDateShort(r.r2)}</p>
        </div>
        <span class="badge badge-${s}">${statusLabel(s)}</span>
      </div>`;
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
          ${h.bestRookie ? `<p>🌟 Mejor rookie: <strong>${h.bestRookie}</strong></p>` : ''}
        </div>`).join("")
      : `<p class="empty">Todavía no hay temporadas finalizadas.</p>`;
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
   16) BUSCADORES
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
  recalcTeams();
  recalcOdds();
  recalcConstructorOdds();
  recalcPower();
  if (page === "home") renderHome();
  if (page === "news") renderNews();
  if (page === "market") { renderMarket(); initSearch("market-search", ".driver-card", "#market-groups"); }
  if (page === "drivers") renderDriversStandings();
  if (page === "constructors") renderConstructorsStandings();
  if (page === "odds") renderOdds();
  if (page === "duel") renderRivalries();
  if (page === "power") renderPowerRanking();
  if (page === "calendar") renderCalendar();
  if (page === "stats") renderStats();
  if (page === "driver") renderDriverProfile();
  if (page === "admin" && isAdminLogged()) renderAdminAll();
  animateCounters();
}

document.addEventListener("DOMContentLoaded", async () => {
  showLoader();
  DB = await loadDB();
  hideLoader();
  initChrome();
  const page = document.body.dataset.page;
  if (page === "admin") {
    initAdmin();
    animateCounters();
  } else {
    renderCurrentPage();
  }
  subscribeDB();
});

/* ----------------------------------------------------------
   INSTALACIÓN PWA
   ---------------------------------------------------------- */
let deferredPrompt;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = "block";
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = "none";
  });
}

window.addEventListener("appinstalled", () => {
  if (installBtn) installBtn.style.display = "none";
});
