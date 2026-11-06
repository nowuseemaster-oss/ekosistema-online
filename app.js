// =====================================================================
//  Экосистема · страница игрока. Всё здесь только для чтения: данные
//  публикует Экосистема Мастера. Кубик и права Мастера остаются у него.
// =====================================================================
(function () {
  const SB_URL = 'https://tocddkovziqqvepkujsh.supabase.co';
  const SB_KEY = 'sb_publishable__ONEKRBKvn-NQYhoUj6OEg_fhfIxsFr';
  const app = document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const HEROES = ['p0', 'p1', 'p2'];
  const WH = [['Серый', '0', '#9aa0a6'], ['Бирюзовый', 'I', '#3fc7c0'], ['Синий', 'II', '#3c7be0'], ['Индиго', 'III', '#5b4bd1'], ['Фиолетовый', 'IV', '#9b4fd6'], ['Розовый', 'V', '#e86aa6'], ['Красный', 'VI', '#d8323f'], ['Красно-чёрный', 'VII', '#7a0f18']];
  const RAR = ['', 'обычный', 'редкий', 'эпический', 'легендарный', 'мифический'];
  const TABS = [['rolls', '🎲', 'Броски'], ['me', '◆', 'Я'], ['board', '📌', 'Заказы'], ['fight', '⚔', 'Бой'], ['team', '👥', 'Отряд'], ['event', '🎃', 'Ивент'], ['journal', '📜', 'Журнал']];
  const S = { user: null, prof: null, game: {}, heroes: {}, rolls: [], tab: store.get('ek_tab', 'rolls'), sound: store.get('ek_sound', true), err: '', fresh: null, myTurnSeen: null };
  if (!window.supabase) { app.innerHTML = '<div class="boot">Не загрузилась библиотека связи. Проверь интернет и обнови страницу.</div>'; return; }
  const INV = (() => { try { return (new URLSearchParams(location.search).get('code') || '').trim().toUpperCase().slice(0, 12); } catch (e) { return ''; } })();
  const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, storageKey: 'ek_auth' } });

  // ---------- мелочи ----------
  const COINS = [[1000, 'пл', 'pl'], [100, 'з', 'g'], [10, 'с', 's'], [1, 'м', 'c']];
  function money(v) {
    v = Math.max(0, Math.floor(v || 0)); const parts = [];
    COINS.forEach(([n, sh, k]) => { const q = Math.floor(v / n); v -= q * n; if (q) parts.push(`<span class="coin ${k}"><i></i>${q}<small>${sh}</small></span>`); });
    return `<span class="money">${parts.join('') || '<span class="coin c"><i></i>0<small>м</small></span>'}</span>`;
  }
  const ago = (t) => { const m = Math.round((Date.now() - new Date(t).getTime()) / 60000); if (m < 1) return 'только что'; if (m < 60) return m + ' мин назад'; const hh = Math.round(m / 60); if (hh < 24) return hh + ' ч назад'; return new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); };
  const heroName = (k) => (k === 'main' ? 'Мастер' : (S.heroes[k] && S.heroes[k].name) || (S.game.team && S.game.team.heroes && S.game.team.heroes[k] && S.game.team.heroes[k].name) || k);
  const heroCol = (k) => (k === 'main' ? '#d9b26a' : (S.game.team && S.game.team.heroes && S.game.team.heroes[k] && S.game.team.heroes[k].color) || '#7fd1c7');
  const myHero = () => (S.prof && S.prof.role === 'player' ? S.prof.hero : null);
  // кубики обликов: картинки сняты с настоящих кубиков Экосистемы
  let DK = {};
  fetch('dice/dice.json').then((r) => r.json()).then((j) => { DK = j; soft(); }).catch(() => {});
  const SPI = { '21': '21', '0': '0', '-1': '−1', Angel: '☩', '777': '777', '666': '666', '01010011': '⛨', HACK: '⌁', ERROR: '!', NULL: '∅', Abyss: '◉', Andromeda: '✧', Galaxy: '✺', Comet: '☄', Singularity: '◍', Pustota: '◌', Sunrise: '☀', Illusion: '◈', Debt: '¤', Barter: '⇄', Nostalgia: '❀', Dejavu: '↺', Jester: '🃏', TrickTreat: '🍬', Pumpkin: '🎃', Thirteen: '13', HwGhost: '👻' };
  const teamSkin = (k) => S.game.team && S.game.team.skins && S.game.team.skins[k];
  const skinOf = (k) => (k === 'main' ? teamSkin('main') : (S.heroes[k] && S.heroes[k].skin) || teamSkin(k)) || 'classic';
  const dimg = (sk) => 'dice/' + encodeURIComponent(sk || 'classic') + '.webp';
  const faceTxt = (r) => (/^-?\d+$/.test(r.value) ? String(r.value).replace('-', '−') : SPI[r.value] || '✦');
  function d20(r, B, cls) {
    const sk = skinOf(r.hero), f = DK[sk] || 0.5, img = Math.round(Math.min(B / f, B * 2.4)), t = faceTxt(r), fs = Math.round(B * 0.4 * Math.min(1, 2.2 / Math.max(1, Array.from(t).length)));
    return `<div class="d20 ${cls || ''}" style="--s:${img}px"><img src="${dimg(sk)}" alt="" onerror="this.onerror=null;this.src='dice/classic.webp'"><b style="font-size:${fs}px">${esc(t)}</b></div>`;
  }
  function note(txt, cls) { const t = document.createElement('div'); t.className = 'ptoast ' + (cls || ''); t.textContent = txt; document.body.appendChild(t); setTimeout(() => t.remove(), 3600); }
  // экран ожидания: пока Экосистема Мастера выполняет просьбу, остальное заблокировано
  function busy(txt, sub) {
    let el = document.getElementById('busy'); clearTimeout(S.busyT);
    if (!txt) { S.busy = null; if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 260); } return; }
    if (!el) { el = document.createElement('div'); el.id = 'busy'; el.setAttribute('role', 'alert'); el.setAttribute('aria-busy', 'true'); el.innerHTML = '<div class="bx"><div class="bdie"><img alt=""><i></i></div><b></b><small></small><div class="bdots"><i></i><i></i><i></i></div></div>'; ['click', 'touchstart', 'pointerdown', 'keydown'].forEach((ev) => el.addEventListener(ev, (e) => { e.stopPropagation(); e.preventDefault(); }, { passive: false })); document.body.appendChild(el); }
    el.querySelector('img').src = dimg((S.heroes[myHero()] || {}).skin || 'classic');
    el.querySelector('b').textContent = txt; el.querySelector('small').textContent = sub || 'Экосистема Мастера обрабатывает просьбу — пару секунд';
    S.busy = txt; if (document.activeElement) document.activeElement.blur();
    S.busyT = setTimeout(() => { if (S.busy) { busy(null); S.skWant = null; note('Экосистема Мастера не ответила — попробуй ещё раз', 'bad'); soft(); } }, 20000);
  }
  const hpBar = (P, big) => { if (!P || !P.max) return ''; const p = Math.max(0, Math.min(1, P.hp / P.max)); return `<div class="hpb ${big ? 'big' : ''} ${p <= 0.25 ? 'low' : p <= 0.5 ? 'mid' : ''} ${P.hp <= 0 ? 'down' : ''}"><div class="hpt"><span>${P.hp <= 0 ? '☠ без сознания' : '❤ Здоровье'}</span><b>${P.hp}<small> / ${P.max}</small></b></div><div class="hpl"><i style="width:${(p * 100).toFixed(1)}%"></i></div></div>`; };
  let actx = null;
  function beep(f, d, v) { if (!S.sound) return; try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.type = 'triangle'; g.gain.value = v || 0.06; o.connect(g); g.connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (d || 0.25)); o.stop(actx.currentTime + (d || 0.25) + 0.02); } catch (e) {} }
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  // ---------- вход ----------
  async function start() {
    const { data } = await sb.auth.getSession();
    if (data && data.session) await afterLogin(data.session.user); else renderAuth(INV ? 'up' : 'in');
    sb.auth.onAuthStateChange((ev, sess) => { if (ev === 'SIGNED_OUT') { S.user = null; S.prof = null; renderAuth(); } });
  }
  async function afterLogin(user) {
    S.user = user;
    await loadProfile();
    sb.channel('me').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'id=eq.' + user.id }, () => loadProfile()).subscribe();
  }
  async function loadProfile() {
    const { data, error } = await sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle();
    if (error) { S.err = error.message; return renderAuth(); }
    const was = S.prof && S.prof.role;
    S.prof = data;
    if (!data || data.role === 'pending') return renderPending();
    if (was !== data.role || !S.loaded) { S.loaded = true; await loadAll(); live(); }
    render();
  }
  function renderAuth(mode) {
    mode = mode || 'in';
    app.innerHTML = `<div class="auth">
      <div class="logo"><div class="mark">◈</div><h1>Экосистема</h1><p>Отряд у края Бездны</p></div>
      <div class="seg"><button data-m="in" class="${mode === 'in' ? 'on' : ''}">Вход</button><button data-m="up" class="${mode === 'up' ? 'on' : ''}">Регистрация</button></div>
      <form class="card form">
        ${mode === 'up' ? `<label>Код отряда (его даёт Мастер)<input name="code" required maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc((S.f && S.f.code) || INV)}" style="text-transform:uppercase;letter-spacing:.2em;font-weight:700"></label><label>Имя (как тебя знает отряд)<input name="name" required maxlength="30" autocomplete="nickname" value="${esc((S.f && S.f.name) || '')}"></label>` : ''}
        <label>Почта<input name="email" type="email" required autocomplete="username" value="${esc((S.f && S.f.email) || '')}"></label>
        <label>Пароль<input name="pw" type="password" required minlength="6" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}"></label>
        <button class="btn primary" type="submit">${mode === 'up' ? 'Зарегистрироваться' : 'Войти'}</button>
        <p class="err">${esc(S.err)}</p>
      </form>
      <p class="hint">${mode === 'up' ? 'Код отряда — у Мастера. После регистрации он привяжет тебя к твоему герою.' : 'Первый раз здесь? Открой «Регистрация».'}</p>
    </div>`;
    app.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { S.err = ''; renderAuth(b.dataset.m); }));
    app.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), email = String(f.get('email')).trim(), pw = String(f.get('pw'));
      const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = '…';
      const code = String(f.get('code') || '').trim().toUpperCase();
      S.f = { code, email, name: String(f.get('name') || '').trim() };
      const r = mode === 'up' ? await sb.auth.signUp({ email, password: pw, options: { data: { name: String(f.get('name') || '').trim(), code } } }) : await sb.auth.signInWithPassword({ email, password: pw });
      if (r.error) { const m = r.error.message || ''; S.err = m === 'Invalid login credentials' ? 'Неверная почта или пароль.' : /database error|saving new user|EK_BAD_CODE/i.test(m) ? 'Неверный код отряда (или Мастер закрыл набор). Спроси код у Мастера.' : /already registered|already exists/i.test(m) ? 'Эта почта уже зарегистрирована — просто войди.' : m; return renderAuth(mode); }
      if (!r.data.session) { S.err = 'Аккаунт создан. Попробуй войти.'; return renderAuth('in'); }
      S.err = ''; afterLogin(r.data.user);
    });
  }
  function renderPending() {
    app.innerHTML = `<div class="auth"><div class="logo"><div class="mark pulse">◈</div><h1>Почти готово</h1><p>Аккаунт создан: ${esc(S.prof ? S.prof.name : '')}</p></div>
      <div class="card"><p>Мастер должен привязать тебя к твоему герою. Как только он это сделает, эта страница откроется сама.</p></div>
      <button class="btn ghost" id="out">Выйти</button></div>`;
    app.querySelector('#out').addEventListener('click', () => sb.auth.signOut());
  }

  // ---------- данные ----------
  async function loadAll() {
    const [g, hs, r] = await Promise.all([sb.from('game_state').select('*'), sb.from('hero_state').select('*'), sb.from('rolls').select('*').order('id', { ascending: false }).limit(40)]);
    (g.data || []).forEach((x) => { S.game[x.key] = x.data; });
    (hs.data || []).forEach((x) => { S.heroes[x.hero] = x.data; });
    S.rolls = r.data || [];
    setTimeout(pkSync, 400);
  }
  let ch = null;
  function live() {
    if (ch) return;
    ch = sb.channel('game')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, (p) => { if (p.new && p.new.key) { const old = S.game[p.new.key]; S.game[p.new.key] = p.new.data; if (p.new.key === 'fight') checkTurn(old); if (p.new.key === 'pk') pkSync(); soft(); } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hero_state' }, (p) => { if (p.new && p.new.hero) { const old = S.heroes[p.new.hero]; S.heroes[p.new.hero] = p.new.data; if (p.new.hero === myHero()) { hpFx(old && old.hp, p.new.data && p.new.data.hp); if (S.skWant && p.new.data && p.new.data.skin === S.skWant) { S.skWant = null; busy(null); } } soft(); } })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'actions' }, (p) => { if (p.new && p.new.hero === myHero() && p.new.applied) onResult(p.new); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rolls' }, (p) => { if (p.new) { S.rolls.unshift(p.new); S.rolls = S.rolls.slice(0, 60); S.fresh = p.new.id; onRoll(p.new); soft(); } })
      .subscribe((st) => { S.live = st === 'SUBSCRIBED'; paintLive(); });
  }
  // ---------- ОЗ: вспышка при уроне и лечении ----------
  function hpFx(a, b) {
    if (!a || !b || a.hp === b.hp) return;
    const d = b.hp - a.hp, el = document.createElement('div'); el.className = 'hpfx ' + (d < 0 ? 'hurt' : 'heal');
    el.innerHTML = `<b>${d < 0 ? '−' + Math.abs(d) : '+' + d} ОЗ</b>`; document.body.appendChild(el); setTimeout(() => el.remove(), 1500);
    if (d < 0) { buzz([90, 50, 90]); beep(140, 0.35, 0.08); document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 500); }
    else { beep(660, 0.2, 0.05); setTimeout(() => beep(990, 0.3, 0.05), 120); if (window.EkTheme) window.EkTheme.burst(innerWidth / 2, innerHeight * 0.4, { cols: ['#8af0a0', '#d8ffe0', '#3ccf7a'], n: 26, power: 260 }); }
  }
  // ---------- просьбы к Экосистеме Мастера ----------
  const gmOn = () => !(S.game.gm && S.game.gm.on === false);
  async function ask(kind, payload) {
    const me = myHero(); if (!me) return false;
    if (!gmOn()) { note('Мастер сейчас не в сети — попробуй, когда он подключится', 'bad'); return false; }
    const { error } = await sb.from('actions').insert({ hero: me, kind, payload });
    if (error) { note(/EK_TOO_FAST/.test(error.message) ? 'Слишком часто — подожди немного' : 'Не получилось: ' + error.message, 'bad'); return false; }
    return true;
  }
  function onResult(a) {
    const r = a.result || {};
    if (a.kind === 'skin') { if (!r.ok) { S.skWant = null; busy(null); note('Облик не сменился: ' + (r.why || 'неизвестно'), 'bad'); } else { clearTimeout(S.busyT); S.busyT = setTimeout(() => { S.skWant = null; busy(null); soft(); }, 5000); } soft(); }
    if (a.kind === 'pumpkin') { busy(null); if (r.ok) { note('🎃 +' + r.n + ' 🍬 — тыква поймана!', 'good'); beep(880, 0.2); setTimeout(() => beep(1320, 0.3), 120); buzz([40, 30, 40]); } else note('Тыква: ' + (r.why || 'не засчитана'), 'bad'); }
  }
  // ---------- тыквы на экране ----------
  const PKdone = new Set(store.get('ek_pk', [])), PKel = {};
  const PKSVG = '<svg viewBox="0 0 60 60"><path d="M30 10 q2 -8 8 -9" stroke="#5a3a1a" stroke-width="3" fill="none"/><ellipse cx="30" cy="34" rx="24" ry="20" fill="#ff8a1e"/><ellipse cx="30" cy="34" rx="9" ry="20" fill="#ffa040" opacity=".55"/><path d="M17 30 l6 -6 l5 6z M33 30 l6 -6 l5 6z" fill="#ffe27a"/><path d="M18 40 q12 10 24 0 l-4 3 l-3 -3 l-3 4 l-3 -4 l-3 3 l-4 -3z" fill="#ffe27a"/></svg>';
  function pkSync() {
    const me = myHero(), L = (S.game.pk && S.game.pk.list) || [];
    if (!me || !(S.game.hw && S.game.hw.live)) return;
    L.forEach((p) => { if (p.hero === me && !p.got && !PKdone.has(p.id) && !PKel[p.id] && Date.now() < p.t1 + 120000) pkSpawn(p); });
  }
  function pkSpawn(p) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'pk'; el.innerHTML = PKSVG + '<i></i>'; el.setAttribute('aria-label', 'Поймать тыкву');
    document.body.appendChild(el); PKel[p.id] = el;
    const t0 = performance.now(), life = Math.max(20000, Math.min(85000, p.t1 - p.t0)), ph = Math.random() * 6; let x = 0, y = 0, alive = true;
    beep(520, 0.15, 0.04); setTimeout(() => beep(780, 0.2, 0.04), 110); buzz(25);
    const gone = () => { alive = false; PKdone.add(p.id); store.set('ek_pk', Array.from(PKdone).slice(-40)); delete PKel[p.id]; };
    (function step(now) {
      if (!alive) return; const t = (now - t0) / 1000;
      if (t * 1000 > life) { el.classList.add('bye'); setTimeout(() => el.remove(), 600); gone(); return; }
      x = innerWidth / 2 + Math.sin(t * 0.47 + ph) * innerWidth * 0.36 + Math.sin(t * 1.3) * 20; y = innerHeight * 0.48 + Math.sin(t * 0.61 + ph * 2) * innerHeight * 0.3;
      el.style.transform = `translate(${x - 36}px, ${y - 36}px) rotate(${Math.sin(t * 2.2) * 14}deg)`;
      requestAnimationFrame(step);
    })(t0);
    el.addEventListener('click', async () => {
      if (!alive || S.busy) return; gone(); el.classList.add('got');
      if (window.EkTheme) window.EkTheme.burst(x, y, { cols: ['#ffb347', '#ffe27a', '#ff8a1e'], n: 36, power: 360, ring: 2 });
      beep(990, 0.12, 0.06); buzz(40); setTimeout(() => el.remove(), 500);
      if (S.busy) return; busy('🎃 Тыква поймана!', 'Мастер считает конфеты…');
      if (!(await ask('pumpkin', { id: p.id }))) busy(null);
    });
  }
  function onRoll(r) {
    const mine = r.hero === myHero();
    if (r.kind === 'crit') { beep(880, 0.35, 0.07); setTimeout(() => beep(1320, 0.4, 0.06), 120); }
    else if (r.kind === 'fail') beep(160, 0.5, 0.08);
    else if (r.kind === 'special') { beep(660, 0.3); setTimeout(() => beep(990, 0.3), 140); setTimeout(() => beep(1320, 0.4), 280); }
    else beep(mine ? 520 : 420, 0.18, 0.04);
    if (mine) buzz(r.kind === 'crit' || r.kind === 'special' ? [60, 40, 60] : 40);
  }
  function curTurn(F) { if (!F || !F.order || !F.order.length) return null; return F.order[F.turn] || null; }
  function checkTurn(old) {
    const c = curTurn(S.game.fight), o = curTurn(old), me = myHero();
    if (c && c.kind === 'pl' && c.key === me && (!o || o.name !== c.name || (old && old.round !== S.game.fight.round))) { beep(784, 0.25, 0.08); setTimeout(() => beep(1046, 0.4, 0.08), 160); buzz([120, 60, 120]); S.turnFlash = Date.now(); }
  }
  let softT = null;
  const soft = () => { clearTimeout(softT); softT = setTimeout(render, 60); };

  // ---------- экраны ----------
  function render() {
    if (!S.prof || S.prof.role === 'pending') return;
    const me = myHero(), H = S.heroes[me] || {}, F = S.game.fight, c = curTurn(F), myTurn = c && c.kind === 'pl' && c.key === me;
    skinTheme(H.skin);
    const gmOff = S.game.gm && S.game.gm.on === false;
    const head = `<header class="top" style="--hc:${heroCol(me)}">
      <div class="who"><i class="dot"></i><div><b>${esc(me ? heroName(me) : S.prof.role === 'gm' ? 'Мастер' : '')}</b><small>${esc((S.game.team && S.game.team.party) || 'Отряд')}${S.game.clock ? ' · ' + esc(S.game.clock.time) + ' · день ' + esc(S.game.clock.day) : ''}</small></div></div>
      <div class="bal">${me ? money(H.wallet) : ''}<span class="bal2">${me && H.hp && H.hp.max ? `<span class="hpm ${H.hp.hp / H.hp.max <= 0.25 ? 'low' : ''}">❤ ${H.hp.hp}/${H.hp.max}</span>` : ''}${me && S.game.hw && S.game.hw.live ? `<span class="candy">🍬 ${H.candy || 0}</span>` : ''}</span></div>
      <span class="live ${S.live && !gmOff ? 'on' : ''}" title="${gmOff ? 'Мастер не в сети' : 'Связь с Экосистемой Мастера'}"></span>
    </header>
    ${gmOff ? `<div class="offline">Мастер сейчас не в сети — здесь то, что он отправил последним${S.game.gm.t ? ' (' + esc(ago(S.game.gm.t)) + ')' : ''}.</div>` : ''}
    ${myTurn ? '<div class="turn">⚔ ТВОЙ ХОД</div>' : ''}`;
    const tabs = TABS.filter(([id]) => id !== 'event' || (S.game.hw && S.game.hw.live));
    if (!tabs.find(([id]) => id === S.tab)) S.tab = 'rolls';
    const nav = `<nav class="tabs">${tabs.map(([id, ic, t]) => `<button data-t="${id}" class="${S.tab === id ? 'on' : ''}"><i>${ic}</i><span>${t}</span>${id === 'fight' && myTurn ? '<em></em>' : ''}</button>`).join('')}</nav>`;
    const body = ({ rolls: vRolls, me: vMe, board: vBoard, fight: vFight, team: vTeam, event: vEvent, journal: vJournal }[S.tab] || vRolls)();
    const y = window.scrollY;
    app.innerHTML = head + `<main class="pane">${body}</main>` + nav;
    app.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.t; store.set('ek_tab', S.tab); window.scrollTo(0, 0); render(); }));
    const snd = app.querySelector('#snd'); if (snd) snd.addEventListener('change', () => { S.sound = snd.checked; store.set('ek_sound', S.sound); if (S.sound) beep(660, 0.2); });
    const out = app.querySelector('#out'); if (out) out.addEventListener('click', () => sb.auth.signOut());
    const fxo = app.querySelector('#fxo'); if (fxo) fxo.addEventListener('change', () => window.EkTheme && window.EkTheme.fx(fxo.checked));
    app.querySelectorAll('[data-sk]').forEach((b) => b.addEventListener('click', async () => {
      const id = b.dataset.sk; if (id === (S.heroes[me] || {}).skin || S.busy) return;
      if (!gmOn()) return ask('skin', { id });
      S.skWant = id; busy('Меняем облик на «' + (window.EkTheme ? window.EkTheme.name(id) : id) + '»', 'Экосистема Мастера перекрашивает кубик — пару секунд');
      if (!(await ask('skin', { id }))) { S.skWant = null; busy(null); }
    }));
    if (S.tab === 'rolls' && S.fresh) {
      const el = app.querySelector('.big'), dz = el && el.querySelector('.d20'); if (el) el.classList.add('pop'); if (dz) dz.classList.add('roll-in');
      const R0 = S.rolls[0];
      if (dz && window.EkTheme) setTimeout(() => { const q = dz.getBoundingClientRect(); const cx = q.left + q.width / 2, cy = q.top + q.height / 2; const k = R0 && R0.kind; window.EkTheme.burst(cx, cy, k === 'crit' ? { cols: ['#f5cd6a', '#fff2c0', '#ffd56a'], n: 60, power: 460, ring: 2 } : k === 'fail' ? { cols: ['#e0645a', '#7a1010', '#ff9a8a'], n: 34, power: 280 } : k === 'special' ? { cols: ['#c38cff', '#ffffff', '#7ae0ff'], n: 54, power: 420, ring: 2 } : { n: 26, power: 260 }); }, 620);
      S.fresh = null;
    } else window.scrollTo(0, y);
  }
  function paintLive() { const el = app.querySelector('.live'); if (el) el.classList.toggle('on', !!S.live && !(S.game.gm && S.game.gm.on === false)); }
  // облик кубика меняет атмосферу экрана
  let skinSeen = null;
  function skinTheme(id) {
    if (!window.EkTheme || !id) return;
    const T = window.EkTheme;
    if (skinSeen && skinSeen !== id) { const t = document.createElement('div'); t.className = 'skin-toast'; t.innerHTML = '<small>новый облик</small>' + esc(T.name(id)); document.body.appendChild(t); setTimeout(() => t.remove(), 3400); buzz(30); }
    skinSeen = id; T.set(id);
  }

  const rollCls = (r) => (r.kind === 'crit' ? 'crit' : r.kind === 'fail' ? 'fail' : r.kind === 'special' ? 'special' : '');
  const rollTxt = (r) => (r.kind === 'special' ? esc(r.label || r.value) : esc(r.value));
  function vRolls() {
    const me = myHero(), last = S.rolls[0];
    if (!last) return '<div class="empty">Бросков пока не было. Как только Мастер бросит кубик — результат появится здесь.</div>';
    const mineLast = S.rolls.find((r) => r.hero === me);
    const big = (r, cls) => `<div class="card big ${rollCls(r)} ${cls || ''}" style="--hc:${heroCol(r.hero)}"><small>${r.hero === me ? 'Твой бросок' : esc(heroName(r.hero))}</small>${d20(r, cls === 'small' ? 78 : 132)}${r.kind === 'special' ? `<em class="spl">${rollTxt(r)}</em>` : r.kind === 'crit' ? '<em class="spl">критический успех</em>' : r.kind === 'fail' ? '<em class="spl">критический провал</em>' : ''}<span>${ago(r.created_at)}</span></div>`;
    return `${big(last)}
      ${mineLast && mineLast !== last ? `<h3>Твой последний бросок</h3>${big(mineLast, 'small')}` : ''}
      <h3>Лента</h3><ul class="feed">${S.rolls.slice(0, 40).map((r) => `<li class="${rollCls(r)} ${r.hero === me ? 'mine' : ''}" style="--hc:${heroCol(r.hero)}"><img class="fd" src="${dimg(skinOf(r.hero))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span>${esc(heroName(r.hero))}</span><b>${rollTxt(r)}</b><small>${ago(r.created_at)}</small></li>`).join('')}</ul>`;
  }
  function itemsOf(H) { const it = (S.game.hw && S.game.hw.it) || {}; return Object.keys(H.inv || {}).filter((id) => H.inv[id] > 0).map((id) => ({ id, n: H.inv[id], d: it[id] || { n: id, ic: '?', d: '' } })); }
  function bufText(b, prank) {
    b = b || {}; const o = [];
    if (b.plus) o.push('🎃 +' + b.plus + ' к броску'); if (b.pl) o.push('🍭 +1 ×' + b.pl); if (b.candle) o.push('🕯️ второй шанс'); if (b.adv) o.push('🧹 доп. бросок' + (b.adv > 1 ? ' ×' + b.adv : '')); if (b.adv3) o.push('👑 тройной бросок');
    if (b.low3) o.push('🍪 +2 к низкому'); if (b.mir) o.push('🪞 зеркало'); if (b.fl5) o.push('⏳ не ниже 5 ×' + b.fl5); if (b.guard) o.push('🧿 без единиц ×' + b.guard); if (b.luck) o.push('🧪 удача ×' + b.luck); if (prank) o.push('🕸 разыграли ×' + prank);
    return o;
  }
  function vMe() {
    const me = myHero(); if (!me) return '<div class="empty">Ты не привязан к герою.</div>';
    const H = S.heroes[me] || {}, w = WH[Math.min(7, H.whistle || 0)], items = itemsOf(H), bf = bufText(H.buf, H.prank), hw = S.game.hw && S.game.hw.live;
    return `<div class="card hero" style="--hc:${heroCol(me)}"><div class="hrow"><div><h2>${esc(H.name || heroName(me))}</h2><span class="wh" style="--wc:${w[2]}"><i></i>${w[0]} свисток · ${w[1]}</span></div></div>
      ${hpBar(H.hp, true)}
      <div class="stats"><div><small>Кошелёк</small>${money(H.wallet)}</div>${hw ? `<div><small>Конфеты</small><b>🍬 ${H.candy || 0}</b></div>` : ''}${H.stats ? `<div><small>Бросков</small><b>${H.stats.rolls}</b></div><div><small>Двадцаток</small><b>${H.stats.n20}</b></div><div><small>Единиц</small><b>${H.stats.n1}</b></div><div><small>Средний</small><b>${H.stats.avg || '—'}</b></div>` : ''}</div></div>
      ${bf.length ? `<div class="card buffs"><small>Действует сейчас</small><p>${bf.map(esc).join(' · ')}</p></div>` : ''}
      ${items.length ? `<h3>Инвентарь</h3><div class="grid">${items.map((x) => `<div class="card it r${x.d.r || 1}"><i>${esc(x.d.ic)}</i><div><b>${esc(x.d.n)}${x.n > 1 ? ' ×' + x.n : ''}</b><p>${esc(x.d.d)}</p></div></div>`).join('')}</div>` : hw ? '<h3>Инвентарь</h3><div class="empty sm">Пусто. Загляни к Тыквенному торговцу.</div>' : ''}
      <h3>Достижения · ${(H.ach || []).length}${H.achTotal ? ' из ' + H.achTotal : ''}</h3>
      ${(H.ach || []).length ? `<div class="achs">${H.ach.slice(0, 60).map((a) => `<div class="ach lv${a.lv}" title="${esc(a.d)}"><i>${esc(a.ic)}</i><div><b>${esc(a.t)}</b><small>${esc(a.d)}</small></div></div>`).join('')}</div>` : '<div class="empty sm">Пока ни одного. Всё впереди.</div>'}
      ${vSkins(H)}
      ${vSpecials(H)}
      <div class="card opts"><label><input type="checkbox" id="snd" ${S.sound ? 'checked' : ''}> Звук при бросках и «твой ход»</label><label><input type="checkbox" id="fxo" ${!window.EkTheme || window.EkTheme.fxOn ? 'checked' : ''}> Живой фон</label><button class="btn ghost" id="out">Выйти из аккаунта</button></div>`;
  }
  function vSkins(H) {
    const L = H.skins || [], cur = H.skin || 'classic', off = !gmOn();
    return `<h3>Облик кубика <small>${esc(window.EkTheme ? window.EkTheme.name(cur) : cur)} · открыто ${L.length}</small></h3>
      <div class="skins">${L.map((s) => `<button class="sk r${s.r || 1} ${s.id === cur ? 'on' : ''} ${S.skWant === s.id ? 'pend' : ''}" data-sk="${esc(s.id)}" ${off ? 'disabled' : ''} title="${esc(s.t + (s.x ? ': ' + s.x : ''))}"><img src="${dimg(s.id)}" alt="" loading="lazy"><span>${esc(s.t)}</span></button>`).join('')}</div>
      <p class="note">${off ? 'Сменить облик можно, когда Мастер в сети.' : 'Нажми на облик — кубик и весь экран сменятся. Новые облики открываются достижениями и у Тыквенного торговца.'}</p>`;
  }
  function vSpecials(H) {
    const L = H.sp || [], base = L.filter((x) => x.base), rare = L.filter((x) => !x.base), tot = H.spTotal || 0, locked = Math.max(0, tot - rare.length);
    return `<h3>Особые результаты <small>${rare.length}${tot ? ' из ' + tot : ''}</small></h3>
      <div class="sps">${base.concat(rare).map((x) => `<div class="spc ${x.base ? 'base' : ''} ${x.id === '1' ? 'bad' : ''}"><i>${esc(x.ic)}</i><b>${esc(x.t)}</b><em>×${x.n}</em></div>`).join('')}${Array.from({ length: Math.min(locked, 6) }, () => '<div class="spc lock"><i>?</i><b>???</b></div>').join('')}${locked > 6 ? `<div class="spc lock more">и ещё ${locked - 6} — пока тайна</div>` : ''}</div>`;
  }
  function qCard(q, taken) {
    const left = q.due ? Math.ceil((q.due - ((S.game.clock && S.game.clock.t) || Date.now())) / 86400000) : null, w = WH[Math.min(7, q.wh || 0)];
    return `<div class="card quest ${q.res ? q.res : ''}"><div class="qh"><b>${esc(q.title)}</b><span class="rew">${money(q.reward)}</span></div><p>${esc(q.text)}</p>
      <div class="qm"><span>${'◆'.repeat(Math.max(1, q.diff || 1))}</span><span>слой ${q.layer || 0}</span><span class="wh" style="--wc:${w[2]}"><i></i>от ${w[0].toLowerCase()}</span>${q.qty ? `<span>${q.got || 0}/${q.qty}</span>` : ''}${taken && left != null ? `<span class="${left < 1 ? 'late' : ''}">${left < 1 ? 'срок вышел' : 'осталось ' + left + ' дн.'}</span>` : ''}${q.days && !taken ? `<span>${q.days} дн.</span>` : ''}</div>
      ${q.team && q.team.length ? `<div class="qt">${q.team.map((k) => `<span style="--hc:${heroCol(k)}"><i></i>${esc(heroName(k))}</span>`).join('')}</div>` : ''}</div>`;
  }
  function vBoard() {
    const B = S.game.board; if (!B) return '<div class="empty">Доска заказов пока пуста.</div>';
    return `${B.taken && B.taken.length ? `<h3>Взятые заказы</h3>${B.taken.map((q) => qCard(q, true)).join('')}` : ''}
      <h3>Доска заказов</h3>${B.board && B.board.length ? B.board.map((q) => qCard(q, false)).join('') : '<div class="empty sm">Новых заказов нет.</div>'}
      ${B.archive && B.archive.length ? `<h3>Недавно закрытые</h3>${B.archive.slice(0, 6).map((q) => qCard(q, false)).join('')}` : ''}`;
  }
  function vFight() {
    const F = S.game.fight, me = myHero();
    if (!F || !F.order || !F.order.length) return '<div class="empty">Сейчас не бой. Когда Мастер бросит инициативу, здесь появится порядок ходов.</div>';
    const c = F.order[F.turn];
    return `<div class="card fhead"><b>Раунд ${F.round || 1}</b><span>Ходит: ${esc(c ? c.name : '—')}</span></div>
      <ol class="order">${F.order.map((e, i) => `<li class="${i === F.turn ? 'cur' : ''} ${e.out ? 'out' : ''} ${e.kind === 'pl' && e.key === me ? 'mine' : ''} ${e.kind}" style="--hc:${e.kind === 'pl' ? heroCol(e.key) : '#c0504a'}"><i>${i + 1}</i><span>${esc(e.name)}</span><b>${e.total}</b></li>`).join('')}</ol>`;
  }
  function vTeam() {
    const T = S.game.team || {};
    return `<h3>${esc(T.party || 'Отряд')}${T.rest === 'long' ? ' <small>☀ долгий отдых — аптечка лечит вдвое</small>' : ''}</h3>${HEROES.map((k) => { const H = S.heroes[k] || {}, w = WH[Math.min(7, H.whistle || 0)]; return `<div class="card hero sm" style="--hc:${heroCol(k)}"><div class="hrow"><div><h2>${esc(H.name || heroName(k))}</h2><span class="wh" style="--wc:${w[2]}"><i></i>${w[0]} · ${w[1]}</span></div><div class="right">${money(H.wallet)}${S.game.hw && S.game.hw.live ? `<small>🍬 ${H.candy || 0}</small>` : ''}</div></div>${hpBar(H.hp)}</div>`; }).join('')}
      ${S.game.board && S.game.board.fund ? `<div class="card"><small>Общий фонд</small> ${money(S.game.board.fund)}</div>` : ''}`;
  }
  function vEvent() {
    const E = S.game.hw, me = myHero(), H = S.heroes[me] || {}; if (!E || !E.live) return '<div class="empty">Сейчас нет ивента.</div>';
    const left = Math.max(0, E.slotEnd - Date.now()), mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60;
    const lot = (l) => { const sk = l.id.startsWith('skin:'), d = sk ? E.sk[l.id.slice(5)] || {} : E.it[l.id] || {}; return `<div class="card lot r${d.r || 1} ${l.st <= 0 ? 'sold' : ''}"><i>${sk ? '◈' : esc(d.ic || '?')}</i><small>${sk ? 'облик · ' : ''}${RAR[d.r || 1]}${l.sale ? ' · скидка' : ''}</small><b>${esc(d.n || l.id)}</b><p>${esc(sk ? 'Облик кубика. Остаётся навсегда.' : d.d || '')}</p><div class="lf"><span>${l.st <= 0 ? 'раскуплено' : 'осталось ' + l.st}</span><em>${l.p} 🍬</em></div></div>`; };
    const T = (H.tasks || []).map((q) => { const d = (E.tasks || []).find((x) => x.id === q.id) || { t: q.id, need: 1, rew: 0 }; return `<li class="${q.done ? 'done' : ''}"><i>${q.done ? '✔' : '○'}</i><span>${esc(d.t)} · ${q.c}/${d.need}</span><em>+${d.rew} 🍬</em></li>`; }).join('');
    const pt = E.potT || [], lastT = pt.length ? pt[pt.length - 1][0] : 1000;
    return `<div class="card evh"><b>🎃 Ночь Тонкой Грани</b><span>ещё ${Math.ceil((E.end - Date.now()) / 86400000)} дн.</span></div>
      <h3>Прилавок Тыквенного торговца <small>новый товар через ${mm}:${String(ss).padStart(2, '0')}</small></h3>
      <div class="grid">${(E.lots || []).map(lot).join('')}</div>
      <p class="note">Пока покупки — через Мастера: скажи, что берёшь. А тыквы иногда прилетают прямо на этот экран — лови их пальцем, это конфеты!</p>
      <h3>Общий котёл · ${E.pot.n} 🍬</h3><div class="bar"><i style="width:${Math.min(100, E.pot.n / lastT * 100).toFixed(1)}%"></i></div>
      <ul class="thr">${pt.map(([n, t]) => `<li class="${E.pot.got.includes(n) ? 'got' : ''}"><b>${n}</b><span>${esc(t)}</span></li>`).join('')}<li class="${E.pot.box ? 'got' : ''}"><b>+${E.boxStep}</b><span>потом — Ящик Тонкой Грани каждому${E.pot.box ? ' (выдано: ' + E.pot.box + ')' : ''}</span></li></ul>
      ${T ? `<h3>Мои задания на сегодня</h3><ul class="tasks">${T}</ul>` : ''}`;
  }
  function vJournal() {
    const J = (S.game.journal && S.game.journal.list) || [];
    if (!J.length) return '<div class="empty">Журнал пуст.</div>';
    return `<ul class="jr">${J.slice().reverse().map((e) => `<li class="${e.imp ? 'imp' : ''}"><i>${esc(e.ic || '•')}</i><span>${esc(e.txt)}</span><small>${ago(e.t)}</small></li>`).join('')}</ul>`;
  }
  setInterval(() => { if (S.prof && S.prof.role !== 'pending' && (S.tab === 'event' || S.tab === 'rolls')) { const a = document.activeElement; if (!a || a.tagName !== 'INPUT') render(); } }, 15000);
  start().catch((e) => { app.innerHTML = '<div class="boot">Ошибка: ' + esc(e.message || e) + '</div>'; });
})();
