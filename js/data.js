/* ============================================================
   F1 INTERNATIONAL CHAMPIONSHIP — data.js
   ------------------------------------------------------------
   Aquí vive TODA la información base del sitio: equipos,
   pilotos, calendario y noticias. Está pensado para que sea
   fácil de editar a mano si no querés usar el panel de admin.

   Cómo funciona la persistencia:
   - Estos DEFAULT_* son el "seed" (datos de fábrica).
   - La PRIMERA vez que alguien entra al sitio (con la base de
     datos de Firestore todavía vacía), app.js copia estos datos
     dentro del documento compartido "f1champ/estado".
   - A partir de ahí, TODO se lee y se escribe desde Firestore
     (incluyendo lo que hace el admin), así los cambios se ven
     para CUALQUIERA que entre al sitio, no solo en tu navegador.
   - Ver js/firebase-config.js para conectar tu propio proyecto
     gratuito de Firebase (necesario para que esto funcione).
   ============================================================ */

const SEASON_LABEL = "Temporada 26/27";

/* ---------------------- EQUIPOS (14) ---------------------- */
/* points/wins/poles/podiums = temporada actual (arranca en 0,
   la temporada todavía no empezó: primera carrera 12/09). */
const DEFAULT_TEAMS = [
  { id: "redbull",    name: "Red Bull",      color: "#061D42", logo: "assets/team/redbull.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 2.7 },
  { id: "ferrari",    name: "Ferrari",       color: "#DC0000", logo: "assets/team/ferrari.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 3.5 },
  { id: "williams",   name: "Williams",      color: "#00A0DE", logo: "assets/team/williams.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 4.1 },
  { id: "mercedes",   name: "Mercedes",      color: "#00D2BE", logo: "assets/team/mercedes.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 3.0 },
  { id: "mclaren",    name: "McLaren",       color: "#FF8000", logo: "assets/team/mclaren.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 25 },
  { id: "audifxr",    name: "Audi FXR",      color: "#BB0A30", logo: "assets/team/audi.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 10 },
  { id: "porsche",    name: "Porsche",       color: "#D5001C", logo: "assets/team/porsche.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 14 },
  { id: "racingbulls", name: "Racing Bulls",    color: "#6C98FF", logo: "assets/team/racingbulls.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 36 },
  { id: "lamborghini",    name: "Lamborghini",      color: "#D8A016", logo: "assets/team/lamborghini.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 21 },
  { id: "astonmartin",name: "Aston Martin",  color: "#006F62", logo: "assets/team/astonmartin.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 13 },
  { id: "alpine",     name: "Alpine",        color: "#0090FF", logo: "assets/team/alpine.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 17 },
  { id: "lotus", name: "Lotus Renault Racing", color: "#C6F300", logo: "assets/team/lotus.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 23 },
  { id: "bmw",     name: "BMW",        color: "#2B115A", logo: "assets/team/bmw.png.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 37 },
  { id: "alphatauri", name: "Alpha Tauri", color: "#1634CB", logo: "assets/team/alphatauri.png.png", points: 0, wins: 0, poles: 0, podiums: 0, odds: 32 },
];

/* ---------------------- PILOTOS (28) ----------------------
   status: "confirmado" | "rumor" | "libre"
   teamId: null si no tiene equipo
   career = estadísticas de temporadas anteriores (histórico)
   season = estadísticas de la temporada actual (26/27), arranca en 0
   oddsHistory = para el gráfico de evolución de cuotas
------------------------------------------------------------- */
const DEFAULT_DRIVERS = [
  {
    id: "alexander", name: "Alexander", number: 1, country: "Argentina", flag: "🇦🇷",
    teamId: "williams", status: "confirmado", rumorTeams: [],
    age: 20, seasons: 1, bestResult: "1° (Campeón vigente)",
    bio: "Campeón vigente del torneo. Pasó de Red Bull, el mejor auto del grid, a Williams en busca de un nuevo desafío que podría cambiar su rendimiento en esta temporada.",
    career: { wins: 15, podiums: 22, poles: 3, fastLaps: 5, dnf: 0, points: 512 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 3.50, oddsPrev: 3.80, probability: 28, oddsHistory: [3.80, 3.65, 3.55, 3.50],
    powerRank: 1, powerRankPrev: 1,
  },
  {
    id: "coffin", name: "Coffin", number: 99, country: "Venezuela", flag: "🇻🇪",
    teamId: "mercedes", status: "confirmado", rumorTeams: [],
    age: 35, seasons: 1, bestResult: "1°",
    bio: "Cerró la temporada anterior a un gran nivel con Audi FXR: ganando una carreraen en austin, segundo en casi todas las últimas carreras y 5 poles consecutivas. Ahora firma con Mercedes.",
    career: { wins: 1, podiums: 8, poles: 9, fastLaps: 4, dnf: 2, points: 378 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 2.60, oddsPrev: 2.90, probability: 34, oddsHistory: [3.10, 2.95, 2.75, 2.60],
    powerRank: 2, powerRankPrev: 3,
  },
  {
    id: "carreon", name: "Manuel Carreon", number: 21, country: "México", flag: "🇲🇽",
    teamId: "redbull", status: "confirmado", rumorTeams: [],
    age: 44, seasons: 1, bestResult: "1°",
    bio: "Ganó dos carrera durante la temporada passada, Ahora da el salto al mejor auto de la grid: Red Bull.",
    career: { wins: 2, podiums: 12, poles: 3, fastLaps: 2, dnf: 4, points: 210 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 3.90, oddsPrev: 4.10, probability: 19, oddsHistory: [4.50, 4.10, 4.00, 3.90],
    powerRank: 3, powerRankPrev: 5,
  },
  {
    id: "moran", name: "Gabriel Moran", number: 58, country: "Paraguay", flag: "🇵🇾",
    teamId: "ferrari", status: "confirmado", rumorTeams: [],
    age: 20, seasons: 1, bestResult: "2°",
    bio: "Excelente temporada con varios podios y un gran cierre de año con Audi FXR. Firma con Ferrari para pelear el título.",
    career: { wins: 0, podiums: 9, poles: 0, fastLaps: 3, dnf: 2, points: 265 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 4.60, oddsPrev: 4.80, probability: 14, oddsHistory: [4.90, 4.80, 4.75, 4.60],
    powerRank: 4, powerRankPrev: 4,
  },
  {
    id: "acosta", name: "Hernán Acosta", number: 40, country: "Argentina", flag: "🇦🇷",
    teamId: "redbull", status: "confirmado", rumorTeams: [],
    age: 28, seasons: 5, bestResult: "4°",
    bio: "Grandes actuaciones al mando de un Alpine que solo daba para P4 o P5. Ahora estrena asiento en Red Bull.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 1, dnf: 3, points: 150 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 8.50, oddsPrev: 9.00, probability: 9, oddsHistory: [9.00, 8.90, 8.70, 8.50],
    powerRank: 5, powerRankPrev: 7,
  },
  {
    id: "mauricio", name: "Mauricio", number: 75, country: "México", flag: "🇲🇽",
    teamId: "ferrari", status: "confirmado", rumorTeams: [],
    age: 15, seasons: 1, bestResult: "4°",
    bio: "Hizo una impresionante temporadara. Da el salto a Ferrari para la 26/27.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 5, points: 95 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 12, oddsPrev: 13, probability: 4, oddsHistory: [14, 13.5, 12.8, 12],
    powerRank: 6, powerRankPrev: 6,
  },
  {
    id: "vidal", name: "Santiago Vidal", number: 25, country: "Bolivia", flag: "🇧🇴",
    teamId: "lotus", status: "confirmado", rumorTeams: [],
    age: 24, seasons: 1, bestResult: "6°",
    bio: "piloto confirmado para Lotus Renault Racing en la Temporada 26/27.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 1, dnf: 3, points: 88 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 19, oddsPrev: 19, probability: 3, oddsHistory: [19, 19, 19, 19],
    powerRank: 7, powerRankPrev: 8,
  },
  {
    id: "pichardo", name: "Pichardo", number: 22, country: "México", flag: "🇲🇽",
    teamId: "williams", status: "confirmado", rumorTeams: [],
    age: 24, seasons: 3, bestResult: "5°",
    bio: "nuevo piloto de Williams para la temporada 2.",
    career: { wins: 0, podiums: 0, poles: 3, fastLaps: 0, dnf: 4, points: 70 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 23, oddsPrev: 23, probability: 2, oddsHistory: [23, 23, 23, 23],
    powerRank: 8, powerRankPrev: 9,
  },
  {
    id: "osorio", name: "Osmany Osorio", number: 67, country: "Cuba", flag: "🇨🇺",
    teamId: "mercedes", status: "confirmado", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "3°",
    bio: "nuevo piloto de mercedes para la temporada 26/27.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 5, points: 140 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 26, oddsPrev: 26, probability: 2, oddsHistory: [26, 26, 26, 26],
    powerRank: 9, powerRankPrev: 10,
  },
  {
    id: "flores", name: "Eduardo Flores", number: 15, country: "México", flag: "🇲🇽",
    teamId: "lamborghini", status: "confirmado", rumorTeams: [],
    age: 22, seasons: 1, bestResult: "9°",
    bio: "nuevo piloto de Lamborghini para la Temporada 26/27.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 4, points: 48 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 29, oddsPrev: 29, probability: 1, oddsHistory: [29, 29, 29, 29],
    powerRank: 10, powerRankPrev: 11,
  },
  {
    id: "maximo", name: "Máximo", number: 33, country: "Mexico", flag: "🇲🇽",
    teamId: "alpine", status: "confirmado", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "7°",
    bio: "Piloto confirmado para la temporada 2.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 3, points: 40 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 31, oddsPrev: 31, probability: 1, oddsHistory: [31, 31, 31, 31],
    powerRank: 11, powerRankPrev: 12,
  },
  {
    id: "caceres", name: "Santino Cáceres", number: 12, country: "Argentina", flag: "🇦🇷",
    teamId: "porsche", status: "confirmado", rumorTeams: [],
    age: 23, seasons: 2, bestResult: "11°",
    bio: "Confirmado en Porsche para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 4, points: 35 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 34, oddsPrev: 34, probability: 1, oddsHistory: [34, 34, 34, 34],
    powerRank: 12, powerRankPrev: 13,
  },
  {
    id: "jeanfranco", name: "Jeanfranco", number: 96, country: "Venezuela", flag: "🇻🇪",
    teamId: "astonmartin", status: "confirmado", rumorTeams: [],
    age: 24, seasons: 2, bestResult: "12°",
    bio: "Confirmado en Aston Martin para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 5, points: 28 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 41, oddsPrev: 41, probability: 1, oddsHistory: [41, 41, 41, 41],
    powerRank: 13, powerRankPrev: 14,
  },
  {
    id: "raneri", name: "Nehemias Raneri", number: 10, country: "Argentina", flag: "🇦🇷",
    teamId: "alpine", status: "confirmado", rumorTeams: [],
    age: 21, seasons: 1, bestResult: "13°",
    bio: "Confirmado en Alpine para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 4, points: 22 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 51, oddsPrev: 51, probability: 0.8, oddsHistory: [51, 51, 51, 51],
    powerRank: 14, powerRankPrev: 15,
  },
  {
    id: "camilo", name: "Camilo", number: 43, country: "Argentina", flag: "🇦🇷",
    teamId: "lotus", status: "confirmado", rumorTeams: [],
    age: 14, seasons: 1, bestResult: "14°",
    bio: "confirmado para Lotus Renault Racing en temporada 2.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 5, points: 15 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 67, oddsPrev: 67, probability: 0.5, oddsHistory: [67, 67, 67, 67],
    powerRank: 15, powerRankPrev: 16,
  },
  {
    id: "dave", name: "Dave", number: 56, country: "Chile", flag: "🇨🇱",
    teamId: "racingbulls", status: "confirmado", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "15°",
    bio: "Piloto confirmado para Racing Bulls en la Temporada 26/27.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 10 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 81, oddsPrev: 81, probability: 0.4, oddsHistory: [81, 81, 81, 81],
    powerRank: 16, powerRankPrev: 17,
  },
  {
    id: "chichar", name: "Chichar", number: 30, country: "Perú", flag: "🇵🇪",
    teamId: "mclaren", status: "confirmado", rumorTeams: [],
    age: 14, seasons: 1, bestResult: "16°",
    bio: "Confirmado en McLaren para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 5 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 101, oddsPrev: 101, probability: 0.3, oddsHistory: [101, 101, 101, 101],
    powerRank: 17, powerRankPrev: 18,
  },
  {
    id: "tapara", name: "Tapara", number: 47, country: "Peru", flag: "🇵🇪",
    teamId: "mclaren", status: "confirmado", rumorTeams: [],
    age: 14, seasons: 1, bestResult: "12°",
    bio: "Piloto confirmado para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 5 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 105, oddsPrev: 105, probability: 0.3, oddsHistory: [105, 105, 105, 105],
    powerRank: 18, powerRankPrev: 19,
  },
  {
    id: "luca", name: "Luca", number: 46, country: "Argentina", flag: "🇦🇷",
    teamId: "racingbulls", status: "confirmado", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "12°",
    bio: "Piloto confirmado en Racing Bulls para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 5 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 107, oddsPrev: 107, probability: 0.2, oddsHistory: [107, 107, 107, 107],
    powerRank: 19, powerRankPrev: 20,
  },
    {
    id: "hernandez", name: "Juanjo Hernandez", number: 20, country: "Colombia", flag: "🇨🇴",
    teamId: null, status: "libre", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "12°",
    bio: "Piloto para confrimar la temporada siguiente.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 5 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 55, oddsPrev: 55, probability: 0.9, oddsHistory: [55, 55, 55, 55],
    powerRank: 20, powerRankPrev: 21,
  },
    {
    id: "catnap", name: "N:Catnap", number: 6, country: "Argentina", flag: "🇦🇷",
    teamId: "porsche", status: "confirmado", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "12°",
    bio: "Piloto confirmado para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 5 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 102, oddsPrev: 102, probability: 0.3, oddsHistory: [102, 102, 102, 102],
    powerRank: 21, powerRankPrev: 22,
  },
    {
    id: "yzaac", name: "Yzaac", number: 13, country: "Mexico", flag: "🇲🇽",
    teamId: "bmw", status: "confirmado", rumorTeams: [],
    age: 25, seasons: 1, bestResult: "null",
    bio: "Piloto confirmado para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 110, oddsPrev: 110, probability: 0.2, oddsHistory: [110, 110, 110, 110],
    powerRank: 22, powerRankPrev: 23,
  },
    {
    id: "ianfalla", name: "Ian Falla", number: 45, country: "Colombia", flag: "🇨🇴",
    teamId: "astonmartin", status: "confirmado", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "7°",
    bio: "Piloto confirmado para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 5 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 63, oddsPrev: 63, probability: 0.6, oddsHistory: [63, 63, 63, 63],
    powerRank: 23, powerRankPrev: 24,
  },
    {
    id: "ventura", name: "Alexander ventura", number: 33, country: "Bolivia", flag: "🇧🇴",
    teamId: "bmw", status: "confirmado", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "12°",
    bio: "Piloto confirmado para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 5 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 102, oddsPrev: 102, probability: 0.3, oddsHistory: [102, 102, 102, 102],
    powerRank: 24, powerRankPrev: 25,
  },
    {
    id: "santiago", name: "Santiago Leclerc", number: 16, country: "Colombia", flag: "🇨🇴",
    teamId: "alphatauri", status: "confirmado", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "12°",
    bio: "Piloto confirmado para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 5 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 102, oddsPrev: 102, probability: 0.3, oddsHistory: [102, 102, 102, 102],
    powerRank: 25, powerRankPrev: 26,
  },
    {
    id: "hitan", name: "Hitan", number: 39, country: "Mexico", flag: "🇲🇽",
    teamId: "alphatauri", status: "confirmado", rumorTeams: [],
    age: 16, seasons: 1, bestResult: "12°",
    bio: "Piloto confirmado para esta temporada.",
    career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 6, points: 5 },
    season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 },
    odds: 102, oddsPrev: 102, probability: 0.3, oddsHistory: [102, 102, 102, 102],
    powerRank: 25, powerRankPrev: 26,
  },
  /* 5 asientos libres reservados para futuras incorporaciones */
  { id: "libre1", name: "Piloto libre 1", number: 2, country: "Por confirmar", flag: "🏳️", teamId: null, status: "libre", rumorTeams: [], age: null, seasons: 0, bestResult: "—", bio: "Asiento disponible. Piloto a confirmar próximamente.", career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 }, season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 }, odds: null, oddsPrev: null, probability: null, oddsHistory: [], powerRank: 18, powerRankPrev: 18 },
  { id: "libre2", name: "Piloto libre 2", number: 3, country: "Por confirmar", flag: "🏳️", teamId: null, status: "libre", rumorTeams: [], age: null, seasons: 0, bestResult: "—", bio: "Asiento disponible. Piloto a confirmar próximamente.", career: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 }, season: { wins: 0, podiums: 0, poles: 0, fastLaps: 0, dnf: 0, points: 0 }, odds: null, oddsPrev: null, probability: null, oddsHistory: [], powerRank: 19, powerRankPrev: 19 },
];

/* ---------------------- CALENDARIO (24 fechas) ----------------------
   status se recalcula solo en app.js comparando con la fecha de hoy,
   pero dejamos un valor por defecto acá también.
   Formato de fecha: "YYYY-MM-DD" (el campeonato arranca en 2026 y
   cruza a 2027 en enero-febrero). */
const DEFAULT_CALENDAR = [
  { round: 1,  circuit: "Bahréin",        flag: "🇧🇭", r1: "2026-09-12", r2: "2026-09-13" },
  { round: 2,  circuit: "Qatar",          flag: "🇶🇦", r1: "2026-09-19", r2: "2026-09-20" },
  { round: 3,  circuit: "China",          flag: "🇨🇳", r1: "2026-09-26", r2: "2026-09-27" },
  { round: 4,  circuit: "Malasia",        flag: "🇲🇾", r1: "2026-10-03", r2: "2026-10-04" },
  { round: 5,  circuit: "Australia",      flag: "🇦🇺", r1: "2026-10-10", r2: "2026-10-11" },
  { round: 6,  circuit: "Mount Panorama", flag: "🇦🇺", r1: "2026-10-17", r2: "2026-10-18" },
  { round: 7,  circuit: "Canadá",         flag: "🇨🇦", r1: "2026-10-24", r2: "2026-10-25" },
  { round: 8,  circuit: "Miami",          flag: "🇺🇸", r1: "2026-10-31", r2: "2026-11-01" },
  { round: 9,  circuit: "South Carolina", flag: "🇺🇸", r1: "2026-11-07", r2: "2026-11-08" },
  { round: 10, circuit: "Barcelona",      flag: "🇪🇸", r1: "2026-11-14", r2: "2026-11-15" },
  { round: 11, circuit: "Mónaco",         flag: "🇲🇨", r1: "2026-11-21", r2: "2026-11-22" },
  { round: 12, circuit: "Austria",        flag: "🇦🇹", r1: "2026-11-28", r2: "2026-11-29" },
  { round: 13, circuit: "Hungría",        flag: "🇭🇺", r1: "2026-12-05", r2: "2026-12-06" },
  { round: 14, circuit: "Bélgica",        flag: "🇧🇪", r1: "2026-12-12", r2: "2026-12-13" },
  { round: 15, circuit: "Reino Unido",    flag: "🇬🇧", r1: "2026-12-19", r2: "2026-12-20" },
  { round: 16, circuit: "Georgia",        flag: "🇬🇪", r1: "2026-12-26", r2: "2026-12-27" },
  { round: 17, circuit: "Italia",         flag: "🇮🇹", r1: "2027-01-02", r2: "2027-01-03" },
  { round: 18, circuit: "Singapur",       flag: "🇸🇬", r1: "2027-01-09", r2: "2027-01-10" },
  { round: 19, circuit: "EE.UU.",         flag: "🇺🇸", r1: "2027-01-16", r2: "2027-01-17" },
  { round: 20, circuit: "México",         flag: "🇲🇽", r1: "2027-01-23", r2: "2027-01-24" },
  { round: 21, circuit: "Las Vegas",      flag: "🇺🇸", r1: "2027-01-30", r2: "2027-01-31" },
  { round: 22, circuit: "Brasil",         flag: "🇧🇷", r1: "2027-02-06", r2: "2027-02-07" },
  { round: 23, circuit: "Arabia Saudita", flag: "🇸🇦", r1: "2027-02-13", r2: "2027-02-14" },
  { round: 24, circuit: "Abu Dabi",       flag: "🇦🇪", r1: "2027-02-20", r2: "2027-02-21" },
].map(r => ({ ...r, results: { r1: null, r2: null } })); // results se completan desde el panel de admin

/* ---------------------- NOTICIAS ---------------------- */
const DEFAULT_NEWS = [
  {
    id: 1, title: "Coffin firma con Mercedes",
    date: "2026-08-01", category: "Fichajes",
    image: "https://images.unsplash.com/photo-1541348263662-e068662d82af?q=80&w=1200&auto=format&fit=crop",
    text: "Mercedes anunció oficialmente la contratación de Coffin, quien llega tras un cierre de temporada sobresaliente con Audi FXR: segundo lugar en casi todas las últimas fechas y cinco poles consecutivas. El venezolano competirá con el número 99 y llega con el objetivo de pelear el campeonato desde el primer fin de semana.",
  },
  {
    id: 3, title: "Carreon firma con Red Bull",
    date: "2026-07-25", category: "Fichajes",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=1200&auto=format&fit=crop",
    text: "Manuel Carreon, ganador de una carrera la temporada pasada con McLaren, ocupará el asiento que deja Pujalski en Red Bull. Pese a un cierre de año irregular, el mexicano convenció al equipo con destellos de gran nivel.",
  },
  {
    id: 4, title: "Gabriel Moran, nuevo piloto de Ferrari",
    date: "2026-07-20", category: "Fichajes",
    image: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=1200&auto=format&fit=crop",
    text: "Ferrari confirmó a Gabriel Moran como su nuevo piloto tras una gran temporada con Audi FXR, cerrada con varios podios. El paraguayo competirá con el número 58 y buscará pelear el título desde Maranello.",
  },
];

/* Sistema de puntos por carrera (igual para R1 y R2, top 10) */
const POINTS_SYSTEM = [30, 27, 24, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
