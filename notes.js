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
  // ---------- рисунок поверх страницы ----------
  //  Штрих: { b: кисть, c: цвет, w: толщина (доли ширины страницы ×10000), o: непрозрачность 0–100, p: [x0, y0, dx, dy, …] в долях ширины ×2000 }.
  //  Слой лежит над текстом и прокручивается вместе с ним; ластик стирает только рисунок.
  const PALETTE = ['#111111', '#444444', '#888888', '#c8c8c8', '#ffffff', '#f3ecdc', '#5a0610', '#c0262d', '#ff3a46', '#ff8a96', '#ffc2d1', '#d81b60',
    '#e65100', '#ff8a1e', '#ffb74d', '#ffd54f', '#fff176', '#c9a227', '#1b5e20', '#2e7d32', '#43a047', '#9ccc65', '#26a69a', '#00838f',
    '#0d47a1', '#1f4fb0', '#42a5f5', '#90caf9', '#311b92', '#5e35b1', '#9575cd', '#ce93d8', '#3e2723', '#6d4c41', '#a1887f', '#d7b899'];
  const BRUSH = { pen: ['✒', 'Ручка', 4, 100], pencil: ['✏', 'Карандаш', 3, 85], marker: ['▮', 'Маркер', 18, 45], brush: ['🖌', 'Кисть', 10, 95], neon: ['✦', 'Неон', 6, 100], spray: ['∴', 'Баллончик', 16, 80], eraser: ['◌', 'Ластик', 24, 100] };
  const OKCOL = /^#[0-9a-f]{6}$/i;
  const seeded = (n) => { let x = (n | 0) * 2654435761 >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
  const LSI = { get(k, d) { try { const v = localStorage.getItem('ek_ink_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('ek_ink_' + k, JSON.stringify(v)); } catch (e) {} } };
  function inkFix(a) {
    return (Array.isArray(a) ? a : []).filter((q) => q && BRUSH[q.b] && Array.isArray(q.p) && q.p.length >= 2 && q.p.length <= 40000).slice(0, 3000).map((q) => ({
      b: q.b, c: OKCOL.test(q.c) ? q.c : '#111111', w: Math.max(1, Math.min(2000, q.w | 0)), o: Math.max(5, Math.min(100, q.o | 0)), p: q.p.map((v) => v | 0) }));
  }
  function inkPts(q, W, offY) { const k = W / 2000, a = q.p, out = []; let x = 0, y = 0; for (let i = 0; i + 1 < a.length; i += 2) { x += a[i]; y += a[i + 1]; out.push([x * k, y * k - offY]); } return out; }
  function inkPath(c, P) {
    c.beginPath(); c.moveTo(P[0][0], P[0][1]);
    if (P.length === 1) { c.lineTo(P[0][0] + 0.01, P[0][1]); return; }
    for (let i = 1; i < P.length - 1; i++) c.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
    c.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
  }
  // зерно грифеля: узор в точках экрана, для каждого цвета — свой (постоянный, без мерцания при перерисовке)
  const GRAIN = new Map();
  function grain(t, col, dens, k) {
    const key = col + '|' + dens + '|' + k; let pt = GRAIN.get(key); if (pt) return pt;
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data;
    const n = parseInt(col.slice(1), 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255, rnd = seeded(n + dens * 977 + 13);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4, u = rnd(), streak = 0.12 * Math.sin((x * 0.9 + y * 0.35) * 1.7 + rnd() * 0.6);
      const a = dens ? (u < 0.18 ? 0 : 0.45 + 0.55 * rnd()) : (u < 0.34 ? rnd() * 0.18 : 0.38 + 0.5 * rnd() + streak);
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
    g.putImageData(im, 0, 0); pt = t.createPattern(c, 'repeat'); GRAIN.set(key, pt); if (GRAIN.size > 120) GRAIN.delete(GRAIN.keys().next().value); return pt;
  }
  // форма штриха — во вспомогательный холст (целиком, без прозрачности); прозрачность — при наложении
  function inkShape(t, q, W, H, offY) {
    const P = inkPts(q, W, offY); if (!P.length) return false;
    const w = Math.max(0.6, q.w * W / 10000);
    let y0 = Infinity, y1 = -Infinity; P.forEach((pt) => { if (pt[1] < y0) y0 = pt[1]; if (pt[1] > y1) y1 = pt[1]; });
    if (y1 < -w * 3 || y0 > H + w * 3) return false;
    t.save(); t.lineCap = t.lineJoin = 'round'; t.strokeStyle = t.fillStyle = q.c;
    const rnd = seeded(q.p.length * 31 + q.p[0] * 7 + q.p[1]);
    if (q.b === 'pen' || q.b === 'marker' || q.b === 'eraser') { t.lineWidth = w; inkPath(t, P); t.stroke(); }
    else if (q.b === 'pencil') {
      // грифель: одна линия, залитая зерном (точки разной плотности и просветы «зубчиков» бумаги); середина плотнее краёв
      const k = t.getTransform ? t.getTransform().a : 1, pat = (sh, dens) => { const g = grain(t, q.c, dens, k); try { g.setTransform(new DOMMatrix().scale(1 / k).translate(sh, sh * 0.6)); } catch (e) {} return g; };
      t.strokeStyle = pat(0, w <= 3.2 ? 1 : 0); t.lineWidth = Math.max(1, w); inkPath(t, P); t.stroke();
      if (w > 2.5) { t.strokeStyle = pat(37, 1); t.lineWidth = Math.max(1, w * 0.55); inkPath(t, P); t.stroke(); }
    }
    else if (q.b === 'brush') {
      let pw = w;
      for (let i = 0; i < P.length; i++) {
        const a = P[Math.max(0, i - 1)], b = P[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), tw = w * Math.max(0.35, Math.min(1.25, 1.25 - d / (w * 2.5)));
        const steps = Math.max(1, Math.ceil(d / Math.max(0.6, w * 0.18)));
        for (let s2 = 1; s2 <= steps; s2++) { const u = s2 / steps, r = (pw + (tw - pw) * u) / 2; t.beginPath(); t.arc(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, r, 0, Math.PI * 2); t.fill(); }
        if (i === 0) { t.beginPath(); t.arc(b[0], b[1], tw / 2, 0, Math.PI * 2); t.fill(); }
        pw = pw + (tw - pw) * 0.6;
      }
    }
    else if (q.b === 'neon') { t.shadowColor = q.c; t.shadowBlur = w * 2.4; t.lineWidth = w; inkPath(t, P); t.stroke(); t.stroke(); t.shadowBlur = 0; t.strokeStyle = 'rgba(255,255,255,.85)'; t.lineWidth = Math.max(0.6, w * 0.32); inkPath(t, P); t.stroke(); }
    else if (q.b === 'spray') {
      for (let i = 0; i < P.length; i++) {
        const a = P[Math.max(0, i - 1)], b = P[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(4, Math.round((d / Math.max(1, w * 0.3) + 1) * w * 0.5));
        for (let k = 0; k < n; k++) { const u = rnd(), an = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * w; t.fillRect(a[0] + (b[0] - a[0]) * u + Math.cos(an) * rr, a[1] + (b[1] - a[1]) * u + Math.sin(an) * rr, 1.1, 1.1); }
      }
    }
    t.restore(); return true;
  }
  const tClear = (t) => { t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, t.canvas.width, t.canvas.height); t.restore(); };
  const compose = (m, t, o) => { m.save(); m.globalAlpha = o / 100; m.setTransform(1, 0, 0, 1, 0, 0); m.drawImage(t.canvas, 0, 0); m.restore(); };
  function inkErase(m, q, W, H, offY) { m.save(); m.globalCompositeOperation = 'destination-out'; inkShape(m, Object.assign({}, q, { c: '#000000' }), W, H, offY); m.restore(); }
  // все штрихи страницы: маркер — на своём слое («умножение» поверх текста, как настоящий текстовыделитель),
  //  проходы одного цвета сливаются в одну заливку — без тёмных полос на нахлёстах
  function inkRender(mc, kc, tA, tB, list, W, H, offY, skip) {
    let run = null;
    const flush = () => { if (run) { compose(kc, tA, run.o); run = null; } };
    list.forEach((q, i) => {
      if (skip && skip.has(i)) return;
      if (q.b === 'eraser') { flush(); inkErase(mc, q, W, H, offY); inkErase(kc, q, W, H, offY); return; }
      if (q.b === 'marker') { if (!run || run.c !== q.c || run.o !== q.o) { flush(); tClear(tA); run = { c: q.c, o: q.o }; } inkShape(tA, q, W, H, offY); return; }
      tClear(tB); if (inkShape(tB, q, W, H, offY)) compose(mc, tB, q.o);
    });
    flush();
  }
  // маркер, которым сейчас ведут, сливается с предыдущими проходами того же цвета
  function markerRun(list, c, o) { const S2 = new Set(); for (let i = list.length - 1; i >= 0; i--) { const q = list[i]; if (q.b === 'eraser') break; if (q.b !== 'marker') continue; if (q.c === c && q.o === o) S2.add(i); else break; } return S2; }
  // слой рисунка над текстом страницы
  function inkLayer(host, ed, p, live, ctl) {
    const cvK = h('canvas', 'nb-ink nb-ink-mk'), cv = h('canvas', 'nb-ink');
    const base = document.createElement('canvas'), baseK = document.createElement('canvas'), tA = document.createElement('canvas'), tB = document.createElement('canvas');
    const mc = cv.getContext('2d'), kc = cvK.getContext('2d'), bc = base.getContext('2d'), bk2 = baseK.getContext('2d'), ta = tA.getContext('2d'), tb2 = tB.getContext('2d');
    host.appendChild(cvK); host.appendChild(cv);
    let W = 0, H = 0, OY = 0, dpr = 1, cur = null, raf = 0, baseOff = -1, dirty = true, baseSkip = '';
    function place() {
      // слой — на всю страницу (заголовок и поля тоже), отсчёт — от начала текста
      const nw = ed.offsetWidth, nh = host.clientHeight; if (!nw || !nh) return false;
      if (OY !== ed.offsetTop) { OY = ed.offsetTop; dirty = true; }
      [cv, cvK].forEach((c) => { c.style.left = ed.offsetLeft + 'px'; c.style.top = '0px'; c.style.width = nw + 'px'; c.style.height = nh + 'px'; });
      const nd = Math.min(2, window.devicePixelRatio || 1);
      if (nw !== W || nh !== H || nd !== dpr) { W = nw; H = nh; dpr = nd; [cv, cvK, base, baseK, tA, tB].forEach((c) => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }); [mc, kc, bc, bk2, ta, tb2].forEach((c) => c.setTransform(dpr, 0, 0, dpr, 0, 0)); dirty = true; }
      return true;
    }
    // прокрученный текст уходит под заголовок — рисунок вместе с ним
    const clip = (c) => { if (ed.scrollTop > 0) { c.beginPath(); c.rect(0, OY, W, H - OY); c.clip(); } };
    function rebase(skip) {
      const off = ed.scrollTop; tClear(bc); tClear(bk2); bc.save(); bk2.save(); clip(bc); clip(bk2);
      inkRender(bc, bk2, ta, tb2, p.ink || [], W, H, off - OY, skip); bc.restore(); bk2.restore();
      baseOff = off; dirty = false; baseSkip = skip ? [...skip].join(',') : '';
    }
    function frame() {
      raf = 0; if (!W && !place()) return;
      const ink = p.ink || [], run = cur && cur.b === 'marker' ? markerRun(ink, cur.c, cur.o) : null, key = run ? [...run].join(',') : '';
      if (dirty || baseOff !== ed.scrollTop || baseSkip !== key) rebase(run);
      tClear(mc); tClear(kc); mc.save(); mc.setTransform(1, 0, 0, 1, 0, 0); mc.drawImage(base, 0, 0); mc.restore(); kc.save(); kc.setTransform(1, 0, 0, 1, 0, 0); kc.drawImage(baseK, 0, 0); kc.restore();
      if (!cur || cur.p.length < 2) return;
      const off = ed.scrollTop - OY;
      mc.save(); kc.save(); clip(mc); clip(kc);
      if (cur.b === 'eraser') { inkErase(mc, cur, W, H, off); inkErase(kc, cur, W, H, off); }
      else if (cur.b === 'marker') { tClear(ta); [...run].sort((x, y) => x - y).forEach((i) => inkShape(ta, ink[i], W, H, off)); inkShape(ta, cur, W, H, off); compose(kc, ta, cur.o); }
      else { tClear(tb2); if (inkShape(tb2, cur, W, H, off)) compose(mc, tb2, cur.o); }
      mc.restore(); kc.restore();
    }
    const redraw = (full) => { if (full) dirty = true; if (!raf) raf = requestAnimationFrame(frame); };
    const ro = window.ResizeObserver ? new ResizeObserver(() => { if (place()) redraw(true); }) : null; if (ro) { ro.observe(ed); ro.observe(host); }
    ed.addEventListener('scroll', () => redraw());
    requestAnimationFrame(() => { place(); redraw(true); });
    if (!live) return { redraw, setMode() {}, cv };
    // ввод: одним пальцем/пером/мышью — рисовать; двумя пальцами — листать страницу
    const ptrs = new Map(); let lastX = 0, lastY = 0, two = null;
    const toN = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / W * 2000, (e.clientY - r.top - OY + ed.scrollTop) / W * 2000]; };
    cv.addEventListener('pointerdown', (e) => {
      if (!cv.classList.contains('on') || (e.button && e.button !== 0)) return;
      e.preventDefault(); e.stopPropagation(); try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      ctl.down && ctl.down();
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size >= 2) { cur = null; two = { y: [...ptrs.values()].reduce((s2, v) => s2 + v[1], 0) / ptrs.size, st: ed.scrollTop }; redraw(); return; }
      const st = ctl.state(), [x, y] = toN(e);
      cur = { b: st.b, c: st.c, w: Math.max(1, Math.round(st.w / W * 10000)), o: st.b === 'eraser' ? 100 : st.o, p: [Math.round(x), Math.round(y)] };
      lastX = Math.round(x); lastY = Math.round(y); redraw();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (two) { const y = [...ptrs.values()].reduce((s2, v) => s2 + v[1], 0) / ptrs.size; ed.scrollTop = two.st - (y - two.y); return; }
      if (!cur) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach((ev) => { const [x, y] = toN(ev), X = Math.round(x), Y = Math.round(y); if (Math.hypot(X - lastX, Y - lastY) * W / 2000 < 1.2) return; cur.p.push(X - lastX, Y - lastY); lastX = X; lastY = Y; });
      redraw();
    });
    const up = (e) => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (ptrs.size) return;
      if (two) { two = null; return; }
      const q = cur; cur = null; if (!q) return;
      if (q.p.length === 2) q.p.push(1, 0);   // точка
      if (!ctl.add(q)) { redraw(); return; }
      redraw(true);
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    return { redraw, cv, setMode(on) { cv.classList.toggle('on', !!on); } };
  }
  // ---------- блокнот ----------
  //  Полка: { books: [{ id, name, c, pages: [{ id, ti, html, tx, t }], at }], cur }.
  //  Старый формат { pages, at } (простой текст) переносится в первый блокнот сам.
  const COVER = { r: ['#7a1f24', 'Алый'], b: ['#1f3f7a', 'Синий'], g: ['#2a5a33', 'Зелёный'], v: ['#4a2a6a', 'Фиолетовый'], k: ['#2a2622', 'Чёрный'], o: ['#8a5a1a', 'Охра'] };
  const MARK = { y: ['#fff176', 'Жёлтый маркер'], g: ['#a5f0a0', 'Зелёный маркер'], p: ['#ffb3d1', 'Розовый маркер'], b: ['#9fd8ff', 'Голубой маркер'] };
  const INK = { r: ['#c0262d', 'Красные чернила'], u: ['#1f4fb0', 'Синие чернила'], k: ['#2a2418', 'Обычные чернила'] };
  const escH = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const txt2html = (t) => escH(t).replace(/\n/g, '<br>');
  // разрешено только своё оформление: жирный, курсив, подчёркивание, зачёркивание, маркер, цвет, заголовок, список
  const OKTAG = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, DEL: 1, BR: 1, DIV: 1, P: 1, SPAN: 1, UL: 1, OL: 1, LI: 1, MARK: 1, H3: 1, FONT: 1 };
  const OKCSS = /^(background-color|color|text-decoration|text-decoration-line|font-weight|font-style)$/;
  const OKVAL = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|transparent|bold|bolder|normal|italic|underline|line-through|underline line-through|line-through underline|none|[1-9]00)$/i;
  function clean(html) {
    const box = document.createElement('div'); box.innerHTML = String(html || '');
    (function walk(n) {
      [...n.childNodes].forEach((c) => {
        if (c.nodeType === 3) return;
        if (c.nodeType !== 1 || !OKTAG[c.tagName]) { if (c.nodeType === 1 && !/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|svg|SVG|IMG|VIDEO|AUDIO)$/.test(c.tagName)) { walk(c); while (c.firstChild) n.insertBefore(c.firstChild, c); } c.remove(); return; }
        let el = c;
        if (c.tagName === 'FONT') { el = document.createElement('span'); const col = c.getAttribute('color'); if (col && OKVAL.test(col)) el.style.color = col; while (c.firstChild) el.appendChild(c.firstChild); n.replaceChild(el, c); }
        const keep = [];
        if (el.style) for (let i = 0; i < el.style.length; i++) { const k = el.style[i], v = el.style.getPropertyValue(k).trim(); if (OKCSS.test(k) && OKVAL.test(v)) keep.push(k + ': ' + v); }
        [...el.attributes].forEach((at) => el.removeAttribute(at.name));
        if (keep.length) el.setAttribute('style', keep.join('; '));
        walk(el);
      });
    })(box);
    return box.innerHTML.slice(0, 120000);
  }
  function normShelf(S) {
    S = S && typeof S === 'object' ? S : {};
    if (!Array.isArray(S.books)) { const old = Array.isArray(S.pages) && S.pages.length ? { id: 'b1', name: 'Блокнот', c: 'r', pages: S.pages, at: S.at | 0 } : null; S = { books: old ? [old] : [], cur: old ? 'b1' : null }; }
    S.books = S.books.filter((b) => b && typeof b === 'object').slice(0, 30);
    if (!S.books.length) S.books.push({ id: uid(), name: 'Блокнот', c: 'r', pages: [], at: 0 });
    S.books.forEach((b) => {
      b.id = String(b.id || uid()); b.name = String(b.name || 'Блокнот').slice(0, 40); if (!COVER[b.c]) b.c = 'r';
      b.pages = (Array.isArray(b.pages) ? b.pages : []).filter((p) => p && typeof p === 'object').slice(0, 300);
      b.pages.forEach((p) => { p.id = String(p.id || uid()); p.ti = String(p.ti || '').slice(0, 80); if (p.html == null) p.html = txt2html(p.tx); p.t = +p.t || Date.now(); if (p.ink != null) { p.ink = inkFix(p.ink); if (!p.ink.length) delete p.ink; } });
      if (!b.pages.length) b.pages.push({ id: uid(), ti: '', html: '', tx: '', t: Date.now() });
      b.at = Math.max(0, Math.min(b.pages.length - 1, b.at | 0));
    });
    if (!S.books.some((b) => b.id === S.cur)) S.cur = S.books[0].id;
    return S;
  }
  const shelfT = (S) => Math.max(0, ...normShelf(S).books.map((b) => Math.max(0, ...b.pages.map((p) => +p.t || 0))));
  //  o: { book: полка, onChange(), confirm(text, opts) → Promise<bool>, prompt(text, val) → Promise<string|null>, rustle(len, hi), hint, color }
  function mountBook(B, o) {
    const SH = normShelf(o.book);
    if (SH !== o.book) { Object.keys(o.book).forEach((k) => delete o.book[k]); Object.assign(o.book, SH); }
    const shelf = o.book;
    const save = () => o.onChange && o.onChange();
    const rustle = o.rustle || (() => {});
    const ask = o.prompt || ((t, v) => Promise.resolve(window.prompt(t, v)));
    let bk = shelf.books.find((b) => b.id === shelf.cur);
    // полка: блокноты
    const bar = h('div', 'nb-shelf');
    B.appendChild(bar);
    function paintShelf() {
      bar.innerHTML = '';
      shelf.books.forEach((b) => {
        const t = h('button', 'nb-bk' + (b === bk ? ' on' : '')); t.type = 'button'; t.style.setProperty('--bc', COVER[b.c][0]);
        t.appendChild(h('i')); t.appendChild(h('span', '', b.name)); t.title = b.name + ' · страниц: ' + b.pages.length;
        t.addEventListener('click', () => { if (b === bk) return; bk = b; shelf.cur = b.id; rustle(0.25, 2200); save(); paintShelf(); show(); });
        bar.appendChild(t);
      });
      const nw = h('button', 'nb-bk add', '+ Блокнот'); nw.type = 'button'; nw.title = 'Новый блокнот';
      nw.addEventListener('click', async () => {
        if (shelf.books.length >= 30) return;
        const name = await ask('Как назвать новый блокнот?', 'Блокнот ' + (shelf.books.length + 1)); if (name == null) return;
        const keys = Object.keys(COVER), b = { id: uid(), name: String(name).trim().slice(0, 40) || 'Блокнот', c: keys[shelf.books.length % keys.length], pages: [{ id: uid(), ti: '', html: '', tx: '', t: Date.now() }], at: 0 };
        shelf.books.push(b); bk = b; shelf.cur = b.id; rustle(0.3, 2000); save(); paintShelf(); show();
      });
      bar.appendChild(nw);
      const ed = h('span', 'nb-bked');
      const rn = h('button', 'nb-ic', '✎'); rn.type = 'button'; rn.title = 'Переименовать блокнот';
      rn.addEventListener('click', async () => { const n = await ask('Новое название блокнота', bk.name); if (n == null) return; bk.name = String(n).trim().slice(0, 40) || bk.name; save(); paintShelf(); });
      const cc = h('span', 'nb-cc'); Object.keys(COVER).forEach((c) => { const b = h('button', c === bk.c ? 'on' : ''); b.type = 'button'; b.title = COVER[c][1] + ' переплёт'; b.style.background = COVER[c][0]; b.addEventListener('click', () => { bk.c = c; save(); paintShelf(); wrap.style.setProperty('--bc', COVER[c][0]); }); cc.appendChild(b); });
      const dl = h('button', 'nb-ic', '🗑'); dl.type = 'button'; dl.title = 'Выбросить блокнот';
      dl.addEventListener('click', async () => {
        const has = bk.pages.some((p) => p.ti || (p.tx || '').trim() || (p.html || '').replace(/<[^>]+>/g, '').trim());
        if (!(await o.confirm(shelf.books.length > 1 ? 'Выбросить блокнот «' + bk.name + '»' + (has ? ' со всеми страницами' : '') + '?' : 'Это последний блокнот — очистить его?', { title: 'Блокнот', ok: shelf.books.length > 1 ? 'Выбросить' : 'Очистить' }))) return;
        rustle(0.5, 1400);
        if (shelf.books.length > 1) { shelf.books.splice(shelf.books.indexOf(bk), 1); bk = shelf.books[0]; shelf.cur = bk.id; }
        else { bk.pages = [{ id: uid(), ti: '', html: '', tx: '', t: Date.now() }]; bk.at = 0; }
        save(); paintShelf(); show();
      });
      ed.append(rn, cc, dl); bar.appendChild(ed);
    }
    // панель оформления: кнопки не забирают фокус у страницы, выделение не теряется
    const tb = h('div', 'nb-tb');
    let saved = null, edEl = null;
    const keepSel = () => { if (!tb.isConnected) return; try { const s = window.getSelection(); if (s.rangeCount && edEl && edEl.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); } catch (e) {} };
    document.addEventListener('selectionchange', keepSel);
    const tool = (label, title, fn, cls) => { const b = h('button', 'nb-tl' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.title = title; b.addEventListener('pointerdown', (e) => e.preventDefault()); b.addEventListener('mousedown', (e) => e.preventDefault()); b.addEventListener('click', () => run(fn)); tb.appendChild(b); return b; };
    function run(fn) {
      if (!edEl) return;
      if (document.activeElement !== edEl) { edEl.focus(); if (saved) { try { const s = window.getSelection(); s.removeAllRanges(); s.addRange(saved); } catch (e) {} } }
      try { document.execCommand('styleWithCSS', false, true); } catch (e) {}
      fn(); edEl.dispatchEvent(new Event('input')); keepSel(); paintState();
    }
    const ex = (c, v) => () => { try { document.execCommand(c, false, v); } catch (e) {} };
    const tB = tool('Ж', 'Жирный', ex('bold'), 'b'), tI = tool('К', 'Курсив', ex('italic'), 'i'), tU = tool('Ч', 'Подчеркнуть', ex('underline'), 'u'), tS = tool('З', 'Зачеркнуть', ex('strikeThrough'), 's');
    tb.appendChild(h('i', 'nb-sep'));
    Object.keys(MARK).forEach((k) => { const b = tool('', MARK[k][1], () => { const cur = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor'); const same = cur && cur.replace(/\s/g, '') === hexRgb(MARK[k][0]); ex(document.queryCommandSupported('hiliteColor') ? 'hiliteColor' : 'backColor', same ? 'transparent' : MARK[k][0])(); }, 'mk'); b.style.setProperty('--mk', MARK[k][0]); });
    tb.appendChild(h('i', 'nb-sep'));
    Object.keys(INK).forEach((k) => { const b = tool('А', INK[k][1], ex('foreColor', INK[k][0]), 'ink'); b.style.color = INK[k][0]; });
    tb.appendChild(h('i', 'nb-sep'));
    tool('H', 'Заголовок', () => { const v = String(document.queryCommandValue('formatBlock') || '').toLowerCase(); ex('formatBlock', v === 'h3' ? 'div' : 'h3')(); }, 'h');
    tool('•', 'Список', ex('insertUnorderedList'), 'li');
    tool('⌫', 'Убрать оформление', () => { ex('removeFormat')(); ex(document.queryCommandSupported('hiliteColor') ? 'hiliteColor' : 'backColor', 'transparent')(); }, 'cl');
    tb.appendChild(h('i', 'nb-sep'));
    tool('↶', 'Отменить', ex('undo'), 'un'); tool('↷', 'Вернуть', ex('redo'), 'un');
    function hexRgb(x) { const n = parseInt(x.slice(1), 16); return 'rgb(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ')'; }
    function paintState() { try { [[tB, 'bold'], [tI, 'italic'], [tU, 'underline'], [tS, 'strikeThrough']].forEach(([b, c]) => b.classList.toggle('on', !!document.queryCommandState(c))); } catch (e) {} }
    document.addEventListener('selectionchange', () => { if (tb.isConnected && edEl && document.activeElement === edEl) paintState(); });
    // ---- рисование: своя панель вместо панели текста ----
    const IP = Object.assign({ b: 'pen', c: '#c0262d', w: {}, o: {}, rec: [] }, LSI.get('prefs', {}));
    Object.keys(BRUSH).forEach((k) => { if (!(IP.w[k] > 0)) IP.w[k] = BRUSH[k][2]; if (!(IP.o[k] > 0)) IP.o[k] = BRUSH[k][3]; });
    if (!BRUSH[IP.b]) IP.b = 'pen'; if (!OKCOL.test(IP.c)) IP.c = '#c0262d'; if (!BRUSH[IP.lastB] || IP.lastB === 'eraser') IP.lastB = IP.b === 'eraser' ? 'pen' : IP.b;
    const saveIP = () => LSI.set('prefs', IP);
    let drawing = false, L = null;
    const HIST = new Map(); const hist = (p) => { if (!HIST.has(p.id)) HIST.set(p.id, { u: [], r: [] }); return HIST.get(p.id); };
    const ctlInk = {
      down() { if (!pal.hidden) { pal.hidden = true; paintDraw(); } },
      state: () => ({ b: IP.b, c: IP.c, w: IP.w[IP.b], o: IP.o[IP.b] }),
      add(q) {
        const p = bk.pages[bk.at]; p.ink = p.ink || [];
        if (JSON.stringify(p.ink).length > 220000) { flash('Страница уже сплошь изрисована — начни новую'); return false; }
        p.ink.push(q); const H = hist(p); H.u.push({ t: 'add' }); H.r = []; p.t = Date.now(); save(); paintDraw(); return true;
      }
    };
    const dtb = h('div', 'nb-tb nb-dtb'); dtb.hidden = true;
    const dbtn = (label, title, fn, cls) => { const b = h('button', 'nb-tl' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.title = title; b.addEventListener('pointerdown', (e) => e.preventDefault()); b.addEventListener('click', fn); dtb.appendChild(b); return b; };
    const toDraw = tool('🖌', 'Рисовать поверх страницы (B)', () => {}, 'dr');
    toDraw.replaceWith(toDraw.cloneNode(true)); const drB = tb.querySelector('.nb-tl.dr'); drB.addEventListener('click', () => setDraw(true)); tb.insertBefore(drB, tb.firstChild);
    dbtn('Aa', 'Вернуться к тексту (Esc)', () => setDraw(false), 'dr on');
    dtb.appendChild(h('i', 'nb-sep'));
    const bBtns = {}; Object.keys(BRUSH).forEach((k, i) => { bBtns[k] = dbtn(BRUSH[k][0], BRUSH[k][1] + (k === 'eraser' ? ' — стирает только рисунок (E)' : ' (' + (i + 1) + ')'), () => setBrush(k), 'br'); });
    function setBrush(k) { if (!BRUSH[k]) return; if (k !== 'eraser') IP.lastB = k; IP.b = k; saveIP(); paintDraw(); }
    dtb.appendChild(h('i', 'nb-sep'));
    const colB = dbtn('', 'Цвет (C)', () => { pal.hidden = !pal.hidden; paintDraw(); }, 'col');
    const sz = h('label', 'nb-rg'); sz.title = 'Толщина ([ и ])'; const szD = h('i', 'nb-dot'); const szR = h('input'); szR.type = 'range'; szR.min = 1; szR.max = 48; szR.step = 1; sz.append(szD, szR); dtb.appendChild(sz);
    szR.addEventListener('input', () => { IP.w[IP.b] = +szR.value; saveIP(); paintDraw(); });
    const op = h('label', 'nb-rg'); op.title = 'Непрозрачность (- и =)'; const opT = h('small', '', ''); const opR = h('input'); opR.type = 'range'; opR.min = 5; opR.max = 100; opR.step = 5; op.append(opT, opR); dtb.appendChild(op);
    opR.addEventListener('input', () => { IP.o[IP.b] = +opR.value; saveIP(); paintDraw(); });
    dtb.appendChild(h('i', 'nb-sep'));
    const uB = dbtn('↶', 'Отменить штрих (Ctrl+Z)', () => inkUndo(), 'un'), rB = dbtn('↷', 'Вернуть штрих (Ctrl+Y или Ctrl+Shift+Z)', () => inkRedo(), 'un');
    const cB = dbtn('🗑', 'Стереть весь рисунок на странице', async () => { const p = bk.pages[bk.at]; if (!p.ink || !p.ink.length) return; if (!(await o.confirm('Стереть весь рисунок на этой странице? Текст останется. Вернуть можно кнопкой ↶.', { title: 'Рисунок', ok: 'Стереть' }))) return; const H = hist(p); H.u.push({ t: 'clear', list: p.ink }); H.r = []; p.ink = []; p.t = Date.now(); save(); if (L) L.redraw(true); paintDraw(); }, 'cl');
    // палитра: строится один раз — выбор цвета её не пересобирает (свой цвет не закрывается, меню не прыгает)
    const pal = h('div', 'nb-pal'); pal.hidden = true;
    const pg2 = h('div', 'nb-pg'), sw = {};
    PALETTE.forEach((c) => { const b = h('button'); b.type = 'button'; b.style.background = c; b.title = c; b.addEventListener('click', () => { pick(c); pal.hidden = true; paintDraw(); }); pg2.appendChild(b); sw[c.toLowerCase()] = b; });
    const prow = h('div', 'nb-pr'), own = h('label', 'nb-own'), ci = h('input'); ci.type = 'color';
    own.append(h('span', '', 'Свой цвет'), ci);
    const recBox = h('span', 'nb-recs');
    const closeP = h('button', 'nb-tl nb-pclose', 'Готово'); closeP.type = 'button'; closeP.addEventListener('click', () => { pal.hidden = true; paintDraw(); });
    prow.append(own, recBox, closeP); pal.append(pg2, prow);
    ci.addEventListener('input', () => pick(ci.value));
    ci.addEventListener('change', () => { pick(ci.value); addRec(IP.c); });
    function addRec(c) { IP.rec = [c].concat(IP.rec.filter((x) => x !== c)).slice(0, 8); saveIP(); paintRec(); }
    function paintRec() { recBox.innerHTML = ''; if (!IP.rec.length) return; recBox.appendChild(h('small', '', 'Недавние:')); IP.rec.forEach((c) => { const b = h('button', 'rec'); b.type = 'button'; b.style.background = c; b.title = c; b.addEventListener('click', () => pick(c)); recBox.appendChild(b); }); }
    function paintPal() { Object.keys(sw).forEach((c) => sw[c].classList.toggle('on', c === IP.c)); if (document.activeElement !== ci) ci.value = IP.c; }
    function pick(c) { if (!OKCOL.test(c)) return; IP.c = c.toLowerCase(); if (IP.b === 'eraser') IP.b = IP.lastB || 'pen'; if (!PALETTE.some((x) => x.toLowerCase() === IP.c) && !IP.rec.includes(IP.c)) {} saveIP(); paintDraw(); }
    paintRec();
    const flashEl = h('div', 'nb-flash'); let flT = 0; function flash(t) { flashEl.textContent = t; flashEl.classList.add('on'); clearTimeout(flT); flT = setTimeout(() => flashEl.classList.remove('on'), 2600); }
    function inkUndo() { const p = bk.pages[bk.at], H = hist(p); const a = H.u.pop(); if (a && a.t === 'clear') { H.r.push({ t: 'clear', list: a.list }); p.ink = a.list; } else if (p.ink && p.ink.length) { H.r.push({ t: 'add', s: p.ink.pop() }); } else return; p.t = Date.now(); save(); if (L) L.redraw(true); paintDraw(); }
    function inkRedo() { const p = bk.pages[bk.at], H = hist(p); const a = H.r.pop(); if (!a) return; if (a.t === 'add') { p.ink = p.ink || []; p.ink.push(a.s); H.u.push({ t: 'add' }); } else { H.u.push({ t: 'clear', list: p.ink || [] }); p.ink = []; } p.t = Date.now(); save(); if (L) L.redraw(true); paintDraw(); }
    function paintDraw() {
      const p = bk && bk.pages[bk.at], H = p ? hist(p) : { u: [], r: [] };
      Object.keys(bBtns).forEach((k) => bBtns[k].classList.toggle('on', IP.b === k));
      colB.style.setProperty('--ic', IP.c); colB.classList.toggle('dim', IP.b === 'eraser');
      szR.value = IP.w[IP.b]; opR.value = IP.o[IP.b]; opR.disabled = IP.b === 'eraser'; opT.textContent = (IP.b === 'eraser' ? 100 : IP.o[IP.b]) + '%';
      const d = Math.max(3, Math.min(26, IP.w[IP.b])); szD.style.width = szD.style.height = d + 'px'; szD.style.background = IP.b === 'eraser' ? 'transparent' : IP.c; szD.style.opacity = IP.b === 'eraser' ? 1 : IP.o[IP.b] / 100;
      uB.disabled = !(H.u.length || (p && p.ink && p.ink.length)); rB.disabled = !H.r.length; cB.disabled = !(p && p.ink && p.ink.length);
      if (!pal.hidden) paintPal();
      colB.classList.toggle('on', !pal.hidden);
    }
    function setDraw(on) {
      drawing = !!on; tb.hidden = drawing; dtb.hidden = !drawing; pal.hidden = true; keys.hidden = !drawing || !matchMedia('(hover: hover)').matches; wrap.classList.toggle('drawing', drawing);
      if (drawing && document.activeElement && page.contains(document.activeElement)) document.activeElement.blur();
      if (L) L.setMode(drawing); paintDraw();
    }
    const keys = h('p', 'nb-keys', 'Клавиши: Ctrl+Z — отменить · Ctrl+Y — вернуть · 1–6 — кисти · E — ластик · [ ] — толщина · − = — прозрачность · C — палитра · Esc или B — к тексту'); keys.hidden = true;
    B.appendChild(tb); B.appendChild(dtb); B.appendChild(pal); B.appendChild(keys); B.appendChild(flashEl);
    // горячие клавиши (по физическим клавишам — работают и в русской раскладке)
    const typing = () => { const a = document.activeElement; return a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && a.type !== 'range' && a.type !== 'color'; };
    const onKey = (e) => {
      if (!tb.isConnected) { window.removeEventListener('keydown', onKey, true); return; }
      if (!wrap.offsetParent) return;
      const c = e.code, mod = e.ctrlKey || e.metaKey;
      let done = true;
      if (drawing) {
        if (mod && c === 'KeyZ' && !e.shiftKey) inkUndo();
        else if (mod && (c === 'KeyY' || (c === 'KeyZ' && e.shiftKey))) inkRedo();
        else if (mod || e.altKey) done = false;
        else if (c === 'Escape') { if (!pal.hidden) { pal.hidden = true; paintDraw(); } else setDraw(false); }
        else if (typing()) done = false;
        else if (/^Digit[1-6]$/.test(c)) setBrush(Object.keys(BRUSH)[+c.slice(5) - 1]);
        else if (c === 'KeyE' || c === 'Digit0') setBrush('eraser');
        else if (c === 'KeyC') { pal.hidden = !pal.hidden; paintDraw(); }
        else if (c === 'BracketLeft' || c === 'BracketRight') { IP.w[IP.b] = Math.max(1, Math.min(48, IP.w[IP.b] + (c === 'BracketRight' ? 1 : -1) * (e.shiftKey ? 5 : 1))); saveIP(); paintDraw(); }
        else if (c === 'Minus' || c === 'Equal') { if (IP.b !== 'eraser') { IP.o[IP.b] = Math.max(5, Math.min(100, IP.o[IP.b] + (c === 'Equal' ? 5 : -5))); saveIP(); paintDraw(); } }
        else if (c === 'KeyB') setDraw(false);
        else done = false;
      } else if (!typing() && !mod && !e.altKey && c === 'KeyB') setDraw(true);
      else done = false;
      if (done) { e.preventDefault(); e.stopImmediatePropagation(); }
    };
    window.addEventListener('keydown', onKey, true);
    const wrap = h('div', 'nb-wrap'); if (o.color) wrap.style.setProperty('--pc', o.color);
    const cover = h('div', 'nb-cover');
    const rings = h('div', 'nb-rings'); for (let i = 0; i < 11; i++) rings.appendChild(h('i'));
    const stack = h('div', 'nb-stack'), page = h('div', 'nb-page');
    cover.append(stack, page, rings); wrap.appendChild(cover); B.appendChild(wrap);
    const nav = h('div', 'nb-nav');
    const prev = h('button', 'btn ghost', '◀'), nx = h('button', 'btn ghost', '▶'), num = h('span', 'nb-num'), add = h('button', 'btn', '+ Страница'), del = h('button', 'btn ghost nb-del', '🗑 Вырвать');
    [prev, nx, add, del].forEach((b) => { b.type = 'button'; });
    prev.title = 'Предыдущая страница'; nx.title = 'Следующая страница'; del.title = 'Вырвать страницу';
    nav.append(prev, num, nx, add, del); B.appendChild(nav);
    if (o.hint) B.appendChild(h('p', 'nb-hint', o.hint));
    const empty = (p) => !p.ti && !(p.ink && p.ink.length) && !(p.html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
    function fill(el, p, i, live) {
      el.innerHTML = '';
      const hd = h('div', 'nb-ph'), ti = h('input', 'nb-ti'); ti.placeholder = 'Без названия'; ti.maxLength = 80; ti.value = p.ti || '';
      hd.append(ti, h('small', 'nb-date', fmtD(p.t)));
      const tx = h('div', 'nb-tx nb-ed'); tx.contentEditable = live ? 'true' : 'false'; tx.spellcheck = false; tx.innerHTML = clean(p.html); tx.dataset.ph = i === 0 && empty(p) ? 'Пиши здесь — всё сохранится само…' : '';
      el.append(hd, tx, h('div', 'nb-pf', '— ' + (i + 1) + ' —'));
      const ly = inkLayer(el, tx, p, live, ctlInk);
      const curl = h('button', 'nb-curl'); curl.type = 'button'; curl.title = i < bk.pages.length - 1 ? 'Перевернуть страницу' : 'Новая страница'; el.appendChild(curl);
      curl.addEventListener('click', () => (i < bk.pages.length - 1 ? turn(1) : newPage()));
      if (!live) return { ti, tx, ly };
      ti.addEventListener('input', () => { p.ti = ti.value; p.t = Date.now(); save(); });
      tx.addEventListener('input', () => { p.html = clean(tx.innerHTML); p.tx = tx.innerText.slice(0, 40000); p.t = Date.now(); tx.dataset.ph = ''; save(); });
      // вставка — только текстом, без чужого оформления
      tx.addEventListener('paste', (e) => { const t = e.clipboardData && e.clipboardData.getData('text/plain'); if (t == null) return; e.preventDefault(); try { document.execCommand('insertText', false, t); } catch (er) {} });
      tx.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && /^[biu]$/i.test(e.key)) { e.preventDefault(); run(ex({ b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()])); } });
      edEl = tx; saved = null; L = ly; ly.setMode(drawing);
      return { ti, tx, ly };
    }
    let F = null;
    function show() {
      wrap.style.setProperty('--bc', COVER[bk.c][0]);
      const p = bk.pages[bk.at]; F = fill(page, p, bk.at, true);
      num.textContent = 'стр. ' + (bk.at + 1) + ' из ' + bk.pages.length;
      prev.disabled = bk.at <= 0; nx.disabled = bk.at >= bk.pages.length - 1; del.disabled = bk.pages.length <= 1 && empty(p);
      stack.style.setProperty('--n', Math.min(6, bk.pages.length - 1 - bk.at));
      paintDraw();
    }
    let busy = false;
    function turn(d, target) {
      const to = target != null ? target : bk.at + d;
      if (busy || to < 0 || to >= bk.pages.length || to === bk.at) return;
      busy = true; rustle(0.38);
      const leaf = h('div', 'nb-page nb-leaf ' + (d > 0 ? 'fwd' : 'back'));
      if (d > 0) { fill(leaf, bk.pages[bk.at], bk.at, false); bk.at = to; show(); } else fill(leaf, bk.pages[to], to, false);
      leaf.querySelectorAll('input,button').forEach((e) => { e.tabIndex = -1; e.setAttribute('aria-hidden', 'true'); });
      cover.appendChild(leaf);
      const done = () => { if (!busy) return; if (d < 0) { bk.at = to; show(); } leaf.remove(); busy = false; save(); };
      leaf.addEventListener('animationend', done, { once: true }); setTimeout(done, 1200);
    }
    function newPage() { bk.pages.push({ id: uid(), ti: '', html: '', tx: '', t: Date.now() }); save(); turn(1, bk.pages.length - 1); setTimeout(() => { try { F.tx.focus(); } catch (e) {} }, 700); }
    prev.addEventListener('click', () => turn(-1)); nx.addEventListener('click', () => turn(1)); add.addEventListener('click', newPage);
    del.addEventListener('click', async () => {
      const p = bk.pages[bk.at];
      if (!empty(p) && !(await o.confirm('Вырвать страницу «' + (p.ti || 'без названия') + '»? Написанное пропадёт.', { title: 'Вырвать страницу', ok: 'Вырвать' }))) return;
      rustle(0.5, 1400);
      if (bk.pages.length <= 1) bk.pages[0] = { id: uid(), ti: '', html: '', tx: '', t: Date.now() };
      else { bk.pages.splice(bk.at, 1); bk.at = Math.min(bk.at, bk.pages.length - 1); }
      page.classList.add('torn'); setTimeout(() => { page.classList.remove('torn'); show(); save(); }, 380);
    });
    wrap.addEventListener('pointerdown', (e) => e.stopPropagation());
    const inText = (t) => t.closest && t.closest('.nb-ed, input');
    wrap.addEventListener('wheel', (e) => { if (drawing && e.target.classList && e.target.classList.contains('nb-ink')) { const ed = page.querySelector('.nb-ed'); if (ed && ed.scrollHeight > ed.clientHeight) { ed.scrollTop += e.deltaY; e.preventDefault(); return; } } const ed = inText(e.target); if (ed && ed.scrollHeight > ed.clientHeight) return; if (Math.abs(e.deltaY) < 30) return; e.preventDefault(); turn(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    // на телефоне — листать пальцем: влево — дальше, вправо — назад (пока не пишешь)
    let tsw = null;
    wrap.addEventListener('touchstart', (e) => { const t = e.touches[0], typing = document.activeElement && page.contains(document.activeElement) && inText(e.target); tsw = e.touches.length === 1 && !typing && !drawing ? [t.clientX, t.clientY, Date.now()] : null; }, { passive: true });
    wrap.addEventListener('touchend', (e) => { if (!tsw) return; const t = e.changedTouches[0], dx = t.clientX - tsw[0], dy = t.clientY - tsw[1], ok = Date.now() - tsw[2] < 650 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6; tsw = null; if (ok) turn(dx < 0 ? 1 : -1); }, { passive: true });
    paintShelf(); show();
    // чужая правка (с другого устройства) — перерисовать, если сейчас не печатают
    return { refresh() {
      if (busy || (document.activeElement && (page.contains(document.activeElement) || bar.contains(document.activeElement)))) return false;
      const S2 = normShelf(o.book); if (S2 !== o.book) Object.assign(o.book, S2);
      bk = shelf.books.find((b) => b.id === shelf.cur) || shelf.books[0]; paintShelf(); show(); return true;
    } };
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
  return { W0, H0, PAPER, THR, COVER, uid, clone, fixBoard, diff, apply, mountBook, mountBoard, normShelf, shelfT, clean };
})();
