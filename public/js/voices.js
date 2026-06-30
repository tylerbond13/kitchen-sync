// Soundboard clips: random spoken lines, grouped by mood so the game reacts in
// character. Most clips are just "funny" (greetings, character select); the
// rude/exasperated ones are reserved for screw-ups — burning food, missing an
// order, or a rejected hand-off — so messing up earns a clip yelling at you.
// Clips live in public/assets/audio/soundboard-clips/ and are listed in
// that folder's manifest.json (regenerate with `npm run voices`). No clips? Every
// call below is a graceful no-op, so nothing breaks.
(function () {
  const BASE = 'assets/audio/soundboard-clips/';
  let unlocked = false;
  let el = null;           // single shared channel (a new clip cuts the last)
  let lastAt = 0;

  // Mood tags. A clip not named here lands in the general "funny" pool (used for
  // character select and as a fallback). Re-tag a clip by adding its filename;
  // brand-new clips keep working as general clips until you sort them.
  const ANGRY = [           // exasperated / insulting / panic — played on screw-ups
    'dirt-bag.mp3',
    'hi-blanche-eat-dirt-and-die-trash.mp3',
    'you-re-a-furry-little-gnome-and-we-feed-you-too-much.mp3',
    'honey-you-need-professional-help.mp3',
    'good-night-rose-go-to-sleep-sweetheart-pray-for-brains.mp3',
    'you-ll-have-to-excuse-my-mother-she-suffered-a-slight-stroke-a-few-years-ago-which-rendered-her-totally-annoying.mp3',
    'oh-shit.mp3',
    'i-am-sick.mp3',
    'as-i-hold-this-cold-meat-i-m-reminded-of-winston-god-rest-his-soul.mp3',
    'mrs-doubtfire-help-us-he-s-choking-help-is-on-the-way-dear.mp3',
    'wizard-of-ass.mp3',
  ];
  const HAPPY = [           // pleased / food-praise / relief — played on a delivery
    'dinner-is-served-madam.mp3',
    'oh-sophia-that-smells-heavenly-is-it-chef-boyardee-audience-laughing-stick-it-in-my-heart-rose-it-ll-hurt-less.mp3',
    'that-would-make-my-day-he-is-such-a-stud-muffin.mp3',
    'looks-just-like-oregano-doesn-t-it.mp3',
    'better-late-than-pregnant-better-late-than-pregnant-not-pregnant-late-period.mp3',
    'golden-girls.mp3',
    'golden-girls-condoms-rose-long.mp3',
    'golden-girls-condoms-rose-short.mp3',
    'golden-girls-sardines.mp3',
    'can-i-ask-a-dumb-question-better-than-anyone-i-know.mp3',
    'hello.mp3',
  ];

  // Pools are filtered against the manifest at load, so a clip only ever plays
  // if its file actually shipped. `funny` = everything not tagged above.
  const pools = { all: [], angry: [], happy: [], funny: [] };
  function fileName(clipPath) {
    return String(clipPath || '').split('/').pop();
  }
  function buildPools(list) {
    const pathFor = (f) => list.find((clipPath) => fileName(clipPath) === f);
    pools.all = list.slice();
    pools.angry = ANGRY.map(pathFor).filter(Boolean);
    pools.happy = HAPPY.map(pathFor).filter(Boolean);
    const tagged = new Set([...ANGRY, ...HAPPY]);
    pools.funny = list.filter((clipPath) => !tagged.has(fileName(clipPath)));
  }

  fetch('/' + BASE + 'manifest.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => buildPools(Array.isArray(list) ? list : []))
    .catch(() => { /* no manifest yet — stay silent */ });

  // Clips are sound-effects: honour the SFX mute toggle, and wait for the first
  // user gesture (browser autoplay policy) before any clip can play.
  function audible() {
    if (!unlocked) return false;
    if (window.SFX && SFX.isMuted && SFX.isMuted()) return false;
    return true;
  }
  function channel() {
    if (!el) { el = new Audio(); el.preload = 'auto'; }
    return el;
  }
  // Play a random clip from a mood pool (falling back to the full pool, then to
  // the funny pool), with a min-gap so rapid-fire events don't machine-gun.
  function playFrom(poolName, minGap) {
    if (!audible()) return;
    const list = (pools[poolName] && pools[poolName].length) ? pools[poolName]
      : (pools.all.length ? pools.all : pools.funny);
    if (!list || !list.length) return;
    const now = Date.now();
    if (now - lastAt < (minGap || 120)) return;   // de-dupe rapid-fire triggers
    lastAt = now;
    const name = list[(Math.random() * list.length) | 0];
    try {
      const a = channel();
      a.pause();
      a.src = '/' + BASE + name.split('/').map(encodeURIComponent).join('/');
      a.currentTime = 0;
      a.volume = 0.95;
      a.play().catch(() => {});
    } catch (_) { /* best-effort */ }
  }

  const unlock = () => { unlocked = true; };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });

  // The chefKey args are ignored (pools are global) but kept so existing call
  // sites keep working.
  window.KSVoices = {
    has() { return pools.all.length > 0; },
    playSelect() { playFrom('funny'); },        // random funny line on character pick
    playDelivery() { playFrom('happy', 900); }, // pleased line when a meal lands
    playFail() { playFrom('angry', 900); },     // someone yells when you screw up
    play() { playFrom('all'); },
  };
})();
