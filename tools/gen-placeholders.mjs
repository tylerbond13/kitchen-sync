// Generates bundled .svg placeholder sprites for every asset in the manifest,
// so the image-only renderer is never blank before real PNGs are dropped in.
// Run:  node tools/gen-placeholders.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// key → [ relativePngPath, emoji, label, accent, kind ]
//   kind: sprite (disc behind), tile (full bleed), char (ground shadow),
//         station (rounded card), bubble, heart, heart_empty, wall, floor
const A = (p, e, l, accent, kind = 'sprite') => ({ p, e, l, accent, kind });
const M = {
  // characters
  chef:             A('characters/chef.png',            '🧑‍🍳', 'Chef',        '#FF6FAE', 'char'),
  // customers
  grandma_rose:     A('customers/grandma_rose.png',     '👵',  'Grandma Rose','#C77DD6', 'char'),
  influencer:       A('customers/influencer.png',       '💁‍♀️','Influencer',  '#FF6FAE', 'char'),
  workhorse:        A('customers/workhorse.png',        '👷',  'Workhorse',   '#5B83B0', 'char'),
  socialite:        A('customers/socialite.png',        '💃',  'Socialite',   '#A24FC0', 'char'),
  kid:              A('customers/kid.png',              '🧒',  'Kid',         '#5BB0E0', 'char'),
  // stations
  counter:          A('stations/counter.png',           '',    '',            '#E8D8B8', 'counter'),
  chopping_board:   A('stations/chopping_board.png',    '🔪',  'Chop',        '#D8C088', 'station'),
  stove:            A('stations/stove.png',             '🍳',  'Stove',       '#7A8290', 'station'),
  pot:              A('stations/pot.png',               '🍲',  'Pot',         '#8A92A2', 'station'),
  oven:             A('stations/oven.png',              '🔥',  'Oven',        '#8890A0', 'station'),
  plate_stack:      A('stations/plate_stack.png',       '🍽️', 'Plates',      '#EEF0F4', 'station'),
  serve_window:     A('stations/serve_window.png',      '🛎️', 'Serve',       '#5BD9A0', 'station'),
  trash:            A('stations/trash.png',             '🗑️', 'Trash',       '#9AA0A8', 'station'),
  sink:             A('stations/sink.png',              '🚰',  'Sink',        '#9AD0E8', 'station'),
  // ingredients
  lettuce:          A('ingredients/lettuce.png',        '🥬',  '',            '#7FC24A'),
  lettuce_chopped:  A('ingredients/lettuce_chopped.png','🥬',  '',            '#7FC24A', 'chop'),
  tomato:           A('ingredients/tomato.png',         '🍅',  '',            '#E8503A'),
  tomato_chopped:   A('ingredients/tomato_chopped.png', '🍅',  '',            '#E8503A', 'chop'),
  cucumber:         A('ingredients/cucumber.png',       '🥒',  '',            '#5FA83A'),
  cucumber_chopped: A('ingredients/cucumber_chopped.png','🥒', '',            '#5FA83A', 'chop'),
  onion:            A('ingredients/onion.png',          '🧅',  '',            '#D9A05A'),
  onion_chopped:    A('ingredients/onion_chopped.png',  '🧅',  '',            '#D9A05A', 'chop'),
  cheese:           A('ingredients/cheese.png',         '🧀',  '',            '#F2C14E'),
  cheese_chopped:   A('ingredients/cheese_chopped.png', '🧀',  '',            '#F2C14E', 'chop'),
  potato:           A('ingredients/potato.png',         '🥔',  '',            '#C8A45A'),
  carrot:           A('ingredients/carrot.png',         '🥕',  '',            '#E88A30'),
  bun:              A('ingredients/bun.png',            '🍞',  '',            '#D9A664'),
  patty:            A('ingredients/patty.png',          '🥩',  '',            '#C05A4A'),
  patty_cooked:     A('ingredients/patty_cooked.png',   '🍖',  '',            '#8A4A2A', 'cook'),
  rice:             A('ingredients/rice.png',           '🍚',  '',            '#EFEFE6'),
  fish:             A('ingredients/fish.png',           '🐟',  '',            '#6AB0D0'),
  fish_sashimi:     A('ingredients/fish_sashimi.png',   '🍣',  '',            '#F08AA0', 'chop'),
  seaweed:          A('ingredients/seaweed.png',        '🌿',  '',            '#3F8A4A'),
  dough:            A('ingredients/dough.png',          '🫓',  '',            '#E8D8B0'),
  milk:             A('ingredients/milk.png',           '🥛',  '',            '#EDEDF2'),
  cocoa:            A('ingredients/cocoa.png',          '🍫',  '',            '#7A4A2A'),
  pineapple:        A('ingredients/pineapple.png',      '🍍',  '',            '#E8C040'),
  strawberry:       A('ingredients/strawberry.png',     '🍓',  '',            '#E8405A'),
  banana:           A('ingredients/banana.png',         '🍌',  '',            '#F0D040'),
  tortilla:         A('ingredients/tortilla.png',       '🌮',  '',            '#E0B060'),
  plate:            A('ingredients/plate.png',          '🍽️', '',            '#FFFFFF', 'plate'),
  // dishes
  salad:            A('dishes/salad.png',               '🥗',  '',            '#7FC24A'),
  big_salad:        A('dishes/big_salad.png',           '🥙',  '',            '#9FB24A'),
  burger:           A('dishes/burger.png',              '🍔',  '',            '#D98A3A'),
  cheeseburger:     A('dishes/cheeseburger.png',        '🍔',  '',            '#E0A030'),
  soup_onion:       A('dishes/soup_onion.png',          '🥣',  '',            '#D9A05A'),
  soup_tomato:      A('dishes/soup_tomato.png',         '🍲',  '',            '#E8503A'),
  sushi:            A('dishes/sushi.png',               '🍣',  '',            '#F08AA0'),
  pizza:            A('dishes/pizza.png',               '🍕',  '',            '#E8A030'),
  stew:             A('dishes/stew.png',                '🥘',  '',            '#C07A3A'),
  cocoa_dish:       A('dishes/cocoa.png',               '☕',  '',            '#7A4A2A'),
  juice:            A('dishes/juice.png',               '🍹',  '',            '#F0708A'),
  poke:             A('dishes/poke.png',                '🥗',  '',            '#6AB0A0'),
  fish_taco:        A('dishes/fish_taco.png',           '🌮',  '',            '#E0B060'),
  burned:           A('dishes/burned.png',              '🪨',  '',            '#555555'),
  // env
  floor:            A('env/floor.png',                  '',    '',            '#E8C8A8', 'floor'),
  wall:             A('env/wall.png',                   '',    '',            '#FF9EC8', 'wall'),
  // ui
  speech_bubble:    A('ui/speech_bubble.png',           '',    '',            '#FFFFFF', 'bubble'),
  heart:            A('ui/heart.png',                   '',    '',            '#FF4D6D', 'heart'),
  heart_empty:      A('ui/heart_empty.png',             '',    '',            '#00000022','heart_empty'),
};

const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');

function svgFor({ e, l, accent, kind }) {
  const W = 256, H = 256, cx = 128, cy = 128;
  const shadow = `<defs><filter id="ds" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity="0.22"/></filter>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${shade(accent,-0.22)}"/></linearGradient></defs>`;
  const emoji = (sz, dy = 0) =>
    `<text x="${cx}" y="${cy + dy}" font-size="${sz}" text-anchor="middle" dominant-baseline="central"
       font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${esc(e)}</text>`;
  const label = l
    ? `<text x="${cx}" y="232" font-size="26" font-weight="800" text-anchor="middle"
         fill="#fff" stroke="${shade(accent,-0.4)}" stroke-width="0.6" paint-order="stroke"
         font-family="ui-rounded,system-ui,sans-serif">${esc(l)}</text>` : '';
  const knife = `<text x="196" y="78" font-size="64" text-anchor="middle" dominant-baseline="central"
       font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">🔪</text>`;
  const steam = `<text x="196" y="70" font-size="60" text-anchor="middle" dominant-baseline="central"
       font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">♨️</text>`;

  let body;
  switch (kind) {
    case 'station':
      body = `${shadow}<rect x="26" y="34" rx="34" ry="34" width="204" height="188" fill="url(#g)"
        stroke="${shade(accent,-0.42)}" stroke-width="7" filter="url(#ds)"/>
        <rect x="40" y="48" rx="22" width="176" height="40" fill="#ffffff" opacity="0.18"/>
        ${emoji(118,-6)}${label}`;
      break;
    case 'char':
      // No baked-in name text — the engine handles labels; customers stay nameless.
      body = `${shadow}<ellipse cx="${cx}" cy="236" rx="78" ry="15" fill="#000" opacity="0.18"/>
        ${emoji(196,-6)}`;
      break;
    case 'sprite':
      body = `${shadow}<circle cx="${cx}" cy="${cy}" r="96" fill="#fff" opacity="0.92" filter="url(#ds)"/>
        <circle cx="${cx}" cy="${cy}" r="96" fill="none" stroke="${shade(accent,-0.2)}" stroke-width="5"/>
        ${emoji(150)}`;
      break;
    case 'chop':
      body = `${shadow}<circle cx="${cx}" cy="${cy}" r="96" fill="#fff" opacity="0.92" filter="url(#ds)"/>
        <circle cx="${cx}" cy="${cy}" r="96" fill="none" stroke="${shade(accent,-0.2)}" stroke-width="5"/>
        ${emoji(140)}${knife}`;
      break;
    case 'cook':
      body = `${shadow}<circle cx="${cx}" cy="${cy}" r="96" fill="#fff" opacity="0.92" filter="url(#ds)"/>
        <circle cx="${cx}" cy="${cy}" r="96" fill="none" stroke="${shade(accent,-0.2)}" stroke-width="5"/>
        ${emoji(140)}${steam}`;
      break;
    case 'plate':
      body = `${shadow}<ellipse cx="${cx}" cy="150" rx="104" ry="50" fill="#fff" filter="url(#ds)"/>
        <ellipse cx="${cx}" cy="150" rx="104" ry="50" fill="none" stroke="#d8d0dc" stroke-width="5"/>
        <ellipse cx="${cx}" cy="144" rx="66" ry="30" fill="#f1ecf4"/>`;
      break;
    case 'counter':
      body = `<rect x="0" y="86" width="256" height="120" fill="${accent}"/>
        <rect x="0" y="86" width="256" height="22" fill="#fff" opacity="0.35"/>
        <rect x="0" y="150" width="256" height="56" fill="${shade(accent,-0.18)}"/>
        <rect x="0" y="200" width="256" height="6" fill="${shade(accent,-0.4)}"/>`;
      break;
    case 'floor': {
      const a = accent, b = shade(accent, -0.1);
      body = `<rect width="256" height="256" fill="${a}"/>
        <rect width="128" height="128" fill="${b}"/><rect x="128" y="128" width="128" height="128" fill="${b}"/>
        <rect width="256" height="256" fill="none" stroke="${shade(accent,-0.22)}" stroke-width="2"/>`;
      break;
    }
    case 'wall':
      body = `<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${shade(accent,-0.16)}"/></linearGradient></defs>
        <rect width="256" height="256" fill="url(#wg)"/>
        <rect y="210" width="256" height="46" fill="${shade(accent,-0.3)}"/>
        <rect y="206" width="256" height="6" fill="#fff" opacity="0.3"/>`;
      break;
    case 'bubble':
      body = `${shadow}<rect x="14" y="14" rx="46" ry="46" width="228" height="150" fill="#fff"
        stroke="#E6D8E8" stroke-width="6" filter="url(#ds)"/>
        <path d="M104 158 L152 158 L120 214 Z" fill="#fff" stroke="#E6D8E8" stroke-width="6" stroke-linejoin="round"/>
        <rect x="104" y="150" width="48" height="16" fill="#fff"/>`;
      break;
    case 'heart':
      body = `${shadow}<path filter="url(#ds)" fill="#FF4D6D" stroke="#C81E4A" stroke-width="9" stroke-linejoin="round"
        d="M128 214 C40 150 40 70 92 70 C116 70 128 92 128 92 C128 92 140 70 164 70 C216 70 216 150 128 214 Z"/>
        <ellipse cx="100" cy="110" rx="16" ry="10" fill="#fff" opacity="0.5"/>`;
      break;
    case 'heart_empty':
      body = `<path fill="#00000010" stroke="#0000002e" stroke-width="9" stroke-linejoin="round"
        d="M128 214 C40 150 40 70 92 70 C116 70 128 92 128 92 C128 92 140 70 164 70 C216 70 216 150 128 214 Z"/>`;
      break;
    default:
      body = emoji(150);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>\n`;
}

// lighten/darken a #rrggbb hex
function shade(hex, amt) {
  const h = hex.replace('#', '').slice(0, 6).padEnd(6, '0');
  const f = (i) => {
    const v = parseInt(h.substr(i, 2), 16);
    return Math.max(0, Math.min(255, Math.round(v + amt * 255)))
      .toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(2)}${f(4)}`;
}

let n = 0;
for (const key of Object.keys(M)) {
  const m = M[key];
  const out = resolve(ROOT, 'assets/images', m.p.replace(/\.png$/, '.svg'));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svgFor(m));
  n++;
}
console.log(`Wrote ${n} placeholder sprites under public/assets/images/`);
