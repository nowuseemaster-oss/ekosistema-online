// =====================================================================
//  Экосистема · страница игрока. Данные публикует Экосистема Мастера;
//  просьбы игрока (облик, вещи, покупки) она проверяет и применяет сама.
//  Кубик и права Мастера остаются у него.
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
  const TABS = [['rolls', '🎲', 'Броски'], ['me', '◆', 'Я'], ['bag', '🎒', 'Вещи'], ['board', '📌', 'Заказы'], ['fight', '⚔', 'Бой'], ['team', '👥', 'Отряд'], ['event', '🎃', 'Ивент'], ['journal', '📜', 'Журнал']];
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
  const SPI = { '21': '21', '0': '0', '-1': '−1', Angel: '☩', '777': '777', '666': '666', '01010011': '⛨', HACK: '⌁', ERROR: '!', NULL: '∅', Abyss: '◉', Andromeda: '✧', Galaxy: '✺', Comet: '☄', Singularity: '◍', Pustota: '◌', Sunrise: '☀', Illusion: '◈', Debt: '¤', Barter: '⇄', Nostalgia: '❀', Dejavu: '↺', Jester: '🃏', Life: '⌛', TrickTreat: '🍬', Pumpkin: '🎃', Thirteen: '13', HwGhost: '👻' };
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
  const WHC = ['#9aa0a6', '#3fc7c0', '#3c7be0', '#5b4bd1', '#9b4fd6', '#e86aa6', '#d8323f', '#7a0f18'];
  const xpBar = (Q, big) => { if (!Q) return ''; const p = Q.max ? 100 : Q.into / Q.need * 100; return `<div class="xpb ${big ? 'lg' : ''}" style="--wc:${WHC[Q.wh] || '#9aa0a6'}"><div class="xpt"><span><i></i>${esc(Q.rank)} · <b>${Q.lv}</b> ур.</span><small>${Q.max ? 'максимальный уровень' : Q.into + ' / ' + Q.need + ' ОГ'}</small></div><div class="xpl"><i style="width:${p.toFixed(1)}%"></i></div></div>`; };
  // новый уровень — праздник на весь экран
  function lvFx(a, b) {
    if (!a || !b || b.lv <= a.lv) return;
    const el = document.createElement('div'); el.className = 'lvfx' + (b.rank !== a.rank ? ' rank' : ''); el.style.setProperty('--wc', WHC[b.wh] || '#d9b26a');
    el.innerHTML = `<div><small>${b.rank !== a.rank ? 'новый ранг · ' + esc(b.rank) : 'опыт гильдии'}</small><b>${b.lv}</b><em>уровень</em></div>`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 3400);
    beep(523, 0.18, 0.06); setTimeout(() => beep(659, 0.18, 0.06), 140); setTimeout(() => beep(784, 0.18, 0.06), 280); setTimeout(() => beep(1046, 0.5, 0.07), 420); buzz([60, 40, 60, 40, 120]);
    if (window.EkTheme) { const cx = innerWidth / 2, cy = innerHeight * 0.42; window.EkTheme.burst(cx, cy, { cols: [WHC[b.wh] || '#d9b26a', '#ffffff', '#f5cd6a'], n: 70, power: 520, ring: 2 }); setTimeout(() => window.EkTheme.burst(cx, cy, { n: 40, power: 380, ring: 2 }), 450); }
  }
  // опыт персонажа D&D (за монстров и прочее) — отдельно от опыта гильдии
  const dndBar = (D, big) => { if (!D) return ''; const p = D.max ? 100 : D.need ? D.into / D.need * 100 : 0; return `<div class="xpb dnd ${big ? 'lg' : ''}"><div class="xpt"><span><i></i>⚔ Персонаж · <b>${D.lv}</b> ур.</span><small>${D.max ? 'максимальный уровень' : D.xp + ' / ' + D.next + ' опыта'}</small></div><div class="xpl"><i style="width:${p.toFixed(1)}%"></i></div></div>`; };
  function dndFx(a, b) {
    if (!a || !b || b.lv <= a.lv) return;
    const el = document.createElement('div'); el.className = 'lvfx dnd'; el.style.setProperty('--wc', '#e0645a');
    el.innerHTML = `<div><small>уровень персонажа · D&D</small><b>${b.lv}</b><em>не забудь про новые умения и хиты</em></div>`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 3600);
    beep(392, 0.18, 0.06); setTimeout(() => beep(523, 0.18, 0.06), 140); setTimeout(() => beep(659, 0.4, 0.07), 280); buzz([60, 40, 120]);
    if (window.EkTheme) window.EkTheme.burst(innerWidth / 2, innerHeight * 0.42, { cols: ['#e0645a', '#ffffff', '#f5cd6a'], n: 60, power: 480, ring: 2 });
  }
  const hpBar = (P, big) => { if (!P || !P.max) return ''; const p = Math.max(0, Math.min(1, P.hp / P.max)); return `<div class="hpb ${big ? 'lg' : ''} ${p <= 0.25 ? 'low' : p <= 0.5 ? 'mid' : ''} ${P.hp <= 0 ? 'down' : ''}"><div class="hpt"><span>${P.hp <= 0 ? '☠ без сознания' : '❤ Здоровье'}</span><b>${P.hp}<small> / ${P.max}</small></b></div><div class="hpl"><i style="width:${(p * 100).toFixed(1)}%"></i></div></div>`; };
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hero_state' }, (p) => { if (p.new && p.new.hero) { const old = S.heroes[p.new.hero]; S.heroes[p.new.hero] = p.new.data; if (p.new.hero === myHero()) { hpFx(old && old.hp, p.new.data && p.new.data.hp); lvFx(old && old.xp, p.new.data && p.new.data.xp); dndFx(old && old.dnd, p.new.data && p.new.data.dnd); if (S.skWant && p.new.data && p.new.data.skin === S.skWant) S.skWant = null; } soft(); } })
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
    if (a.kind === 'inv') {
      busy(null);
      if (a.payload && a.payload.op === 'batch') {
        S.dr.sent = null;
        if (r.ok) { S.dr.moves = []; note('Сохранено ✓ Вещи разложены', 'good'); beep(660, 0.15, 0.05); setTimeout(() => beep(990, 0.2, 0.05), 110); buzz(30); }
        else note('Не сохранилось: ' + (r.why || 'неизвестно') + '. Черновик остался — поправь и сохрани снова', 'bad');
        soft();
      } else note(r.ok ? 'Готово ✓' : 'Не вышло: ' + (r.why || 'неизвестно'), r.ok ? 'good' : 'bad');
    }
    if (a.kind === 'hw') {
      busy(null);
      if (r.ok) { note(r.txt || 'Готово ✓', 'good'); beep(880, 0.15, 0.05); setTimeout(() => beep(1320, 0.25, 0.05), 120); buzz([30, 30, 30]); if (window.EkTheme) window.EkTheme.burst(innerWidth / 2, innerHeight * 0.45, { cols: ['#ffb347', '#ffe27a', '#c38cff'], n: 34, power: 320 }); }
      else note('Не вышло: ' + (r.why || 'неизвестно'), 'bad');
      soft();
    }
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
      <div class="who"><i class="dot"></i><div><b>${esc(me ? heroName(me) : S.prof.role === 'gm' ? 'Мастер' : '')}</b><small>${me && H.xp ? 'ур. ' + H.xp.lv + ' · ' + esc(H.xp.rank) : esc((S.game.team && S.game.team.party) || 'Отряд')}${S.game.clock ? ' · ' + esc(S.game.clock.time) + ' · день ' + esc(S.game.clock.day) : ''}</small></div></div>
      <div class="bal">${me ? money(H.wallet) : ''}<span class="bal2">${me && H.hp && H.hp.max ? `<span class="hpm ${H.hp.hp / H.hp.max <= 0.25 ? 'low' : ''}">❤ ${H.hp.hp}/${H.hp.max}</span>` : ''}${me && S.game.hw && S.game.hw.live ? `<span class="candy">🍬 ${H.candy || 0}</span>` : ''}</span></div>
      <span class="live ${S.live && !gmOff ? 'on' : ''}" title="${gmOff ? 'Мастер не в сети' : 'Связь с Экосистемой Мастера'}"></span>
    </header>
    ${gmOff ? `<div class="offline">Мастер сейчас не в сети — здесь то, что он отправил последним${S.game.gm.t ? ' (' + esc(ago(S.game.gm.t)) + ')' : ''}.</div>` : ''}
    ${myTurn ? '<div class="turn">⚔ ТВОЙ ХОД</div>' : ''}`;
    const tabs = TABS.filter(([id]) => id !== 'event' || (S.game.hw && S.game.hw.live));
    if (!tabs.find(([id]) => id === S.tab)) S.tab = 'rolls';
    const nav = `<nav class="tabs">${tabs.map(([id, ic, t]) => `<button data-t="${id}" class="${S.tab === id ? 'on' : ''}"><i>${ic}</i><span>${t}</span>${id === 'fight' && myTurn ? '<em></em>' : ''}${id === 'bag' && S.dr.moves.length ? '<em class="dr"></em>' : ''}</button>`).join('')}</nav>`;
    const body = ({ rolls: vRolls, me: vMe, bag: vBag, board: vBoard, fight: vFight, team: vTeam, event: vEvent, journal: vJournal }[S.tab] || vRolls)();
    const y = window.scrollY;
    app.innerHTML = head + `<main class="pane">${body}</main>` + nav;
    app.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.t; store.set('ek_tab', S.tab); window.scrollTo(0, 0); render(); }));
    const snd = app.querySelector('#snd'); if (snd) snd.addEventListener('change', () => { S.sound = snd.checked; store.set('ek_sound', S.sound); if (S.sound) beep(660, 0.2); });
    const out = app.querySelector('#out'); if (out) out.addEventListener('click', () => sb.auth.signOut());
    const fxo = app.querySelector('#fxo'); if (fxo) fxo.addEventListener('change', () => window.EkTheme && window.EkTheme.fx(fxo.checked));
    app.querySelectorAll('.bi[data-bi]').forEach((b) => b.addEventListener('click', () => openItem(b.dataset.bi)));
    const dsv = app.querySelector('#drSave'); if (dsv) dsv.addEventListener('click', drSave);
    const dun = app.querySelector('#drUndo'); if (dun) dun.addEventListener('click', () => { S.dr.moves = []; render(); });
    app.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => openBuy(+b.dataset.buy, b.dataset.id)));
    app.querySelectorAll('[data-hwuse]').forEach((b) => b.addEventListener('click', () => openHwUse(b.dataset.hwuse)));
    app.querySelectorAll('[data-jf]').forEach((b) => b.addEventListener('click', () => { S.jf = b.dataset.jf; store.set('ek_jf', S.jf); render(); }));
    app.querySelectorAll('.qn[data-q]').forEach((b) => b.addEventListener('click', () => openNote(b.dataset.q, b)));
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
    const first = !skinSeen, was = skinSeen; skinSeen = id;
    if (first || was === id) { T.set(id); return; }
    // смена облика — всегда через экран загрузки: и когда меняет сам игрок, и когда Мастер
    const mine = !!S.busy;
    if (!mine) { busy('Меняем облик…', 'Мастер сменил облик твоего кубика'); const im = document.querySelector('#busy img'); if (im) im.src = dimg(was); }
    setTimeout(() => skinReveal(id), mine ? 350 : 1300);
  }
  function skinReveal(id) {
    const T = window.EkTheme, el = document.getElementById('busy');
    if (!el) { T.set(id); return; }
    busy('Облик «' + T.name(id) + '»', 'Готово — кубик и экран в новой атмосфере');
    el.classList.add('done'); const img = el.querySelector('img'); img.src = dimg(id);
    T.set(id); buzz([30, 40, 30]); beep(660, 0.15, 0.05); setTimeout(() => beep(990, 0.25, 0.05), 120);
    setTimeout(() => { const q = img.getBoundingClientRect(); T.burst(q.left + q.width / 2, q.top + q.height / 2, { n: 40, power: 340, ring: 2 }); }, 120);
    setTimeout(() => { el.classList.remove('done'); busy(null); soft(); }, 1400);
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
      ${xpBar(H.xp, true)}${dndBar(H.dnd, true)}${hpBar(H.hp, true)}
      <div class="stats"><div><small>Кошелёк</small>${money(H.wallet)}</div>${hw ? `<div><small>Конфеты</small><b>🍬 ${H.candy || 0}</b></div>` : ''}${H.stats ? `<div><small>Бросков</small><b>${H.stats.rolls}</b></div><div><small>Двадцаток</small><b>${H.stats.n20}</b></div><div><small>Единиц</small><b>${H.stats.n1}</b></div><div><small>Средний</small><b>${H.stats.avg || '—'}</b></div>` : ''}</div></div>
      ${bf.length ? `<div class="card buffs"><small>Действует сейчас</small><p>${bf.map(esc).join(' · ')}</p></div>` : ''}
      ${items.length || hw ? `<h3>Сладости и предметы ивента</h3>${hwItems(H)}` : ''}
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
  // ---------- доска заказов: листочки на пробковой доске ----------
  const DIFFN = ['', 'Лёгкий', 'Средний', 'Сложный', 'Смертельный'], DIFFI = ['', '◇', '◈', '◆', '☠'];
  const hash = (s) => { let x = 7; for (const ch of String(s || '')) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; };
  const QS = {};   // заказы по id — для раскрытия листочка
  const daysLeft = (q) => (q.due ? Math.ceil((q.due - ((S.game.clock && S.game.clock.t) || Date.now())) / 86400000) : null);
  function qNote(q, mode) {
    QS[q.id] = { q, mode };
    const r = hash(q.id), rot = ((r % 70) / 10 - 3.5).toFixed(1), w = WH[Math.min(7, q.wh || 0)], pin = ['#e0645a', '#e8c547', '#5ab0e0', '#7ad08a', '#c38cff'][r % 5];
    const me = myHero(), mine = (q.team || []).includes(me), left = daysLeft(q);
    const stamp = q.res === 'done' ? '<em class="stamp ok">выполнен</em>' : q.res === 'fail' ? '<em class="stamp bad">провален</em>' : mode === 'taken' ? `<em class="stamp take">${mine ? 'мой' : 'взят'}</em>` : '';
    return `<button class="qn ${mode} ${q.res || ''} ${mine ? 'mine' : ''}" data-q="${esc(q.id)}" style="--rot:${rot}deg;--wc:${w[2]};--pin:${pin}">
      <i class="pin"></i><i class="rib" title="${esc(w[0])} свисток"></i>
      <b>${esc(q.title)}</b>
      <span class="qn-m"><span>${DIFFI[q.diff || 1] || '◇'} ${esc(DIFFN[q.diff || 1] || '')}</span>${money(q.reward)}</span>
      ${mode === 'taken' && left != null && !q.res ? `<small class="${left < 1 ? 'late' : ''}">${left < 1 ? 'срок вышел' : 'осталось ' + left + ' дн.'}</small>` : ''}
      ${stamp}</button>`;
  }
  function vBoard() {
    const B = S.game.board || {}, me = myHero();
    const taken = (B.taken || []).slice().sort((a, b) => ((b.team || []).includes(me) ? 1 : 0) - ((a.team || []).includes(me) ? 1 : 0));
    const takenHtml = taken.length ? `<div class="cork small"><div class="cork-in">${taken.map((q) => qNote(q, 'taken')).join('')}</div></div>` : '<div class="empty sm">Отряд пока не взял ни одного заказа.</div>';
    const board = B.open
      ? `<div class="cork"><div class="cork-h">Доска заказов гильдии</div><div class="cork-in">${(B.board || []).length ? B.board.map((q) => qNote(q, 'board')).join('') : '<p class="cork-empty">Сегодня на доске пусто.</p>'}</div></div>
         ${(B.archive || []).length ? `<h3>Недавно закрытые</h3><div class="cork small dim"><div class="cork-in">${B.archive.slice(0, 6).map((q) => qNote(q, 'arch')).join('')}</div></div>` : ''}`
      : `<div class="cork shut"><div class="cork-in"><div class="shut-msg"><b>Доска закрыта</b><span>Новые заказы появятся здесь, когда Мастер подойдёт к доске.</span></div></div></div>`;
    return `<h3>Взятые заказы <small>${taken.filter((q) => (q.team || []).includes(me)).length} моих</small></h3>${takenHtml}
      <h3>Доска заказов ${B.open ? '<small class="live-tag">● Мастер у доски</small>' : ''}</h3>${board}`;
  }
  // листочек приближается с доски и раскрывается
  function openNote(id, from) {
    const it = QS[id]; if (!it || document.querySelector('.qz')) return;
    const q = it.q, w = WH[Math.min(7, q.wh || 0)], left = daysLeft(q), me = myHero();
    const ov = document.createElement('div'); ov.className = 'qz';
    ov.innerHTML = `<div class="qz-bg"></div><article class="qz-card" style="--wc:${w[2]}">
      <i class="pin"></i><i class="rib"><span>${esc(w[0])}</span></i><button class="qz-x" aria-label="Закрыть">✕</button>
      <div class="qz-body">
        <small class="qz-k">${esc(q.kind || 'Заказ')}${q.client ? ' · ' + esc(q.client) : ''}</small>
        <h2>${esc(q.title)}</h2>
        ${q.text ? `<p class="qz-t">${esc(q.text)}</p>` : ''}
        <dl>
          <div><dt>Награда</dt><dd>${money(q.res === 'done' && q.paid ? q.paid : q.reward)}</dd></div>
          <div><dt>Сложность</dt><dd>${DIFFI[q.diff || 1]} ${esc(DIFFN[q.diff || 1])}${q.fr != null && !q.res ? `<small class="qz-fr">провал — штраф ${q.fr}% награды</small>` : ''}</dd></div>
          <div><dt>Где</dt><dd>${esc(q.ln || 'Слой ' + (q.layer || 0))}</dd></div>
          <div><dt>Допуск</dt><dd><i class="dot" style="background:${w[2]}"></i>${esc(w[0])} свисток</dd></div>
          ${q.item && (q.item.name || q.qty) ? `<div><dt>Добыча</dt><dd>${esc(q.item.name || q.item.type || '—')}${q.qty ? ' · ' + (it.mode === 'taken' ? (q.got || 0) + ' из ' : '') + q.qty : ''}</dd></div>` : ''}
          <div><dt>Срок</dt><dd>${it.mode === 'taken' && left != null ? (left < 1 ? '<span class="late">срок вышел</span>' : 'осталось ' + left + ' дн.') : q.days ? q.days + ' дн. с момента, как возьмёте' : 'без срока'}</dd></div>
        </dl>
        ${q.team && q.team.length ? `<div class="qt">${q.team.map((k) => `<span style="--hc:${heroCol(k)}"><i></i>${esc(heroName(k))}${k === me ? ' (ты)' : ''}</span>`).join('')}</div>` : ''}
        ${q.res === 'done' ? '<em class="stamp ok big">выполнен</em>' : q.res === 'fail' ? '<em class="stamp bad big">провален</em>' : it.mode === 'taken' ? '<em class="stamp take big">взят отрядом</em>' : '<p class="qz-hint">Хотите взять — скажите Мастеру.</p>'}
      </div></article>`;
    document.body.appendChild(ov);
    const card = ov.querySelector('.qz-card'), r0 = from.getBoundingClientRect(), r1 = card.getBoundingClientRect();
    const sx = r0.width / r1.width, sy = r0.height / r1.height, dx = r0.left + r0.width / 2 - (r1.left + r1.width / 2), dy = r0.top + r0.height / 2 - (r1.top + r1.height / 2);
    const rot = getComputedStyle(from).getPropertyValue('--rot') || '0deg';
    card.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotate(${rot})`, opacity: 0.9 }, { transform: 'translate(0,0) scale(1.04) rotate(0.6deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.25,1)' });
    ov.querySelector('.qz-bg').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'both' });
    from.style.visibility = 'hidden'; beep(420, 0.08, 0.03); buzz(15);
    const close = () => {
      const a = card.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotate(${rot})`, opacity: 0.6 }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)' });
      ov.querySelector('.qz-bg').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: 'both' });
      a.onfinish = () => { ov.remove(); from.style.visibility = ''; };
    };
    ov.querySelector('.qz-bg').addEventListener('click', close); ov.querySelector('.qz-x').addEventListener('click', close);
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
    return `<h3>${esc(T.party || 'Отряд')}${T.rest === 'long' ? ' <small>☀ долгий отдых — аптечка лечит вдвое</small>' : ''}</h3>${HEROES.map((k) => { const H = S.heroes[k] || {}, w = WH[Math.min(7, H.whistle || 0)]; return `<div class="card hero sm" style="--hc:${heroCol(k)}"><div class="hrow"><div><h2>${esc(H.name || heroName(k))}</h2><span class="wh" style="--wc:${w[2]}"><i></i>${w[0]} · ${w[1]}</span></div><div class="right">${money(H.wallet)}${S.game.hw && S.game.hw.live ? `<small>🍬 ${H.candy || 0}</small>` : ''}</div></div>${xpBar(H.xp)}${dndBar(H.dnd)}${hpBar(H.hp)}</div>`; }).join('')}
      ${S.game.board && S.game.board.fund ? `<div class="card"><small>Общий фонд</small> ${money(S.game.board.fund)}</div>` : ''}`;
  }
  function vEvent() {
    const E = S.game.hw, me = myHero(), H = S.heroes[me] || {}; if (!E || !E.live) return '<div class="empty">Сейчас нет ивента.</div>';
    const left = Math.max(0, E.slotEnd - Date.now()), mm = Math.floor(left / 60000), ss = Math.floor(left / 1000) % 60;
    const own = (id) => (H.hwSkins || []).includes(id) || (H.skins || []).some((q) => q.id === id), off = !gmOn();
    const lot = (l, i) => { const sk = l.id.startsWith('skin:'), d = sk ? E.sk[l.id.slice(5)] || {} : E.it[l.id] || {}, has = sk && own(l.id.slice(5)), poor = (H.candy || 0) < l.p;
      return `<div class="card lot r${d.r || 1} ${l.st <= 0 ? 'sold' : ''}"><i>${sk ? '◈' : esc(d.ic || '?')}</i><small>${sk ? 'облик · ' : ''}${RAR[d.r || 1]}${l.sale ? ' · скидка' : ''}</small><b>${esc(d.n || l.id)}</b><p>${esc(sk ? 'Облик кубика. Остаётся навсегда.' : d.d || '')}</p><div class="lf"><span>${l.st <= 0 ? 'раскуплено' : 'осталось ' + l.st}</span><em>${l.p} 🍬</em></div>
        <button class="btn buy" data-buy="${i}" data-id="${esc(l.id)}" ${l.st <= 0 || has || poor || off ? 'disabled' : ''}>${l.st <= 0 ? 'раскуплено' : has ? 'уже есть' : poor ? 'не хватает ' + (l.p - (H.candy || 0)) + ' 🍬' : 'Купить'}</button></div>`; };
    const T = (H.tasks || []).map((q) => { const d = (E.tasks || []).find((x) => x.id === q.id) || { t: q.id, need: 1, rew: 0 }; return `<li class="${q.done ? 'done' : ''}"><i>${q.done ? '✔' : '○'}</i><span>${esc(d.t)} · ${q.c}/${d.need}</span><em>+${d.rew} 🍬</em></li>`; }).join('');
    const pt = E.potT || [], lastT = pt.length ? pt[pt.length - 1][0] : 1000;
    return `<div class="card evh"><b>🎃 Ночь Тонкой Грани</b><span>ещё ${Math.ceil((E.end - Date.now()) / 86400000)} дн.</span></div>
      <h3>Прилавок Тыквенного торговца <small>новый товар через ${mm}:${String(ss).padStart(2, '0')}</small></h3>
      <div class="grid">${(E.lots || []).map(lot).join('')}</div>
      <p class="note">${off ? 'Покупать можно, когда Мастер в сети.' : 'Покупай прямо отсюда — конфеты спишутся сами.'} А тыквы иногда прилетают прямо на этот экран — лови их, это конфеты!</p>
      <h3>Мои сладости и предметы <small>🍬 ${H.candy || 0}</small></h3>${hwItems(H)}
      <h3>Общий котёл · ${E.pot.n} 🍬</h3><div class="bar"><i style="width:${Math.min(100, E.pot.n / lastT * 100).toFixed(1)}%"></i></div>
      <ul class="thr">${pt.map(([n, t]) => `<li class="${E.pot.got.includes(n) ? 'got' : ''}"><b>${n}</b><span>${esc(t)}</span></li>`).join('')}<li class="${E.pot.box ? 'got' : ''}"><b>+${E.boxStep}</b><span>потом — Ящик Тонкой Грани каждому${E.pot.box ? ' (выдано: ' + E.pot.box + ')' : ''}</span></li></ul>
      ${T ? `<h3>Мои задания на сегодня</h3><ul class="tasks">${T}</ul>` : ''}`;
  }
  // ---------- вещи: при себе, рюкзаки, сундук ----------
  //  Перекладывать можно сколько угодно — это черновик на твоём устройстве.
  //  «Сохранить» отправляет всё разом; Экосистема Мастера проверяет и сразу применяет.
  const fW = (v) => String(Math.round((+v || 0) * 100) / 100).replace('.', ',') + ' фнт';
  const ATKN = { melee: '⚔ ближняя', arrow: '🏹 стрелы', bolt: '🎯 болты', dart: '🗡️ дротики' };
  const ENCN = ['Свободно', 'Перегружен', 'Сильно перегружен', 'Сверх грузоподъёмности'];
  // свисток: продолговатый, с мундштуком, отверстием и кольцом для шнурка (как в Экосистеме Мастера)
  function whSVG(i) {
    i = Math.max(0, Math.min(7, i | 0)); const c = WH[i][2], dark = i === 7 ? '#120204' : 'rgba(0,0,0,.45)', body = i === 7 ? 'url(#whrb)' : c;
    return `<svg class="whi" viewBox="0 0 32 32" aria-hidden="true">${i === 7 ? '<defs><linearGradient id="whrb" x1="0" x2="1"><stop offset="0" stop-color="#d8323f"/><stop offset=".55" stop-color="#5a0a12"/><stop offset="1" stop-color="#120204"/></linearGradient></defs>' : ''}<g transform="rotate(-32 16 16)"><path d="M3 11.2h4.2v9.6H3a1.6 1.6 0 0 1-1.6-1.6v-6.4A1.6 1.6 0 0 1 3 11.2z" fill="${dark}"/><rect x="6" y="10" width="19.5" height="12" rx="6" fill="${body}" stroke="${dark}" stroke-width="1.1"/><path d="M11 10.6h5.2l-1.3 3.6h-2.6z" fill="rgba(0,0,0,.65)"/><rect x="8.5" y="11.6" width="14" height="2" rx="1" fill="rgba(255,255,255,.55)"/><rect x="8" y="19" width="15" height="1.4" rx=".7" fill="rgba(0,0,0,.25)"/><circle cx="28.3" cy="16" r="2.6" fill="none" stroke="#e2cd8e" stroke-width="1.7"/></g></svg>`;
  }
  const ico = (ic) => (/^wh:[0-7]$/.test(String(ic || '')) ? whSVG(+String(ic).slice(3)) : esc(ic || '❓'));
  // ---- черновик ----
  S.dr = { moves: [] };   // { from, id, to, u } — откуда (исходное место), какая стопка, куда, сколько штук
  const sigOf = (s) => [s.name, s.desc || '', +s.w || 0, s.icon, +s.U || 0, s.role || ''].join('\u0001');
  const placesOf = (B) => [['inv', B.items]].concat(B.packs.map((p) => ['pack:' + p.id, p.items]), [['chest', B.chest]]);
  const placeName = (B, w) => (w === 'inv' ? 'при себе' : w === 'chest' ? 'сундук' : w.startsWith('hero:') ? heroName(w.slice(5)) : '«' + ((B.packs.find((p) => 'pack:' + p.id === w) || {}).name || 'рюкзак') + '»');
  // как всё лежит с учётом черновика
  function lay(B) {
    const M = S.dr.moves, byId = {}, L = {};
    placesOf(B).forEach(([w, arr]) => { L[w] = []; arr.forEach((s) => { byId[w + '|' + s.id] = s; }); });
    const outOf = () => { const o = {}; M.forEach((m) => { o[m.from + '|' + m.id] = (o[m.from + '|' + m.id] || 0) + m.u; }); return o; };
    let out = outOf();
    // инвентарь поменялся, пока ты перекладывал (Мастер выдал, потратил, переложил) — лишнее из черновика убираем
    const bad = Object.keys(out).filter((key) => !byId[key] || out[key] > byId[key].n), badTo = M.filter((m) => !m.to.startsWith('hero:') && !L[m.to]);
    if (bad.length || badTo.length) { S.dr.moves = M.filter((m) => !bad.includes(m.from + '|' + m.id) && !badTo.includes(m)); S.dr.pruned = true; return lay(B); }
    out = outOf();
    placesOf(B).forEach(([w, arr]) => arr.forEach((s) => { const u = s.n - (out[w + '|' + s.id] || 0); if (u > 0) L[w].push({ from: w, s, u }); }));
    const gone = [];
    M.forEach((m) => { const part = { from: m.from, s: byId[m.from + '|' + m.id], u: m.u, m }; if (L[m.to]) L[m.to].push(part); else gone.push(Object.assign({ to: m.to }, part)); });
    const G = {};
    Object.keys(L).forEach((w) => { const map = new Map(); L[w].forEach((p) => { const g = sigOf(p.s); if (!map.has(g)) map.set(g, { w, s: p.s, u: 0, parts: [], moved: false }); const x = map.get(g); x.u += p.u; x.parts.push(p); if (p.m) x.moved = true; }); G[w] = Array.from(map.values()); });
    // сколько весит: при себе + сами рюкзаки + монеты; содержимое рюкзаков не считается
    const gw = (g) => (+g.s.w || 0) * g.u, sum = (w) => (G[w] || []).reduce((a, g) => a + gw(g), 0);
    const load = {}; B.packs.forEach((p) => { load['pack:' + p.id] = sum('pack:' + p.id); });
    const carried = sum('inv') + B.packs.reduce((a, p) => a + (+p.w || 0), 0) + ((B.coins && B.coins.w) || 0);
    const lim = (B.enc && B.enc.lim) || (B.cap ? [B.cap / 3, B.cap * 2 / 3, B.cap] : null);
    const lvl = lim ? (carried > lim[2] ? 3 : carried > lim[1] ? 2 : carried > lim[0] ? 1 : 0) : 0;
    const over = B.packs.filter((p) => p.cap && load['pack:' + p.id] > p.cap + 1e-9);
    return { G, gone, load, carried, lim, lvl, over, gw };
  }
  // переложить u штук из группы g (лежит в from) в место to
  function drMove(from, g, to, u) {
    const M = S.dr.moves; let left = u;
    const add = (o, id, t, k) => { if (o === t || k <= 0) return; const m = M.find((x) => x.from === o && x.id === id && x.to === t); if (m) m.u += k; else M.push({ from: o, id, to: t, u: k }); };
    // сначала то, что уже перекладывали (так «вернуть обратно» отменяет перестановку), потом своё
    g.parts.slice().sort((a, b) => (a.m ? 0 : 1) - (b.m ? 0 : 1)).forEach((p) => {
      if (left <= 0) return; const k = Math.min(left, p.u); left -= k;
      if (p.m) { p.m.u -= k; if (p.m.u <= 0) M.splice(M.indexOf(p.m), 1); add(p.from, p.s.id, to, k); }
      else add(from, p.s.id, to, k);
    });
  }
  const BI = {};
  function bItem(g, key) {
    BI[key] = g; const s = g.s, nat = !g.moved && g.parts.length === 1 && g.u === s.n, p = s.U && nat ? Math.max(0, Math.min(1, s.left / s.U)) : 0;
    return `<button class="bi ${g.w === 'chest' ? 'locked' : ''} ${g.moved ? 'moved' : ''}" data-bi="${esc(key)}"><i>${ico(s.icon)}</i><b>${esc(s.name)}</b>${g.u > 1 ? `<span class="bx">×${g.u}</span>` : ''}<small>${s.U && nat ? s.left + '/' + s.U + ' исп.' : s.U ? 'по ' + s.U + ' исп.' : ''}</small><em>${fW((+s.w || 0) * g.u)}</em>${s.U && nat ? `<span class="bu"><u style="width:${(p * 100).toFixed(0)}%"></u></span>` : ''}</button>`;
  }
  function vBag() {
    const me = myHero(), H = S.heroes[me] || {}, B = H.bag;
    if (!B || (!B.items.length && !B.packs.length && !B.chest.length)) { S.dr.moves = []; return '<div class="empty">Сумка пуста. Вещи появятся, когда Мастер их выдаст.</div>'; }
    const X = lay(B), E = B.enc || {}, n = S.dr.moves.length, cap = X.lim ? X.lim[2] : 0, pc = cap ? Math.min(100, X.carried / cap * 100) : 0;
    Object.keys(BI).forEach((k) => delete BI[k]);
    const grid = (w, empty) => ((X.G[w] || []).length ? X.G[w].map((g, i) => bItem(g, w + '#' + i)).join('') : `<p class="note">${empty}</p>`);
    const spd = E.base != null ? Math.max(0, E.base - [0, 10, 20, 20][X.lvl]) : null;
    const marks = X.lim ? X.lim.slice(0, 2).map((v) => `<u style="left:${(v / cap * 100).toFixed(1)}%"></u>`).join('') : '';
    let html = `<div class="card bag-top lv${X.lvl}"><div><small>Несу на себе</small><b>${fW(X.carried)}</b>${cap ? `<span> из ${fW(cap)}</span>` : ''}</div><div class="bag-atk"><small>Атака</small><b>${ATKN[B.atk] || ATKN.melee}</b></div>
      ${cap ? `<div class="bag-bar">${marks}<i style="width:${pc.toFixed(1)}%"></i></div>` : ''}
      <div class="enc"><b>${ENCN[X.lvl]}</b>${spd != null ? `<span>скорость ${spd} фт${X.lvl ? ' (обычно ' + E.base + ')' : ''}</span>` : ''}${X.lim ? `<small>Сила ${E.str || '—'}: перегруз с ${fW(X.lim[0])}, сильный — с ${fW(X.lim[1])}, предел ${fW(X.lim[2])}</small>` : ''}${X.lvl >= 2 ? '<small class="warn">Помеха на проверки, спасброски и атаки Силы, Ловкости и Телосложения</small>' : ''}</div></div>
      ${B.coins && B.coins.n ? `<div class="card coins-row"><i>🪙</i><div><b>Монеты в кошельке · ${B.coins.n} шт.</b><small>Каждая весит 1/10 фунта — считаются в весе сами</small></div><em>${fW(B.coins.w)}</em></div>` : ''}
      <h3>При себе <small>считается в весе</small></h3><div class="bgrid">${grid('inv', 'Ничего в руках.')}</div>
      ${B.packs.map((p) => { const ld = X.load['pack:' + p.id], ov = p.cap && ld > p.cap + 1e-9; return `<div class="pack ${ov ? 'over' : ''}"><div class="pack-h"><i>${ico(p.icon)}</i><div><b>${esc(p.name)}</b><small>внутри ${fW(ld)} из ${fW(p.cap)} · сам весит ${fW(p.w)}</small></div></div><div class="bag-bar"><i style="width:${p.cap ? Math.min(100, ld / p.cap * 100).toFixed(1) : 0}%"></i></div><div class="bgrid">${grid('pack:' + p.id, 'Пусто.')}</div></div>`; }).join('')}
      <h3>🧰 Сундук <small>не в весе · пользоваться нельзя</small></h3><div class="bgrid chest">${grid('chest', 'Сундук пуст.')}</div>`;
    if (X.gone.length) html += `<h3>🤝 Отдаю товарищам <small>уйдёт после «Сохранить»</small></h3><div class="bgrid">${X.gone.map((p, i) => { const key = 'gone#' + i; BI[key] = { gone: p }; return `<button class="bi moved" data-bi="${key}"><i>${ico(p.s.icon)}</i><b>${esc(p.s.name)}</b>${p.u > 1 ? `<span class="bx">×${p.u}</span>` : ''}<small>→ ${esc(heroName(p.to.slice(5)))}</small><em>${fW((+p.s.w || 0) * p.u)}</em></button>`; }).join('')}</div>`;
    html += `<p class="note">Нажми на вещь, чтобы переложить её, отдать товарищу или потратить использование. Перестановки — черновик: вступят в силу, когда нажмёшь «Сохранить».</p>`;
    if (n) html += `<div class="drbar ${X.over.length ? 'bad' : ''}"><div><b>Перестановок: ${n}</b><small>${X.over.length ? '«' + esc(X.over[0].name) + '» не вместит — переложи лишнее' : X.lvl !== (E.lvl || 0) ? 'станет: ' + ENCN[X.lvl].toLowerCase() : 'пока это только черновик'}</small></div><button class="btn ghost" id="drUndo">Отменить</button><button class="btn primary" id="drSave" ${X.over.length || !gmOn() ? 'disabled' : ''}>Сохранить</button></div>`;
    if (S.dr.pruned) { S.dr.pruned = false; setTimeout(() => note('Инвентарь изменился — часть перестановок сброшена', 'bad'), 50); }
    return html;
  }
  // окно вещи: сколько штук, куда, кому
  function sheet(inner) {
    const ov = document.createElement('div'); ov.className = 'isheet'; ov.innerHTML = `<div class="is-bg"></div><div class="is-card">${inner}</div>`;
    document.body.appendChild(ov);
    const close = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 220); };
    ov.querySelector('.is-bg').addEventListener('click', close); const x = ov.querySelector('.is-x'); if (x) x.addEventListener('click', close);
    return { ov, close, $: (q) => ov.querySelector(q), $$: (q) => ov.querySelectorAll(q) };
  }
  function openItem(key) {
    const it = BI[key]; if (!it || document.querySelector('.isheet')) return;
    const me = myHero(), B = (S.heroes[me] || {}).bag; if (!B) return;
    if (it.gone) {   // уже отдаётся товарищу — можно передумать
      const p = it.gone, Q = sheet(`<div class="is-h"><i>${ico(p.s.icon)}</i><div><b>${esc(p.s.name)}${p.u > 1 ? ' ×' + p.u : ''}</b><small>отдаю: ${esc(heroName(p.to.slice(5)))}</small></div><button class="is-x" aria-label="Закрыть">✕</button></div><div class="is-acts"><button class="btn" data-back="1">↩ Передумал — оставить себе</button></div>`);
      Q.$('[data-back]').addEventListener('click', () => { p.m.u = 0; S.dr.moves = S.dr.moves.filter((m) => m.u > 0); Q.close(); render(); });
      return;
    }
    const g = it, s = g.s, where = g.w, X = lay(B), unitW = +s.w || 0, max = g.u;
    const nat = !g.moved && g.parts.length === 1 && g.u === s.n;
    const dests = [['inv', '↩ Взять в руки']].concat(B.packs.map((p) => ['pack:' + p.id, ico(p.icon) + ' В «' + esc(p.name) + '»', Math.max(0, p.cap - X.load['pack:' + p.id])]), [['chest', '🧰 В сундук']]).filter(([w]) => w !== where);
    const mates = HEROES.filter((k) => k !== me && S.heroes[k]);
    const usable = where !== 'chest' && (s.U || s.role) && nat && !S.dr.moves.length;
    const Q = sheet(`<div class="is-h"><i>${ico(s.icon)}</i><div><b>${esc(s.name)}${max > 1 ? ' ×' + max : ''}</b><small>${fW(unitW * max)}${s.U && nat ? ' · ' + s.left + '/' + s.U + ' использований' + (s.n > 1 ? ' (всего ' + s.t + ')' : '') : ''}${where === 'chest' ? ' · в сундуке' : ''}${g.moved ? ' · переложено (черновик)' : ''}</small></div><button class="is-x" aria-label="Закрыть">✕</button></div>
      ${s.desc ? `<p class="is-d">${esc(s.desc)}</p>` : ''}
      ${max > 1 ? `<div class="qty"><div class="qty-h"><span>Сколько штук</span><b class="qv">1</b><small>из ${max} · <em class="qw">${fW(unitW)}</em></small></div>
        <input type="range" class="qr" min="1" max="${max}" value="1" step="1" aria-label="Сколько штук">
        <div class="qty-b"><button data-q="1">1</button>${max >= 4 ? `<button data-q="${Math.floor(max / 2)}">половина · ${Math.floor(max / 2)}</button>` : ''}<button data-q="${max}">все · ${max}</button><input type="number" class="qnum" min="1" max="${max}" value="1" inputmode="numeric" aria-label="Точное число"></div></div>` : ''}
      <div class="is-acts">${dests.map(([w, t, free]) => `<button class="btn" data-to="${esc(w)}" ${free != null ? `data-free="${free}"` : ''}>${t}${free != null ? ` <small>свободно ${fW(free)}</small>` : ''}</button>`).join('')}
      ${mates.length ? `<div class="is-mates">${mates.map((k) => `<button class="btn" data-to="hero:${k}" style="--hc:${heroCol(k)}">🤝 Отдать: ${esc(heroName(k))}</button>`).join('')}</div>` : ''}
      ${(s.U || s.role) && where !== 'chest' ? `<button class="btn primary" data-use="1" ${usable ? '' : 'disabled'}>Использовать (−1)</button>` : ''}</div>
      ${(s.U || s.role) && where !== 'chest' && !usable ? '<p class="note">Использовать можно, когда все перестановки сохранены.</p>' : ''}
      ${where === 'chest' ? '<p class="note">Из сундука пользоваться нельзя — сначала достань.</p>' : ''}`);
    let q = 1;
    const setQ = (v) => {
      q = Math.max(1, Math.min(max, Math.floor(+v) || 1));
      const r = Q.$('.qr'), nn = Q.$('.qnum'); if (r) r.value = q; if (nn && document.activeElement !== nn) nn.value = q;
      const qv = Q.$('.qv'), qw = Q.$('.qw'); if (qv) qv.textContent = q; if (qw) qw.textContent = fW(unitW * q);
      Q.$$('[data-q]').forEach((b) => b.classList.toggle('on', +b.dataset.q === q));
      Q.$$('[data-free]').forEach((b) => { b.disabled = unitW * q > +b.dataset.free + 1e-9; });
    };
    if (Q.$('.qr')) { Q.$('.qr').addEventListener('input', (e) => setQ(e.target.value)); Q.$('.qnum').addEventListener('input', (e) => { if (e.target.value !== '') setQ(e.target.value); }); Q.$('.qnum').addEventListener('blur', (e) => { e.target.value = q; }); Q.$$('[data-q]').forEach((b) => b.addEventListener('click', () => setQ(b.dataset.q))); }
    setQ(1);
    Q.$$('[data-to]').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; drMove(where, g, b.dataset.to, q); Q.close(); buzz(15); render(); }));
    const u = Q.$('[data-use]'); if (u) u.addEventListener('click', async () => { if (S.busy || u.disabled) return; Q.close(); busy('Используем «' + s.name + '»', 'Экосистема Мастера списывает одно использование'); if (!(await ask('inv', { op: 'use', from: where, id: s.id }))) busy(null); });
  }
  async function drSave() {
    if (S.busy || !S.dr.moves.length) return;
    const moves = S.dr.moves.map((m) => ({ from: m.from, id: m.id, to: m.to, u: m.u }));
    busy('Сохраняем вещи', 'Экосистема Мастера проверяет и раскладывает — пару секунд');
    S.dr.sent = JSON.stringify(moves);
    if (!(await ask('inv', { op: 'batch', moves }))) { S.dr.sent = null; busy(null); }
  }
  // предметы ивента: нажми — и используй со своего устройства
  function hwItems(H) {
    const items = itemsOf(H);
    if (!items.length) return '<div class="empty sm">Пусто. Загляни к Тыквенному торговцу.</div>';
    const off = !gmOn() || !(S.game.hw && S.game.hw.live);
    return `<div class="grid">${items.map((x) => `<button class="card it hwi r${x.d.r || 1}" data-hwuse="${esc(x.id)}" ${off ? 'disabled' : ''}><i>${esc(x.d.ic)}</i><div><b>${esc(x.d.n)}${x.n > 1 ? ' ×' + x.n : ''}</b><p>${esc(x.d.d)}</p></div><span class="use">${off ? '' : 'Использовать'}</span></button>`).join('')}</div>${off ? '<p class="note">Использовать можно, когда Мастер в сети и идёт ивент.</p>' : ''}`;
  }
  function openHwUse(id) {
    const H = S.heroes[myHero()] || {}, it = ((S.game.hw && S.game.hw.it) || {})[id]; if (!it || !((H.inv || {})[id] > 0) || document.querySelector('.isheet')) return;
    const Q = sheet(`<div class="is-h"><i>${esc(it.ic)}</i><div><b>${esc(it.n)}${H.inv[id] > 1 ? ' ×' + H.inv[id] : ''}</b><small>${RAR[it.r || 1]}</small></div><button class="is-x" aria-label="Закрыть">✕</button></div>
      <p class="is-d">${esc(it.d)}</p>${id === 'cleanse' ? '<p class="note">Снимет с твоего кубика проклятия, какие есть. Если их нет — предмет останется у тебя.</p>' : ''}
      <div class="is-acts"><button class="btn primary" data-go="1">Использовать</button></div>`);
    Q.$('[data-go]').addEventListener('click', async () => { if (S.busy) return; Q.close(); busy(it.ic + ' ' + it.n, 'Экосистема Мастера применяет предмет — пару секунд'); if (!(await ask('hw', { op: 'use', id }))) busy(null); });
  }
  function openBuy(i, id) {
    const E = S.game.hw, l = E && (E.lots || [])[i]; if (!l || l.id !== id || document.querySelector('.isheet')) return;
    const sk = id.startsWith('skin:'), d = sk ? E.sk[id.slice(5)] || {} : E.it[id] || {}, H = S.heroes[myHero()] || {};
    const Q = sheet(`<div class="is-h"><i>${sk ? '◈' : esc(d.ic || '?')}</i><div><b>${esc(d.n || id)}</b><small>${sk ? 'облик кубика · ' : ''}${RAR[d.r || 1]}</small></div><button class="is-x" aria-label="Закрыть">✕</button></div>
      <p class="is-d">${esc(sk ? 'Облик кубика. Остаётся навсегда.' : d.d || '')}</p>
      <div class="is-acts"><button class="btn primary" data-go="1">Купить за ${l.p} 🍬 <small>останется ${(H.candy || 0) - l.p} 🍬</small></button></div>`);
    Q.$('[data-go]').addEventListener('click', async () => { if (S.busy) return; Q.close(); busy('🛒 ' + (d.n || id), 'Тыквенный торговец заворачивает покупку'); if (!(await ask('hw', { op: 'buy', i, id }))) busy(null); });
  }
  // журнал: всё подряд или по разделам
  const JF = [['all', 'Всё', null], ['inv', 'Вещи', ['inv']], ['xp', 'Опыт', ['xp', 'ach']], ['money', 'Деньги', ['money', 'fine', 'upkeep', 'casino', 'quest']], ['fight', 'Бой и ОЗ', ['fight', 'hp']], ['hw', 'Ивент', ['hw']]];
  S.jf = store.get('ek_jf', 'all');
  function vJournal() {
    const J = (S.game.journal && S.game.journal.list) || [];
    if (!J.length) return '<div class="empty">Журнал пуст.</div>';
    const f = JF.find((x) => x[0] === S.jf) || JF[0], L = J.filter((e) => !f[2] || f[2].includes(e.k));
    return `<div class="jf">${JF.map(([id, t, ks]) => `<button data-jf="${id}" class="${id === f[0] ? 'on' : ''}">${t}${ks ? ` <small>${J.filter((e) => ks.includes(e.k)).length}</small>` : ''}</button>`).join('')}</div>
      ${L.length ? `<ul class="jr">${L.slice().reverse().map((e) => `<li class="${e.imp ? 'imp' : ''} k-${esc(e.k || '')}"><i>${esc(e.ic || '•')}</i><span>${esc(e.txt)}</span><small>${ago(e.t)}</small></li>`).join('')}</ul>` : '<div class="empty sm">Здесь пока пусто.</div>'}`;
  }
  setInterval(() => { if (S.prof && S.prof.role !== 'pending' && (S.tab === 'event' || S.tab === 'rolls')) { const a = document.activeElement; if (!a || a.tagName !== 'INPUT') render(); } }, 15000);
  start().catch((e) => { app.innerHTML = '<div class="boot">Ошибка: ' + esc(e.message || e) + '</div>'; });
})();
