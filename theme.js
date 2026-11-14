// =====================================================================
//  Экосистема · атмосфера экрана по облику кубика игрока.
//  У каждого облика — своя палитра и живой фон на холсте.
//  window.EkTheme.set(id) — сменить облик, .fx(on) — анимация вкл/выкл.
// =====================================================================
(function () {
  const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
  const R = (v) => (Array.isArray(v) ? rnd(v[0], v[1]) : v || 0);

  // ---------- облики: [название, акцент, второй цвет, глубина, свечение, слои фона] ----------
  const STARS = { t: 'stars', n: 90 };
  const T = {
    classic: ['Классика', '#d9b26a', '#7fd1c7', '#071012', '#12323a', [{ t: 'glow', y: 1.1, col: '#1d6b6b', a: 0.35 }, { t: 'p', n: 34, shape: 'dot', col: ['#7fd1c7', '#bfe8e0'], s: [1, 2.4], vy: [-9, -3], vx: [-3, 3], a: [0.2, 0.6], tw: 1 }]],
    calamity: ['Каламити', '#ff3a46', '#ff1a2a', '#060103', '#2a0408', [{ t: 'glow', y: 1.1, col: '#c0101e', a: 0.4 }, { t: 'glow', y: -0.15, col: '#5a0008', a: 0.35 }, { t: 'p', n: 18, shape: 'shard', col: ['#1a0003', '#2a0006', '#120002'], edge: '#ff3a46', s: [8, 22], vy: [-6, -2], vx: [-4, 4], rot: [-0.6, 0.6], a: [0.4, 0.8] }, { t: 'p', n: 46, shape: 'dot', col: ['#ff2a36', '#ff6a74', '#ffb3ba'], s: [1, 2.6], vy: [-30, -12], vx: [-6, 6], a: [0.3, 1], tw: 2.2 }]],
    emerald: ['Изумруд', '#6ff2a8', '#2fcf86', '#04100a', '#0d3a26', [{ t: 'glow', y: 1.1, col: '#14a05a', a: 0.32 }, { t: 'p', n: 16, shape: 'shard', col: ['#0e5a36', '#137a48', '#0a4a2c'], edge: '#8affc4', s: [8, 20], vy: [-7, -2], vx: [-4, 4], rot: [-0.5, 0.5], a: [0.35, 0.7] }, { t: 'p', n: 34, shape: 'star4', col: ['#d6ffe8', '#8affc4', '#ffffff'], s: [1.5, 4], vy: [0, 0], a: [0, 1], tw: 1.6 }]],
    sapphire: ['Сапфир', '#8ec2ff', '#4a7cf0', '#040915', '#10255a', [{ t: 'glow', y: 1.1, col: '#1c4ab8', a: 0.34 }, { t: 'p', n: 16, shape: 'shard', col: ['#10285e', '#173a8a', '#0c1f4a'], edge: '#9cc6ff', s: [8, 20], vy: [-7, -2], vx: [-4, 4], rot: [-0.5, 0.5], a: [0.35, 0.7] }, { t: 'p', n: 34, shape: 'star4', col: ['#e0ecff', '#9cc6ff', '#ffffff'], s: [1.5, 4], vy: [0, 0], a: [0, 1], tw: 1.6 }]],
    marble: ['Мрамор', '#e8c47a', '#e2d8c6', '#14110d', '#3a3226', [{ t: 'veins', col: '#d9b26a', n: 7 }, { t: 'p', n: 40, shape: 'dot', col: ['#ffe2a0', '#f5cd6a'], s: [0.8, 2], vy: [-6, -1], vx: [-4, 4], a: [0.2, 0.7], tw: 1 }]],
    wood: ['Дерево Бездны', '#e0a860', '#b5895a', '#120c07', '#3a2414', [{ t: 'grain', col: '#6a4424' }, { t: 'p', n: 36, shape: 'dot', col: ['#ffcf8a', '#d9a05a'], s: [1, 2.6], vy: [-8, -2], vx: [-6, 6], sw: 12, a: [0.15, 0.5] }]],
    bone: ['Кость', '#eadfc8', '#b8ab92', '#121110', '#34302a', [{ t: 'cracks', col: '#b8ab92', a: 0.22, n: 6 }, { t: 'p', n: 40, shape: 'dot', col: ['#eadfc8'], s: [0.6, 1.6], vy: [2, 8], vx: [-3, 3], a: [0.15, 0.45] }]],
    ice: ['Лёд', '#c4ecff', '#7fd1ff', '#06111c', '#16405e', [{ t: 'frost' }, { t: 'icicles', col: '#bfe9ff' }, { t: 'p', n: 70, shape: 'flake', col: ['#ffffff', '#cfefff'], s: [2, 6], vy: [18, 46], vx: [-10, 10], sw: 18, rot: [-1, 1], a: [0.35, 0.9] }]],
    ghost: ['Призрак', '#cdd8ff', '#9fb0ff', '#0a0c14', '#2a3050', [{ t: 'fog', col: '#8090c0', a: 0.12 }, { t: 'p', n: 9, shape: 'ghost', col: ['#dfe6ff'], s: [14, 30], vy: [-14, -6], vx: [-4, 4], sw: 26, a: [0.08, 0.22] }, { t: 'p', n: 26, shape: 'dot', col: ['#c8d4ff'], s: [1, 2], vy: [-10, -2], a: [0.2, 0.6], tw: 1 }]],
    moss: ['Мох Бездны', '#bdec72', '#6fd18a', '#06110a', '#163a20', [{ t: 'vines', col: '#2e6a3a' }, { t: 'fog', col: '#3a7a40', a: 0.08 }, { t: 'p', n: 34, shape: 'firefly', col: ['#d8ff7a', '#b6ff5a'], s: [1.6, 3], vy: [-6, 6], vx: [-6, 6], a: [0.5, 1], tw: 2.5, wander: 1 }]],
    obsidian: ['Обсидиан', '#bfb0ff', '#8a80a8', '#07060a', '#241e30', [{ t: 'p', n: 22, shape: 'shard', col: ['#2a2438', '#3a3150', '#1a1624'], edge: '#b9a8ff', s: [8, 22], vy: [-6, 6], vx: [-8, 8], rot: [-0.6, 0.6], a: [0.6, 0.95] }, { t: 'p', n: 24, shape: 'star4', col: ['#d8ccff'], s: [2, 4], vy: [0, 0], a: [0, 0.9], tw: 1.6 }]],
    glitch: ['Глитч', '#3cffd0', '#ff3c8a', '#050608', '#102030', [{ t: 'scan', a: 0.08 }, { t: 'glitch' }, { t: 'p', n: 30, shape: 'glyph', chars: '01', col: ['#3cffd0', '#ff3c8a'], s: [9, 14], vy: [20, 50], a: [0.12, 0.4] }]],
    blood: ['Кровь', '#ff6a6a', '#c0303a', '#0f0405', '#3a0a10', [{ t: 'glow', y: 1.15, col: '#8a1018', a: 0.4 }, { t: 'drips', col: '#9a0e18', n: 9 }]],
    whisper: ['Красноречие', '#f0d0ff', '#c8a8ff', '#0c0a10', '#2c2440', [{ t: 'p', n: 26, shape: 'glyph', chars: '«»…—?!', font: 'Lora, serif', col: ['#f0d0ff', '#c8a8ff', '#ffffff'], s: [16, 34], vy: [-14, -5], vx: [-6, 6], sw: 10, a: [0.15, 0.45] }, { t: 'words' }]],
    circuit: ['Схема', '#3cffb0', '#3cc8ff', '#03100c', '#0a3a2a', [{ t: 'grid', col: '#1a6a4a', pulse: '#3cffb0' }, { t: 'p', n: 22, shape: 'glyph', chars: '01', col: ['#3cffb0'], s: [9, 12], vy: [14, 30], a: [0.1, 0.3] }]],
    lava: ['Лава', '#ffb347', '#ff6a2a', '#120503', '#4a1206', [{ t: 'cracks', col: '#ff6a1a', a: 0.35, n: 7, glow: 1 }, { t: 'glow', y: 1.1, col: '#ff4a0a', a: 0.45, pulse: 1 }, { t: 'p', n: 60, shape: 'ember', col: ['#ffb347', '#ff7a2a', '#ffd27a'], s: [1.2, 3], vy: [-60, -20], vx: [-10, 10], sw: 14, a: [0.5, 1], fade: 'up' }]],
    crystal: ['Кристалл', '#a8e6ff', '#e0b0ff', '#070c16', '#1e3050', [{ t: 'p', n: 18, shape: 'shard', col: ['#3a6a9a', '#6a4a9a', '#4a8ab0'], edge: '#cfefff', s: [8, 20], vy: [-8, -2], vx: [-4, 4], rot: [-0.5, 0.5], a: [0.35, 0.7] }, { t: 'p', n: 34, shape: 'star4', col: ['#ffffff', '#cfefff', '#f0d0ff'], s: [2, 5], vy: [0, 0], a: [0, 1], tw: 1.8 }]],
    gold: ['Золото', '#ffd56a', '#ffeaa0', '#120e04', '#3e2e08', [{ t: 'rays', from: 'top', col: '#ffd56a', a: 0.07, n: 9 }, { t: 'p', n: 46, shape: 'star4', col: ['#ffd56a', '#fff2c0'], s: [1.5, 4], vy: [10, 30], vx: [-4, 4], a: [0.3, 1], tw: 2 }]],
    oracle: ['Оракул', '#e8c878', '#a080ff', '#0a0814', '#2a1a4a', [{ t: 'runes', col: '#e0c070' }, { t: 'p', n: 30, shape: 'dot', col: ['#c8b0ff', '#e0c070'], s: [1, 2], vy: [-5, 5], vx: [-5, 5], a: [0.2, 0.6], tw: 1 }]],
    storm: ['Буря', '#d4e2ff', '#8aa8ff', '#06080e', '#1a2438', [{ t: 'fog', col: '#2a3450', a: 0.22 }, { t: 'rain' }, { t: 'bolt' }]],
    chains: ['Должник', '#cfc6b4', '#8a8f98', '#0b0b0d', '#2a2a30', [{ t: 'chains', col: '#9a9ea8' }, { t: 'p', n: 26, shape: 'dot', col: ['#cfc6b4'], s: [0.6, 1.6], vy: [2, 7], a: [0.12, 0.4] }]],
    angel: ['Ангельский', '#fff0c0', '#ffffff', '#0e0d14', '#3a3450', [{ t: 'rays', from: 'top', col: '#fff6d8', a: 0.09, n: 11 }, { t: 'p', n: 14, shape: 'feather', col: ['#ffffff', '#f6f0e0'], s: [10, 18], vy: [12, 26], vx: [-6, 6], sw: 30, rot: [-0.8, 0.8], a: [0.45, 0.85] }, { t: 'p', n: 24, shape: 'star4', col: ['#fff6d8'], s: [1.5, 3.5], vy: [0, 0], a: [0, 0.9], tw: 1.4 }]],
    reaper: ['Ангел Смерти', '#d8c6cc', '#a83246', '#050406', '#1e1018', [{ t: 'fog', col: '#3a1a24', a: 0.18 }, { t: 'glow', y: 1.15, col: '#6a1222', a: 0.35 }, { t: 'p', n: 14, shape: 'feather', col: ['#2a2026', '#3a2c34'], edge: '#9a7a88', s: [10, 20], vy: [14, 30], vx: [-6, 6], sw: 30, rot: [-0.8, 0.8], a: [0.8, 1] }]],
    mirror: ['Зеркало', '#dcebff', '#a0c0ff', '#050814', '#142040', [{ t: 'mirror' }]],
    lantern: ['Фонарь исследователя', '#ffd28a', '#ffb347', '#080604', '#3a2610', [{ t: 'spot', col: '#ffb347' }, { t: 'p', n: 40, shape: 'dot', col: ['#ffd28a', '#ffe8c0'], s: [0.8, 2], vy: [-4, 4], vx: [-4, 4], a: [0.2, 0.7], tw: 1 }]],
    star: ['Звёздный', '#ffe8a0', '#a8bcff', '#04050c', '#141a38', [STARS, { t: 'cons', col: '#a8bcff' }, { t: 'shoot', every: 5 }]],
    rainbow: ['Радуга', '#ffd0f0', '#a0f0ff', '#0a0a12', '#2a2040', [{ t: 'aurora', rainbow: 1 }, { t: 'p', n: 30, shape: 'star4', col: ['#ffffff'], s: [1.5, 3.5], vy: [0, 0], a: [0, 0.9], tw: 1.5, hue: 1 }]],
    nebula: ['Туманность', '#ffa0e4', '#9a8aff', '#06040e', '#2a0e3a', [{ t: 'nebula', cols: ['#ff4ad0', '#6a4aff', '#2ad0ff'] }, STARS]],
    hell: ['Адский', '#ff8a3a', '#ff3a1a', '#100303', '#4a0a04', [{ t: 'flames', col: '#ff4a0a' }, { t: 'p', n: 50, shape: 'ember', col: ['#ffb347', '#ff5a1a'], s: [1.2, 3], vy: [-70, -25], vx: [-12, 12], sw: 16, a: [0.5, 1], fade: 'up' }]],
    seraph: ['Серафим', '#ffe8a0', '#fff6d8', '#100e08', '#4a3a14', [{ t: 'rays', from: 'center', col: '#ffe8a0', a: 0.08, n: 12, spin: 0.03 }, { t: 'p', n: 10, shape: 'feather', col: ['#fff2c8', '#ffe8a0'], s: [9, 16], vy: [10, 22], vx: [-5, 5], sw: 26, rot: [-0.8, 0.8], a: [0.4, 0.8] }, { t: 'p', n: 30, shape: 'star4', col: ['#fff6d8', '#ffe8a0'], s: [1.5, 4], vy: [0, 0], a: [0, 1], tw: 1.6 }]],
    abyss: ['Бездна', '#7fe8ff', '#3cc8d8', '#020a10', '#063040', [{ t: 'glow', y: 1.2, col: '#1ad0e0', a: 0.4, pulse: 1 }, { t: 'p', n: 40, shape: 'bubble', col: ['#9ff0ff', '#cff8ff'], s: [2, 7], vy: [-40, -12], vx: [-4, 4], sw: 10, a: [0.25, 0.6] }]],
    andromeda: ['Андромеда', '#ff8ae4', '#7ae0ff', '#04040e', '#1a1040', [STARS, { t: 'galaxy', col1: '#ff7ae0', col2: '#7ae0ff' }, { t: 'p', n: 8, shape: 'orb', col: ['#ff7ae0', '#7ae0ff', '#b08aff'], s: [6, 14], vy: [-5, 5], vx: [-5, 5], a: [0.35, 0.7] }]],
    comet: ['Падающая звезда', '#c4e2ff', '#ffd0a0', '#03060e', '#102040', [STARS, { t: 'shoot', every: 1.6 }]],
    amethyst: ['Аметист', '#dcaaff', '#a060ff', '#0a0410', '#30104a', [{ t: 'p', n: 20, shape: 'shard', col: ['#4a1a70', '#6a2a9a', '#3a1458'], edge: '#e0b0ff', s: [8, 22], vy: [-6, 6], vx: [-6, 6], rot: [-0.5, 0.5], a: [0.5, 0.85] }, { t: 'p', n: 30, shape: 'star4', col: ['#f0d0ff', '#d8a0ff'], s: [2, 4], vy: [0, 0], a: [0, 1], tw: 1.7 }]],
    constellation: ['Созвездие', '#e4ecff', '#a8b8ff', '#03040a', '#10183a', [STARS, { t: 'cons', col: '#c8d4ff', strong: 1 }]],
    starfall: ['Звездопад', '#ffe8a0', '#c4d4ff', '#04050c', '#141a38', [STARS, { t: 'shoot', every: 0.35 }]],
    horizon: ['Горизонт событий', '#ffb868', '#ff7030', '#050302', '#3a1a06', [STARS, { t: 'disk' }]],
    prism: ['Иллюзия', '#ff7a98', '#6ae0ff', '#08080c', '#202030', [{ t: 'prism' }, { t: 'scan', a: 0.05 }, { t: 'rec' }]],
    ledger: ['Долг', '#ffd56a', '#c8a050', '#0c0a04', '#2e2408', [{ t: 'guilloche', col: '#8a6a20' }, { t: 'p', n: 16, shape: 'coin', col: ['#ffd56a'], s: [7, 12], vy: [18, 40], vx: [-4, 4], rot: [2, 5], a: [0.5, 0.9] }, { t: 'p', n: 8, shape: 'glyph', chars: '¤', font: 'Lora, serif', col: ['#ffd56a'], s: [18, 34], vy: [-8, -3], a: [0.06, 0.16] }]],
    trade: ['Бартер', '#ffd08a', '#8ad0ff', '#080a0c', '#1e2a30', [{ t: 'halves' }, { t: 'arrows' }]],
    deja: ['Дежавю', '#ffd8a0', '#c8b898', '#0a0806', '#2a2214', [{ t: 'tv' }, { t: 'scan', a: 0.1 }]],
    album: ['Ностальгия', '#ffd2a0', '#e8b080', '#0c0806', '#3a2414', [{ t: 'leak' }, { t: 'p', n: 9, shape: 'photo', col: ['#e8b080', '#c89a70', '#a8b8c0', '#d8a8a0'], s: [16, 26], vy: [-10, -4], vx: [-5, 5], sw: 12, rot: [-0.3, 0.3], a: [0.25, 0.5] }, { t: 'noise', a: 0.05 }]],
    dawn: ['Восход', '#ffd27a', '#ff9a6a', '#0e0608', '#4a1e14', [{ t: 'sun' }, { t: 'p', n: 30, shape: 'dot', col: ['#ffd27a', '#ffb08a'], s: [0.8, 2], vy: [-6, -1], vx: [-3, 3], a: [0.2, 0.6] }]],
    hollow: ['Пустота', '#cfcfd8', '#8a8a98', '#08080a', '#1c1c20', [{ t: 'bigglyph', ch: '∅', col: '#cfcfd8', a: 0.05 }, { t: 'p', n: 50, shape: 'ash', col: ['#8a8a98', '#5a5a64', '#b0b0bc'], s: [1.5, 3.5], vy: [8, 22], vx: [-6, 6], sw: 16, rot: [-2, 2], a: [0.3, 0.7] }]],
    void: ['Абсолют', '#e4dcff', '#8070c0', '#000000', '#0a0a14', [STARS, { t: 'hole' }]],
    hwpumpkin: ['Тыква', '#ffb347', '#ff8a1e', '#100804', '#3e1a06', [{ t: 'glow', y: 1.15, col: '#ff7a1a', a: 0.35, flicker: 1 }, { t: 'p', n: 16, shape: 'leaf', col: ['#c0501a', '#e0801a', '#8a3a10', '#d0a020'], s: [7, 13], vy: [16, 34], vx: [-10, 10], sw: 30, rot: [-1.5, 1.5], a: [0.6, 0.95] }]],
    hwwax: ['Восковая свеча', '#ffdc96', '#ffb060', '#0c0806', '#3a2410', [{ t: 'candles' }, { t: 'p', n: 12, shape: 'smoke', col: ['#8a7a6a'], s: [10, 22], vy: [-20, -10], vx: [-3, 3], sw: 20, a: [0.04, 0.1], fade: 'up' }]],
    hwweb: ['Паутина', '#e6e6f4', '#ff7a2a', '#08080c', '#20202c', [{ t: 'webs' }, { t: 'p', n: 24, shape: 'dot', col: ['#cfd6e6'], s: [0.6, 1.4], vy: [2, 6], a: [0.1, 0.35] }]],
    hwbats: ['Летучие мыши', '#ffb347', '#c08aff', '#0a0610', '#2a1630', [{ t: 'glow', y: 0.2, col: '#8a4ac0', a: 0.25 }, { t: 'moon', x: 0.78, y: 0.62, r: 0.13, col: '#ffe8c0' }, { t: 'p', n: 14, shape: 'bat', col: ['#140a1c', '#1e1028'], s: [10, 20], vy: [-14, 14], vx: [30, 70], flip: 1, a: [0.85, 1] }]],
    hwmoon: ['Полнолуние', '#fff0c8', '#c4cce4', '#05060e', '#1a2038', [STARS, { t: 'moon', x: 0.5, y: 0.3, r: 0.26, col: '#fff0c8', big: 1 }, { t: 'fog', col: '#5a6488', a: 0.16, low: 1 }, { t: 'p', n: 4, shape: 'bat', col: ['#05030a'], s: [8, 13], vy: [-8, 8], vx: [24, 50], flip: 1, a: [0.9, 1] }]],
    hwcauldron: ['Ведьмин котёл', '#a8ff6a', '#c08aff', '#060e06', '#14381a', [{ t: 'glow', y: 1.15, col: '#4aff3a', a: 0.35, pulse: 1 }, { t: 'fog', col: '#5aa04a', a: 0.1, low: 1 }, { t: 'p', n: 40, shape: 'bubble', col: ['#a8ff6a', '#d0ff9a', '#c08aff'], s: [2, 8], vy: [-46, -14], vx: [-5, 5], sw: 10, a: [0.3, 0.75], pop: 1 }]],
    hwking: ['Тыквенный король', '#ffd56a', '#ff9a2e', '#100a02', '#3e2a06', [{ t: 'rays', from: 'top', col: '#ffd56a', a: 0.08, n: 9, spin: 0.01 }, { t: 'glow', y: 1.1, col: '#ff8a1a', a: 0.3 }, { t: 'p', n: 40, shape: 'star4', col: ['#ffd56a', '#ffb347'], s: [1.5, 4], vy: [8, 24], a: [0.3, 1], tw: 2 }]],
    hwspirit: ['Дух Тонкой Грани', '#ffdcc4', '#ff5a5a', '#0a0608', '#2a1418', [{ t: 'pair' }, { t: 'p', n: 30, shape: 'dot', col: ['#ffd8c0', '#ff8a8a'], s: [0.8, 2], vy: [-6, 6], vx: [-6, 6], a: [0.15, 0.5], tw: 1 }]],
    hwghost: ['Призрак Хеллоуина', '#ffb347', '#cdd8ff', '#0a0812', '#241a3a', [{ t: 'fog', col: '#6a5a9a', a: 0.12, low: 1 }, { t: 'p', n: 7, shape: 'ghost', col: ['#eef2ff'], lamp: 1, s: [16, 28], vy: [-10, 10], vx: [-12, 12], sw: 20, a: [0.5, 0.8] }, { t: 'p', n: 12, shape: 'glyph', chars: '🍬🍭', col: ['#fff'], s: [12, 18], vy: [10, 22], vx: [-6, 6], rot: [-1.5, 1.5], a: [0.5, 0.85] }]]
  };

  // ---------- холст ----------
  const cv = document.createElement('canvas'); cv.id = 'ekfx'; cv.setAttribute('aria-hidden', 'true');
  const c = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, cur = null, layers = [], on = true, run = false, last = 0, tt = 0;
  const reduce = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  // На телефоне при прокрутке прячется и появляется адресная строка: высота окна «прыгает», ширина — нет.
  //  Раньше на каждый такой прыжок фон собирался заново, и частицы телепортировались. Теперь холст берётся
  //  с запасом по высоте (на всю высоту экрана) и пересобирается, только если поменялась ширина или поворот.
  const touchDev = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  function size(force) {
    const nw = innerWidth, nh = innerHeight;
    const tall = touchDev ? Math.min(Math.round(nh * 1.4), Math.max(Math.round(nh * 1.12), (window.screen && screen.height) || 0)) : nh;
    if (!force && W && Math.abs(nw - W) < 2 && (touchDev ? nh <= H : nh === H)) return false;
    const sameW = Math.abs(nw - W) < 2;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5); W = nw; H = touchDev && sameW ? Math.max(tall, H) : tall;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.height = H + 'px'; c.setTransform(DPR, 0, 0, DPR, 0, 0); layers.forEach((l) => l.init && l.init()); bake();
    return true;
  }
  const spr = {};
  function glowSprite(col) { // мягкое круглое свечение, нарисованное один раз
    if (spr[col]) return spr[col];
    const s = document.createElement('canvas'); s.width = s.height = 64; const g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(0.25, col + 'aa'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (spr[col] = s);
  }
  const hex = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

  // ---------- частицы ----------
  function Particles(o) {
    const ps = [];
    const spawn = (p, first) => {
      p.s = R(o.s); p.vy = R(o.vy); p.vx = R(o.vx); p.a = R(o.a); p.col = pick(o.col); p.rot = rnd(0, TAU); p.vr = R(o.rot); p.ph = rnd(0, TAU); p.sw = o.sw || 0;
      p.ch = o.chars ? pick(Array.from(o.chars)) : null; p.hue = rnd(0, 360);
      if (o.flip) { p.dir = Math.random() < 0.5 ? 1 : -1; p.vx *= p.dir; }
      const m = p.s * 3 + 30;
      if (first) { p.x = rnd(-m, W + m); p.y = rnd(-m, H + m); }
      else if (o.flip) { p.x = p.dir > 0 ? -m : W + m; p.y = rnd(0, H * 0.8); }
      else if (Math.abs(p.vy) < 1 && !o.wander) { p.x = rnd(0, W); p.y = rnd(0, H); }
      else if (p.vy > 0) { p.x = rnd(-m, W + m); p.y = -m; } else { p.x = rnd(-m, W + m); p.y = H + m; }
      p.life = 0;
    };
    return {
      init() { ps.length = 0; for (let i = 0; i < o.n; i++) { const p = {}; spawn(p, true); ps.push(p); } },
      step(dt) {
        for (const p of ps) {
          p.life += dt;
          if (o.wander) { p.vx += rnd(-20, 20) * dt; p.vy += rnd(-20, 20) * dt; p.vx *= 0.98; p.vy *= 0.98; }
          p.x += p.vx * dt + Math.cos(tt * 0.8 + p.ph) * p.sw * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          const m = p.s * 3 + 40;
          if (o.wander) { if (p.x < -m) p.x = W + m; if (p.x > W + m) p.x = -m; if (p.y < -m) p.y = H + m; if (p.y > H + m) p.y = -m; }
          else if (p.y > H + m || p.y < -m || p.x < -m * 2 || p.x > W + m * 2) spawn(p, false);
          if (o.pop && p.y < H * rnd(0.1, 0.5) && Math.random() < 0.01) spawn(p, false);
        }
      },
      draw() {
        for (const p of ps) {
          let a = p.a;
          if (o.tw) a *= 0.55 + 0.45 * Math.sin(tt * o.tw * 2 + p.ph);
          if (o.fade === 'up') a *= Math.max(0, Math.min(1, p.y / H * 1.3));
          if (a <= 0.01) continue;
          c.globalAlpha = Math.min(1, a);
          shape(o, p);
        }
        c.globalAlpha = 1;
      }
    };
  }
  function shape(o, p) {
    const s = p.s, col = o.hue ? `hsl(${(p.hue + tt * 40) % 360},90%,80%)` : p.col;
    switch (o.shape) {
      case 'dot': { const g = glowSprite(p.col); c.drawImage(g, p.x - s * 3, p.y - s * 3, s * 6, s * 6); break; }
      case 'ember': case 'firefly': { const g = glowSprite(p.col); c.drawImage(g, p.x - s * 4, p.y - s * 4, s * 8, s * 8); c.fillStyle = '#fff8e0'; c.beginPath(); c.arc(p.x, p.y, s * 0.45, 0, TAU); c.fill(); break; }
      case 'orb': { const g = glowSprite(p.col); c.drawImage(g, p.x - s * 2.5, p.y - s * 2.5, s * 5, s * 5); c.strokeStyle = p.col; c.lineWidth = 1.2; c.beginPath(); c.arc(p.x, p.y, s * 0.6, 0, TAU); c.stroke(); break; }
      case 'star4': { c.save(); c.translate(p.x, p.y); c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.22 : s, an = i * Math.PI / 4; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); } c.fill(); c.restore(); break; }
      case 'flake': { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.strokeStyle = p.col; c.lineWidth = Math.max(0.7, s / 7); c.beginPath(); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; c.moveTo(0, 0); c.lineTo(Math.cos(an) * s, Math.sin(an) * s); const bx = Math.cos(an) * s * 0.55, by = Math.sin(an) * s * 0.55; c.moveTo(bx, by); c.lineTo(bx + Math.cos(an + 0.7) * s * 0.3, by + Math.sin(an + 0.7) * s * 0.3); c.moveTo(bx, by); c.lineTo(bx + Math.cos(an - 0.7) * s * 0.3, by + Math.sin(an - 0.7) * s * 0.3); } c.stroke(); c.restore(); break; }
      case 'feather': { c.save(); c.translate(p.x, p.y); c.rotate(p.rot * 0.5 + Math.sin(tt + p.ph) * 0.5); c.fillStyle = p.col; c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s * 0.55, -s * 0.2, 0, s); c.quadraticCurveTo(-s * 0.4, -s * 0.2, 0, -s); c.fill(); c.strokeStyle = o.edge || 'rgba(0,0,0,.18)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -s); c.lineTo(0, s * 1.2); c.stroke(); c.restore(); break; }
      case 'shard': { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.strokeStyle = hex(o.edge || '#ffffff', 0.55); c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.45, -s * 0.1); c.lineTo(s * 0.2, s * 0.8); c.lineTo(-s * 0.35, s * 0.4); c.lineTo(-s * 0.4, -s * 0.3); c.closePath(); c.fill(); c.stroke(); c.globalAlpha *= 0.5; c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.2, s * 0.8); c.stroke(); c.restore(); break; }
      case 'bubble': { c.strokeStyle = p.col; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, s, 0, TAU); c.stroke(); c.fillStyle = hex(p.col.length === 7 ? p.col : '#ffffff', 0.12); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(p.x - s * 0.35, p.y - s * 0.35, s * 0.22, 0, TAU); c.fill(); break; }
      case 'coin': { c.save(); c.translate(p.x, p.y); c.scale(Math.max(0.12, Math.abs(Math.cos(p.rot))), 1); c.fillStyle = '#b8862a'; c.beginPath(); c.arc(0, 0, s, 0, TAU); c.fill(); c.fillStyle = p.col; c.beginPath(); c.arc(0, 0, s * 0.82, 0, TAU); c.fill(); c.fillStyle = '#8a6210'; c.font = `700 ${s}px Lora, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('¤', 0, s * 0.05); c.restore(); break; }
      case 'glyph': { c.save(); c.translate(p.x, p.y); if (p.vr) c.rotate(p.rot); c.fillStyle = col; c.font = `600 ${s}px ${o.font || 'ui-monospace, monospace'}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.ch, 0, 0); c.restore(); break; }
      case 'ghost': { c.save(); c.translate(p.x, p.y + Math.sin(tt * 1.4 + p.ph) * 4); c.fillStyle = p.col; c.beginPath(); c.arc(0, -s * 0.2, s * 0.6, Math.PI, 0); c.lineTo(s * 0.6, s * 0.7); for (let i = 0; i < 4; i++) { const x0 = s * 0.6 - (i + 1) * s * 0.3; c.quadraticCurveTo(x0 + s * 0.15, s * (i % 2 ? 0.95 : 0.45) + Math.sin(tt * 3 + i) * 2, x0, s * 0.7); } c.closePath(); c.fill(); c.fillStyle = 'rgba(20,16,40,.75)'; c.beginPath(); c.ellipse(-s * 0.2, -s * 0.25, s * 0.08, s * 0.13, 0, 0, TAU); c.ellipse(s * 0.2, -s * 0.25, s * 0.08, s * 0.13, 0, 0, TAU); c.fill();
        if (o.lamp) { const lx = s * 0.75, ly = s * 0.35 + Math.sin(tt * 2 + p.ph) * 2; c.globalAlpha = Math.min(1, c.globalAlpha * 1.6); const g = glowSprite('#ffb347'); c.drawImage(g, lx - s * 0.7, ly - s * 0.7, s * 1.4, s * 1.4); c.fillStyle = '#ffcf7a'; c.fillRect(lx - s * 0.1, ly - s * 0.14, s * 0.2, s * 0.28); }
        c.restore(); break; }
      case 'bat': { c.save(); c.translate(p.x, p.y + Math.sin(tt * 2 + p.ph) * 8); c.scale(p.dir || 1, 1); const f = Math.sin(tt * 14 + p.ph); c.fillStyle = p.col; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-s * 0.5, -s * 0.6 * f - s * 0.2, -s, -s * 0.1 * f); c.quadraticCurveTo(-s * 0.6, s * 0.1, -s * 0.5, s * 0.25); c.quadraticCurveTo(-s * 0.25, s * 0.05, 0, s * 0.25); c.quadraticCurveTo(s * 0.25, s * 0.05, s * 0.5, s * 0.25); c.quadraticCurveTo(s * 0.6, s * 0.1, s, -s * 0.1 * f); c.quadraticCurveTo(s * 0.5, -s * 0.6 * f - s * 0.2, 0, 0); c.fill(); c.beginPath(); c.ellipse(0, s * 0.05, s * 0.16, s * 0.22, 0, 0, TAU); c.fill(); c.restore(); break; }
      case 'leaf': { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(tt * 1.5 + p.ph))); c.fillStyle = p.col; c.beginPath(); c.moveTo(0, -s); c.bezierCurveTo(s * 0.8, -s * 0.5, s * 0.6, s * 0.5, 0, s); c.bezierCurveTo(-s * 0.6, s * 0.5, -s * 0.8, -s * 0.5, 0, -s); c.fill(); c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(0, -s); c.lineTo(0, s * 1.2); c.stroke(); c.restore(); break; }
      case 'ash': { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-s / 2, -s / 3, s, s * 0.66); c.restore(); break; }
      case 'smoke': { const g = glowSprite(p.col); c.drawImage(g, p.x - s * 2, p.y - s * 2, s * 4, s * 4); break; }
      case 'photo': { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = '#efe6d6'; c.fillRect(-s * 0.5, -s * 0.6, s, s * 1.2); c.fillStyle = p.col; c.fillRect(-s * 0.42, -s * 0.52, s * 0.84, s * 0.84); c.restore(); break; }
    }
  }

  // ---------- декорации ----------
  let bg = null; // неподвижный слой: прожилки, трещины, сетка и т. п.
  function bake() {
    bg = document.createElement('canvas'); bg.width = Math.round(W * DPR); bg.height = Math.round(H * DPR);
    const g = bg.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    let seed = 7; const sr = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    (cur ? cur[5] : []).forEach((o) => {
      if (o.t === 'veins') { g.strokeStyle = hex(o.col, 0.16); g.lineWidth = 1; for (let i = 0; i < o.n; i++) { g.beginPath(); let x = sr() * W, y = -20; g.moveTo(x, y); while (y < H + 20) { const nx = x + (sr() - 0.5) * 120, ny = y + 40 + sr() * 80; g.quadraticCurveTo(x + (sr() - 0.5) * 80, (y + ny) / 2, nx, ny); x = nx; y = ny; } g.lineWidth = 0.6 + sr() * 1.4; g.stroke(); } }
      if (o.t === 'grain') { for (let i = 0; i < 60; i++) { g.strokeStyle = hex(o.col, 0.05 + sr() * 0.08); g.lineWidth = 1 + sr() * 2; g.beginPath(); const y0 = sr() * H; g.moveTo(-10, y0); for (let x = 0; x <= W + 20; x += 40) g.lineTo(x, y0 + Math.sin(x / 90 + i) * 10 + (sr() - 0.5) * 3); g.stroke(); } }
      if (o.t === 'cracks') { const n = o.n || 6; for (let i = 0; i < n; i++) { let x = sr() * W, y = sr() * H; const paths = [[x, y]]; let an = sr() * TAU; for (let k = 0; k < 9; k++) { an += (sr() - 0.5) * 1.2; x += Math.cos(an) * (20 + sr() * 40); y += Math.sin(an) * (20 + sr() * 40); paths.push([x, y]); }
          if (o.glow) { g.shadowColor = o.col; g.shadowBlur = 10; }
          g.strokeStyle = hex(o.col, o.a); g.lineWidth = 1.4; g.beginPath(); paths.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); g.shadowBlur = 0; } }
      if (o.t === 'grid') { g.strokeStyle = hex(o.col, 0.22); g.lineWidth = 1; const st = 46; for (let x = 0; x < W; x += st) for (let y = 0; y < H; y += st) { if (sr() < 0.45) { g.beginPath(); g.moveTo(x, y); if (sr() < 0.5) g.lineTo(x + st, y); else g.lineTo(x, y + st); g.stroke(); } if (sr() < 0.12) { g.fillStyle = hex(o.col, 0.45); g.fillRect(x - 2, y - 2, 4, 4); } } }
      if (o.t === 'guilloche') { g.strokeStyle = hex(o.col, 0.12); g.lineWidth = 0.7; const cx = W / 2, cy = H * 0.45; for (let k = 0; k < 14; k++) { g.beginPath(); for (let a = 0; a <= TAU + 0.01; a += 0.02) { const r = Math.min(W, H) * 0.42 + Math.sin(a * 12 + k * 0.45) * 22; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9); } g.stroke(); } }
      if (o.t === 'vines') { g.strokeStyle = hex(o.col, 0.5); for (let i = 0; i < 9; i++) { const x0 = sr() * W; g.lineWidth = 1 + sr() * 2; g.beginPath(); g.moveTo(x0, -10); const len = H * (0.15 + sr() * 0.3); for (let y = 0; y < len; y += 10) g.lineTo(x0 + Math.sin(y / 30 + i) * 12, y); g.stroke(); for (let y = 20; y < len; y += 34) { g.fillStyle = hex('#4a9a4a', 0.55); g.beginPath(); g.ellipse(x0 + Math.sin(y / 30 + i) * 12 + 6, y, 6, 3, 0.6, 0, TAU); g.fill(); } } }
      if (o.t === 'webs') { [[0, 0, 1, 1], [W, 0, -1, 1]].forEach(([x0, y0, sx, sy], wi) => { const R0 = Math.min(W, H) * (wi ? 0.38 : 0.5); g.strokeStyle = 'rgba(207,214,230,.42)'; g.lineWidth = 1; const n = 7; for (let i = 0; i < n; i++) { const an = (i / (n - 1)) * Math.PI / 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + sx * Math.cos(an) * R0, y0 + sy * Math.sin(an) * R0); g.stroke(); } for (let r = R0 * 0.18; r < R0; r += R0 * 0.15) { g.beginPath(); for (let i = 0; i < n; i++) { const an = (i / (n - 1)) * Math.PI / 2, px = x0 + sx * Math.cos(an) * r, py = y0 + sy * Math.sin(an) * r; if (!i) g.moveTo(px, py); else { const pa = ((i - 0.5) / (n - 1)) * Math.PI / 2, rr = r * 0.9; g.quadraticCurveTo(x0 + sx * Math.cos(pa) * rr, y0 + sy * Math.sin(pa) * rr, px, py); } } g.stroke(); } }); }
      if (o.t === 'halves') { const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(255,190,110,.18)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(110,190,255,.18)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(255,255,255,.06)'; g.setLineDash([6, 10]); g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); g.setLineDash([]); }
      if (o.t === 'stars') { const n = Math.round(o.n * W * H / 400000) + 40; for (let i = 0; i < n; i++) { const x = sr() * W, y = sr() * H, r = sr() < 0.08 ? 1.4 : 0.4 + sr() * 0.8; g.fillStyle = `rgba(255,255,255,${0.25 + sr() * 0.6})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
      if (o.t === 'bigglyph') { g.fillStyle = hex(o.col, o.a); g.font = `400 ${Math.min(W, H) * 0.9}px Lora, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.ch, W / 2, H * 0.46); }
    });
  }

  // живые слои (с анимацией)
  const LIVE = {
    glow(o) { return { draw() { let a = o.a; if (o.pulse) a *= 0.75 + 0.25 * Math.sin(tt * 1.3); if (o.flicker) a *= 0.8 + 0.2 * Math.sin(tt * 7) * Math.sin(tt * 3.1); const r = Math.max(W, H) * 0.75, y = H * o.y; const gr = c.createRadialGradient(W / 2, y, 0, W / 2, y, r); gr.addColorStop(0, hex(o.col, a)); gr.addColorStop(1, hex(o.col, 0)); c.fillStyle = gr; c.fillRect(0, 0, W, H); } }; },
    fog(o) { const b = Array.from({ length: 6 }, () => ({ x: rnd(0, 1), y: o.low ? rnd(0.65, 1) : rnd(0, 1), r: rnd(0.3, 0.6), v: rnd(-0.01, 0.01) })); return { draw() { for (const f of b) { f.x += f.v / 30; if (f.x < -0.5) f.x = 1.5; if (f.x > 1.5) f.x = -0.5; const r = Math.max(W, H) * f.r, gr = c.createRadialGradient(f.x * W, f.y * H, 0, f.x * W, f.y * H, r); gr.addColorStop(0, hex(o.col, o.a)); gr.addColorStop(1, hex(o.col, 0)); c.fillStyle = gr; c.fillRect(0, 0, W, H); } } }; },
    rays(o) { return { draw() { const cx = W / 2, cy = o.from === 'top' ? -H * 0.15 : o.from === 'bottom' ? H * 1.1 : H * 0.42, L = Math.hypot(W, H) * 1.1, sp = (o.spin || 0.004) * tt; c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < o.n; i++) { const base = o.from === 'top' ? Math.PI / 2 : o.from === 'bottom' ? -Math.PI / 2 : 0, spread = o.from === 'center' ? TAU : 1.4, an = base + (i / o.n - 0.5) * spread + Math.sin(sp * 10 + i) * 0.04 + (o.from === 'center' ? sp : 0), w = 0.035 + 0.02 * Math.sin(tt * 0.7 + i * 1.7); const a = o.a * (0.6 + 0.4 * Math.sin(tt * 0.6 + i * 2.1)); const gr = c.createRadialGradient(cx, cy, 0, cx, cy, L); gr.addColorStop(0, hex(o.col, a)); gr.addColorStop(1, hex(o.col, 0)); c.fillStyle = gr; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, L, an - w, an + w); c.closePath(); c.fill(); } c.restore(); } }; },
    frost() { return { draw() { const r = Math.max(W, H) * 0.55;[[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(200,235,255,.16)'); gr.addColorStop(1, 'rgba(200,235,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); }); } }; },
    icicles(o) { const ic = Array.from({ length: Math.ceil(W / 26) + 2 }, (_, i) => ({ x: i * 26 + rnd(-6, 6), h: rnd(10, 46), w: rnd(5, 10), d: rnd(0, 6) })); return { init() { ic.length = 0; for (let i = 0; i < Math.ceil(W / 26) + 2; i++) ic.push({ x: i * 26 + rnd(-6, 6), h: rnd(10, 46), w: rnd(5, 10), d: rnd(0, 6) }); }, draw() { c.fillStyle = 'rgba(200,235,255,.22)'; for (const q of ic) { c.beginPath(); c.moveTo(q.x - q.w / 2, 0); c.lineTo(q.x + q.w / 2, 0); c.lineTo(q.x, q.h); c.closePath(); c.fill(); const dy = ((tt + q.d) % 6) / 6; if (dy < 0.35) { c.globalAlpha = 0.6 * (1 - dy / 0.35); c.beginPath(); c.arc(q.x, q.h + dy * 160, 1.6, 0, TAU); c.fill(); c.globalAlpha = 1; } } } }; },
    scan(o) { return { draw() { c.fillStyle = `rgba(0,0,0,${o.a * 2.5})`; for (let y = (tt * 30) % 4; y < H; y += 4) c.fillRect(0, y, W, 1.5); const by = ((tt * 0.15) % 1.2 - 0.1) * H; const gr = c.createLinearGradient(0, by - 60, 0, by + 60); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${o.a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, by - 60, W, 120); } }; },
    glitch() { let next = 0, blocks = []; return { draw() { if (tt > next) { next = tt + rnd(0.6, 2.4); blocks = Array.from({ length: (Math.random() * 6) | 0 }, () => ({ x: rnd(0, W), y: rnd(0, H), w: rnd(30, 180), h: rnd(3, 16), col: pick(['rgba(60,255,208,.25)', 'rgba(255,60,138,.25)', 'rgba(255,255,255,.12)']), t: tt + rnd(0.05, 0.25) })); } for (const b of blocks) if (tt < b.t) { c.fillStyle = b.col; c.fillRect(b.x, b.y, b.w, b.h); } } }; },
    drips(o) { const d = []; const mk = () => ({ x: rnd(0, W), len: 0, max: rnd(40, H * 0.45), v: rnd(6, 20), w: rnd(2, 5), drop: null }); return { init() { d.length = 0; for (let i = 0; i < o.n; i++) { const q = mk(); q.len = rnd(0, q.max); d.push(q); } }, step(dt) { for (const q of d) { if (q.len < q.max) q.len += q.v * dt; else if (!q.drop) q.drop = { y: q.len, v: 0 }; if (q.drop) { q.drop.v += 400 * dt; q.drop.y += q.drop.v * dt; if (q.drop.y > H + 20) Object.assign(q, mk()); } } }, draw() { c.fillStyle = o.col; for (const q of d) { c.globalAlpha = 0.75; c.beginPath(); c.moveTo(q.x - q.w, 0); c.quadraticCurveTo(q.x - q.w * 0.5, q.len * 0.6, q.x - q.w * 0.35, q.len); c.arc(q.x, q.len, q.w * 0.42, Math.PI, 0, true); c.quadraticCurveTo(q.x + q.w * 0.5, q.len * 0.6, q.x + q.w, 0); c.fill(); if (q.drop) { c.beginPath(); c.arc(q.x, q.drop.y, q.w * 0.5, 0, TAU); c.fill(); } } c.globalAlpha = 1; } }; },
    rain() { const dr = []; return { init() { dr.length = 0; const n = Math.round(W * H / 6000); for (let i = 0; i < n; i++) dr.push({ x: rnd(0, W), y: rnd(0, H), v: rnd(500, 900), l: rnd(10, 22) }); }, step(dt) { for (const q of dr) { q.y += q.v * dt; q.x -= q.v * 0.18 * dt; if (q.y > H) { q.y = -20; q.x = rnd(0, W + 100); } } }, draw() { c.strokeStyle = 'rgba(180,200,255,.28)'; c.lineWidth = 1; c.beginPath(); for (const q of dr) { c.moveTo(q.x, q.y); c.lineTo(q.x + q.l * 0.18, q.y - q.l); } c.stroke(); } }; },
    bolt() { let next = 2, flash = 0, path = null; return { draw() { if (tt > next) { next = tt + rnd(3, 8); flash = 1; path = []; let x = rnd(W * 0.2, W * 0.8), y = 0; while (y < H * rnd(0.4, 0.8)) { path.push([x, y]); x += rnd(-40, 40); y += rnd(20, 50); } path.push([x, y]); } if (flash > 0) { c.fillStyle = `rgba(200,215,255,${flash * 0.18})`; c.fillRect(0, 0, W, H); if (path) { c.strokeStyle = `rgba(235,240,255,${flash})`; c.lineWidth = 2.2; c.shadowColor = '#bcd0ff'; c.shadowBlur = 14; c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.shadowBlur = 0; } flash -= 0.045; } } }; },
    chains(o) { const ch = []; return { init() { ch.length = 0; const n = Math.max(3, Math.round(W / 130)); for (let i = 0; i < n; i++) ch.push({ x: (i + 0.5) * W / n + rnd(-20, 20), len: rnd(H * 0.2, H * 0.55), ph: rnd(0, TAU) }); }, draw() { c.strokeStyle = o.col; c.lineWidth = 2.6; for (const q of ch) { const sw = Math.sin(tt * 0.7 + q.ph) * 0.05; c.save(); c.translate(q.x, -6); c.rotate(sw); for (let y = 0; y < q.len; y += 14) { c.globalAlpha = 0.75 * (1 - y / q.len * 0.5); c.beginPath(); if ((y / 14) % 2) c.ellipse(0, y, 2.2, 7, 0, 0, TAU); else c.ellipse(0, y, 5, 7.5, 0, 0, TAU); c.stroke(); } c.restore(); } c.globalAlpha = 1; } }; },
    mirror() { const st = []; return { init() { st.length = 0; for (let i = 0; i < 120; i++) st.push({ x: rnd(0, W), y: rnd(0, H * 0.55), r: rnd(0.6, 2), ph: rnd(0, TAU) }); }, draw() { const hy = H * 0.6; const gr = c.createLinearGradient(0, hy - 2, 0, hy + 2); gr.addColorStop(0, 'rgba(200,220,255,0)'); gr.addColorStop(0.5, 'rgba(200,220,255,.6)'); gr.addColorStop(1, 'rgba(200,220,255,0)'); c.fillStyle = gr; c.fillRect(0, hy - 2, W, 4); const sh = c.createLinearGradient(0, hy, 0, H); sh.addColorStop(0, 'rgba(120,150,230,.14)'); sh.addColorStop(1, 'rgba(120,150,230,0)'); c.fillStyle = sh; c.fillRect(0, hy, W, H - hy); for (const s of st) { const a = 0.4 + 0.5 * Math.sin(tt * 1.6 + s.ph); c.fillStyle = `rgba(230,240,255,${a})`; c.beginPath(); c.arc(s.x, s.y * (hy / (H * 0.55)), s.r, 0, TAU); c.fill(); const ry = hy + (hy - s.y * (hy / (H * 0.55))) * 0.6; if (ry < H) { c.fillStyle = `rgba(200,220,255,${a * 0.35})`; c.beginPath(); c.ellipse(s.x + Math.sin(tt * 2 + s.y) * 2, ry, s.r * 1.6, s.r * 0.6, 0, 0, TAU); c.fill(); } } } }; },
    spot(o) { return { draw() { const f = 0.85 + 0.1 * Math.sin(tt * 9) * Math.sin(tt * 2.3) + 0.05 * Math.sin(tt * 17); const r = Math.min(W, H) * 0.75 * f, cx = W / 2, cy = H * 0.42; const gr = c.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, hex(o.col, 0.22 * f)); gr.addColorStop(0.5, hex(o.col, 0.07)); gr.addColorStop(1, hex(o.col, 0)); c.fillStyle = gr; c.fillRect(0, 0, W, H); } }; },
    cons(o) { const pts = []; let lines = []; return { init() { pts.length = 0; const n = 7 + Math.round(W / 120); for (let i = 0; i < n; i++) pts.push({ x: rnd(0.05, 0.95) * W, y: rnd(0.05, 0.9) * H, ph: rnd(0, TAU) }); lines = []; pts.forEach((p, i) => { let best = null, bd = 1e9; pts.forEach((q, j) => { if (j <= i) return; const d = Math.hypot(p.x - q.x, p.y - q.y); if (d < bd) { bd = d; best = j; } }); if (best != null && bd < Math.min(W, H) * 0.5) lines.push([i, best]); }); }, draw() { c.strokeStyle = hex(o.col, o.strong ? 0.3 : 0.18); c.lineWidth = 1; for (const [i, j] of lines) { const k = 0.5 + 0.5 * Math.sin(tt * 0.5 + i); c.globalAlpha = 0.4 + 0.6 * k; c.beginPath(); c.moveTo(pts[i].x, pts[i].y); c.lineTo(pts[j].x, pts[j].y); c.stroke(); } c.globalAlpha = 1; for (const p of pts) { const a = 0.6 + 0.4 * Math.sin(tt * 2 + p.ph), g = glowSprite(o.col); c.globalAlpha = a; c.drawImage(g, p.x - 9, p.y - 9, 18, 18); c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 1.6, 0, TAU); c.fill(); } c.globalAlpha = 1; } }; },
    shoot(o) { const ss = []; let next = 0.5; return { draw() { if (tt > next) { next = tt + rnd(o.every * 0.5, o.every * 1.5); const an = rnd(0.35, 0.7); ss.push({ x: rnd(-0.1, 0.9) * W, y: rnd(-0.1, 0.45) * H, vx: Math.cos(an) * rnd(500, 900), vy: Math.sin(an) * rnd(500, 900), t: 0, life: rnd(0.6, 1.1) }); } for (let i = ss.length - 1; i >= 0; i--) { const s = ss[i]; s.t += 1 / 30; if (s.t > s.life) { ss.splice(i, 1); continue; } const x = s.x + s.vx * s.t, y = s.y + s.vy * s.t, a = Math.sin(s.t / s.life * Math.PI); const gr = c.createLinearGradient(x, y, x - s.vx * 0.12, y - s.vy * 0.12); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = gr; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x - s.vx * 0.12, y - s.vy * 0.12); c.stroke(); c.globalAlpha = a; c.drawImage(glowSprite('#cfe0ff'), x - 8, y - 8, 16, 16); c.globalAlpha = 1; } } }; },
    aurora(o) { return { draw() { c.save(); c.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { const hue = (tt * 20 + k * 120) % 360; c.fillStyle = `hsla(${hue},90%,60%,.07)`; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 20; x += 20) c.lineTo(x, H * (0.25 + k * 0.12) + Math.sin(x / 140 + tt * 0.5 + k * 2) * 50 + Math.sin(x / 60 + tt * 0.9) * 14); c.lineTo(W, H); c.closePath(); c.fill(); } c.restore(); } }; },
    nebula(o) { const cl = o.cols.map((col, i) => ({ col, x: rnd(0.2, 0.8), y: rnd(0.15, 0.85), r: rnd(0.35, 0.6), ph: i * 2 })); return { draw() { c.save(); c.globalCompositeOperation = 'lighter'; for (const q of cl) { const x = (q.x + Math.sin(tt * 0.05 + q.ph) * 0.06) * W, y = (q.y + Math.cos(tt * 0.04 + q.ph) * 0.05) * H, r = Math.max(W, H) * q.r; const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hex(q.col, 0.22)); gr.addColorStop(0.5, hex(q.col, 0.07)); gr.addColorStop(1, hex(q.col, 0)); c.fillStyle = gr; c.fillRect(0, 0, W, H); } c.restore(); } }; },
    flames(o) { return { draw() { c.save(); c.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { c.fillStyle = hex(k === 2 ? '#ffd27a' : o.col, 0.12 - k * 0.02); c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, H - (60 + k * -14) - Math.abs(Math.sin(x / 40 + tt * (3 + k) + k)) * (70 - k * 15) - Math.sin(x / 13 + tt * 7) * 8); c.lineTo(W, H); c.closePath(); c.fill(); } c.restore(); } }; },
    galaxy(o) { const st = []; return { init() { st.length = 0; for (let i = 0; i < 420; i++) { const arm = i % 2, d = Math.pow(Math.random(), 0.7); st.push({ d, an: arm * Math.PI + d * 5.5 + rnd(-0.35, 0.35), r: rnd(0.4, 1.4), col: Math.random() < 0.5 ? o.col1 : o.col2 }); } }, draw() { const cx = W / 2, cy = H * 0.4, R0 = Math.min(W, H) * 0.48, rot = tt * 0.05; c.save(); c.globalCompositeOperation = 'lighter'; const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R0 * 0.35); gr.addColorStop(0, 'rgba(255,240,255,.35)'); gr.addColorStop(1, 'rgba(255,200,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); for (const s of st) { const an = s.an + rot, x = cx + Math.cos(an) * s.d * R0, y = cy + Math.sin(an) * s.d * R0 * 0.45; c.fillStyle = hex(s.col, 0.55 * (1 - s.d * 0.6)); c.fillRect(x, y, s.r, s.r); } c.restore(); } }; },
    disk() { return { draw() { const cx = W / 2, cy = H * 0.4, R0 = Math.min(W, H) * 0.3; c.save(); c.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { c.strokeStyle = `rgba(255,${150 + k * 30},${60 + k * 30},${0.3 - k * 0.07})`; c.lineWidth = 10 - k * 3; c.beginPath(); c.ellipse(cx, cy, R0 * (1 + k * 0.18), R0 * (0.22 + k * 0.04), Math.sin(tt * 0.2) * 0.05, 0, TAU); c.stroke(); } const jet = c.createLinearGradient(cx, cy - H * 0.5, cx, cy + H * 0.5); jet.addColorStop(0, 'rgba(255,190,120,0)'); jet.addColorStop(0.5, 'rgba(255,190,120,.18)'); jet.addColorStop(1, 'rgba(255,190,120,0)'); c.fillStyle = jet; c.fillRect(cx - 3 - Math.sin(tt * 4), 0, 6, H); c.restore(); c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, R0 * 0.42, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,200,140,.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R0 * 0.44, 0, TAU); c.stroke(); } }; },
    hole() { const ps = []; return { init() { ps.length = 0; for (let i = 0; i < 160; i++) ps.push({ an: rnd(0, TAU), d: rnd(0.2, 1) }); }, draw() { const cx = W / 2, cy = H * 0.42, R0 = Math.min(W, H) * 0.42; for (const p of ps) { p.an += (0.6 / Math.max(0.15, p.d)) / 30; p.d -= 0.0016; if (p.d < 0.14) { p.d = 1; p.an = rnd(0, TAU); } const x = cx + Math.cos(p.an) * p.d * R0, y = cy + Math.sin(p.an) * p.d * R0 * 0.5; c.fillStyle = `rgba(210,200,255,${0.6 * (1 - p.d)})`; c.fillRect(x, y, 1.4, 1.4); } const gr = c.createRadialGradient(cx, cy, R0 * 0.1, cx, cy, R0 * 0.3); gr.addColorStop(0, '#000'); gr.addColorStop(0.75, '#000'); gr.addColorStop(0.85, 'rgba(200,180,255,.35)'); gr.addColorStop(1, 'rgba(200,180,255,0)'); c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R0 * 0.3, 0, TAU); c.fill(); } }; },
    runes(o) { const G = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'; return { draw() { const cx = W / 2, cy = H * 0.42, R0 = Math.min(W, H) * 0.42; c.save(); c.translate(cx, cy); c.strokeStyle = hex(o.col, 0.16); c.lineWidth = 1; c.beginPath(); c.arc(0, 0, R0, 0, TAU); c.arc(0, 0, R0 * 0.82, 0, TAU); c.stroke(); c.rotate(tt * 0.04); c.fillStyle = hex(o.col, 0.22); c.font = `${R0 * 0.1}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 0; i < 24; i++) { c.save(); c.rotate(i / 24 * TAU); c.fillText(G[i], 0, -R0 * 0.91); c.restore(); } c.rotate(-tt * 0.08); c.strokeStyle = hex(o.col, 0.1); for (let i = 0; i < 3; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, -R0 * 0.8); c.lineTo(R0 * 0.69, R0 * 0.4); c.lineTo(-R0 * 0.69, R0 * 0.4); c.closePath(); c.stroke(); } c.restore();
        const blink = Math.max(0.08, Math.abs(Math.sin(tt * 0.35)) > 0.97 ? 0.1 : 1), ew = R0 * 0.32, eh = R0 * 0.16 * blink; c.save(); c.translate(cx, cy); c.fillStyle = hex(o.col, 0.06); c.strokeStyle = hex(o.col, 0.3); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-ew, 0); c.quadraticCurveTo(0, -eh * 2, ew, 0); c.quadraticCurveTo(0, eh * 2, -ew, 0); c.fill(); c.stroke(); if (blink > 0.5) { c.fillStyle = hex('#a080ff', 0.35); c.beginPath(); c.arc(Math.sin(tt * 0.3) * ew * 0.25, 0, eh * 0.75, 0, TAU); c.fill(); c.fillStyle = hex('#000000', 0.6); c.beginPath(); c.arc(Math.sin(tt * 0.3) * ew * 0.25, 0, eh * 0.3, 0, TAU); c.fill(); } c.restore(); } }; },
    prism() { return { draw() { c.save(); c.globalCompositeOperation = 'lighter'; ['255,60,110', '60,255,160', '60,160,255'].forEach((rgb, i) => { const x = W / 2 + Math.sin(tt * 0.6 + i * 2.1) * W * 0.25, y = H * 0.4 + Math.cos(tt * 0.5 + i) * H * 0.1, r = Math.max(W, H) * 0.5; const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},.12)`); gr.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = gr; c.fillRect(0, 0, W, H); }); c.restore(); } }; },
    rec() { return { draw() { const on = Math.floor(tt * 1.4) % 2 === 0, y = H - 96; c.fillStyle = on ? 'rgba(255,70,70,.85)' : 'rgba(255,70,70,.2)'; c.beginPath(); c.arc(22, y, 5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '700 12px ui-monospace, monospace'; c.textBaseline = 'middle'; c.fillText('REC', 34, y); const s = Math.floor(tt), mm = String(Math.floor(s / 60) % 60).padStart(2, '0'), ss2 = String(s % 60).padStart(2, '0'); c.fillText('00:' + mm + ':' + ss2, 72, y); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1.5; const m = 14, L = 22;[[m, m + 64, 1, 1], [W - m, m + 64, -1, 1], [m, H - m - 70, 1, -1], [W - m, H - m - 70, -1, -1]].forEach(([x, yy, sx, sy]) => { c.beginPath(); c.moveTo(x, yy + sy * L); c.lineTo(x, yy); c.lineTo(x + sx * L, yy); c.stroke(); }); } }; },
    arrows() { const ar = []; return { init() { ar.length = 0; for (let i = 0; i < 12; i++) ar.push({ x: rnd(0, W), y: rnd(0, H), v: (i % 2 ? 1 : -1) * rnd(14, 34), s: rnd(12, 22) }); }, step(dt) { for (const a of ar) { a.x += a.v * dt; if (a.x > W + 30) a.x = -30; if (a.x < -30) a.x = W + 30; } }, draw() { c.font = '600 18px Lora, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (const a of ar) { c.fillStyle = a.v > 0 ? 'rgba(255,208,138,.5)' : 'rgba(138,208,255,.5)'; c.font = `600 ${a.s * 1.4}px Lora, serif`; c.fillText(a.v > 0 ? '→' : '←', a.x, a.y); } } }; },
    tv() { return { draw() { const on = Math.floor(tt * 0.9) % 2 === 0; c.fillStyle = 'rgba(255,240,210,.55)'; c.font = '700 13px ui-monospace, monospace'; c.textBaseline = 'middle'; c.fillText('PLAY ▶', 18, H - 96); if (on) c.fillText('17.10 · 08:00', W - 128, H - 96); const jy = ((tt * 0.23) % 1) * H; c.fillStyle = 'rgba(255,240,210,.05)'; c.fillRect(0, jy, W, 18); c.fillStyle = 'rgba(255,230,190,.08)'; for (let i = 0; i < 260; i++) c.fillRect(Math.random() * W, Math.random() * H, rnd(1, 3), 1); const gr = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.8); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); if (Math.sin(tt * 0.7) > 0.985) { c.fillStyle = 'rgba(255,240,210,.06)'; c.fillRect(0, 0, W, H); } } }; },
    leak() { return { draw() { c.save(); c.globalCompositeOperation = 'lighter'; const x = W * (0.85 + Math.sin(tt * 0.15) * 0.15), gr = c.createRadialGradient(x, H * 0.1, 0, x, H * 0.1, Math.max(W, H) * 0.7); gr.addColorStop(0, 'rgba(255,150,80,.16)'); gr.addColorStop(1, 'rgba(255,150,80,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.restore(); } }; },
    noise(o) { return { draw() { c.fillStyle = `rgba(255,240,220,${o.a})`; for (let i = 0; i < 160; i++) c.fillRect(Math.random() * W, Math.random() * H, 1, 1); } }; },
    sun() { return { draw() { const cx = W / 2, cy = H * 1.02, R0 = Math.min(W, H) * 0.34; c.save(); c.globalCompositeOperation = 'lighter'; const gr = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H)); gr.addColorStop(0, 'rgba(255,190,110,.45)'); gr.addColorStop(0.3, 'rgba(255,120,90,.14)'); gr.addColorStop(1, 'rgba(255,120,90,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); for (let i = 0; i < 14; i++) { const an = -Math.PI / 2 + (i / 13 - 0.5) * 2.6 + Math.sin(tt * 0.2 + i) * 0.02, w = 0.03, L = Math.hypot(W, H); const g2 = c.createRadialGradient(cx, cy, R0, cx, cy, L); g2.addColorStop(0, `rgba(255,210,130,${0.1 + 0.05 * Math.sin(tt + i)})`); g2.addColorStop(1, 'rgba(255,210,130,0)'); c.fillStyle = g2; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, L, an - w, an + w); c.closePath(); c.fill(); } c.restore(); c.fillStyle = 'rgba(255,214,140,.9)'; c.beginPath(); c.arc(cx, cy, R0, Math.PI, 0); c.fill(); } }; },
    moon(o) { return { draw() { const x = W * o.x, y = H * o.y, r = Math.min(W, H) * o.r; const gr = c.createRadialGradient(x, y, r * 0.8, x, y, r * (o.big ? 3 : 2.2)); gr.addColorStop(0, hex(o.col, 0.25)); gr.addColorStop(1, hex(o.col, 0)); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.fillStyle = hex(o.col, o.big ? 0.92 : 0.85); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.fillStyle = 'rgba(160,150,130,.25)';[[-0.3, -0.2, 0.18], [0.25, 0.1, 0.12], [-0.05, 0.35, 0.1], [0.35, -0.3, 0.08]].forEach(([dx, dy, rr]) => { c.beginPath(); c.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); c.fill(); }); } }; },
    candles() { return { draw() { const xs = [0.18, 0.5, 0.82]; xs.forEach((fx, i) => { const x = W * fx, y = H - 74, f = 0.85 + 0.15 * Math.sin(tt * (8 + i) + i) * Math.sin(tt * 3.3 + i * 2); const gr = c.createRadialGradient(x, y - 20, 0, x, y - 20, Math.min(W, H) * 0.5 * f); gr.addColorStop(0, `rgba(255,190,100,${0.28 * f})`); gr.addColorStop(1, 'rgba(255,190,100,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(240,226,200,.16)'; c.fillRect(x - 9, y - 4, 18, 80); c.save(); c.translate(x, y - 6); c.scale(1, f); c.fillStyle = 'rgba(255,200,110,.85)'; c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(7, -4, 0, 2); c.quadraticCurveTo(-7, -4, 0, -18); c.fill(); c.restore(); }); } }; },
    pair() { const tr = []; return { draw() { const cx = W / 2, cy = H * 0.42, R0 = Math.min(W, H) * 0.2; const a = tt * 0.9, p1 = [cx + Math.cos(a) * R0, cy + Math.sin(a * 1.3) * R0 * 0.6], p2 = [cx + Math.cos(a + Math.PI) * R0, cy + Math.sin(a * 1.3 + Math.PI) * R0 * 0.6]; tr.push([p1, p2]); if (tr.length > 40) tr.shift(); c.save(); c.globalCompositeOperation = 'lighter'; tr.forEach(([q1, q2], i) => { const k = i / tr.length; c.globalAlpha = k * 0.25; c.drawImage(glowSprite('#ff3a3a'), q1[0] - 10, q1[1] - 10, 20, 20); c.drawImage(glowSprite('#ffd8b0'), q2[0] - 10, q2[1] - 10, 20, 20); }); c.globalAlpha = 1; c.drawImage(glowSprite('#ff3a3a'), p1[0] - 46, p1[1] - 46, 92, 92); c.drawImage(glowSprite('#ffd8b0'), p2[0] - 46, p2[1] - 46, 92, 92); c.restore(); c.fillStyle = '#fff'; [p1, p2].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill(); }); } }; }
  };
  LIVE.words = () => { const W0 = ['…и тогда', 'послушай', 'говорят, внизу', 'а если', 'тише…', 'клянусь', 'поверь', 'ещё слово'], ws = []; let next = 0; return { draw() { if (tt > next) { next = tt + rnd(1.2, 2.4); ws.push({ t: tt, x: rnd(0.1, 0.7) * W, y: rnd(0.2, 0.9) * H, w: pick(W0) }); if (ws.length > 6) ws.shift(); } c.font = 'italic 400 17px Lora, serif'; c.textBaseline = 'middle'; for (const q of ws) { const k = (tt - q.t) / 5; if (k > 1) continue; c.fillStyle = `rgba(240,208,255,${Math.sin(k * Math.PI) * 0.4})`; c.fillText(q.w, q.x, q.y - k * 30); } } }; };
  const BAKED = ['veins', 'grain', 'cracks', 'grid', 'guilloche', 'vines', 'webs', 'halves', 'stars', 'bigglyph'];

  // circuit: бегущие импульсы по сетке
  LIVE.grid = (o) => { const pl = []; return { init() { pl.length = 0; for (let i = 0; i < 10; i++) pl.push({ x: Math.round(rnd(0, W) / 46) * 46, y: Math.round(rnd(0, H) / 46) * 46, d: pick([[1, 0], [0, 1], [-1, 0], [0, -1]]), k: 0 }); }, step(dt) { for (const p of pl) { p.x += p.d[0] * 90 * dt; p.y += p.d[1] * 90 * dt; p.k += 90 * dt; if (p.k >= 46) { p.k = 0; if (Math.random() < 0.4) p.d = pick([[1, 0], [0, 1], [-1, 0], [0, -1]]); } if (p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) { p.x = Math.round(rnd(0, W) / 46) * 46; p.y = Math.round(rnd(0, H) / 46) * 46; } } }, draw() { for (const p of pl) { c.drawImage(glowSprite(o.pulse), p.x - 10, p.y - 10, 20, 20); c.fillStyle = '#eafff6'; c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); } } }; };
  LIVE.webs = () => ({ draw() { const x = W * 0.86, len = H * 0.26 + Math.sin(tt * 0.6) * 30; c.strokeStyle = 'rgba(207,214,230,.35)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, len); c.stroke(); c.save(); c.translate(x, len + 6); c.fillStyle = '#16101e'; c.strokeStyle = '#16101e'; c.lineWidth = 1.3; c.beginPath(); c.ellipse(0, 0, 5, 6.5, 0, 0, TAU); c.fill(); c.beginPath(); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { c.moveTo(s * 4, -2 + i * 2); c.lineTo(s * 10, -6 + i * 4 + Math.sin(tt * 4 + i) * 1.5); } c.stroke(); c.fillStyle = '#ff7a2a'; c.beginPath(); c.arc(-1.6, -2.6, 1, 0, TAU); c.arc(1.6, -2.6, 1, 0, TAU); c.fill(); c.restore(); } });

  function build(id) {
    cur = T[id] || T.classic; layers = [];
    cur[5].forEach((o) => { if (o.t === 'p') layers.push(Particles(o)); else if (LIVE[o.t]) layers.push(LIVE[o.t](o)); });
    size(true);
  }
  function frame(now) {
    if (!run) return;
    requestAnimationFrame(frame);
    if (document.hidden) return;
    if (now - last < 32) return; // ~30 кадров в секунду — бережём батарею
    const dt = Math.min(0.1, (now - last) / 1000 || 0.03); last = now; tt += dt;
    draw(dt);
  }
  function draw(dt) {
    c.clearRect(0, 0, W, H);
    if (bg) c.drawImage(bg, 0, 0, W, H);
    for (const l of layers) { if (dt && l.step) l.step(dt); l.draw(); }
    drawBursts(dt || 0);
  }
  // ---------- вспышка частиц (бросок, тыква) ----------
  const bursts = [], rings = [];
  function burst(x, y, o) {
    if (!on || reduce || !cur) return; o = o || {};
    const cols = o.cols || [cur[1], cur[2], '#ffffff'], n = o.n || 28, pw = o.power || 320;
    for (let i = 0; i < n; i++) { const an = rnd(0, TAU), v = rnd(pw * 0.25, pw); bursts.push({ x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v - pw * 0.15, life: 0, max: rnd(0.6, 1.3), s: rnd(1.5, 4.5), col: pick(cols), star: Math.random() < 0.45 }); }
    if (o.ring !== false) rings.push({ x, y, t: 0, col: cols[0], w: o.ring === 2 ? 2 : 1 });
    while (bursts.length > 400) bursts.shift();
  }
  function drawBursts(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.life += dt; if (b.life > b.max) { bursts.splice(i, 1); continue; }
      b.vy += 220 * dt; b.vx *= 0.97; b.vy *= 0.97; b.x += b.vx * dt; b.y += b.vy * dt;
      c.globalAlpha = 1 - b.life / b.max;
      if (b.star) shape({ shape: 'star4' }, { x: b.x, y: b.y, s: b.s * 1.8, col: b.col });
      else { const g = glowSprite(b.col); c.drawImage(g, b.x - b.s * 3, b.y - b.s * 3, b.s * 6, b.s * 6); }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.t += dt; if (r.t > 0.9) { rings.splice(i, 1); continue; }
      c.globalAlpha = (1 - r.t / 0.9) * 0.8; c.strokeStyle = r.col; c.lineWidth = 3 * r.w * (1 - r.t); c.beginPath(); c.arc(r.x, r.y, 30 + r.t * 260 * r.w, 0, TAU); c.stroke();
    }
    c.globalAlpha = 1;
  }
  function palette(id) {
    const t = T[id] || T.classic, s = document.documentElement.style;
    s.setProperty('--brass', t[1]); s.setProperty('--teal', t[2]); s.setProperty('--bg', t[3]); s.setProperty('--glow', t[4]);
    document.documentElement.dataset.skin = T[id] ? id : 'classic';
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', t[3]);
  }
  let curId = null;
  function set(id) {
    id = T[id] ? id : 'classic';
    if (id === curId) return;
    const first = curId == null; curId = id;
    try { localStorage.setItem('ek_skin', id); } catch (e) {}
    if (first) { palette(id); build(id); start(); return; }
    cv.classList.add('out');
    setTimeout(() => { palette(id); build(id); tt = 0; cv.classList.remove('out'); if (!run) draw(0); }, 600);
  }
  function start() {
    if (!document.body.contains(cv)) document.body.prepend(cv);
    if (!on || reduce) { run = false; cv.classList.toggle('still', !on); draw(0); return; }
    cv.classList.remove('still');
    if (!run) { run = true; last = performance.now(); requestAnimationFrame(frame); }
  }
  addEventListener('resize', () => { if (cur && size() && !run) draw(0); });
  window.EkTheme = {
    set, burst, list: T, name: (id) => (T[id] || T.classic)[0], accent: () => (cur ? [cur[1], cur[2]] : ['#d9b26a', '#7fd1c7']),
    fx(v) { on = !!v; try { localStorage.setItem('ek_fx', on ? '1' : '0'); } catch (e) {} run = false; start(); },
    get fxOn() { return on; }
  };
  try { on = localStorage.getItem('ek_fx') !== '0'; } catch (e) {}
  let saved = 'classic'; try { saved = localStorage.getItem('ek_skin') || 'classic'; } catch (e) {}
  if (document.body) set(saved); else addEventListener('DOMContentLoaded', () => set(saved));
})();
