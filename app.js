// Ma Liste de Films : recherche via TMDB, liste enregistrée dans le navigateur (localStorage).
const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/";
const LANG = "fr-FR";
const KEY_STORE = "tmdbKey";
const LIST_STORE = "filmList";
const FILTER_STORE = "filmFilter";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}

let apiKey = load(KEY_STORE, "");
let films = load(LIST_STORE, []);
let filter = load(FILTER_STORE, "todo");
let results = [];
let confirmId = null;

/* ---------- TMDB ---------- */
async function tmdb(path, params = {}) {
  if (!apiKey) throw { code: "nokey" };
  const url = new URL(API + path);
  url.searchParams.set("language", LANG);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers = { accept: "application/json" };
  // Un jeton de lecture v4 est un long JWT ; une clé v3 fait 32 caractères.
  if (apiKey.length > 40) headers.Authorization = "Bearer " + apiKey;
  else url.searchParams.set("api_key", apiKey);
  let res;
  try { res = await fetch(url, { headers }); } catch (e) { throw { code: "network" }; }
  if (res.status === 401) throw { code: "badkey" };
  if (res.status === 429) throw { code: "rate" };
  if (!res.ok) throw { code: "http", status: res.status };
  return res.json();
}

async function fetchDetails(id) {
  const d = await tmdb("/movie/" + id, { append_to_response: "credits,external_ids" });
  const directors = (d.credits?.crew || []).filter((c) => c.job === "Director").map((c) => c.name);
  return {
    id: d.id,
    title: d.title,
    originalTitle: d.original_title,
    year: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
    poster: d.poster_path || null,
    overview: d.overview || "",
    runtime: d.runtime || null,
    genres: (d.genres || []).map((g) => g.name).slice(0, 3),
    director: directors.slice(0, 2).join(", "),
    cast: (d.credits?.cast || []).slice(0, 4).map((c) => c.name),
    country: (d.production_countries || []).map((c) => c.name).slice(0, 2).join(", "),
    rating: d.vote_count > 20 ? Math.round(d.vote_average * 10) / 10 : null,
    imdbId: d.imdb_id || d.external_ids?.imdb_id || null,
  };
}

function errorText(e) {
  return {
    nokey: "Ajoute d'abord ta clé API TMDB dans les Réglages.",
    badkey: "TMDB refuse cette clé. Vérifie-la dans les Réglages.",
    rate: "Trop de requêtes d'un coup. Attends quelques secondes et réessaie.",
    network: "Impossible de joindre TMDB. Vérifie ta connexion.",
  }[e?.code] || "TMDB a renvoyé une erreur. Réessaie plus tard.";
}

/* ---------- affichage ---------- */
function posterTag(path, size, alt) {
  return path
    ? `<img class="poster" src="${IMG}${size}${esc(path)}" alt="Affiche de ${esc(alt)}" loading="lazy">`
    : `<div class="poster none" aria-hidden="true">sans affiche</div>`;
}

function renderTabs() {
  document.querySelectorAll(".tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === filter)));
}

function renderList() {
  const seen = films.filter((f) => f.watched), todo = films.filter((f) => !f.watched);
  $("#nTodo").textContent = todo.length;
  $("#nSeen").textContent = seen.length;
  let shown = filter === "seen" ? seen : filter === "todo" ? todo : [...todo, ...seen];
  shown = shown.slice().sort((a, b) =>
    a.watched !== b.watched ? (a.watched ? 1 : -1)
      : a.watched ? (b.watchedAt || 0) - (a.watchedAt || 0) : (b.addedAt || 0) - (a.addedAt || 0));
  const list = $("#list");
  if (!films.length) {
    list.innerHTML = `<div class="empty"><h2>Pas encore de films</h2><p>Cherche un film ci-dessus et clique sur <b>Ajouter</b>. Coche-le dès que tu l'as vu.</p></div>`;
    return;
  }
  if (!shown.length) {
    list.innerHTML = `<div class="empty"><p>${filter === "seen" ? "Tu n'as encore rien coché." : "Tout est vu. Il est temps de chercher de nouveaux films."}</p></div>`;
    return;
  }
  list.innerHTML = shown.map((f) => `
    <article class="film${f.watched ? " seen" : ""}" data-id="${f.id}">
      <div>${posterTag(f.poster, "w185", f.title)}</div>
      <div class="body">
        <div class="top">
          <div>
            <span class="title">${esc(f.title)}</span><span class="year">${esc(f.year || "")}</span>
            ${f.originalTitle && f.originalTitle !== f.title ? `<div class="hint">${esc(f.originalTitle)}</div>` : ""}
          </div>
          <button class="check" data-act="toggle" aria-pressed="${!!f.watched}">
            <span class="dot">${CHECK}</span>${f.watched ? "Vu" + (f.watchedAt ? " le " + new Date(f.watchedAt).toLocaleDateString(LANG, { day: "numeric", month: "short", year: "numeric" }) : "") : "Marquer comme vu"}
          </button>
        </div>
        <div class="facts">
          ${f.director ? `<span>Réalisation <b>${esc(f.director)}</b></span>` : ""}
          ${f.runtime ? `<span class="mono">${esc(f.runtime)} min</span>` : ""}
          ${f.country ? `<span>${esc(f.country)}</span>` : ""}
          ${f.rating ? `<span class="mono rating">★ ${esc(f.rating)}/10</span>` : ""}
        </div>
        ${f.genres?.length ? `<div class="chips">${f.genres.map((g) => `<span class="chip">${esc(g)}</span>`).join("")}</div>` : ""}
        ${f.overview ? `<p class="syn">${esc(f.overview)}</p>` : ""}
        ${f.cast?.length ? `<div class="facts"><span>Avec <b>${f.cast.map(esc).join(", ")}</b></span></div>` : ""}
        <div class="actions">
          <a href="https://www.themoviedb.org/movie/${f.id}" target="_blank" rel="noopener">TMDB</a>
          ${f.imdbId ? `<a href="https://www.imdb.com/title/${esc(f.imdbId)}/" target="_blank" rel="noopener">IMDb</a>` : ""}
          ${confirmId === f.id
            ? `<span>Supprimer ?</span><button class="link danger" data-act="del">Oui, supprimer</button><button class="link" data-act="nodel">Annuler</button>`
            : `<button class="link" data-act="askdel">Supprimer</button>`}
        </div>
      </div>
    </article>`).join("");
}

function renderResults() {
  $("#results").innerHTML = results.map((r, i) => {
    const on = films.some((f) => f.id === r.id);
    const year = r.release_date ? r.release_date.slice(0, 4) : "";
    return `<div class="result">
      ${posterTag(r.poster_path, "w92", r.title)}
      <div>
        <div class="t">${esc(r.title)} <span class="mono" style="color:var(--muted);font-weight:400">${esc(year)}</span></div>
        <div class="meta">${esc(r.overview || (r.original_title !== r.title ? r.original_title : ""))}</div>
      </div>
      ${on ? `<span class="onlist">Dans ta liste</span>` : `<button class="btn" data-i="${i}">Ajouter</button>`}
    </div>`;
  }).join("");
}

function persist() {
  if (!save(LIST_STORE, films)) {
    const s = $("#listStatus"); s.hidden = false; s.classList.add("err");
    s.textContent = "Ce navigateur bloque l'enregistrement. Ta liste sera perdue en fermant la page ; exporte-la dans les Réglages.";
  }
}

/* ---------- actions ---------- */
let searchCtl = 0;
async function search(q) {
  q = q.trim(); if (!q) return;
  const st = $("#searchStatus"); st.hidden = false; st.classList.remove("err");
  const run = ++searchCtl;
  $("#searchBtn").disabled = true;
  st.textContent = "Recherche…";
  try {
    const data = await tmdb("/search/movie", { query: q, include_adult: "false" });
    if (run !== searchCtl) return;
    results = (data.results || []).slice(0, 8);
    st.textContent = results.length
      ? `${data.total_results} ${data.total_results === 1 ? "film trouvé" : "films trouvés"} pour « ${q} »${data.total_results > results.length ? `, voici les ${results.length} premiers` : ""}.`
      : `Aucun film trouvé pour « ${q} ». Vérifie l'orthographe ou essaie le titre original.`;
    renderResults();
  } catch (e) {
    if (run !== searchCtl) return;
    st.classList.add("err"); st.textContent = errorText(e);
    if (e.code === "nokey" || e.code === "badkey") openSettings();
  } finally {
    if (run === searchCtl) $("#searchBtn").disabled = false;
  }
}

$("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); search($("#q").value); });

$("#results").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-i]"); if (!b) return;
  const r = results[Number(b.dataset.i)]; if (!r) return;
  b.disabled = true; b.textContent = "Ajout…";
  try {
    const film = await fetchDetails(r.id);
    if (!films.some((f) => f.id === film.id)) {
      films.push({ ...film, watched: false, watchedAt: null, addedAt: Date.now() });
      persist();
    }
    renderList(); renderResults();
  } catch (err) {
    b.disabled = false; b.textContent = "Ajouter";
    const st = $("#searchStatus"); st.hidden = false; st.classList.add("err"); st.textContent = errorText(err);
  }
});

$("#list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]"); if (!btn) return;
  const id = Number(btn.closest(".film").dataset.id);
  const f = films.find((x) => x.id === id); if (!f) return;
  const act = btn.dataset.act;
  if (act === "askdel") confirmId = id;
  else if (act === "nodel") confirmId = null;
  else if (act === "del") { confirmId = null; films = films.filter((x) => x.id !== id); persist(); renderResults(); }
  else if (act === "toggle") { f.watched = !f.watched; f.watchedAt = f.watched ? Date.now() : null; persist(); }
  renderList();
});

document.querySelector(".tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-f]"); if (!b) return;
  filter = b.dataset.f; save(FILTER_STORE, filter);
  renderTabs(); renderList();
});

/* ---------- réglages ---------- */
function openSettings() {
  $("#settings").hidden = false;
  $("#apiKey").value = apiKey;
  $("#apiKey").focus();
}
$("#openSettings").addEventListener("click", () => {
  if ($("#settings").hidden) openSettings(); else $("#settings").hidden = true;
});

$("#keyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const st = $("#keyStatus"); st.hidden = false; st.classList.remove("err");
  const previous = apiKey;
  apiKey = $("#apiKey").value.trim();
  if (!apiKey) { save(KEY_STORE, ""); st.textContent = "Clé supprimée."; return; }
  st.textContent = "Vérification de la clé…";
  try {
    await tmdb("/configuration");
    save(KEY_STORE, apiKey);
    st.textContent = "Clé enregistrée. Tu peux chercher des films.";
  } catch (err) {
    apiKey = previous;
    st.classList.add("err"); st.textContent = errorText(err);
  }
});

$("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ app: "ma-liste-de-films", version: 1, films }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ma-liste-de-films-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("#importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const st = $("#keyStatus"); st.hidden = false; st.classList.remove("err");
  try {
    const data = JSON.parse(await file.text());
    const incoming = (Array.isArray(data) ? data : data.films || []).filter((f) => f && Number.isInteger(f.id) && f.title);
    let added = 0;
    for (const f of incoming) {
      const i = films.findIndex((x) => x.id === f.id);
      if (i === -1) { films.push(f); added++; } else films[i] = { ...films[i], ...f };
    }
    persist(); renderList(); renderResults();
    st.textContent = `${incoming.length} films importés, dont ${added} nouveaux.`;
  } catch (err) {
    st.classList.add("err"); st.textContent = "Ce fichier n'est pas une liste valide.";
  }
  e.target.value = "";
});

/* ---------- démarrage ---------- */
renderTabs(); renderList();
if (!apiKey) openSettings();
