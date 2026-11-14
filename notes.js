// =====================================================================
//  Заметки: общий движок блокнота и пробковой доски.
//  Один и тот же код — в Экосистеме Мастера и на странице игрока.
//  Доска хранит { notes: [...], threads: [...] }; правки собираются в «черновик»
//  и при сохранении накладываются на свежую доску из облака (чужие правки не затираются).
// =====================================================================
var EkNotes = (function () {
  const W0 = 4200, H0 = 2800;
  const PAPER = { y: ['#f6e27a', 'Жёлтый'], p: ['#f4b6c8', 'Розовый'], b: ['#a9d4f2', 'Голубой'], g: ['#b9e3a1', 'Зелёный'], w: ['#f3efe6', 'Белый'] };
  const THR = { r: ['#d8323f', 'Красная'], u: ['#3c7be0', 'Синяя'], g: ['#3fae5a', 'Зелёная'], y: ['#e8b62a', 'Жёлтая'] };
  const MAXN = 400, MAXT = 6000;
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const uid = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fmtD = (t) => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const clone = (o) => JSON.parse(JSON.stringify(o || {}));
  // ---------- данные доски ----------
  function fixBoard(B) {
    B = B && typeof B === 'object' ? B : {};
    B.notes = (Array.isArray(B.notes) ? B.notes : []).filter((n) => n && n.id).slice(-MAXN).map((n) => ({
      id: String(n.id), x: Math.round(Math.max(0, Math.min(W0 - 130, +n.x || 0))), y: Math.round(Math.max(0, Math.min(H0 - 110, +n.y || 0))),
      w: Math.round(Math.max(130, Math.min(900, +n.w || 210))), h: Math.round(Math.max(110, Math.min(900, +n.h || 180))),
      tx: String(n.tx || '').slice(0, MAXT), c: PAPER[n.c] ? n.c : 'y', by: String(n.by || 'main'), t: +n.t || Date.now(), r: Math.max(-4, Math.min(4, +n.r || 0)) }));
    const ids = new Set(B.notes.map((n) => n.id));
    B.threads = (Array.isArray(B.threads) ? B.threads : []).filter((t) => t && ids.has(t.a) && ids.has(t.b) && t.a !== t.b).map((t) => ({ id: String(t.id || uid()), a: t.a, b: t.b, c: THR[t.c] ? t.c : 'r' }));
    return B;
  }
  const sig = (n) => [n.x, n.y, n.w, n.h, n.tx, n.c, n.r].join('\u0001');
  // что поменялось в черновике относительно последней сохранённой доски
  function diff(base, cur) {
    const bn = new Map((base.notes || []).map((n) => [n.id, n])), cn = new Map((cur.notes || []).map((n) => [n.id, n]));
    const ops = { add: [], del: [], mod: [], tadd: [], tdel: [] };
    cn.forEach((n, id) => { const b = bn.get(id); if (!b) ops.add.push(clone(n)); else if (sig(b) !== sig(n)) ops.mod.push(clone(n)); });
    bn.forEach((n, id) => { if (!cn.has(id)) ops.del.push(id); });
    const tk = (t) => [t.a, t.b].sort().join('|') + '|' + t.c;
    const bt = new Set((base.threads || []).map(tk)), ct = new Set((cur.threads || []).map(tk));
    (cur.threads || []).forEach((t) => { if (!bt.has(tk(t))) ops.tadd.push(clone(t)); });
    (base.threads || []).forEach((t) => { if (!ct.has(tk(t))) ops.tdel.push(tk(t)); });
    ops.n = ops.add.length + ops.del.length + ops.mod.length + ops.tadd.length + ops.tdel.length;
    return ops;
  }
  // наложить свои правки на свежую доску
  function apply(doc, ops) {
    const D = fixBoard(clone(doc));
    const tk = (t) => [t.a, t.b].sort().join('|') + '|' + t.c;
    ops.del.forEach((id) => { D.notes = D.notes.filter((n) => n.id !== id); });
    ops.mod.forEach((n) => { const i = D.notes.findIndex((q) => q.id === n.id); if (i >= 0) D.notes[i] = clone(n); else D.notes.push(clone(n)); });
    ops.add.forEach((n) => { if (!D.notes.some((q) => q.id === n.id)) D.notes.push(clone(n)); });
    const del = new Set(ops.tdel); D.threads = D.threads.filter((t) => !del.has(tk(t)));
    ops.tadd.forEach((t) => { if (!D.threads.some((q) => tk(q) === tk(t))) D.threads.push(clone(t)); });
    return fixBoard(D);
  }
  // ---------- блокнот ----------
  //  o: { book: { pages, at }, onChange(), confirm(text, opts) → Promise<bool>, rustle(len, hi), hint, color }
  function mountBook(B, o) {
    const bk = o.book;
    if (!Array.isArray(bk.pages) || !bk.pages.length) bk.pages = [{ id: uid(), ti: '', tx: '', t: Date.now() }];
    bk.at = Math.max(0, Math.min(bk.pages.length - 1, bk.at | 0));
    const save = () => o.onChange && o.onChange();
    const rustle = o.rustle || (() => {});
    const wrap = h('div', 'nb-wrap'); if (o.color) wrap.style.setProperty('--pc', o.color);
    const cover = h('div', 'nb-cover');
    const rings = h('div', 'nb-rings'); for (let i = 0; i < 11; i++) rings.appendChild(h('i'));
    const stack = h('div', 'nb-stack'), page = h('div', 'nb-page');
    cover.append(stack, page, rings); wrap.appendChild(cover); B.appendChild(wrap);
    const nav = h('div', 'nb-nav');
    const prev = h('button', 'btn ghost', '◀'), nx = h('button', 'btn ghost', '▶'), num = h('span', 'nb-num'), add = h('button', 'btn', '+ Новая страница'), del = h('button', 'btn ghost nb-del', '🗑 Вырвать страницу');
    [prev, nx, add, del].forEach((b) => { b.type = 'button'; });
    prev.title = 'Предыдущая страница'; nx.title = 'Следующая страница';
    nav.append(prev, num, nx, add, del); B.appendChild(nav);
    if (o.hint) B.appendChild(h('p', 'nb-hint', o.hint));
    function fill(el, p, i) {
      el.innerHTML = '';
      const hd = h('div', 'nb-ph'), ti = h('input', 'nb-ti'); ti.placeholder = 'Без названия'; ti.maxLength = 80; ti.value = p.ti || '';
      hd.append(ti, h('small', 'nb-date', fmtD(p.t)));
      const tx = h('textarea', 'nb-tx'); tx.placeholder = i === 0 && !p.tx ? 'Пиши здесь — всё сохранится само…' : ''; tx.value = p.tx || ''; tx.spellcheck = false; tx.maxLength = 20000;
      el.append(hd, tx, h('div', 'nb-pf', '— ' + (i + 1) + ' —'));
      const curl = h('button', 'nb-curl'); curl.type = 'button'; curl.title = i < bk.pages.length - 1 ? 'Перевернуть страницу' : 'Новая страница'; el.appendChild(curl);
      curl.addEventListener('click', () => (i < bk.pages.length - 1 ? turn(1) : newPage()));
      ti.addEventListener('input', () => { p.ti = ti.value; p.t = Date.now(); save(); });
      tx.addEventListener('input', () => { p.tx = tx.value; p.t = Date.now(); save(); });
      return { ti, tx };
    }
    let F = null;
    function show() {
      const p = bk.pages[bk.at]; F = fill(page, p, bk.at);
      num.textContent = 'стр. ' + (bk.at + 1) + ' из ' + bk.pages.length;
      prev.disabled = bk.at <= 0; nx.disabled = bk.at >= bk.pages.length - 1; del.disabled = bk.pages.length <= 1 && !p.tx && !p.ti;
      stack.style.setProperty('--n', Math.min(6, bk.pages.length - 1 - bk.at));
    }
    let busy = false;
    function turn(d, target) {
      const to = target != null ? target : bk.at + d;
      if (busy || to < 0 || to >= bk.pages.length || to === bk.at) return;
      busy = true; rustle(0.38);
      const leaf = h('div', 'nb-page nb-leaf ' + (d > 0 ? 'fwd' : 'back'));
      if (d > 0) { fill(leaf, bk.pages[bk.at], bk.at); bk.at = to; show(); } else fill(leaf, bk.pages[to], to);
      leaf.querySelectorAll('input,textarea,button').forEach((e) => { e.tabIndex = -1; e.setAttribute('aria-hidden', 'true'); });
      cover.appendChild(leaf);
      const done = () => { if (!busy) return; if (d < 0) { bk.at = to; show(); } leaf.remove(); busy = false; save(); };
      leaf.addEventListener('animationend', done, { once: true }); setTimeout(done, 1200);
    }
    function newPage() { bk.pages.push({ id: uid(), ti: '', tx: '', t: Date.now() }); save(); turn(1, bk.pages.length - 1); setTimeout(() => { try { F.tx.focus(); } catch (e) {} }, 700); }
    prev.addEventListener('click', () => turn(-1)); nx.addEventListener('click', () => turn(1)); add.addEventListener('click', newPage);
    del.addEventListener('click', async () => {
      const p = bk.pages[bk.at];
      if ((p.tx || p.ti) && !(await o.confirm('Вырвать страницу «' + (p.ti || 'без названия') + '»? Написанное пропадёт.', { title: 'Вырвать страницу', ok: 'Вырвать' }))) return;
      rustle(0.5, 1400);
      if (bk.pages.length <= 1) bk.pages[0] = { id: uid(), ti: '', tx: '', t: Date.now() };
      else { bk.pages.splice(bk.at, 1); bk.at = Math.min(bk.at, bk.pages.length - 1); }
      page.classList.add('torn'); setTimeout(() => { page.classList.remove('torn'); show(); save(); }, 380);
    });
    wrap.addEventListener('pointerdown', (e) => e.stopPropagation());
    wrap.addEventListener('wheel', (e) => { if (e.target.closest('textarea') && e.target.scrollHeight > e.target.clientHeight) return; if (Math.abs(e.deltaY) < 30) return; e.preventDefault(); turn(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    // на телефоне — листать пальцем: влево — дальше, вправо — назад (пока не пишешь)
    let tsw = null;
    wrap.addEventListener('touchstart', (e) => { const t = e.touches[0], typing = document.activeElement && page.contains(document.activeElement) && e.target.closest('textarea,input'); tsw = e.touches.length === 1 && !typing ? [t.clientX, t.clientY, Date.now()] : null; }, { passive: true });
    wrap.addEventListener('touchend', (e) => { if (!tsw) return; const t = e.changedTouches[0], dx = t.clientX - tsw[0], dy = t.clientY - tsw[1], ok = Date.now() - tsw[2] < 650 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6; tsw = null; if (ok) turn(dx < 0 ? 1 : -1); }, { passive: true });
    show();
    // чужая правка (с другого устройства) — перерисовать, если сейчас не печатают
    return { refresh() { if (busy || (document.activeElement && page.contains(document.activeElement))) return false; bk.at = Math.max(0, Math.min(bk.pages.length - 1, bk.at | 0)); show(); return true; } };
  }
  // ---------- доска ----------
  //  o: { doc: () => доска, view: {z,x,y}, onChange(), onView(), nm(k), col(k), authors: [ключи] | null, author: () => ключ, setAuthor(k),
  //       confirm, rustle, prefs: { get(k, d), set(k, v) }, extra: [элементы для панели], hint }
  function mountBoard(B, o) {
    const V = o.view, P = o.prefs || { get: (k, d) => d, set() {} };
    const changed = () => o.onChange && o.onChange();
    const viewed = () => o.onView && o.onView();
    const rustle = o.rustle || (() => {});
    let thr = null, thrA = null, paperC = P.get('paper', 'y');
    const D = () => o.doc();
    const tools = h('div', 'bd-tools');
    const addB = h('button', 'btn', '+ Листочек'); addB.type = 'button';
    const pc = h('div', 'bd-sw'); Object.keys(PAPER).forEach((c) => { const b = h('button', c === paperC ? 'on' : ''); b.type = 'button'; b.title = PAPER[c][1] + ' листочек'; b.style.background = PAPER[c][0]; b.addEventListener('click', () => { paperC = c; P.set('paper', c); pc.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }); pc.appendChild(b); });
    tools.append(addB, pc);
    if (o.authors && o.authors.length > 1) { const au = h('select', 'bd-au'); o.authors.forEach((k) => { const op = h('option', '', 'Пишет: ' + o.nm(k)); op.value = k; au.appendChild(op); }); au.value = o.author(); au.addEventListener('change', () => o.setAuthor(au.value)); tools.appendChild(au); }
    const th = h('div', 'bd-thr'); th.appendChild(h('span', '', 'Нитка:'));
    Object.keys(THR).forEach((c) => { const b = h('button'); b.type = 'button'; b.title = THR[c][1] + ' нитка — нажми листочек, потом второй'; b.style.setProperty('--tc', THR[c][0]); b.addEventListener('click', () => { thr = thr === c ? null : c; thrA = null; paintThrUI(); }); th.appendChild(b); });
    const zm = h('div', 'bd-zoom'), zo = h('button', '', '−'), zv = h('span'), zi = h('button', '', '+'), fit = h('button', '', '⤢ Всё');
    [zo, zi, fit].forEach((b) => { b.type = 'button'; }); zo.title = 'Отдалить'; zi.title = 'Приблизить'; fit.title = 'Показать все листочки';
    zm.append(zo, zv, zi, fit);
    tools.append(th, zm); (o.extra || []).forEach((e) => tools.appendChild(e)); B.appendChild(tools);
    const view = h('div', 'bd-view'), world = h('div', 'bd-world'), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    world.style.width = W0 + 'px'; world.style.height = H0 + 'px';
    svg.setAttribute('class', 'bd-svg'); svg.setAttribute('width', W0); svg.setAttribute('height', H0); svg.setAttribute('viewBox', '0 0 ' + W0 + ' ' + H0);
    world.appendChild(svg); view.appendChild(world); B.appendChild(view);
    const hint = h('p', 'nb-hint'); B.appendChild(hint);
    const clampV = () => { const r = view.getBoundingClientRect(), z = V.z; if (!r.width) return; V.x = Math.min(r.width * 0.6, Math.max(r.width * 0.4 - W0 * z, V.x)); V.y = Math.min(r.height * 0.6, Math.max(r.height * 0.4 - H0 * z, V.y)); };
    // ручки и крестики не мельчают при отдалении: --iz = 1/масштаб (не больше ×2,4)
    let lastZ = V.z;
    const applyV = () => { clampV(); world.style.transform = `translate(${V.x}px,${V.y}px) scale(${V.z})`; world.style.setProperty('--iz', Math.max(1, Math.min(2.4, 1 / V.z)).toFixed(3)); zv.textContent = Math.round(V.z * 100) + '%'; view.classList.toggle('far', V.z < 0.45); if (Math.abs(lastZ - V.z) > 0.05 && svg.childNodes.length) { lastZ = V.z; drawThreads(); } };
    const zoomAt = (z, cx, cy) => { const r = view.getBoundingClientRect(); const px = cx - r.left, py = cy - r.top; z = Math.max(0.2, Math.min(2.5, z)); const wx = (px - V.x) / V.z, wy = (py - V.y) / V.z; V.z = z; V.x = px - wx * z; V.y = py - wy * z; applyV(); viewed(); };
    const center = () => { const r = view.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    zo.addEventListener('click', () => zoomAt(V.z / 1.25, ...center())); zi.addEventListener('click', () => zoomAt(V.z * 1.25, ...center()));
    function fitAll() {
      const r = view.getBoundingClientRect(), N = D().notes; if (!N.length) { V.z = 0.55; V.x = r.width / 2 - W0 * V.z / 2; V.y = r.height / 2 - H0 * V.z / 2; applyV(); viewed(); return; }
      const x0 = Math.min(...N.map((n) => n.x)) - 60, y0 = Math.min(...N.map((n) => n.y)) - 60, x1 = Math.max(...N.map((n) => n.x + n.w)) + 60, y1 = Math.max(...N.map((n) => n.y + n.h)) + 60;
      V.z = Math.max(0.2, Math.min(1.4, Math.min(r.width / (x1 - x0), r.height / (y1 - y0)))); V.x = r.width / 2 - (x0 + x1) / 2 * V.z; V.y = r.height / 2 - (y0 + y1) / 2 * V.z; applyV(); viewed();
    }
    fit.addEventListener('click', fitAll);
    view.addEventListener('wheel', (e) => { if (e.target.closest('textarea') && document.activeElement === e.target && e.target.scrollHeight > e.target.clientHeight) return; e.preventDefault(); zoomAt(V.z * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
    // никакого выделения текста, пока что-то тянут
    const noSel = (on) => { document.documentElement.classList.toggle('bd-dragging', on); if (on) { try { const s = window.getSelection(); if (s && s.rangeCount) s.removeAllRanges(); } catch (e) {} } };
    const isBg = (t) => t === view || t === world || t === svg;
    // перетаскивание доски (и щипок двумя пальцами)
    const ptrs = new Map(); let pinch = null;
    view.addEventListener('pointerdown', (e) => {
      e.stopPropagation();   // иначе вместе с доской поедет всё окно (окна Экосистемы таскаются за пустое место)
      if (!isBg(e.target)) return;
      e.preventDefault();    // без этого браузер начинает выделять текст на листочках
      if (document.activeElement && document.activeElement.blur && world.contains(document.activeElement)) document.activeElement.blur();
      if (thr) { thrA = null; paintThrUI(); }
      ptrs.set(e.pointerId, [e.clientX, e.clientY]); try { view.setPointerCapture(e.pointerId); } catch (er) {}
      noSel(true); view.classList.add('pan');
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: V.z }; return; }
      const sx = e.clientX, sy = e.clientY, ox = V.x, oy = V.y;
      const mv = (ev) => {
        if (!ptrs.has(ev.pointerId)) return; ptrs.set(ev.pointerId, [ev.clientX, ev.clientY]);
        if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; zoomAt(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); return; }
        if (ev.pointerId !== e.pointerId) return;
        V.x = ox + ev.clientX - sx; V.y = oy + ev.clientY - sy; applyV();
      };
      const up = (ev) => { ptrs.delete(ev.pointerId); if (ptrs.size) return; pinch = null; view.removeEventListener('pointermove', mv); view.removeEventListener('pointerup', up); view.removeEventListener('pointercancel', up); view.classList.remove('pan'); noSel(false); viewed(); };
      view.addEventListener('pointermove', mv); view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    });
    view.addEventListener('dblclick', (e) => { if (!isBg(e.target)) return; const r = view.getBoundingClientRect(); addNote((e.clientX - r.left - V.x) / V.z - 100, (e.clientY - r.top - V.y) / V.z - 20); });
    addB.addEventListener('click', () => { const r = view.getBoundingClientRect(); addNote((r.width / 2 - V.x) / V.z - 100 + (Math.random() - 0.5) * 80, (r.height / 2 - V.y) / V.z - 90 + (Math.random() - 0.5) * 60); });
    const EL = {};
    function addNote(x, y) {
      const doc = D(); if (doc.notes.length >= MAXN) return;
      const n = { id: uid(), x: Math.round(Math.max(10, Math.min(W0 - 210, x))), y: Math.round(Math.max(10, Math.min(H0 - 180, y))), w: 210, h: 180, tx: '', c: paperC, by: o.author(), t: Date.now(), r: +((Math.random() - 0.5) * 5).toFixed(1) };
      doc.notes.push(n); changed(); rustle(0.22, 3000);
      const el = noteEl(n); el.classList.add('new'); setTimeout(() => { try { el.querySelector('textarea').focus(); } catch (e) {} }, 60);
    }
    const pinOf = (n) => [n.x + n.w / 2, n.y + 12];
    function drawThreads() {
      svg.innerHTML = ''; const doc = D();
      doc.threads = doc.threads.filter((t) => doc.notes.some((n) => n.id === t.a) && doc.notes.some((n) => n.id === t.b));
      doc.threads.forEach((t) => {
        const A = doc.notes.find((n) => n.id === t.a), Bn = doc.notes.find((n) => n.id === t.b), [x1, y1] = pinOf(A), [x2, y2] = pinOf(Bn);
        const d = Math.hypot(x2 - x1, y2 - y1), sag = Math.min(120, 18 + d * 0.12), mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag, path = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
        const g = document.createElementNS(svg.namespaceURI, 'g'); g.setAttribute('class', 'bd-t');
        g.innerHTML = `<path d="${path}" transform="translate(3,5)" stroke="rgba(0,0,0,.35)" stroke-width="4" fill="none"/><path d="${path}" stroke="${(THR[t.c] || THR.r)[0]}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path class="hit" d="${path}" stroke="transparent" stroke-width="${Math.round(18 * Math.max(1, Math.min(2.4, 1 / V.z)))}" fill="none"/>`;
        g.querySelector('.hit').addEventListener('click', async (e) => { e.stopPropagation(); if (!(await o.confirm('Снять эту нитку?', { title: 'Нитка', ok: 'Снять' }))) return; const d2 = D(); d2.threads = d2.threads.filter((q) => q.id !== t.id); changed(); drawThreads(); });
        [[x1, y1, A], [x2, y2, Bn]].forEach(([x, y, n]) => { const c = o.col(n.by); g.insertAdjacentHTML('beforeend', `<circle cx="${x + 2}" cy="${y + 4}" r="7" fill="rgba(0,0,0,.35)"/><circle cx="${x}" cy="${y}" r="7" fill="${c}"/><circle cx="${x - 2.2}" cy="${y - 2.4}" r="2.2" fill="rgba(255,255,255,.75)"/>`); });
        svg.appendChild(g);
      });
    }
    const find = (id) => D().notes.find((q) => q.id === id);
    function noteEl(n) {
      const id = n.id, el = h('div', 'bd-n'); EL[id] = el; el.dataset.id = id;
      const pin = h('i', 'bd-pin');
      const hd = h('div', 'bd-nh'), by = h('span', 'bd-by');
      const cs = h('span', 'bd-cs'); Object.keys(PAPER).forEach((c) => { const b = h('button'); b.type = 'button'; b.style.background = PAPER[c][0]; b.title = PAPER[c][1]; b.addEventListener('click', () => { const q = find(id); if (!q) return; q.c = c; el.style.setProperty('--paper', PAPER[c][0]); changed(); }); cs.appendChild(b); });
      const x = h('button', 'bd-x', '×'); x.type = 'button'; x.title = 'Снять листочек';
      hd.append(by, cs, x);
      const tx = h('textarea', 'bd-tx'); tx.placeholder = 'Напиши что-нибудь…'; tx.spellcheck = false; tx.maxLength = MAXT;
      tx.addEventListener('input', () => { const q = find(id); if (!q) return; q.tx = tx.value; q.t = Date.now(); changed(); });
      const rs = h('span', 'bd-rs'); rs.title = 'Потяни, чтобы изменить размер';
      el.append(pin, hd, tx, rs); world.insertBefore(el, svg);
      el.__sync = () => {
        const q = find(id); if (!q) return;
        el.style.setProperty('--paper', (PAPER[q.c] || PAPER.y)[0]); el.style.setProperty('--r', (q.r || 0) + 'deg');
        el.style.left = q.x + 'px'; el.style.top = q.y + 'px'; el.style.width = q.w + 'px'; el.style.height = q.h + 'px';
        pin.style.setProperty('--tc', o.col(q.by)); by.textContent = o.nm(q.by); by.style.color = o.col(q.by);
        if (document.activeElement !== tx && tx.value !== (q.tx || '')) tx.value = q.tx || '';
      };
      el.__sync();
      x.addEventListener('click', async () => { const q = find(id); if (!q) return; if (q.tx && !(await o.confirm('Снять листочек? Текст пропадёт.', { title: 'Листочек', ok: 'Снять' }))) return; rustle(0.3, 1600); const d2 = D(); d2.notes = d2.notes.filter((z) => z.id !== id); el.classList.add('gone'); setTimeout(() => el.remove(), 260); delete EL[id]; changed(); drawThreads(); });
      // перетаскивание и размер (в координатах доски — с учётом приближения)
      const drag = (e, mode, sx0, sy0) => {
        const q = find(id); if (!q) return;
        const sx = sx0 == null ? e.clientX : sx0, sy = sy0 == null ? e.clientY : sy0, ob = { x: q.x, y: q.y, w: q.w, h: q.h };
        try { el.setPointerCapture(e.pointerId); } catch (er) {}
        el.classList.add(mode === 'move' ? 'lift' : 'sizing'); noSel(true);
        // наверх стопки — только когда отпустят: перестановка узла посреди перетаскивания обрывает захват указателя
        const d2 = D(); d2.notes.splice(d2.notes.indexOf(q), 1); d2.notes.push(q);
        let moved = false;
        const mv = (ev) => { if (ev.pointerId !== e.pointerId) return; const dx = (ev.clientX - sx) / V.z, dy = (ev.clientY - sy) / V.z; moved = true;
          if (mode === 'move') { q.x = Math.round(Math.max(0, Math.min(W0 - q.w, ob.x + dx))); q.y = Math.round(Math.max(0, Math.min(H0 - q.h, ob.y + dy))); }
          else { q.w = Math.round(Math.max(130, Math.min(900, ob.w + dx))); q.h = Math.round(Math.max(110, Math.min(900, ob.h + dy))); }
          el.__sync(); drawThreads(); };
        const up = (ev) => { if (ev.pointerId !== e.pointerId) return; el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.classList.remove('lift', 'sizing'); noSel(false);
          const act = document.activeElement; if (!el.contains(act)) { world.appendChild(el); world.appendChild(svg); }
          if (moved || mode === 'move') changed(); };
        el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
        if (sx0 != null) mv(e);
      };
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (thr) { e.preventDefault(); linkClick(id); return; }
        if (e.button && e.button !== 0) return;
        if (e.target === rs || e.target.closest('.bd-rs')) { e.preventDefault(); return drag(e, 'size'); }
        if (e.target.closest('button')) return;
        // текст: если листочек не в работе — тянется весь; короткое нажатие без движения — начать писать
        if (e.target === tx && (document.activeElement !== tx || view.classList.contains('far'))) {
          e.preventDefault();
          const sx = e.clientX, sy = e.clientY;
          let gone = false;
          const mv = (ev) => { if (ev.pointerId !== e.pointerId || gone) return; if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) { gone = true; off(); drag(ev, 'move', sx, sy); } };
          const up = (ev) => { if (ev.pointerId !== e.pointerId || gone) return; gone = true; off();
            if (view.classList.contains('far')) { const r = view.getBoundingClientRect(), q = find(id); if (q) { V.z = 0.95; V.x = r.width / 2 - (q.x + q.w / 2) * V.z; V.y = r.height / 2 - (q.y + q.h / 2) * V.z; applyV(); drawThreads(); viewed(); } return; }
            tx.focus(); try { const L = tx.value.length; tx.setSelectionRange(L, L); } catch (er) {} };
          const off = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
          try { el.setPointerCapture(e.pointerId); } catch (er) {}
          el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
          return;
        }
        if (e.target === tx) return;     // в работе — обычное выделение текста внутри листочка
        e.preventDefault();
        if (document.activeElement === tx) tx.blur();
        drag(e, 'move');
      });
      return el;
    }
    function linkClick(id) {
      if (!thrA) { thrA = id; paintThrUI(); return; }
      if (thrA === id) { thrA = null; paintThrUI(); return; }
      const a = thrA, b = id, doc = D(); thrA = null;
      if (!doc.threads.some((t) => t.c === thr && ((t.a === a && t.b === b) || (t.a === b && t.b === a)))) { doc.threads.push({ id: uid(), a, b, c: thr }); changed(); rustle(0.12, 4200); }
      drawThreads(); paintThrUI();
    }
    function paintThrUI() {
      th.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', Object.keys(THR)[i] === thr));
      view.classList.toggle('linking', !!thr);
      Object.keys(EL).forEach((id) => EL[id].classList.toggle('pick', id === thrA));
      hint.textContent = thr ? (thrA ? THR[thr][1] + ' нитка: теперь нажми второй листочек. Нажми на пустую доску — отмена.' : THR[thr][1] + ' нитка: нажми первый листочек. Нажми ту же кнопку ещё раз — выйти.')
        : (o.hint || 'Тяни доску мышкой, колёсико — приблизить. Двойной щелчок по доске — новый листочек. Листочек тянется за любое место, размер — за уголок. Нажми на листочек — писать. Нажми на нитку — снять её.');
    }
    // перерисовать по данным (после чужих правок): листочек, в котором печатают, не трогаем
    function refresh() {
      const doc = D(), ids = new Set(doc.notes.map((n) => n.id));
      Object.keys(EL).forEach((id) => { if (!ids.has(id)) { if (EL[id].contains(document.activeElement)) return; EL[id].remove(); delete EL[id]; } });
      doc.notes.forEach((n) => { if (!EL[n.id]) noteEl(n); else EL[n.id].__sync(); });
      const act = document.activeElement, order = doc.notes.map((n) => EL[n.id]).filter(Boolean);
      const cur = [...world.children].filter((e) => e.classList && e.classList.contains('bd-n') && !e.classList.contains('gone'));
      if (order.some((e, i) => cur[i] !== e)) { order.forEach((e) => { if (!e.contains(act)) world.appendChild(e); }); world.appendChild(svg); }
      drawThreads(); paintThrUI();
    }
    D().notes.forEach(noteEl);
    drawThreads(); paintThrUI();
    requestAnimationFrame(applyV);
    return { refresh, view, hint, fit: fitAll };
  }
  return { W0, H0, PAPER, THR, uid, clone, fixBoard, diff, apply, mountBook, mountBoard };
})();
