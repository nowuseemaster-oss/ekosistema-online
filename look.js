// =====================================================================
//  Человечек героя — тот же код, что в Экосистеме Мастера (окно «Профиль»).
//  Файл собирается из Экосистемы автоматически: правки — там.
// =====================================================================
window.EkLook = (function () {
  const TAU = Math.PI * 2;
  const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const dir = (a) => [Math.sin(a), Math.cos(a)];      // угол от «вниз»; + — вперёд
  // ---------- что можно выбрать ----------
  const RACES = {
    human: { n: 'Человек', sc: 1, wd: 1, short: false, ear: 'round', cm: 172 },
    half: { n: 'Полурослик', sc: 0.72, wd: 1.1, short: true, ear: 'round', cm: 98 },
    dwarf: { n: 'Дварф', sc: 0.8, wd: 1.35, short: true, ear: 'round', cm: 135 },
    elf: { n: 'Эльф', sc: 1.05, wd: 0.88, short: false, ear: 'long', cm: 182 },
    helf: { n: 'Полуэльф', sc: 1.02, wd: 0.94, short: false, ear: 'mid', cm: 176 }
  };
  const OPT = {
    race: Object.keys(RACES).map((k) => [k, RACES[k].n]),
    hair: [['short', 'Короткие'], ['long', 'Длинные'], ['tail', 'Хвост'], ['braids', 'Косы'], ['mohawk', 'Ирокез'], ['bald', 'Нет']],
    beard: [['none', 'Нет'], ['short', 'Щетина'], ['long', 'Борода'], ['braid', 'Заплетённая']],
    hat: [['none', 'Нет'], ['pith', 'Панама'], ['hood', 'Капюшон'], ['helm', 'Шлем'], ['band', 'Бандана'], ['witch', 'Ведьмина'], ['top', 'Цилиндр'], ['mitre', 'Митра'], ['kam', 'Камилавка']],
    jacket: [['coat', 'Пальто'], ['short', 'Куртка'], ['cloak', 'Плащ'], ['robe', 'Мантия'], ['vest', 'Жилет']],
    pants: [['trousers', 'Брюки'], ['shorts', 'Шорты'], ['skirt', 'Юбка']],
    pack: [['none', 'Нет'], ['small', 'Сумка'], ['big', 'Рюкзак']],
    scarf: [['none', 'Нет'], ['on', 'Есть']]
  };
  const SKIN = ['#f2d3b5', '#e6b994', '#c98f65', '#9c6644', '#6b4329', '#4a2e1c'];
  const CLOTH = ['#3b4a63', '#5a3b2a', '#2f4f3e', '#6b2f3a', '#26262c', '#8a8f98', '#c9b48a', '#7a5a9a', '#3f7f86', '#a8552c', '#d8d2c4', '#9a2f2f', '#c98a2a', '#46628a'];
  const HAIRC = ['#2a1f19', '#5b3a22', '#8a5a2b', '#c9a15a', '#e8dcc0', '#a33b2a', '#3a3f4a', '#e8e8ee', '#5a8a9a', '#7a4a9a'];
  const EYEC = ['#2a2a30', '#4a7ab0', '#3f8a5a', '#8a5a2b', '#a33b3b', '#c9a03a', '#8a5ac9'];
  const WHC = ['#9aa0a6', '#3fc7c0', '#3c7be0', '#5b4bd1', '#9b4fd6', '#e86aa6', '#d8323f', '#3a1016'];
  const WHN = ['Серый', 'Бирюзовый', 'Синий', 'Индиго', 'Фиолетовый', 'Розовый', 'Красный', 'Красно-чёрный'];
  const DEF = { race: 'human', ht: 1, anom: false, skin: 1, hair: 'short', hairC: 1, beard: 'none', hat: 'pith', hatC: 1, jacket: 'coat', jacketC: 0, pants: 'trousers', pantsC: 4, bootC: 1, pack: 'big', packC: 1, scarf: 'none', scarfC: 11, wh: 1, eye: 0 };
  //  рост: обычный разброс ±15%; «аномальный» (включается отдельно) — ещё на 10% в обе стороны, ±25%
  const HT0 = 0.85, HT1 = 1.15, HA0 = 0.75, HA1 = 1.25;
  const clampHt = (v, anom) => Math.max(anom ? HA0 : HT0, Math.min(anom ? HA1 : HT1, +v || 1));
  // свисток: выбрать можно только свой ранг или ниже (ранг — из «Отряда»); −1 — спрятан
  // старые сохранения: убранные расы → человек, цвета кожи — в пределах палитры, неизвестные вещи — по умолчанию
  const norm = (o) => { o = Object.assign({}, DEF, o || {}); if (!RACES[o.race]) o.race = 'human'; if (!(o.skin >= 0 && o.skin < SKIN.length)) o.skin = 1; o.anom = !!o.anom; o.ht = clampHt(o.ht, o.anom); Object.keys(OPT).forEach((k) => { if (!OPT[k].some((q) => q[0] === o[k])) o[k] = DEF[k]; }); return o; };
  const cmOf = (L) => Math.round(RACES[L.race].cm * clampHt(L.ht, L.anom));
  // ---------- рисование ----------
  //  x, y — точка на земле между ступнями; s — рост. o: { t (дыхание), out (контур), ow, pose, dark (силуэт: один цвет), eyes }
  //  Рисуем слоями сзади вперёд, у каждого слоя свой контур — так вещи не «проваливаются» друг под друга:
  //  плащ → рюкзак → шарф и ленты сзади → дальняя рука → ноги → юбка → куртка → шея → волосы сзади → свисток → ближняя рука → шарф →
  //  капюшон (зад) → голова → волосы → уши → глаз → борода → головной убор.
  //  Силуэт (dark) — наоборот, один общий контур: сперва все обводки, потом все заливки.
  const STAND = { lean: 0.02, aF: -0.1, aN: 0.03, eF: 0.18, eN: 0.12, lF: -0.06, lN: 0.08, kF: 0, kN: -0.05, head: -0.04 };
  function drawHero(c, x, y, s, L, o) {
    L = norm(L); o = o || {};
    const RC = RACES[L.race], wd = RC.wd, shortL = RC.short;
    s *= RC.sc * L.ht;
    const TH = s * 0.22 * (shortL ? 0.85 : 1), SH = s * 0.22 * (shortL ? 0.8 : 1), legL = TH + SH;
    const P = Object.assign({}, STAND, o.pose || {});
    if (o.t != null) { P.lean += Math.sin(o.t * 1.6) * 0.012; P.aF += Math.sin(o.t * 1.6 + 1) * 0.035; P.aN -= Math.sin(o.t * 1.6 + 1) * 0.035; P.head += Math.sin(o.t * 0.7) * 0.03; }
    const sk = SKIN[L.skin], jc = CLOTH[L.jacketC] || CLOTH[0], pc = CLOTH[L.pantsC] || CLOTH[4], bc = mix(CLOTH[L.bootC] || CLOTH[1], '#000000', 0.25), hc = HAIRC[L.hairC] || HAIRC[1], htc = CLOTH[L.hatC] || CLOTH[1], kc = CLOTH[L.packC] || CLOTH[1], scc = CLOTH[L.scarfC] || CLOTH[11];
    const out = o.out || '#0b0d10', ow = o.ow == null ? Math.max(1.5, s * 0.012) : o.ow;
    let g = 0, pass = 1;
    const C = (col, far) => (o.dark ? (pass ? o.dark : out) : pass ? (far ? mix(col, '#000000', 0.28) : col) : out);
    const color = () => pass && !o.dark;                                   // детали без контура — только в заливке
    const lean = P.lean, up = [Math.sin(lean), -Math.cos(lean)], nr = [Math.cos(lean), Math.sin(lean)];
    const T = s * 0.29, UA = s * 0.15, FA = s * 0.14, HR = s * 0.072 * (shortL ? 1.12 : 1);
    const sh = [up[0] * T, up[1] * T];
    const seg = (x0, y0, x1, y1, w, col) => { c.strokeStyle = col; c.lineWidth = w + g; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
    const dot = (x0, y0, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x0, y0, r + g / 2, 0, TAU); c.fill(); };
    const ell = (x0, y0, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x0, y0, rx + g / 2, ry + g / 2, 0, 0, TAU); c.fill(); };
    const poly = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.fill(); if (g) { c.lineWidth = g; c.strokeStyle = col; c.lineJoin = 'round'; c.stroke(); } };
    const shF = [sh[0] - nr[0] * s * 0.045, sh[1] - nr[1] * s * 0.045], shN = [sh[0] - nr[0] * s * 0.008, sh[1] - nr[1] * s * 0.008];   // ближняя рука — от середины плеча, а не от груди
    const ha = lean + (P.head || 0);
    const nx = sh[0] + up[0] * s * 0.03, ny = sh[1] + up[1] * s * 0.03, hcx = nx + Math.sin(ha) * HR * 1.15, hcy = ny - Math.cos(ha) * HR * 1.15;
    const head = (fn) => { c.save(); c.translate(hcx, hcy); c.rotate(ha); fn(); c.restore(); };   // в голове: +x — вперёд, −y — вверх
    const wind = (o.t != null ? Math.sin(o.t * 1.3) : 0);
    // что чем закрыто
    const H = L.hat, hood = H === 'hood';
    const hairFront = L.hair !== 'bald' && !hood, hairBack = ['long', 'tail', 'braids'].includes(L.hair) && !hood;
    const mohawk = L.hair === 'mohawk' && (H === 'none' || H === 'band');   // под шляпой ирокез приминается
    const longBeard = L.beard === 'long' || L.beard === 'braid';
    const leg = (x0, y0, a, e, far) => {
      const [d1x, d1y] = dir(a), [d2x, d2y] = dir(a + e), x1 = x0 + d1x * TH, y1 = y0 + d1y * TH, x2 = x1 + d2x * SH, y2 = y1 + d2y * SH;
      const bx = x1 + d2x * SH * 0.55, by = y1 + d2y * SH * 0.55;
      seg(x0, y0, x1, y1, s * 0.075 * wd, C(pc, far));
      seg(x1, y1, bx, by, s * 0.06 * wd, C(L.pants === 'trousers' ? pc : sk, far));
      seg(bx, by, x2, y2, s * 0.066 * wd, C(bc, far));
      c.fillStyle = C(bc, far); c.save(); c.translate(x2, y2); c.rotate(-(a + e) * 0.3); c.beginPath(); c.ellipse(s * 0.024, s * 0.006, s * 0.048 * wd + g / 2, s * 0.024 + g / 2, 0, 0, TAU); c.fill(); c.restore();
    };
    const arm = (x0, y0, a, e, far) => {
      const [d1x, d1y] = dir(a), [d2x, d2y] = dir(a + e), x1 = x0 + d1x * UA, y1 = y0 + d1y * UA, x2 = x1 + d2x * FA, y2 = y1 + d2y * FA;
      const sl = L.jacket === 'vest' ? '#e2ddd0' : jc;
      seg(x0, y0, x1, y1, s * 0.056 * wd, C(sl, far)); seg(x1, y1, x2, y2, s * 0.047 * wd, C(sl, far)); dot(x2, y2, s * 0.026 * wd, C(sk, far));
    };
    const layers = [];
    const add = (fn, noOutline) => layers.push({ fn, noOutline });
    // плащ — за спиной
    if (L.jacket === 'cloak') add(() => poly([[sh[0] - nr[0] * s * 0.12, sh[1] - nr[1] * s * 0.12], [sh[0] + nr[0] * s * 0.06, sh[1]], [-nr[0] * s * 0.05 - s * 0.02, s * 0.4], [-s * 0.22 - wind * s * 0.02, s * 0.36]], C(mix(jc, '#000000', 0.15))));
    // рюкзак / сумка
    if (L.pack !== 'none') add(() => { const big = L.pack === 'big'; c.save(); c.translate(sh[0] - nr[0] * s * (big ? 0.15 : 0.12), sh[1] + s * (big ? 0.08 : 0.17)); c.rotate(lean); c.fillStyle = C(kc, true); const pw = s * (big ? 0.13 : 0.08) * wd, ph = s * (big ? 0.2 : 0.09); c.beginPath(); c.roundRect ? c.roundRect(-pw / 2 - g / 2, -ph / 2 - g / 2, pw + g, ph + g, s * 0.025) : c.rect(-pw / 2 - g / 2, -ph / 2 - g / 2, pw + g, ph + g); c.fill(); if (big && color()) { c.fillStyle = mix(kc, '#000000', 0.45); c.fillRect(-pw / 2, -ph * 0.1, pw, ph * 0.08); c.fillStyle = mix(kc, '#e8dcc0', 0.3); c.fillRect(-pw * 0.6, -ph * 0.55, pw * 1.2, ph * 0.1); } c.restore(); });
    // хвост шарфа — свисает за спиной и чуть развевается
    if (L.scarf === 'on') add(() => { const bx = sh[0] - nr[0] * s * 0.06, by = sh[1] + s * 0.005, ex = bx - s * (0.12 + wind * 0.02), ey = by + s * (0.15 - wind * 0.015); poly([[bx + s * 0.01, by - s * 0.02], [bx - s * 0.03, by + s * 0.02], [ex - s * 0.012, ey], [ex + s * 0.03, ey + s * 0.008], [bx + s * 0.02, by + s * 0.03]], C(scc, true)); if (color()) { c.strokeStyle = mix(scc, '#000000', 0.45); c.lineWidth = Math.max(1, s * 0.005); c.beginPath(); for (let i = 0; i < 4; i++) { const fx = ex - s * 0.008 + i * s * 0.011, fy = ey + i * s * 0.002; c.moveTo(fx, fy); c.lineTo(fx - s * 0.006, fy + s * 0.02); } c.stroke(); } });
    // ленты митры — сзади, за головой
    if (H === 'mitre') add(() => head(() => { [[-0.8, 1.15], [-0.55, 1.25]].forEach(([x0, len]) => { poly([[HR * (x0 - 0.12), -HR * 0.6], [HR * (x0 + 0.12), -HR * 0.6], [HR * (x0 + 0.08 - wind * 0.06), HR * len], [HR * (x0 - 0.18 - wind * 0.06), HR * len]], C(htc, true)); if (color()) { c.fillStyle = '#d6b45a'; c.fillRect(HR * (x0 - 0.18 - wind * 0.06), HR * (len - 0.16), HR * 0.26, HR * 0.14); } }); }));
    // дальняя рука, ноги, юбка
    add(() => arm(shF[0], shF[1], P.aF + lean, P.eF, true));
    add(() => leg(-nr[0] * s * 0.03, -nr[1] * s * 0.03, P.lF, P.kF, true));
    add(() => leg(nr[0] * s * 0.03, nr[1] * s * 0.03, P.lN, P.kN, false));
    if (L.pants === 'skirt') add(() => poly([[-s * 0.09 * wd, -s * 0.02], [s * 0.1 * wd, -s * 0.02], [s * 0.15 * wd, s * 0.17], [-s * 0.13 * wd, s * 0.17]], C(pc)));
    // корпус: куртка нужной длины
    add(() => {
      const hem = { coat: 0.16, short: 0.02, cloak: 0.06, robe: 0.34, vest: 0.0 }[L.jacket] || 0.1, flare = L.jacket === 'robe' ? 1.5 : L.jacket === 'coat' ? 1.15 : 1;
      const sw = (o.t != null ? Math.sin(o.t * 2.2) : 0) * s * 0.01;
      const body = [[sh[0] - nr[0] * s * 0.1 * wd, sh[1] - nr[1] * s * 0.1 * wd], [sh[0] + nr[0] * s * 0.1 * wd, sh[1] + nr[1] * s * 0.1 * wd], [nr[0] * s * 0.105 * wd * flare - up[0] * s * hem + sw, nr[1] * s * 0.105 * wd - up[1] * s * hem], [-nr[0] * s * 0.095 * wd * flare - up[0] * s * hem + sw * 1.3, -nr[1] * s * 0.095 * wd - up[1] * s * hem]];
      poly(body, C(L.jacket === 'vest' ? mix(jc, '#000000', 0.05) : jc)); c.lineWidth = s * 0.045 * wd + g; c.strokeStyle = C(jc); c.lineJoin = 'round'; c.beginPath(); body.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); c.stroke();
      if (color()) {
        c.fillStyle = mix(jc, '#000000', 0.35); c.fillRect(-s * 0.1 * wd, -s * 0.005, s * 0.2 * wd, s * 0.02);
        c.fillStyle = '#d6b45a'; c.fillRect(-s * 0.012, -s * 0.007, s * 0.024, s * 0.024);
        c.strokeStyle = mix(jc, '#ffffff', 0.18); c.lineWidth = Math.max(1, s * 0.006); c.beginPath(); c.moveTo(sh[0] + nr[0] * s * 0.05, sh[1] + nr[1] * s * 0.05); c.lineTo(nr[0] * s * 0.06, s * -0.05); c.stroke();
      }
    });
    // шея
    add(() => seg(sh[0], sh[1], nx, ny, s * 0.04 * wd, C(sk)));
    // длинные волосы, хвост, косы — спадают на спину поверх куртки, под ближней рукой
    if (hairBack) add(() => head(() => {
      if (L.hair === 'long') poly([[-HR * 0.2, -HR * 0.9], [-HR * 1.15, -HR * 0.25], [-HR * 1.4, HR * 2.1], [-HR * 0.75, HR * 2.35], [-HR * 0.35, HR * 1.2], [-HR * 0.2, HR * 0.6]], C(hc));
      if (L.hair === 'tail') poly([[-HR * 0.7, -HR * 0.6], [-HR * 1.25, -HR * 0.5], [-HR * (1.7 + wind * 0.1), HR * 1.3], [-HR * 1.2, HR * 1.4], [-HR * 0.9, HR * 0.1]], C(hc));
      if (L.hair === 'braids') for (let i = 0; i < 4; i++) ell(-HR * 0.75, HR * (0.5 + i * 0.42), HR * 0.24, HR * 0.26, C(hc));
    }));
    // свисток на шнурке — под рукой и бородой; с длинной бородой висит ниже, чтобы его было видно
    if (L.wh >= 0) add(() => { if (!color()) return; const drop = longBeard ? 0.2 : 0.11, wx = sh[0] + nr[0] * s * 0.05 - up[0] * s * drop, wy = sh[1] - up[1] * s * drop; c.strokeStyle = 'rgba(230,220,190,.8)'; c.lineWidth = Math.max(1, s * 0.004); c.beginPath(); c.moveTo(sh[0] - nr[0] * s * 0.03, sh[1]); c.lineTo(wx, wy); c.lineTo(sh[0] + nr[0] * s * 0.07, sh[1]); c.stroke(); c.save(); c.translate(wx, wy); c.rotate(lean + 0.5); c.fillStyle = WHC[L.wh] || WHC[0]; c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; c.beginPath(); c.roundRect ? c.roundRect(-s * 0.012, -s * 0.007, s * 0.05, s * 0.022, s * 0.01) : c.rect(-s * 0.012, -s * 0.007, s * 0.05, s * 0.022); c.fill(); c.stroke(); c.restore(); }, true);
    // ближняя рука
    add(() => arm(shN[0], shN[1], P.aN + lean, P.eN, false));
    // шарф — вокруг шеи, поверх плеча; борода ляжет поверх него
    if (L.scarf === 'on') add(() => { seg(sh[0] - nr[0] * s * 0.06, sh[1] + s * 0.004, sh[0] + nr[0] * s * 0.065, sh[1] + s * 0.004, s * 0.052, C(scc)); if (color()) { c.strokeStyle = mix(scc, '#000000', 0.25); c.lineWidth = Math.max(1, s * 0.005); c.beginPath(); c.moveTo(sh[0] - nr[0] * s * 0.04, sh[1] - s * 0.012); c.lineTo(sh[0] + nr[0] * s * 0.05, sh[1] + s * 0.018); c.stroke(); } });
    // капюшон — задняя часть
    if (hood) add(() => head(() => ell(-HR * 0.25, -HR * 0.05, HR * 1.35, HR * 1.4, C(htc))));
    // голова и нос
    add(() => head(() => { ell(0, 0, HR, HR * 1.1, C(sk)); poly([[HR * 0.9, -HR * 0.15], [HR * 1.22, HR * 0.12], [HR * 0.9, HR * 0.25]], C(sk)); }));
    // волосы
    if (hairFront) add(() => head(() => {
      if (mohawk) poly([[-HR * 0.9, -HR * 0.4], [-HR * 0.75, -HR * 1.5], [-HR * 0.35, -HR * 1.25], [-HR * 0.1, -HR * 1.75], [HR * 0.25, -HR * 1.35], [HR * 0.55, -HR * 1.6], [HR * 0.6, -HR * 0.8]], C(hc));
      else poly([[-HR * 1.05, HR * 0.3], [-HR * 1.12, -HR * 0.5], [-HR * 0.55, -HR * 1.18], [HR * 0.35, -HR * 1.2], [HR * 1.0, -HR * 0.62], [HR * 0.92, -HR * 0.3], [HR * 0.45, -HR * 0.55], [-HR * 0.1, -HR * 0.35], [-HR * 0.55, -HR * 0.05], [-HR * 0.6, HR * 0.3]], C(hc));
    }));
    // уши — поверх волос, под головным убором; под капюшоном не видно
    if (!hood) add(() => head(() => {
      if (RC.ear === 'long') poly([[-HR * 0.15, -HR * 0.1], [-HR * 1.0, -HR * 1.15], [-HR * 0.35, HR * 0.35]], C(sk));
      else if (RC.ear === 'mid') poly([[-HR * 0.12, -HR * 0.05], [-HR * 0.72, -HR * 0.72], [-HR * 0.32, HR * 0.33]], C(sk));
      else ell(-HR * 0.18, HR * 0.08, HR * 0.2, HR * 0.28, C(mix(sk, '#000000', 0.12)));
    }));
    // глаз (у силуэта — светящийся)
    add(() => head(() => {
      if (pass && !o.dark) { c.fillStyle = '#f4f1ea'; c.beginPath(); c.ellipse(HR * 0.5, -HR * 0.08, HR * 0.17, HR * 0.13, 0, 0, TAU); c.fill(); c.fillStyle = EYEC[L.eye] || EYEC[0]; c.beginPath(); c.arc(HR * 0.57, -HR * 0.07, HR * 0.1, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(HR * 0.59, -HR * 0.07, HR * 0.05, 0, TAU); c.fill(); c.strokeStyle = mix(hc, '#000000', 0.2); c.lineWidth = Math.max(1, HR * 0.08); c.beginPath(); c.moveTo(HR * 0.33, -HR * 0.32); c.lineTo(HR * 0.72, -HR * 0.3); c.stroke(); }
      if (pass && o.eyes) { c.fillStyle = o.eyes; c.beginPath(); c.arc(HR * 0.55, -HR * 0.07, HR * 0.14, 0, TAU); c.fill(); }
    }), true);
    // борода — поверх одежды, шарфа и свистка
    if (L.beard === 'short') add(() => head(() => poly([[HR * 0.95, HR * 0.35], [HR * 0.6, HR * 0.95], [-HR * 0.1, HR * 1.0], [-HR * 0.55, HR * 0.5], [HR * 0.1, HR * 0.6]], C(hc))));
    if (longBeard) add(() => head(() => {
      const br = L.beard === 'braid';
      poly([[HR * 1.05, HR * 0.25], [HR * 1.15, HR * 1.3], [HR * 0.75, HR * (br ? 2.0 : 2.9)], [HR * 0.2, HR * (br ? 2.1 : 2.6)], [-HR * 0.35, HR * 1.4], [-HR * 0.7, HR * 0.35], [HR * 0.15, HR * 0.5]], C(hc));
      if (br) [0, 1, 2, 3].forEach((i) => ell(HR * 0.5, HR * (2.2 + i * 0.36), HR * 0.22, HR * 0.22, C(hc)));
      if (color()) {
        c.strokeStyle = mix(hc, '#000000', 0.3); c.lineWidth = Math.max(1, HR * 0.06); c.lineCap = 'round';
        [0.2, 0.5, 0.8].forEach((u) => { c.beginPath(); c.moveTo(HR * (0.9 - u * 0.6), HR * 0.7); c.quadraticCurveTo(HR * (0.95 - u * 0.5), HR * 1.5, HR * (0.7 - u * 0.3), HR * (br ? 1.9 : 2.4)); c.stroke(); });
        if (br) { c.fillStyle = '#d6b45a'; c.fillRect(HR * 0.28, HR * 3.3, HR * 0.44, HR * 0.16); }
      }
    }));
    // головной убор — самый верхний слой
    if (H !== 'none') add(() => head(() => {
      if (H === 'pith') { c.strokeStyle = C(htc); c.lineWidth = HR * 0.3 + g; c.lineCap = 'round'; c.beginPath(); c.moveTo(-HR * 1.6, -HR * 0.55); c.lineTo(HR * 1.6, -HR * 0.55); c.stroke(); poly([[-HR * 0.95, -HR * 0.6], [-HR * 0.75, -HR * 1.5], [HR * 0.75, -HR * 1.5], [HR * 0.95, -HR * 0.6]], C(htc)); if (color()) { c.fillStyle = mix(htc, '#000000', 0.35); c.fillRect(-HR * 0.92, -HR * 0.9, HR * 1.84, HR * 0.2); } }
      if (H === 'hood') poly([[HR * 0.75, -HR * 0.95], [HR * 0.25, -HR * 1.45], [-HR * 0.9, -HR * 1.25], [-HR * 1.45, -HR * 0.2], [-HR * 1.25, HR * 1.1], [-HR * 0.45, HR * 1.2], [-HR * 0.45, HR * 0.2], [-HR * 0.1, -HR * 0.65], [HR * 0.55, -HR * 0.7]], C(htc));
      if (H === 'helm') { c.fillStyle = C('#8f969e'); c.beginPath(); c.arc(-HR * 0.05, -HR * 0.15, HR * 1.12 + g / 2, Math.PI * 0.98, Math.PI * 2.08); c.closePath(); c.fill(); c.strokeStyle = C('#5d646c'); c.lineWidth = HR * 0.22 + g; c.lineCap = 'round'; c.beginPath(); c.moveTo(-HR * 1.15, -HR * 0.15); c.lineTo(HR * 1.05, -HR * 0.15); c.stroke(); c.lineWidth = HR * 0.18 + g; c.beginPath(); c.moveTo(HR * 0.85, -HR * 0.15); c.lineTo(HR * 0.9, HR * 0.45); c.stroke(); if (color()) { c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.beginPath(); c.arc(-HR * 0.05, -HR * 0.15, HR * 0.85, Math.PI * 1.2, Math.PI * 1.5); c.stroke(); } }
      if (H === 'band') { c.strokeStyle = C(htc); c.lineWidth = HR * 0.32 + g; c.lineCap = 'round'; c.beginPath(); c.moveTo(-HR * 1.02, -HR * 0.55); c.lineTo(HR * 0.95, -HR * 0.62); c.stroke(); c.lineWidth = HR * 0.18 + g; c.beginPath(); c.moveTo(-HR * 1.0, -HR * 0.55); c.lineTo(-HR * (1.6 + wind * 0.1), -HR * 0.1); c.moveTo(-HR * 1.0, -HR * 0.55); c.lineTo(-HR * (1.7 + wind * 0.15), -HR * 0.45); c.stroke(); }
      if (H === 'witch') { c.strokeStyle = C(htc); c.lineWidth = HR * 0.26 + g; c.lineCap = 'round'; c.beginPath(); c.moveTo(-HR * 1.9, -HR * 0.6); c.lineTo(HR * 1.9, -HR * 0.6); c.stroke(); poly([[-HR * 0.95, -HR * 0.65], [HR * 0.95, -HR * 0.65], [HR * 0.15, -HR * 2.2], [-HR * 0.6, -HR * 2.9], [-HR * 0.35, -HR * 2.05]], C(htc)); if (color()) { c.fillStyle = '#c98a2a'; c.fillRect(-HR * 0.92, -HR * 0.98, HR * 1.84, HR * 0.24); } }
      if (H === 'top') { c.strokeStyle = C(htc); c.lineWidth = HR * 0.26 + g; c.lineCap = 'round'; c.beginPath(); c.moveTo(-HR * 1.35, -HR * 0.62); c.lineTo(HR * 1.35, -HR * 0.62); c.stroke(); poly([[-HR * 0.85, -HR * 0.65], [-HR * 0.8, -HR * 2.2], [HR * 0.8, -HR * 2.2], [HR * 0.85, -HR * 0.65]], C(htc)); if (color()) { c.fillStyle = '#9a2f2f'; c.fillRect(-HR * 0.83, -HR * 1.02, HR * 1.66, HR * 0.24); } }
      if (H === 'mitre') {
        // митра: высокая, с двумя остриями (спереди и сзади), золотая кайма и крест; сзади — две ленты
        const gold = '#d6b45a';
        poly([[-HR * 0.95, -HR * 0.55], [HR * 0.95, -HR * 0.55], [HR * 0.92, -HR * 1.55], [HR * 0.4, -HR * 2.6], [HR * 0.02, -HR * 1.95], [-HR * 0.36, -HR * 2.6], [-HR * 0.92, -HR * 1.55]], C(htc));
        if (color()) { c.fillStyle = gold; c.fillRect(-HR * 0.93, -HR * 0.85, HR * 1.86, HR * 0.24); c.fillRect(-HR * 0.08, -HR * 1.95, HR * 0.16, HR * 1.12); c.fillRect(HR * 0.28, -HR * 1.6, HR * 0.14, HR * 0.5); c.fillRect(HR * 0.13, -HR * 1.42, HR * 0.44, HR * 0.13); }
      }
      if (H === 'kam') {
        // камилавка: цилиндр, расширяющийся кверху, с плоским верхом
        poly([[-HR * 0.95, -HR * 0.5], [HR * 0.95, -HR * 0.5], [HR * 1.1, -HR * 1.85], [-HR * 1.1, -HR * 1.85]], C(htc));
        c.strokeStyle = C(mix(htc, '#000000', 0.2)); c.lineWidth = HR * 0.16 + g; c.lineCap = 'round'; c.beginPath(); c.moveTo(-HR * 1.12, -HR * 1.86); c.lineTo(HR * 1.12, -HR * 1.86); c.stroke();
        if (color()) { c.strokeStyle = mix(htc, '#ffffff', 0.18); c.lineWidth = Math.max(1, HR * 0.06); c.beginPath(); c.moveTo(HR * 0.55, -HR * 0.6); c.lineTo(HR * 0.66, -HR * 1.75); c.stroke(); }
      }
    }));
    // отрисовка
    c.save(); c.translate(x, y - legL * 0.97); if (o.flip) c.scale(-1, 1);
    const run = (Ly, p) => { if (p === 0 && Ly.noOutline) return; pass = p; g = p ? 0 : ow * 2; Ly.fn(); };
    if (o.dark) { layers.forEach((Ly) => run(Ly, 0)); layers.forEach((Ly) => run(Ly, 1)); }
    else layers.forEach((Ly) => { run(Ly, 0); run(Ly, 1); });
    c.restore();
    return { head: [x, y - legL - s * 0.42], s, top: y - legL - s * 0.5 };
  }

  return { draw: drawHero, norm, RACES, OPT, SKIN, CLOTH, HAIRC, EYEC, WHC, WHN, DEF, HT0, HT1, HA0, HA1, clampHt, cmOf };
})();
