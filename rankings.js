/* ===== The Viltrum Syndicate - live clan rankings =====
   EDIT THE CONFIG BELOW:
   - members: every clan member's in-game username (add one line per member)
   - categories: `kind` is the ranking table number from the game API. */
const CATEGORY_KINDS = [
  { label: 'Solo', kind: '200' },
  { label: 'Solo Slow', kind: '300' },
  { label: 'Team', kind: '210' },
  { label: 'Team Slow', kind: '310' },
  { label: 'Duel', kind: '220' },
  { label: 'Duel Slow', kind: '320' },
  { label: 'Gang', kind: '250' },
  { label: 'Gang Slow', kind: '350' }
];

const CONFIG = {
  api: 'https://api.demiseofnations.com',
  maxDisplayedRankings: 10,
  clanName: 'TheSyndicate',
  clanId: null,            // optional: set the clan's account id if looking it up by name fails
  clanSearchLimit: 500,    // how deep into each clan ladder to look for our clan
  members: [
    // Owners
    { name: 'GGamer704' },
    { name: 'SirZayn' },
    { name: 'Daltonvee' },
    { name: 'SPitF1RE' },
    // Clan members
    { name: 'Machiavelli' },
    { name: 'ShaneCyrus' },
    { name: 'Ri43Y' },
    { name: 'ThejackAss' },
    { name: 'MrGabiru7' },
    { name: 'Blyatbosk' },
    { name: 'Kashu' },
    { name: 'AceSmoker' },
    { name: 'Shobi' },
    { name: 'ANSAR' },
    { name: 'D1mastiy' },
    { name: 'jhonz09' },
    { name: 'Christoph85360' },
    { name: 'POOYAN1212' },
    { name: 'hossein69646' },
    { name: 'the18' },
    { name: 'Nidhi' },
    { name: 'Ercilios' },
    { name: 'jagdish' },
    { name: 'sochen' },
    { name: 'gt0007' },
    { name: 'KAJ21' },
    { name: 'Bbmatin' },
    { name: 'Pacifist' },
    { name: 'Pierre' },
    { name: 'ArtyAardavark' },
    { name: 'Scipione' },
    { name: 'LIPILI' },
    { name: 'Christopher24858' },
    { name: 'KOMOREBI' },
    { name: 'AdmiralButtNaked' },
    { name: 'NightArgos' }
  ],
  categories: CATEGORY_KINDS.map((category) => ({ ...category, type: 'U' }))
};

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const getJSON = (path) => fetch(CONFIG.api + path).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
const asList = (j) => Array.isArray(j) ? j : (j && (j.list || j.items || j.data || j.arr || j.rows || j.value)) || (j && typeof j === 'object' ? Object.values(j).filter((v) => v && typeof v === 'object') : []);
const ratingOf = (o) => {
  const score = Number(o.rate && o.rate.score);
  if (Number.isFinite(score)) return score;
  for (const k of ['rating', 'score', 'value', 'elo', 'points']) {
    const n = parseFloat(o[k]);
    if (!isNaN(n)) return n;
  }
  return null;
};
const nameOf = (o, fb) => o.name || o.user || o.username || o.nick || fb;
const fmt = (n) => n.toFixed(3);

async function resolveIds() {
  const out = await Promise.allSettled(CONFIG.members.map(async (m) => {
    if (m.id) return { ...m };
    const j = await getJSON('/api/user-db/io-user/rw/get-user?name=' + encodeURIComponent(m.name));
    const id = (j && typeof j === 'object') ? (j.id ?? j.user ?? j.uid) : j;
    if (id == null) throw new Error('no id');
    return { ...m, id: String(id) };
  }));
  return {
    members: out.filter((r) => r.status === 'fulfilled').map((r) => r.value),
    unresolved: out.flatMap((r, i) => r.status === 'rejected' ? [CONFIG.members[i].name] : [])
  };
}

async function loadCategory(cat, members) {
  if (cat.kind == null) return { cat, rows: [], pending: true };
  let entries = [];
  try {
    entries = asList(await getJSON('/api/rank-db/io-rank/ro-ranking/arr/' + members.map((m) => cat.kind + ':' + m.id).join(',')));
  } catch (e) {
    const each = await Promise.allSettled(members.map((m) => getJSON('/api/rank-db/io-rank/ro-ranking/obj/' + cat.kind + ':' + m.id)));
    entries = each.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
  }
  const rows = [];
  entries.forEach((e, i) => {
    const uid = String(e.id || '').includes(':') ? String(e.id).split(':')[1] : String(e.user ?? e.uid ?? (members.length === entries.length ? members[i].id : ''));
    const m = members.find((x) => x.id === uid), r = ratingOf(e);
    if (m && r !== null) rows.push({ m, r, games: Number(e.rate && e.rate.compe), updated: Number(e.rate && e.rate.alter) });
  });
  rows.sort((a, b) => b.r - a.r);
  return { cat, rows };
}

let clanIdPromise;
function resolveClanId() {
  if (CONFIG.clanId) return Promise.resolve(String(CONFIG.clanId));
  if (!clanIdPromise) {
    clanIdPromise = getJSON('/api/user-db/io-user/rw/get-user?name=' + encodeURIComponent(CONFIG.clanName))
      .then((j) => { const id = (j && typeof j === 'object') ? (j.id ?? j.user ?? j.uid) : j; return id == null ? null : String(id); })
      .catch(() => null);
  }
  return clanIdPromise;
}

async function fetchBatches(path, ids, formatId = (id) => id, batchSize = 10) {
  const batches = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    batches.push(getJSON(path + ids.slice(i, i + batchSize).map(formatId).join(',')));
  }
  return (await Promise.all(batches)).flatMap(asList);
}

// Finds our clan's position in one clan ladder (one row of the clan standings table).
async function loadClanStanding(cat, clanId) {
  try {
    const base = '/api/rank-db/io-rank/ro-echelon';
    const query = `?kind=${encodeURIComponent(cat.kind)}&type=C`;
    const total = Number((await getJSON(`${base}/get-size${query}`)).size);
    if (!Number.isInteger(total) || total < 0) throw new Error('Invalid clan standings size');

    const pageSize = 50, limit = Math.min(total, CONFIG.clanSearchLimit);
    const ourName = CONFIG.clanName.toLowerCase();
    let standing = null;
    for (let start = 0; start < limit && !standing; start += pageSize) {
      const page = asList(await getJSON(`${base}/get-list${query}&start=${start}&limit=${Math.min(pageSize, limit - start)}`));
      if (clanId) {
        standing = page.find((row) => String(row.user) === clanId) || null;
      } else {
        const accounts = await fetchBatches('/api/user-db/io-user/ro-account/arr/', page.map((row) => String(row.user)));
        const ours = accounts.find((a) => String(a.nameDisplay || a.name || '').toLowerCase() === ourName);
        standing = ours ? page.find((row) => String(row.user) === String(ours.user)) || null : null;
      }
    }
    if (!standing) return { cat, total, limit, position: null };

    const [ranking] = await fetchBatches('/api/rank-db/io-rank/ro-ranking/arr/', [String(standing.user)], (id) => `${cat.kind}:${id}`);
    return {
      cat, total,
      position: Number(standing.rank),
      rating: ratingOf(ranking || {}),
      games: Number(ranking && ranking.rate && ranking.rate.compe),
      updated: Number(ranking && ranking.rate && ranking.rate.alter)
    };
  } catch (e) {
    console.error(`Failed to load clan standing for ${cat.label}.`, e);
    return { cat, error: true };
  }
}

async function loadClanStandings() {
  const clanId = await resolveClanId();
  return Promise.all(CATEGORY_KINDS.map((cat) => loadClanStanding({ ...cat, type: 'C' }, clanId)));
}

const avatar = (m) => `<img class="rank-avatar" src="${CONFIG.api}/api/user-db/io-user/ro-profile/pic/${esc(m.id)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
const medal = (i) => `<span class="rank-pos pos-${i < 3 ? i + 1 : 'n'}">${i + 1}</span>`;
const formatUpdated = (value) => Number.isFinite(value) && value > 0
  ? new Date(value).toLocaleString()
  : '—';

function renderPlayers(results, unresolved) {
  const tabs = $('#rank-tabs');
  const show = (idx) => {
    [...tabs.children].forEach((b, i) => b.setAttribute('aria-selected', i === idx));
    const { cat, rows, pending } = results[idx];
    const content = rows.length
      ? `
        <div class="rank-scroll"><table class="rank-table"><thead><tr><th>#</th><th>Player</th><th class="num-head">Rating</th><th class="num-head">Games</th><th>Rating Updated</th></tr></thead><tbody>
        ${rows.slice(0, CONFIG.maxDisplayedRankings).map((x, i) => {
          const games = Number.isFinite(x.games) ? x.games : '—';
          return `<tr><td>${medal(i)}</td><td><span class="rank-member">${avatar(x.m)}${esc(x.m.name)}</span></td><td class="num">${fmt(x.r)}</td><td class="num">${games}</td><td class="rank-date">${esc(formatUpdated(x.updated))}</td></tr>`;
        }).join('')}
        </tbody></table></div>`
      : `<p class="rank-status">${pending ? 'This category is not linked to the game API yet.' : 'No ratings found for this category.'}</p>`;
    const unresolvedNote = unresolved.length
      ? `<p class="rank-status">Could not resolve these usernames; check their spelling or try again later: ${unresolved.map(esc).join(', ')}</p>`
      : '';
    $('#rank-table').innerHTML = content + unresolvedNote;
  };
  tabs.innerHTML = results.map((r, i) => `<button role="tab" type="button" aria-selected="${i === 0}">${esc(r.cat.label)}</button>`).join('');
  [...tabs.children].forEach((b, i) => b.addEventListener('click', () => show(i)));
  show(0);
}

function renderClan(standings) {
  const rows = standings.map(({ cat, position, total, limit, rating, games, updated, error }) => {
    let pos;
    if (error) pos = '<span class="clan-unranked">Unavailable</span>';
    else if (position == null) pos = `<span class="clan-unranked">${total ? `Outside top ${limit}` : 'Unranked'}</span>`;
    else pos = `${medal(position - 1)}<span class="clan-of">of ${total}</span>`;
    const num = (v, f = (x) => x) => Number.isFinite(v) ? f(v) : '—';
    return `<tr><td class="clan-cat">${esc(cat.label)}</td><td><span class="clan-pos">${pos}</span></td><td class="num">${num(rating, fmt)}</td><td class="num">${num(games)}</td><td class="rank-date">${esc(formatUpdated(updated))}</td></tr>`;
  }).join('');
  $('#clan-table').innerHTML = `
    <div class="rank-scroll"><table class="rank-table clan-standings"><thead><tr><th>Category</th><th>Position</th><th class="num-head">Rating</th><th class="num-head">Games</th><th>Rating Updated</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

let resolvedRoster;

async function refreshRankings() {
  const button = $('#rank-refresh');
  const updated = $('#rank-updated');
  button.disabled = true;
  button.textContent = 'Refreshing…';
  updated.textContent = 'Refreshing rankings…';
  try {
    if (!resolvedRoster) resolvedRoster = resolveIds();
    const { members, unresolved } = await resolvedRoster;
    if (!members.length) throw new Error('No clan members could be resolved');
    const [serverTime, clanStandings, ...results] = await Promise.all([
      getJSON('/api/user-db/io-user/rw/run-sync'),
      loadClanStandings(),
      ...CONFIG.categories.map((category) => loadCategory(category, members))
    ]);
    renderPlayers(results, unresolved);
    renderClan(clanStandings);
    fillOwners(results, members);
    const timestamp = Number(serverTime.time);
    updated.textContent = Number.isFinite(timestamp) ? `Rankings updated ${new Date(timestamp).toLocaleString()}` : 'Rankings loaded; update time unavailable.';
  } catch (error) {
    console.error('Failed to refresh rankings.', error);
    updated.textContent = 'Rankings are unavailable right now.';
    $('#rank-table').innerHTML = '<p class="rank-status">Rankings are unavailable right now. Please try again later.</p>';
    $('#clan-table').innerHTML = '<p class="rank-status">Clan standings are unavailable right now.</p>';
  } finally {
    button.disabled = false;
    button.textContent = 'Refresh';
  }
}

function fillOwners(results, members) {
  document.querySelectorAll('.OwnerTile[data-user]').forEach((tile) => {
    tile.querySelector('[data-best]').textContent = '—';
    tile.querySelector('[data-queue]').textContent = '—';
    const member = members.find((x) => x.name.toLowerCase() === tile.dataset.user.toLowerCase());
    const image = tile.querySelector('[data-avatar]');
    if (member) {
      image.src = `${CONFIG.api}/api/user-db/io-user/ro-profile/pic/${encodeURIComponent(member.id)}`;
      image.hidden = false;
      image.onerror = () => { image.hidden = true; };
    }
    let best = null;
    results.forEach(({ cat, rows }) => rows.forEach((x) => {
      if (x.m.name.toLowerCase() === tile.dataset.user.toLowerCase() && (!best || x.r > best.r)) best = { r: x.r, label: cat.label };
    }));
    if (best) { tile.querySelector('[data-best]').textContent = fmt(best.r); tile.querySelector('[data-queue]').textContent = best.label; }
  });
}

(async function init() {
  $('#rank-refresh').addEventListener('click', refreshRankings);
  await refreshRankings();
})();
