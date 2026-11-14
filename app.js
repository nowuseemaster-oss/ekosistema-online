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
  const TABS = [['rolls', '🎲', 'Броски'], ['me', '◆', 'Я'], ['style', '🎴', 'Стили'], ['bag', '🎒', 'Вещи'], ['board', '📌', 'Заказы'], ['fight', '⚔', 'Бой'], ['team', '👥', 'Отряд'], ['notes', '📓', 'Заметки'], ['event', '🎃', 'Ивент'], ['journal', '📜', 'Журнал']];
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
  const SPI = { '21': '21', '0': '0', '-1': '−1', Angel: '☩', '777': '777', '666': '666', '01010011': '⛨', HACK: '⌁', ERROR: '!', NULL: '∅', Abyss: '◉', Andromeda: '✧', Galaxy: '✺', Comet: '☄', Singularity: '◍', Pustota: '◌', Sunrise: '☀', Illusion: '◈', Debt: '¤', Barter: '⇄', Nostalgia: '❀', Dejavu: '↺', Jester: '🃏', Life: '⌛', Calamity: '❂', TrickTreat: '🍬', Pumpkin: '🎃', Thirteen: '13', HwGhost: '👻' };
  const teamSkin = (k) => S.game.team && S.game.team.skins && S.game.team.skins[k];
  const skinOf = (k) => (k === 'main' ? teamSkin('main') : (S.heroes[k] && S.heroes[k].skin) || teamSkin(k)) || 'classic';
  const dimg = (sk) => 'dice/' + encodeURIComponent(sk || 'classic') + '.webp';
  const faceTxt = (r) => (/^-?\d+$/.test(r.value) ? String(r.value).replace('-', '−') : SPI[r.value] || (S.game.team && S.game.team.spi && S.game.team.spi[r.value]) || '✦');
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
    let { error } = await sb.from('actions').insert({ hero: me, kind, payload });
    // облик героя и стили — новые виды просьб; если база их ещё не знает, отправляем внутри «облика кубика» (Мастер v7.6 поймёт)
    if (error && (kind === 'look' || kind === 'style') && !/EK_TOO_FAST/.test(error.message)) ({ error } = await sb.from('actions').insert({ hero: me, kind: 'skin', payload: Object.assign({ sub: kind }, payload) }));
    if (error) { note(/EK_TOO_FAST/.test(error.message) ? 'Слишком часто — подожди немного' : 'Не получилось: ' + error.message, 'bad'); return false; }
    return true;
  }
  function onResult(a) {
    const r = a.result || {};
    if (a.kind === 'skin' && a.payload && a.payload.sub) a = Object.assign({}, a, { kind: a.payload.sub });
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
    if (a.kind === 'look') { busy(null); if (r.ok) { note('Облик сохранён ✓', 'good'); beep(660, 0.15, 0.05); setTimeout(() => beep(990, 0.2, 0.05), 110); buzz(30); } else note('Облик не сохранился: ' + (r.why || 'неизвестно'), 'bad'); soft(); }
    if (a.kind === 'style') stResult(a);
    if (a.kind === 'pumpkin') { busy(null); if (r.ok) { note(r.pot ? '🎃 +' + r.n + ' 🍬 в общий котёл!' + (r.left != null ? ' Сегодня ещё ' + r.left : '') : '🎃 +' + r.n + ' 🍬 — тыква поймана!', 'good'); beep(880, 0.2); setTimeout(() => beep(1320, 0.3), 120); buzz([40, 30, 40]); } else note('Тыква: ' + (r.why || 'не засчитана'), 'bad'); }
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
  const visTabs = () => TABS.filter(([id]) => id !== 'event' || (S.game.hw && S.game.hw.live));
  // ---------- свайпы между разделами (телефон) ----------
  //  Влево — следующий раздел, вправо — предыдущий. Не мешает: доске, блокноту, полям ввода,
  //  лентам, которые сами листаются вбок, и системному жесту «назад» у края экрана.
  function goTab(d) {
    const L = visTabs(), i = L.findIndex(([id]) => id === S.tab), j = i + d;
    if (i < 0 || j < 0 || j >= L.length) return false;
    S.tab = L[j][0]; store.set('ek_tab', S.tab); window.scrollTo(0, 0); render(); buzz(8);
    const pane = app.querySelector('#pane'); if (pane) { pane.classList.remove('sw-l', 'sw-r'); void pane.offsetWidth; pane.classList.add(d > 0 ? 'sw-l' : 'sw-r'); clearTimeout(S.swT); S.swT = setTimeout(() => pane.classList.remove('sw-l', 'sw-r'), 340); }
    return true;
  }
  (function swipes() {
    let st = null;
    const NO = 'input, textarea, select, button.ss-spin, .bd-view, .nb-wrap, .tabs, [data-noswipe]';
    const blocked = (el) => { for (let e = el; e && e !== app && e.nodeType === 1; e = e.parentElement) { if (e.matches(NO)) return true; const ox = getComputedStyle(e).overflowX; if ((ox === 'auto' || ox === 'scroll') && e.scrollWidth > e.clientWidth + 2) return true; } return false; };
    app.addEventListener('touchstart', (e) => {
      st = null;
      if (e.touches.length !== 1 || S.busy || !S.prof || S.prof.role === 'pending' || !app.querySelector('#pane')) return;
      const t = e.touches[0]; if (t.clientX < 20 || t.clientX > innerWidth - 20) return;
      if (!blocked(e.target)) st = { x: t.clientX, y: t.clientY, t: Date.now() };
    }, { passive: true });
    app.addEventListener('touchmove', (e) => { if (st && e.touches.length > 1) st = null; }, { passive: true });
    app.addEventListener('touchend', (e) => {
      if (!st) return; const t = e.changedTouches[0], dx = t.clientX - st.x, dy = t.clientY - st.y, dt = Date.now() - st.t; st = null;
      if (dt > 650 || Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.7) return;
      if (goTab(dx < 0 ? 1 : -1) && !store.get('ek_sw_seen', false)) { store.set('ek_sw_seen', true); }
    }, { passive: true });
    app.addEventListener('touchcancel', () => { st = null; }, { passive: true });
    // один раз подсказать на телефоне, что разделы листаются пальцем
    setTimeout(() => { try { if (!matchMedia('(pointer: coarse)').matches || store.get('ek_sw_seen', false) || !app.querySelector('#pane')) return; store.set('ek_sw_seen', true); const h = document.createElement('div'); h.className = 'sw-hint'; h.textContent = '← листай пальцем между разделами →'; document.body.appendChild(h); setTimeout(() => h.remove(), 3500); } catch (e) {} }, 2500);
  })();
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
    const tabs = visTabs();
    if (!tabs.find(([id]) => id === S.tab)) S.tab = 'rolls';
    const nav = `<nav class="tabs">${tabs.map(([id, ic, t]) => `<button data-t="${id}" class="${S.tab === id ? 'on' : ''}"><i>${ic}</i><span>${t}</span>${id === 'fight' && myTurn ? '<em></em>' : ''}${id === 'bag' && S.dr.moves.length ? '<em class="dr"></em>' : ''}</button>`).join('')}</nav>`;
    const rich = { style: stylePane, notes: notesPane }[S.tab];
    const y = window.scrollY;
    if (!app.querySelector('#hd')) app.innerHTML = '<div id="hd"></div><main class="pane" id="pane"></main><div id="nv"></div>';
    const hd = app.querySelector('#hd'), pane = app.querySelector('#pane'), nv = app.querySelector('#nv');
    hd.innerHTML = head; nv.innerHTML = nav;
    document.documentElement.style.setProperty('--hdh', Math.max(48, ...[...hd.children].map((e) => e.getBoundingClientRect().bottom)) + 'px');   // шапка и плашки под ней («Мастер не в сети», «твой ход»)
    if (rich) { const el = rich(); pane.classList.add('rich'); if (pane.firstChild !== el || pane.childNodes.length !== 1) pane.replaceChildren(el); if (el.__refresh) el.__refresh(); }
    else { pane.classList.remove('rich'); pane.innerHTML = ({ rolls: vRolls, me: vMe, bag: vBag, board: vBoard, fight: vFight, team: vTeam, event: vEvent, journal: vJournal }[S.tab] || vRolls)(); }
    { const nb = app.querySelector('.tabs'); if (nb) document.documentElement.style.setProperty('--nvh', nb.getBoundingClientRect().height + 'px'); }
    bindLive();
    const lke = app.querySelector('#lkEdit'); if (lke) lke.addEventListener('click', openLook);
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
      ${vCal(H)}${vLook(H, me)}
      ${bf.length ? `<div class="card buffs"><small>Действует сейчас</small><p>${bf.map(esc).join(' · ')}</p></div>` : ''}
      ${items.length || hw ? `<h3>Сладости и предметы ивента</h3>${hwItems(H)}` : ''}
      <h3>Достижения · ${(H.ach || []).length}${H.achTotal ? ' из ' + H.achTotal : ''}</h3>
      ${(H.ach || []).length ? `<div class="achs">${H.ach.slice(0, 60).map((a) => `<div class="ach lv${a.lv}" title="${esc(a.d)}"><i class="${String(a.ic || '').length > 3 ? 'l4' : String(a.ic || '').length > 2 ? 'l3' : String(a.ic || '').length > 1 ? 'l2' : ''}">${esc(a.ic)}</i><div><b>${esc(a.t)}</b><small>${esc(a.d)}</small></div></div>`).join('')}</div>` : '<div class="empty sm">Пока ни одного. Всё впереди.</div>'}
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
    return `<h3>${esc(T.party || 'Отряд')}${T.rest === 'long' ? ' <small>☀ долгий отдых — аптечка лечит вдвое</small>' : ''}</h3>${HEROES.map((k) => { const H = S.heroes[k] || {}, w = WH[Math.min(7, H.whistle || 0)]; return `<div class="card hero sm ${H.look ? 'lk' : ''}" style="--hc:${heroCol(k)}">${H.look ? `<canvas class="lk-team" data-look="${k}"></canvas>` : ''}<div class="hrow"><div><h2>${esc(H.name || heroName(k))}</h2><span class="wh" style="--wc:${w[2]}"><i></i>${w[0]} · ${w[1]}</span></div><div class="right">${money(H.wallet)}${S.game.hw && S.game.hw.live ? `<small>🍬 ${H.candy || 0}</small>` : ''}</div></div>${xpBar(H.xp)}${dndBar(H.dnd)}${hpBar(H.hp)}</div>`; }).join('')}
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
      <p class="note">${off ? 'Покупать можно, когда Мастер в сети.' : 'Покупай прямо отсюда — конфеты спишутся сами.'} А тыквы иногда прилетают прямо на этот экран — лови их: всё пойманное сразу идёт в общий котёл (до 40 🍬 в день).</p>
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
  // =====================================================================
  //  v7.5: облик героя, стили атаки, заметки, Каламити — как в Экосистеме Мастера
  // =====================================================================
  const TAU = Math.PI * 2;
  const hexA = (c, a) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return 'rgba(128,128,128,' + a + ')'; const n = parseInt(m[1], 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)) + ')'; };
  const rgbOf = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); const n = m ? parseInt(m[1], 16) : 0x808080; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = (v) => '#' + v.map((q) => Math.round(Math.max(0, Math.min(255, q))).toString(16).padStart(2, '0')).join('');
  const rnd = Math.random;
  const lookOf = (k) => { const H = S.heroes[k] || {}; return H.look || null; };
  const mkEl = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  // ---------- живые холсты с человечком (Я, Отряд) ----------
  const LIVE = new Set(); let liveRaf = 0;
  function liveCv(cv, getL) { LIVE.add({ cv, getL }); if (!liveRaf) liveRaf = requestAnimationFrame(liveTick); }
  function liveTick(now) {
    liveRaf = 0; const t = now / 1000;
    LIVE.forEach((q) => {
      if (!q.cv.isConnected) { LIVE.delete(q); return; }
      const cv = q.cv, dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      const L = q.getL(); if (!L || !window.EkLook) return;
      const g = c.createRadialGradient(W / 2, H * 0.88, 2, W / 2, H * 0.88, W * 0.4); g.addColorStop(0, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(W / 2, H * 0.89, W * 0.3, H * 0.035, 0, 0, TAU); c.fill();
      window.EkLook.draw(c, W / 2, H * 0.89, H * 0.6, L, { t });
    });
    if (LIVE.size) liveRaf = requestAnimationFrame(liveTick);
  }
  function bindLive(root) { (root || app).querySelectorAll('canvas[data-look]').forEach((cv) => { if (!cv.__lk) { cv.__lk = 1; liveCv(cv, () => lookOf(cv.dataset.look)); } }); }
  function lookLine(L) {
    const E = window.EkLook; if (!E || !L) return '';
    const n = (k) => ((E.OPT[k] || []).find((q) => q[0] === L[k]) || [])[1] || '';
    return [E.RACES[L.race] ? E.RACES[L.race].n : '', '~' + E.cmOf(E.norm(L)) + ' см', L.hat !== 'none' ? n('hat').toLowerCase() : '', n('jacket').toLowerCase()].filter(Boolean).join(' · ');
  }
  function vLook(H, me) {
    const off = !gmOn(), L = H.look;
    if (!L || !window.EkLook) return '';
    return `<h3>Облик героя</h3><div class="card lkc"><canvas class="lk-mini" data-look="${esc(me)}"></canvas><div class="lkc-tx"><b>${esc(lookLine(L))}</b>
      <button class="btn" id="lkEdit" ${off ? 'disabled' : ''}>✎ Изменить облик</button><p class="note">${off ? 'Изменить можно, когда Мастер в сети.' : 'Этого же человечка видно на экране стилей. Свисток — не выше твоего ранга.'}</p></div></div>`;
  }
  // ---------- редактор облика (черновик → «Сохранить») ----------
  function openLook() {
    const me = myHero(), H = S.heroes[me] || {}, E = window.EkLook; if (!me || !E || !H.look) return;
    const L = E.norm(JSON.parse(JSON.stringify(H.look))), rk = Math.max(0, Math.min(7, H.whistle | 0));
    const ov = mkEl('div', 'lk-sheet'); ov.innerHTML = '<div class="lk-card"><header><h3>Облик героя</h3><button class="is-x" type="button" aria-label="Закрыть">×</button></header><div class="lk-wrap"><div class="lk-stage"><canvas class="lk-cv"></canvas></div><div class="lk-ctl"></div></div><footer><button class="btn ghost" data-a="no" type="button">Отмена</button><button class="btn primary" data-a="ok" type="button">Сохранить</button></footer></div>';
    document.body.appendChild(ov); requestAnimationFrame(() => ov.classList.add('on'));
    const ctl = ov.querySelector('.lk-ctl'), cv = ov.querySelector('.lk-cv');
    let alive = true;
    const close = () => { alive = false; ov.classList.remove('on'); ov.classList.add('out'); setTimeout(() => ov.remove(), 250); };
    ov.querySelector('.is-x').addEventListener('click', close); ov.querySelector('[data-a=no]').addEventListener('click', close);
    ov.querySelector('[data-a=ok]').addEventListener('click', async () => {
      if (!gmOn()) { note('Мастер сейчас не в сети — облик сохранится, когда он подключится', 'bad'); return; }
      close(); busy('Сохраняю облик героя', 'Экосистема Мастера переодевает героя — пару секунд');
      if (!(await ask('look', { L }))) busy(null);
    });
    const draw = () => {
      ctl.innerHTML = '';
      const row = (title, key, list) => { const r = mkEl('div', 'lk-row'); r.appendChild(mkEl('small', '', title)); const g = mkEl('div', 'lk-opts'); list.forEach(([v, t]) => { const b = mkEl('button', L[key] === v ? 'on' : '', t); b.type = 'button'; b.addEventListener('click', () => { L[key] = v; if (key === 'race') { const D = { dwarf: { beard: 'long', hair: 'short' }, elf: { beard: 'none', hair: 'long' }, helf: { beard: 'none' }, half: { beard: 'none' } }[v]; if (D) Object.assign(L, D); } draw(); }); g.appendChild(b); }); r.appendChild(g); ctl.appendChild(r); };
      const sw = (title, key, cols) => { const r = mkEl('div', 'lk-row'); r.appendChild(mkEl('small', '', title)); const g = mkEl('div', 'lk-sw'); cols.forEach((col, i) => { const b = mkEl('button', L[key] === i ? 'on' : ''); b.type = 'button'; b.style.background = col; b.addEventListener('click', () => { L[key] = i; draw(); }); g.appendChild(b); }); r.appendChild(g); ctl.appendChild(r); };
      row('Раса', 'race', E.OPT.race);
      { const r = mkEl('div', 'lk-row lk-ht'), lb = mkEl('small', ''), rg = mkEl('input');
        rg.type = 'range'; rg.step = 0.01; rg.min = L.anom ? E.HA0 : E.HT0; rg.max = L.anom ? E.HA1 : E.HT1; rg.value = L.ht; r.classList.toggle('anom', !!L.anom);
        const upd = () => { const odd = L.ht < E.HT0 - 0.001 || L.ht > E.HT1 + 0.001; lb.textContent = 'Рост · ~' + E.cmOf(L) + ' см' + (Math.abs(L.ht - 1) < 0.005 ? ' (обычный)' : odd ? (L.ht < 1 ? ' (аномально низкий)' : ' (аномально высокий)') : L.ht < 1 ? ' (ниже обычного)' : ' (выше обычного)'); };
        rg.addEventListener('input', () => { L.ht = E.clampHt(rg.value, L.anom); upd(); });
        const an = mkEl('button', 'lk-anom' + (L.anom ? ' on' : ''), 'Аномальный'); an.type = 'button'; an.title = 'Разрешить рост ещё на 10% выше или ниже обычного для расы';
        an.addEventListener('click', () => { L.anom = !L.anom; L.ht = E.clampHt(L.ht, L.anom); draw(); });
        const r0 = mkEl('button', 'btn ghost lk-r0', '↺'); r0.type = 'button'; r0.title = 'Обычный рост'; r0.addEventListener('click', () => { L.ht = 1; draw(); });
        const line = mkEl('div', 'lk-htl'); line.append(rg, an, r0); upd(); r.append(lb, line); ctl.appendChild(r); }
      sw('Кожа', 'skin', E.SKIN); row('Волосы', 'hair', E.OPT.hair); sw('Цвет волос', 'hairC', E.HAIRC); row('Борода', 'beard', E.OPT.beard); sw('Глаза', 'eye', E.EYEC);
      row('Головной убор', 'hat', E.OPT.hat); sw('Цвет убора', 'hatC', E.CLOTH); row('Верх', 'jacket', E.OPT.jacket); sw('Цвет верха', 'jacketC', E.CLOTH); row('Низ', 'pants', E.OPT.pants); sw('Цвет низа', 'pantsC', E.CLOTH); sw('Обувь', 'bootC', E.CLOTH);
      row('За спиной', 'pack', E.OPT.pack); sw('Цвет сумки', 'packC', E.CLOTH); row('Шарф', 'scarf', E.OPT.scarf); sw('Цвет шарфа', 'scarfC', E.CLOTH);
      { if (L.wh > rk) L.wh = rk;
        const r = mkEl('div', 'lk-row'); r.appendChild(mkEl('small', '', 'Свисток · твой ранг — ' + E.WHN[rk].toLowerCase())); const g = mkEl('div', 'lk-sw');
        const hide = mkEl('button', 'lk-whx' + (L.wh === -1 ? ' on' : ''), '✕'); hide.type = 'button'; hide.title = 'Спрятать свисток'; hide.addEventListener('click', () => { L.wh = -1; draw(); }); g.appendChild(hide);
        E.WHC.forEach((col, i) => { const b = mkEl('button', L.wh === i ? 'on' : ''); b.type = 'button'; b.style.background = col; const up = i > rk; b.disabled = up; b.title = E.WHN[i] + (up ? ' — такого свистка у героя нет' : ''); b.addEventListener('click', () => { if (!up) { L.wh = i; draw(); } }); g.appendChild(b); });
        r.appendChild(g); ctl.appendChild(r); }
      const acts = mkEl('div', 'lk-acts'), rn = mkEl('button', 'btn', '🎲 Случайно'), rs = mkEl('button', 'btn ghost', 'Как было'); rn.type = rs.type = 'button';
      rn.addEventListener('click', () => { const pick = (a) => a[Math.floor(Math.random() * a.length)]; Object.assign(L, { race: pick(E.OPT.race)[0], skin: Math.floor(Math.random() * E.SKIN.length), ht: Math.round((0.9 + Math.random() * 0.2) * 100) / 100, anom: false, hair: pick(E.OPT.hair)[0], hairC: Math.floor(Math.random() * E.HAIRC.length), beard: pick(E.OPT.beard)[0], hat: pick(E.OPT.hat)[0], hatC: Math.floor(Math.random() * E.CLOTH.length), jacket: pick(E.OPT.jacket)[0], jacketC: Math.floor(Math.random() * E.CLOTH.length), pants: pick(E.OPT.pants)[0], pantsC: Math.floor(Math.random() * E.CLOTH.length), bootC: Math.floor(Math.random() * E.CLOTH.length), pack: pick(E.OPT.pack)[0], packC: Math.floor(Math.random() * E.CLOTH.length), scarf: pick(E.OPT.scarf)[0], scarfC: Math.floor(Math.random() * E.CLOTH.length), eye: Math.floor(Math.random() * E.EYEC.length) }); draw(); });
      rs.addEventListener('click', () => { Object.assign(L, E.norm(JSON.parse(JSON.stringify(H.look)))); draw(); });
      acts.append(rn, rs); ctl.appendChild(acts);
    };
    draw();
    const t0 = performance.now();
    (function fr(now) {
      if (!alive) return;
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, Hh = cv.clientHeight;
      if (W && Hh) {
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
        const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, Hh);
        const g = c.createRadialGradient(W / 2, Hh * 0.84, 4, W / 2, Hh * 0.84, W * 0.42); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(W / 2, Hh * 0.86, W * 0.32, Hh * 0.035, 0, 0, TAU); c.fill();
        E.draw(c, W / 2, Hh * 0.86, Hh * 0.58, L, { t: (now - t0) / 1000 });
      }
      requestAnimationFrame(fr);
    })(t0);
  }

  // ---------- Каламити: карточка носителя ----------
  function vCal(H) {
    const Q = H.cal, T = S.game.cal; if (!Q || !T || !T.txt) return '';
    const mx = T.max || 10, cr = Math.max(0, Math.min(mx, Q.cr | 0));
    const st = { p1: '', p2: '', we: Q.we ? 'венец уже держит следующий бросок' : Q.q ? 'худший кубик ляжет следующим броском' : 'готова', dbl: Q.dbl > 0 ? 'двойник ещё на ' + Q.dbl + ' ' + (Q.dbl === 1 ? 'бросок' : 'броска') : 'готова', ult: Q.ult ? 'после долгого отдыха' : 'готова' };
    const row = (id, kind) => { const t = T.txt[id]; if (!t) return ''; return `<li class="${kind}"><div><b>${esc(t[0])}</b>${st[id] ? `<em class="${/готова/.test(st[id]) ? 'ok' : ''}">${esc(st[id])}</em>` : ''}</div><p>${esc(t[1])}</p><div class="clgb"><span class="g">＋ ${esc(t[2])}</span><span class="b">− ${esc(t[3])}</span></div></li>`; };
    return `<h3>❂ Каламити <small>проклятая способность · не снимается</small></h3><div class="card clc ${cr >= 7 ? 'hot' : ''}">
      <div class="clg"><span>Раскол</span><div class="clp">${Array.from({ length: mx }, (_, i) => `<i class="${i < cr ? 'on' : ''}"></i>`).join('')}</div><b>${cr}/${mx}</b></div>
      <p class="note">${cr >= mx ? 'Венец забрал тело на один ход.' : cr >= 5 ? 'Венец давит сильнее: «Ты сильнее» тянет на ±3.' : 'На 10 венец на один ход забирает тело.'}</p>
      <h4>Пассивки</h4><ul class="cll">${row('p1', 'pas')}${row('p2', 'pas')}</ul><h4>Способности</h4><ul class="cll">${row('we', 'ab')}${row('dbl', 'ab')}${row('ult', 'ab ult')}</ul>
      <p class="note">Способности включает Мастер — попроси его. Короткий отдых — Раскол −1 · долгий — −3, и «Каламити» снова готова.</p></div>`;
  }

  // ---------- стили атаки ----------
  const ST = { el: null, sel: 0, swapFrom: null, openR: {}, spin: null, frozen: null, parts: [], raf: 0, VS: null };
  const SPIN_T = 4.4, SFX_PEAK = 1.55;
  const stMeta = () => S.game.styles || null;
  const stRar = (r) => { const M = stMeta(); return (M && M.rar.find((x) => x[0] === r)) || ['c', 'Обычный', 0, '#b9c0c7']; };
  const stRI = (r) => { const M = stMeta(); return M ? M.rar.findIndex((x) => x[0] === r) : -1; };
  const stSty = (id) => { const M = stMeta(); return (M && id && M.base.find((b) => b.id === id)) || null; };
  const stMine = () => { if (ST.frozen) return ST.frozen; const H = S.heroes[myHero()] || {}; return H.sty || null; };
  const stOpen = (o, i) => { const M = stMeta(); return !!o && !!M && o.lvl >= M.open[i]; };
  const stAct = (o, i) => { const M = stMeta(); return !!o && !!M && o.lvl >= M.act[i]; };
  const pct = (v) => String(+(+v).toFixed(3)).replace('.', ',') + '%';
  function stRollLocal() { const M = stMeta(); let u = rnd() * 100; for (const r of M.rar) { u -= r[2]; if (u < 0) { if (r[0] === 'x') return { r: 'x', id: null }; const L = M.base.filter((b) => b.r === r[0]); return L.length ? { r: r[0], id: L[Math.floor(rnd() * L.length)].id } : { r: 'c', id: null }; } } return { r: 'c', id: null }; }
  // звук: нагнетание, сброс, свой звук получения (тот же, что у Мастера)
  let AC = null, MG = null, SFXB = null, sfxLoading = false, NB = null;
  function ac() { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; MG = AC.createGain(); MG.gain.value = 0.9; MG.connect(comp); comp.connect(AC.destination); } if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} } return AC; }
  function loadSfx() { if (SFXB || sfxLoading || !window.EK_SFX_GET) return; sfxLoading = true; try { const a = ac(), bin = atob(window.EK_SFX_GET), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const pr = a.decodeAudioData(u8.buffer, (bf) => { SFXB = bf; }, () => {}); if (pr && pr.then) pr.then((bf) => { SFXB = bf; }).catch(() => {}); } catch (e) {} }
  function playSfx(when, vol) { try { if (!SFXB || !S.sound) return; const a = ac(), src = a.createBufferSource(), g = a.createGain(); src.buffer = SFXB; g.gain.value = vol || 1; src.connect(g); g.connect(MG); src.start(Math.max(a.currentTime, when)); } catch (e) {} }
  function tone(f, d, v, type, at) { try { if (!S.sound) return; const a = ac(), t0 = Math.max(a.currentTime, at || 0), o = a.createOscillator(), g = a.createGain(); o.type = type || 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v || 0.05, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g); g.connect(MG); o.start(t0); o.stop(t0 + d + 0.03); } catch (e) {} }
  function noiseBuf() { const a = ac(); if (NB) return NB; const n = a.sampleRate * 2; NB = a.createBuffer(1, n, a.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return NB; }
  function sweep(f0, f1, d, v, type, at) { try { if (!S.sound) return; const a = ac(), t0 = Math.max(a.currentTime, at || 0), o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + d); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g); g.connect(MG); o.start(t0); o.stop(t0 + d + 0.05); } catch (e) {} }
  function boom(v, at) { try { if (!S.sound) return; const a = ac(), t0 = Math.max(a.currentTime, at || 0), n = a.sampleRate * 0.7, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = v || 0.25; s.connect(f); f.connect(g); g.connect(MG); s.start(t0); sweep(70, 34, 0.8, (v || 0.25) * 0.9, 'sine', t0); } catch (e) {} }
  function pad(freqs, d, v, at, bright) { try { if (!S.sound) return; const a = ac(), t0 = Math.max(a.currentTime, at || 0), lp = a.createBiquadFilter(), g = a.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(bright ? 3200 : 1600, t0); lp.frequency.exponentialRampToValueAtTime(500, t0 + d); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); lp.connect(g); g.connect(MG); freqs.forEach((f) => [-6, 6].forEach((dt) => { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t0); o.stop(t0 + d + 0.05); })); } catch (e) {} }
  function bells(freqs, gap, v, at) { if (!S.sound) return; const a = ac(), t0 = Math.max(a.currentTime, at || 0); freqs.forEach((f, i) => { tone(f, 1.1, v, 'sine', t0 + i * gap); tone(f * 2.76, 0.4, v * 0.25, 'sine', t0 + i * gap); }); }
  function whoosh(f0, f1, d, v, at) { try { if (!S.sound) return; const a = ac(), t0 = Math.max(a.currentTime, at || 0), s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(); s.buffer = noiseBuf(); s.loop = true; bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t0 + d); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + d * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); s.connect(bp); bp.connect(g); g.connect(MG); s.start(t0); s.stop(t0 + d + 0.05); } catch (e) {} }
  function riser(T) {
    try {
      if (!S.sound) return { stop() {} };
      const a = ac(), t0 = a.currentTime + 0.02, out = a.createGain(), nodes = [];
      out.gain.setValueAtTime(0.0001, t0); out.gain.exponentialRampToValueAtTime(0.06, t0 + T * 0.35); out.gain.exponentialRampToValueAtTime(0.55, t0 + T); out.connect(MG);
      const trem = a.createGain(); trem.gain.value = 0.7; const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.setValueAtTime(2.5, t0); lfo.frequency.exponentialRampToValueAtTime(16, t0 + T); lg.gain.value = 0.3; lfo.connect(lg); lg.connect(trem.gain); trem.connect(out); nodes.push(lfo);
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 7; lp.frequency.setValueAtTime(260, t0); lp.frequency.exponentialRampToValueAtTime(3800, t0 + T); lp.connect(trem);
      [[1, -8, 'sawtooth', 0.09], [1, 8, 'sawtooth', 0.09], [0.5, 0, 'sine', 0.16], [1.5, 0, 'triangle', 0.04]].forEach(([m, dt, type, v]) => { const o = a.createOscillator(), og = a.createGain(); o.type = type; o.detune.value = dt; o.frequency.setValueAtTime(98 * m, t0); o.frequency.exponentialRampToValueAtTime(392 * m, t0 + T); og.gain.value = v; o.connect(og); og.connect(lp); nodes.push(o); });
      const ns = a.createBufferSource(), bp = a.createBiquadFilter(), ng = a.createGain(); ns.buffer = noiseBuf(); ns.loop = true; bp.type = 'bandpass'; bp.Q.value = 1.6; bp.frequency.setValueAtTime(350, t0); bp.frequency.exponentialRampToValueAtTime(7000, t0 + T); ng.gain.value = 0.22; ns.connect(bp); bp.connect(ng); ng.connect(out); nodes.push(ns);
      nodes.forEach((n) => n.start(t0));
      let tt = 0.25, iv = 0.62; while (tt < T - 0.12) { const k = tt / T; sweep(78, 38, 0.2, 0.12 + 0.3 * k * k, 'sine', t0 + tt); iv = Math.max(0.13, iv * 0.86); tt += iv; }
      return { stop(at) { try { const e = Math.max(a.currentTime, at); out.gain.cancelScheduledValues(e); out.gain.setTargetAtTime(0.0001, e, 0.025); nodes.forEach((n) => { try { n.stop(e + 0.25); } catch (er) {} }); } catch (er) {} } };
    } catch (e) { return { stop() {} }; }
  }
  function revealSound(ri, at) {
    if (!S.sound) return;
    const a = ac(), t0 = Math.max(a.currentTime, at || 0);
    if (ri === 7) { sweep(220, 70, 0.9, 0.2, 'sine', t0); tone(147, 0.9, 0.08, 'triangle', t0 + 0.18); tone(110, 1.3, 0.08, 'triangle', t0 + 0.42); whoosh(1800, 120, 0.9, 0.06, t0); return; }
    sweep(110, 40, 0.7, 0.22, 'sine', t0); whoosh(6000, 300, 0.9, 0.07, t0);
    if (ri === 0) { tone(523, 0.35, 0.04, 'triangle', t0); return; }
    const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568, A4 = 440, D5 = 587.33, B5 = 987.77;
    if (ri === 1) { bells([E5, B5], 0.09, 0.06, t0); return; }
    if (ri === 2) { bells([C5, E5, G5, C6], 0.07, 0.06, t0); pad([C5 / 2, G5 / 2], 0.9, 0.03, t0); return; }
    if (ri === 3) { bells([C5, E5, G5, C6, E6], 0.065, 0.065, t0); pad([C5 / 2, E5 / 2, G5 / 2], 1.6, 0.045, t0, true); boom(0.12, t0); return; }
    if (ri === 4) { boom(0.3, t0); pad([C5 / 4, C5 / 2, E5 / 2, G5 / 2, C5], 2.4, 0.06, t0, true); bells([G5, C6, E6, G6, E6, G6], 0.08, 0.06, t0 + 0.12); return; }
    if (ri === 5) { boom(0.4, t0); sweep(55, 27, 1.6, 0.35, 'sine', t0); pad([A4 / 4, A4 / 2, C5 / 2, E5 / 2], 1.1, 0.06, t0, true); pad([A4 / 4, A4 / 2, 554.37 / 2, E5 / 2, A4], 2.6, 0.06, t0 + 0.9, true); for (let i = 0; i < 7; i++) whoosh(3000 + i * 500, 900, 0.09, 0.08, t0 + 0.05 + i * 0.07); bells([A4, 554.37, E5, A4 * 2, 554.37 * 2], 0.09, 0.05, t0 + 0.95); return; }
    if (ri === 6) { boom(0.45, t0); sweep(50, 25, 2, 0.35, 'sine', t0); pad([C5 / 4, C5 / 2, G5 / 2, E5, G5, B5], 3.4, 0.06, t0, true); for (let i = 0; i < 16; i++) tone([C6, D5 * 2, E6, G6, A4 * 4][i % 5] * (1 + Math.floor(i / 5) * 0.5), 0.5, 0.035, 'sine', t0 + 0.1 + i * 0.06); bells([C6, E6, G6, C6 * 2], 0.14, 0.06, t0 + 1.1); }
  }
  // экран: создаётся один раз и живёт, пока открыта вкладка (обновления данных его не пересоздают)
  function stylePane() {
    if (ST.el) return ST.el;
    const el = mkEl('div', 'ss-scr ol on');
    el.innerHTML = `<div class="ss-stage"><canvas class="ss-cv"></canvas><div class="ss-top"><div class="ss-title"><small>Текущий стиль:</small><div class="ss-tw"></div></div></div>
      <div class="ss-bottom"><button class="ss-spin" type="button"><b>Крутить</b><small></small></button><p class="ss-note"></p></div></div>
      <aside class="ss-left"><h4>Ячейки стилей</h4><div class="ss-slots"></div><div class="ss-perk"></div><div class="ss-lv"></div></aside>
      <aside class="ss-right"><h4>Шансы</h4><div class="ss-odds"></div></aside>`;
    el.querySelector('.ss-spin').addEventListener('click', stSpin);
    ST.el = el; el.__refresh = stRefresh;
    return el;
  }
  const $s = (q) => ST.el && ST.el.querySelector(q);
  function stRefresh() {
    if (!ST.el) return;
    if (!stMeta()) { ST.el.classList.add('none'); $s('.ss-note').textContent = 'Стили появятся, когда Экосистема Мастера обновится до v7.5.'; return; }
    ST.el.classList.remove('none');
    if (ST.frozen && !ST.spin) { const live = (S.heroes[myHero()] || {}).sty; if ((live && live.slots[0] === ST.frozen.slots[0] && live.spins === ST.frozen.spins) || Date.now() - ST.frozenAt > 9000) ST.frozen = null; }
    stTop(); stSide(); stOdds(); stBottom(); loadSfx();
    if (!ST.raf) stLoop();
  }
  const stShown = () => { const o = stMine(); return o && o.slots[ST.sel] ? stSty(o.slots[ST.sel]) : null; };
  function stTop() {
    if (ST.spin) return;
    const s = stShown(), o = stMine();
    stTitle(s ? s.n : (stOpen(o, ST.sel) ? 'пусто' : 'ячейка закрыта'), s ? stRar(s.r)[1] + (s.src ? ' · ' + s.src : '') : '', s ? stRar(s.r)[3] : '#8a9096', '', 0, s && s.r === 's');
  }
  function stTitle(n, sub, col, mode, dur, rb) {
    const tw = $s('.ss-tw'); if (!tw) return;
    if (!mode) { const cur = tw.querySelector('.ss-ti:not(.out)'); if (cur && cur.dataset.k === n + '|' + sub) return; }
    const el = mkEl('div', 'ss-ti' + (rb ? ' rb' : '')); el.innerHTML = '<b></b><em></em>'; el.dataset.k = n + '|' + sub;
    el.querySelector('b').textContent = n; el.querySelector('em').textContent = sub || ''; el.style.setProperty('--tc', col);
    if (!mode) { tw.innerHTML = ''; tw.appendChild(el); return; }
    const d = Math.max(0.08, dur || 0.3); el.style.setProperty('--d', d.toFixed(3) + 's');
    tw.querySelectorAll('.ss-ti:not(.out)').forEach((old) => { old.style.setProperty('--d', Math.max(0.07, Math.min(d * 0.75, 0.38)).toFixed(3) + 's'); old.classList.remove('in', 'fin'); old.classList.add('out'); setTimeout(() => old.remove(), d * 1000 + 120); });
    const outs = tw.querySelectorAll('.ss-ti.out'); for (let i = 0; i < outs.length - 3; i++) outs[i].remove();
    el.classList.add(mode); tw.appendChild(el);
  }
  function stSide() {
    const o = stMine(), box = $s('.ss-slots'), M = stMeta(); box.innerHTML = '';
    if (!o) { $s('.ss-perk').innerHTML = '<p class="ss-empty">Стили пока закрыты.</p>'; $s('.ss-lv').textContent = ''; return; }
    [0, 1, 2].forEach((i) => {
      const id = o.slots[i], s = stSty(id), op = stOpen(o, i), a2 = stAct(o, i);
      const b = mkEl('button', 'ss-slot ' + (!op ? 'lock' : a2 ? 'act' : 'store') + (i === ST.sel ? ' sel' : '') + (ST.swapFrom === i ? ' from' : '')); b.type = 'button';
      if (s) b.style.setProperty('--rc', stRar(s.r)[3]);
      b.innerHTML = '<i></i><b></b><small></small>';
      b.querySelector('i').textContent = ['I', 'II', 'III'][i]; b.querySelector('b').textContent = !op ? '🔒' : s ? s.n : '—';
      b.querySelector('small').textContent = !op ? 'прокачка ' + M.open[i] : a2 ? (i === 0 ? 'крутится · действует' : 'действует') : 'хранилище';
      b.disabled = !op || !!ST.spin;
      b.addEventListener('click', async () => {
        if (ST.swapFrom != null) { const a = ST.swapFrom; ST.swapFrom = null; if (a !== i) { if (!gmOn()) { note('Мастер сейчас не в сети', 'bad'); stRefresh(); return; } busy('Перекладываю стиль', 'Экосистема Мастера меняет ячейки местами'); if (!(await ask('style', { op: 'swap', a, b: i }))) busy(null); ST.sel = i; } stRefresh(); return; }
        ST.sel = i; stRefresh();
      });
      box.appendChild(b);
    });
    const P = $s('.ss-perk'); P.innerHTML = ''; const s = stShown();
    if (s) {
      const rr = stRar(s.r); P.style.setProperty('--rc', rr[3]);
      P.appendChild(mkEl('h5', '', s.n)); P.appendChild(mkEl('small', 'ss-rr', rr[1] + (s.src ? ' · отсылка: «' + s.src + '»' : ''))); P.appendChild(mkEl('p', '', s.d));
      if (s.auto && s.auto.bf) { const bf = o.bf || { p: 10, n: 0 }, st = mkEl('div', 'ss-bf'); st.innerHTML = '<span>Шанс сейчас</span><b></b><span>Подряд</span><i></i>'; st.querySelector('b').textContent = bf.p + '%'; const pips = st.querySelector('i'); for (let q = 0; q < 4; q++) pips.appendChild(mkEl('u', q < bf.n ? 'on' : '')); P.appendChild(st); }
      if (s.auto && s.auto.p) P.appendChild(mkEl('small', 'ss-auto', '⚡ срабатывает само в бою: ' + s.auto.p + '% на бросок'));
      if (s.act && stAct(o, ST.sel)) P.appendChild(mkEl('small', 'ss-auto', '🎲 «' + s.act.label + '» · ' + s.act.p + '% — бросает Мастер'));
      if (!stAct(o, ST.sel)) P.appendChild(mkEl('small', 'ss-auto', 'Лежит в хранилище — не действует.'));
    } else P.appendChild(mkEl('p', 'ss-empty', stOpen(o, ST.sel) ? (ST.sel === 0 ? 'Пусто. Покрути стиль — он ляжет сюда.' : 'Пусто. Сюда можно переложить стиль из другой ячейки.') : 'Ячейка закрыта — откроется прокачкой ' + M.open[ST.sel] + '.'));
    if (stOpen(o, ST.sel) && [0, 1, 2].filter((i) => stOpen(o, i)).length > 1) { const sw = mkEl('button', 'btn ghost ss-swap', ST.swapFrom != null ? 'Выбери ячейку для обмена…' : '⇄ Поменять с другой ячейкой'); sw.type = 'button'; sw.disabled = !!ST.spin || !gmOn(); sw.addEventListener('click', () => { ST.swapFrom = ST.swapFrom != null ? null : ST.sel; stRefresh(); }); P.appendChild(sw); }
    const lv = $s('.ss-lv'); lv.innerHTML = ''; const pp = mkEl('div', 'ss-pips'); for (let i = 1; i <= 5; i++) pp.appendChild(mkEl('i', i <= o.lvl ? 'on' : '')); const r1 = mkEl('div', 'ss-gr'); r1.append(mkEl('span', '', 'Прокачка'), pp); lv.append(r1, mkEl('small', 'ss-lt', (M.lvlT || [])[o.lvl] || ''));
  }
  function stOdds() {
    const box = $s('.ss-odds'), M = stMeta(); box.innerHTML = '';
    M.rar.forEach((r) => {
      const L = M.base.filter((b) => b.r === r[0]), row = mkEl('div', 'ss-or' + (ST.openR[r[0]] ? ' open' : '')); row.style.setProperty('--rc', r[3]);
      const hd = mkEl('button', 'ss-oh'); hd.type = 'button'; hd.innerHTML = '<i></i><span></span><b></b><em></em>';
      hd.querySelector('span').textContent = r[1]; hd.querySelector('b').textContent = pct(r[2]); hd.querySelector('em').textContent = L.length ? '▸' : '';
      if (L.length) hd.addEventListener('click', () => { ST.openR[r[0]] = !ST.openR[r[0]]; stOdds(); }); else hd.disabled = true;
      row.appendChild(hd);
      if (ST.openR[r[0]] && L.length) { const ul = mkEl('ul'); L.forEach((b) => { const li = mkEl('li'); li.title = b.d; li.innerHTML = '<span></span><small></small>'; li.querySelector('span').textContent = b.n; li.querySelector('small').textContent = pct(r[2] / L.length); ul.appendChild(li); }); row.appendChild(ul); }
      box.appendChild(row);
    });
    box.appendChild(mkEl('small', 'ss-on', '«Ничего» сжигает стиль в ячейке I.'));
  }
  function stBottom() {
    const o = stMine(), b = $s('.ss-spin'), off = !gmOn();
    b.querySelector('small').textContent = 'Прокрутки: ' + (o ? o.spins : 0);
    b.disabled = !!ST.spin || !o || o.lvl < 1 || o.spins < 1 || off;
    $s('.ss-note').textContent = !o || o.lvl < 1 ? 'Стили закрыты: нужна прокачка 1 — её даёт Мастер.' : o.spins < 1 ? 'Прокруток нет — их выдаёт Мастер.' : off ? 'Крутить можно, когда Мастер в сети.' : 'Новый стиль заменит то, что лежит в ячейке I. «Ничего» сожжёт его.';
  }
  async function stSpin() {
    const o = stMine(); if (ST.spin || !o || o.lvl < 1 || o.spins < 1) return;
    if (!gmOn()) { note('Мастер сейчас не в сети', 'bad'); return; }
    ST.frozen = JSON.parse(JSON.stringify(o)); ST.frozen.spins = Math.max(0, o.spins - 1); ST.frozenAt = Date.now();
    ST.sel = 0; ST.swapFrom = null;
    const seq = []; let t = 0, dt = 0.075; while (t < SPIN_T) { seq.push({ t, q: stRollLocal() }); t += dt; dt *= 1.075; }
    ST.spin = { t0: performance.now(), seq, T: t, last: -1, done: false, res: null };
    try { const a = ac(); ST.spin.snd = riser(t); ST.spin.sfxAt = a.currentTime + 0.02 + t - SFX_PEAK; } catch (e) {}
    ST.el.classList.add('spinning'); stSide(); stBottom();
    if (!(await ask('style', { op: 'spin' }))) stAbort();
  }
  function stAbort(why) {
    const sp = ST.spin; if (!sp) return; ST.spin = null; ST.frozen = null;
    try { if (sp.snd) sp.snd.stop(ac().currentTime); } catch (e) {}
    if (ST.el) ST.el.classList.remove('spinning'); if (why) note(why, 'bad'); stRefresh();
  }
  function stResult(a) {
    const r = a.result || {}, op = a.payload && a.payload.op;
    if (op === 'swap') { busy(null); note(r.ok ? 'Готово ✓ Ячейки поменялись' : 'Не вышло: ' + (r.why || 'неизвестно'), r.ok ? 'good' : 'bad'); soft(); return; }
    if (op === 'spin' && ST.spin && !ST.spin.res) {
      if (!r.ok) { stAbort('Не крутится: ' + (r.why || 'неизвестно')); return; }
      ST.spin.res = { id: r.id || null, r: r.r, prev: r.prev || null };
      // свой звук получения ставим так, чтобы его пик совпал с раскрытием
      try { const a2 = ac(), left = ST.spin.T - (performance.now() - ST.spin.t0) / 1000; if (left > SFX_PEAK - 0.1) playSfx(a2.currentTime + left - SFX_PEAK, 0.95); else ST.spin.lateSfx = true; } catch (e) {}
    }
  }
  function stTick(now) {
    const sp = ST.spin, el = (now - sp.t0) / 1000;
    // ответ ещё не пришёл — продолжаем мелькать, пока не придёт
    const T = sp.res ? Math.max(sp.T, sp.tRes || sp.T) : Infinity;
    if (!sp.res && el > sp.T + 20) { stAbort('Экосистема Мастера не ответила — попробуй ещё раз'); return; }
    if (sp.res && !sp.tRes) { sp.tRes = Math.max(sp.T, el + (el > sp.T ? 0.6 : 0)); if (sp.lateSfx) try { playSfx(ac().currentTime + Math.max(0, sp.tRes - el - SFX_PEAK), 0.95); } catch (e) {} }
    if (el < T) {
      let idx = 0; for (let i = 0; i < sp.seq.length; i++) if (sp.seq[i].t <= el) idx = i;
      if (el > sp.T) { idx = sp.seq.length + Math.floor((el - sp.T) / 0.42); if (!sp.ex || sp.ex.length <= idx) { sp.ex = sp.ex || []; while (sp.ex.length <= idx) sp.ex.push(stRollLocal()); } }
      if (idx !== sp.last) {
        sp.last = idx; const q = idx < sp.seq.length ? sp.seq[idx].q : sp.ex[idx], s = q.id ? stSty(q.id) : null, nx = sp.seq[idx + 1], dur = idx < sp.seq.length ? Math.min(0.5, Math.max(0.08, ((nx ? nx.t : sp.T) - sp.seq[idx].t) * 0.95)) : 0.38;
        stTitle(s ? s.n : 'Ничего', stRar(q.r)[1], stRar(q.r)[3], 'in', dur, q.r === 's'); sp.cur = q.r;
      }
      return;
    }
    if (!sp.done) {
      sp.done = true; sp.tEnd = now; sp.cur = sp.res.r;
      const ri = stRI(sp.res.r), s = stSty(sp.res.id), prev = sp.res.prev;
      if (ST.frozen) { ST.frozen.slots[0] = sp.res.id; ST.frozenAt = Date.now(); }
      stTitle(s ? s.n : 'Ничего', s ? stRar(s.r)[1] + (s.src ? ' · ' + s.src : '') : (prev ? '«' + ((stSty(prev) || {}).n || '') + '» сгорел' : 'пусто'), stRar(sp.res.r)[3], 'fin', 0.8, sp.res.r === 's');
      try { const a = ac(); if (sp.snd) sp.snd.stop(a.currentTime); revealSound(ri, a.currentTime); } catch (e) {}
      stSide(); stBottom();
      const E = ST.el; E.classList.remove('spinning'); E.classList.add('reveal', 'tier' + ri); setTimeout(() => E.classList.remove('reveal'), 900);
      if (ri >= 4 && sp.res.r !== 'x') { E.classList.remove('shake'); void E.offsetWidth; E.classList.add('shake'); buzz([40, 30, 60]); }
      stBurst(ri);
      setTimeout(() => { E.classList.remove('tier' + ri); ST.spin = null; stRefresh(); }, 1300);
    }
  }
  function stBurst(ri) { const n = ri >= 6 ? 160 : ri >= 4 ? 110 : ri === 7 ? 40 : 60; for (let i = 0; i < n; i++) { const a = rnd() * TAU, v = 120 + rnd() * (ri >= 4 ? 520 : 300); ST.parts.push({ x: 0, y: -0.25, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.8 + rnd() * 0.8, g: 380, c: ri === 7 ? '#3a3f46' : ri === 6 ? ['#ff5a6a', '#ffd36a', '#6ad7ff', '#c38cff'][i % 4] : stRar(ST.spin ? ST.spin.res.r : 'c')[3], r: 1 + rnd() * 2.4 }); } }
  const motes = Array.from({ length: 60 }, () => ({ x: rnd() - 0.5, y: rnd(), v: 0.02 + rnd() * 0.05, r: 0.6 + rnd() * 1.8, p: rnd() * TAU }));
  const RB = ['#ff5a6a', '#ffd36a', '#6ad7ff', '#c38cff'], NR = 16;
  function stLoop() {
    const cv = $s('.ss-cv'); if (!cv) return;
    const t0 = performance.now(); let last = t0;
    ST.VS = ST.VS || { main: rgbOf('#59606a'), rays: Array.from({ length: NR }, () => rgbOf('#59606a')), inten: 0.15, z: 1, vig: 0, rot: 0, out: 0 };
    const VS = ST.VS;
    (function fr(now) {
      if (!ST.el || (!ST.el.isConnected && !ST.spin)) { ST.raf = 0; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
      if (ST.spin) stTick(now);
      if (!ST.el.isConnected) { ST.raf = requestAnimationFrame(fr); return; }
      const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
      if (!W || !H) { ST.raf = requestAnimationFrame(fr); return; }
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sp = ST.spin, s = stShown(), rk = sp ? (sp.cur || 'c') : s ? s.r : null, ri = rk ? stRI(rk) : -1, tcol = rk ? stRar(rk)[3] : '#59606a';
      const dark = sp && !sp.done, p = dark ? Math.min(1, (now - sp.t0) / 1000 / sp.T) : 0;
      const kc = 1 - Math.exp(-dt * 5.5), kz = 1 - Math.exp(-dt * (dark ? 12 : 3.2)), kv = 1 - Math.exp(-dt * (dark ? 8 : 3));
      const tm = rgbOf(tcol); VS.main = VS.main.map((v, i) => v + (tm[i] - v) * kc);
      VS.rays = VS.rays.map((rc, i) => { const tg = rgbOf(ri === 6 ? RB[i % 4] : tcol); return rc.map((v, j) => v + (tg[j] - v) * kc); });
      const tInt = ri < 0 ? 0.15 : ri === 7 ? 0.12 : 0.25 + Math.min(6, ri) * 0.1; VS.inten += ((dark ? tInt * (0.75 + 0.5 * p) : tInt) - VS.inten) * kc;
      const ez = p * p * (3 - 2 * p);
      VS.z += ((dark ? 1 + 0.62 * Math.pow(ez, 1.4) : 1) - VS.z) * kz;
      VS.vig += ((dark ? 0.25 + 0.72 * Math.pow(p, 1.3) : 0) - VS.vig) * kv;
      VS.out += ((dark ? 1 + 1.6 * p : 1) - VS.out) * kz;
      VS.rot += dt * (0.08 + (dark ? 1.4 * p * p : 0));
      const col = toHex(VS.main);
      const L = lookOf(myHero()), E = window.EkLook, rs = L && E && E.RACES[L.race] ? E.RACES[L.race].sc * (L.ht || 1) : 1;
      const hh = Math.min(H * 0.5, W * 0.45) * Math.min(1, 1.08 / rs), fy = H * 0.78, gy = fy + H * 0.02, cx = W / 2, cy = H * 0.47;
      const fyy = gy - hh * 0.62, sh = dark ? Math.pow(p, 3) * 3.5 : 0;
      c.save(); c.translate(cx + (Math.random() - 0.5) * sh * 2, fyy + (Math.random() - 0.5) * sh * 2); c.scale(VS.z, VS.z); c.translate(-cx, -fyy);
      let g = c.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.5, Math.hypot(W, H) * 0.6); g.addColorStop(0, '#1b1f26'); g.addColorStop(1, '#050608'); c.fillStyle = g; c.fillRect(-W, -H, W * 3, H * 3);
      g = c.createLinearGradient(0, fy, 0, H); g.addColorStop(0, '#15181d'); g.addColorStop(1, '#07080a'); c.fillStyle = g; c.fillRect(-W, fy, W * 3, H * 2);
      c.strokeStyle = 'rgba(255,255,255,.035)'; c.lineWidth = 1; for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(W / 2 + i * 40, fy); c.lineTo(W / 2 + i * 160, H); c.stroke(); } for (let j = 1; j < 6; j++) { const y = fy + (H - fy) * Math.pow(j / 6, 1.6); c.beginPath(); c.moveTo(-W, y); c.lineTo(W * 2, y); c.stroke(); }
      const R = Math.max(W, H) * 0.75, inten = VS.inten;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < NR; i++) { const a = (i / NR) * TAU + VS.rot * (i % 2 ? 1 : -0.6), w = 0.05 + 0.03 * Math.sin(t * 1.3 + i), rc = toHex(VS.rays[i]);
        const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, hexA(rc, inten)); gr.addColorStop(0.55, hexA(rc, inten * 0.15)); gr.addColorStop(1, hexA(rc, 0)); c.fillStyle = gr;
        c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a - w, a + w); c.closePath(); c.fill(); }
      g = c.createRadialGradient(cx, cy, 0, cx, cy, H * 0.38); g.addColorStop(0, hexA(col, (dark ? 0.32 + 0.3 * p : 0.3) * (ri < 0 ? 0.4 : 1))); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g; c.fillRect(-W, -H, W * 3, H * 3);
      c.restore();
      motes.forEach((m) => { m.y -= m.v * dt * (1 + p * 5); if (m.y < 0) { m.y = 1; m.x = rnd() - 0.5; } const x = cx + m.x * W * 0.6, y = H * 0.15 + m.y * H * 0.7; c.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t + m.p)); c.fillStyle = ri >= 0 && ri !== 7 ? col : '#9aa3ad'; c.beginPath(); c.arc(x, y, m.r, 0, TAU); c.fill(); });
      c.globalAlpha = 1;
      g = c.createRadialGradient(cx, gy, 2, cx, gy, hh * 0.35); g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(cx, gy, hh * 0.35, hh * 0.06, 0, 0, TAU); c.fill();
      if (E && L) E.draw(c, cx, gy, hh, L, { t, dark: dark ? '#06070a' : null, out: dark ? hexA(col, 0.9) : '#07080a', ow: dark ? Math.max(2, hh * 0.008) * VS.out : null, eyes: dark ? col : null });
      ST.parts = ST.parts.filter((q) => q.life > 0); ST.parts.forEach((q) => { q.x += q.vx * dt / W; q.y += q.vy * dt / H; q.vy += q.g * dt; q.life -= dt * 0.8; c.globalAlpha = Math.max(0, q.life); c.fillStyle = q.c; c.beginPath(); c.arc(cx + q.x * W, cy + q.y * H, q.r, 0, TAU); c.fill(); }); c.globalAlpha = 1;
      c.restore();
      if (VS.vig > 0.005) { const r0 = Math.min(W, H) * (0.62 - 0.36 * Math.min(1, VS.vig)), r1 = Math.hypot(W, H) * 0.62; g = c.createRadialGradient(cx, H * 0.45, r0, cx, H * 0.45, r1); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,' + (0.55 * VS.vig).toFixed(3) + ')'); g.addColorStop(1, 'rgba(0,0,0,' + Math.min(0.97, VS.vig).toFixed(3) + ')'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
      if (sp && sp.done) { const k = Math.max(0, 1 - (now - sp.tEnd) / 600); if (k > 0) { c.fillStyle = hexA(sp.res.r === 'x' ? '#000000' : ri === 6 ? '#ffffff' : stRar(sp.res.r)[3], k * (sp.res.r === 'x' ? 0.6 : 0.55)); c.fillRect(0, 0, W, H); } }
      ST.raf = requestAnimationFrame(fr);
    })(t0);
  }

  // ---------- заметки: личный блокнот и общая доска ----------
  const NT = { el: null, st: 'off', err: '', tab: store.get('ek_nt_tab', 'book'), book: null, base: null, cur: null, view: store.get('ek_bview', null), ch: null, busy: false, ctl: null, bookT: 0 };
  const NOTAB = (e) => /42P01|PGRST20[0-9]|relation .*notes.* does not exist|Could not find the table/i.test(((e && (e.code || '')) + ' ' + (e && e.message || '')));
  const ntDirty = () => !!(NT.base && NT.cur) && EkNotes.diff(NT.base, NT.cur).n > 0;
  const ntDraft = () => { try { store.set('ek_board_draft', { base: NT.base, cur: NT.cur, me: myHero() }); } catch (e) {} };
  const ntName = (k) => (k === 'main' ? 'Мастер' : heroName(k));
  const ntAsk = (t) => Promise.resolve(window.confirm(t));
  const blankBook = () => ({ pages: [{ id: EkNotes.uid(), ti: '', tx: '', t: Date.now() }], at: 0 });
  async function ntInit() {
    if (NT.st === 'on' || NT.st === 'load' || !window.EkNotes) return;
    NT.st = 'load'; const me = myHero();
    try {
      const { data, error } = await sb.from('notes').select('*');
      if (error) throw error;
      const rows = {}; (data || []).forEach((r) => { rows[r.id] = r; });
      const bk = rows['book:' + me] && rows['book:' + me].data;
      NT.book = bk && Array.isArray(bk.pages) && bk.pages.length ? { pages: bk.pages, at: store.get('ek_book_at', 0) } : blankBook();
      const doc = EkNotes.fixBoard(rows.board ? rows.board.data : {});
      // несохранённый черновик доски переживает перезагрузку страницы
      const dr = store.get('ek_board_draft', null);
      if (dr && dr.me === me && dr.base && dr.cur && EkNotes.diff(EkNotes.fixBoard(dr.base), EkNotes.fixBoard(dr.cur)).n) { NT.base = EkNotes.clone(doc); NT.cur = EkNotes.apply(doc, EkNotes.diff(EkNotes.fixBoard(dr.base), EkNotes.fixBoard(dr.cur))); }
      else { NT.base = EkNotes.clone(doc); NT.cur = EkNotes.clone(doc); }
      NT.st = 'on';
      if (!NT.ch) NT.ch = sb.channel('notes').on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (p) => ntRow(p.new)).subscribe();
    } catch (e) {
      NT.st = NOTAB(e) ? 'nosql' : 'err'; NT.err = e.message || String(e);
      NT.book = store.get('ek_book_local', null) || blankBook();    // пока облако не готово — блокнот хранится на этом устройстве
    }
    ntPaint();
  }
  function ntRow(row) {
    if (!row || !row.id) return;
    const me = myHero();
    if (row.id === 'board') {
      const doc = EkNotes.fixBoard(row.data || {});
      const ops = NT.base && NT.cur ? EkNotes.diff(NT.base, NT.cur) : { n: 0 };
      NT.base = EkNotes.clone(doc); NT.cur = ops.n ? EkNotes.apply(doc, ops) : EkNotes.clone(doc);
      if (NT.ctl && NT.tab === 'board') { NT.ctl.refresh(); ntSave(); }
    } else if (row.id === 'book:' + me && row.data && Array.isArray(row.data.pages) && row.data.pages.length) {
      if (Date.now() - NT.bookT < 4000) return;   // своё же эхо
      const at = NT.book ? NT.book.at : 0; NT.book = { pages: row.data.pages, at: Math.min(at | 0, row.data.pages.length - 1) };
      if (NT.tab === 'book') ntRemountBook();
    }
  }
  let bookT = 0;
  function bookChanged() {
    store.set('ek_book_at', NT.book.at);
    if (NT.st !== 'on') { store.set('ek_book_local', NT.book); return; }
    clearTimeout(bookT); bookT = setTimeout(async () => {
      NT.bookT = Date.now();
      const r = await sb.from('notes').upsert({ id: 'book:' + myHero(), data: { pages: NT.book.pages }, updated_at: new Date().toISOString() });
      if (r.error) note('Блокнот не сохранился: ' + r.error.message, 'bad');
    }, 1200);
  }
  async function boardSave() {
    if (NT.busy || NT.st !== 'on') return;
    NT.busy = true; ntSave();
    try {
      const { data, error } = await sb.from('notes').select('data').eq('id', 'board').maybeSingle(); if (error) throw error;
      const doc = EkNotes.apply(data ? data.data : {}, EkNotes.diff(NT.base, NT.cur)), clean = { notes: doc.notes, threads: doc.threads };
      const r = await sb.from('notes').upsert({ id: 'board', data: clean, updated_at: new Date().toISOString() }); if (r.error) throw r.error;
      NT.base = EkNotes.clone(clean); NT.cur = EkNotes.clone(clean); ntDraft();
      if (NT.ctl) NT.ctl.refresh();
      note('Сохранено ✓ Доска обновилась у всех', 'good'); beep(660, 0.15, 0.05); setTimeout(() => beep(990, 0.2, 0.05), 110); buzz(30);
    } catch (e) { note('Доска не сохранилась: ' + (e.message || e) + '. Черновик остался', 'bad'); }
    NT.busy = false; ntSave();
  }
  function ntSave() {
    if (!NT.el) return; const b = NT.el.querySelector('.bd-save'), st = NT.el.querySelector('.bd-st'); if (!b) return;
    const d = ntDirty(); b.disabled = !d || NT.busy; st.textContent = NT.busy ? 'Сохраняю…' : d ? 'Есть несохранённые правки — их пока видишь только ты' : 'Всё сохранено · все видят то же'; st.classList.toggle('warn', d);
    const t = NT.el.querySelector('.nt-tabs [data-nt=board]'); if (t) t.classList.toggle('dirty', d);
  }
  function notesPane() {
    if (NT.el) return NT.el;
    NT.el = mkEl('div', 'nt-pane'); NT.el.__refresh = () => { if (NT.st === 'off') ntInit(); };
    ['keydown', 'keyup'].forEach((ev) => NT.el.addEventListener(ev, (e) => e.stopPropagation()));
    ntPaint(); return NT.el;
  }
  function ntRemountBook() { if (NT.tab !== 'book' || !NT.el) return false; if (document.activeElement && NT.el.contains(document.activeElement)) return false; ntPaint(); return true; }
  function ntPaint() {
    const B = NT.el; if (!B) return; B.innerHTML = ''; NT.ctl = null;
    const tb = mkEl('div', 'nt-tabs');
    [['book', '📓 Личный блокнот'], ['board', '📌 Общая доска']].forEach(([id, t]) => { const b = mkEl('button', id === NT.tab ? 'on' : '', t); b.type = 'button'; b.dataset.nt = id; b.addEventListener('click', () => { if (NT.tab === id) return; NT.tab = id; store.set('ek_nt_tab', id); ntPaint(); }); tb.appendChild(b); });
    B.appendChild(tb);
    if (NT.st === 'off' || NT.st === 'load' || !NT.book) { B.appendChild(mkEl('div', 'empty', 'Открываю заметки…')); return; }
    if (NT.st !== 'on') B.appendChild(mkEl('p', 'nt-warn', NT.st === 'nosql' ? 'Заметки в облаке ещё не включены (Мастеру нужно запустить файл 03_zametki.sql). Пока блокнот хранится только на этом устройстве, а общей доски нет.' : 'Нет связи с заметками: ' + NT.err));
    const me = myHero();
    if (NT.tab === 'book') {
      NT.ctl = EkNotes.mountBook(B, { book: NT.book, color: heroCol(me), confirm: ntAsk, hint: 'Личный блокнот: его видишь только ты (и Мастер). Пишется само — сохранять не нужно.', onChange: bookChanged });
      return;
    }
    if (NT.st !== 'on') return;
    if (!NT.view) NT.view = { z: 0.5, x: 40, y: 20 };
    const sv = mkEl('button', 'btn primary bd-save', '☁ Сохранить'), st = mkEl('span', 'bd-st'); sv.type = 'button'; sv.addEventListener('click', boardSave);
    NT.ctl = EkNotes.mountBoard(B, { doc: () => NT.cur, view: NT.view, nm: ntName, col: (k) => heroCol(k), authors: null, author: () => me, setAuthor() {}, confirm: ntAsk,
      prefs: { get: (k, d) => store.get('ek_bd_' + k, d), set: (k, v) => store.set('ek_bd_' + k, v) }, extra: [sv, st],
      hint: 'Тяни доску, колёсико или щипок — приблизить. Двойной щелчок по доске — новый листочек. Листочек тянется за любое место, размер — за уголок. Нажми на листочек — писать. Правки увидят все после «Сохранить».',
      onChange: () => { ntDraft(); ntSave(); }, onView: () => store.set('ek_bview', NT.view) });
    ntSave();
  }
  addEventListener('beforeunload', (e) => { if (ntDirty()) { e.preventDefault(); e.returnValue = ''; } });
  setInterval(() => { if (S.prof && S.prof.role !== 'pending' && (S.tab === 'event' || S.tab === 'rolls')) { const a = document.activeElement; if (!a || a.tagName !== 'INPUT') render(); } }, 15000);
  start().catch((e) => { app.innerHTML = '<div class="boot">Ошибка: ' + esc(e.message || e) + '</div>'; });
})();
