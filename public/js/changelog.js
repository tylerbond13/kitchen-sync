// Kitchen Sync changelog — newest first. Read by the in-game "What's new" modal
// (openChangelog in app.js). Regenerated from git history + BUILD_LOG.md; keep
// the newest release at the top and add an entry each release.
window.KS_CHANGELOG = [
  {
    "version": "1.24.0",
    "title": "Mobile overhaul — full-screen kitchen",
    "emoji": "📱",
    "category": "feature",
    "changes": [
      "The kitchen now fills your entire phone screen — the themed wallpaper covers everything, with no side rail and no dead margins.",
      "New floating HUD: timer top-left, pause top-right, order tickets across the top, and a bottom banner with your score, star progress with each cutoff marked, and now-playing music.",
      "Music, sound, and AI-Director buttons moved into the pause menu to keep the play screen clean.",
      "In-game order cards got a solid, readable look that works over any wallpaper.",
      "Menus are landscape-first on phones: the lobby is a sideways card pager (Levels first), the home screen is two panes, and the results screen fits on one screen — no more endless vertical scrolling."
    ]
  },
  {
    "version": "1.23.0",
    "title": "In-game \"What's new\" page",
    "emoji": "📋",
    "category": "feature",
    "changes": [
      "Added a What's new page listing every release — open it from the home screen or by tapping the version footer.",
      "The newest version is highlighted at the top so you can see what just changed.",
      "A little pink dot marks an unread release and clears once you've looked."
    ]
  },
  {
    "version": "1.22.2",
    "title": "Contextual shop toasts",
    "emoji": "🛒",
    "category": "polish",
    "changes": [
      "Shop purchases now give next-step guidance instead of a generic 'unlocked' message.",
      "Hiring the Sous-Chef tells you to teach it skills, then toggle it on for your next round.",
      "Teaching a skill reminds you it only kicks in once the bot is toggled on.",
      "Makes the hire → teach → toggle flow self-explanatory."
    ]
  },
  {
    "version": "1.22.1",
    "title": "AI teammate toggle fix",
    "emoji": "🐛",
    "category": "fix",
    "changes": [
      "Fixed a bug that silently broke the AI teammate On/Off toggle in the lobby.",
      "Restored the builder's board-size buttons and the tuning-slider live readouts.",
      "The character-switch modal now opens and closes properly instead of trapping you.",
      "Everything binds correctly again after the switcher was introduced."
    ]
  },
  {
    "version": "1.22.0",
    "title": "Milestones panel",
    "emoji": "🏅",
    "category": "feature",
    "changes": [
      "New Milestones panel with 12 goals spanning every progression system.",
      "Goals include first service, hiring help, mastering all bot skills, unlocking the full cast, clearing every level, and serving 100 / 500 meals.",
      "Each milestone shows a live progress bar and turns green with a checkmark when complete.",
      "The header tallies how many you've unlocked (X/12).",
      "Open it from 'See all milestones' under the lobby progress banner."
    ]
  },
  {
    "version": "1.21.2",
    "title": "Shop affordability cues",
    "emoji": "✨",
    "category": "polish",
    "changes": [
      "Items you can afford right now get a soft gold glow to catch your eye.",
      "Items you can't afford yet show exactly how much more to save.",
      "Turns the shop from a static price list into a visible savings goal."
    ]
  },
  {
    "version": "1.21.1",
    "title": "Coins-earned pill on results",
    "emoji": "🪙",
    "category": "polish",
    "changes": [
      "The results screen now shows how many coins your score just earned, plus your crew's running total.",
      "Makes it clear that score banks 1:1 as coins to spend in the shop.",
      "Closes the loop from score to coins to shop right at the moment of reward."
    ]
  },
  {
    "version": "1.21.0",
    "title": "First-run welcome card",
    "emoji": "👋",
    "category": "feature",
    "changes": [
      "New players get a one-time welcome card explaining the whole game loop in three lines.",
      "Cook to earn stars that unlock characters and open new levels.",
      "Bank coins to hire and train your AI Sous-Chef.",
      "Start with the Golden Girls and unlock the rest by playing.",
      "Dismisses for good with 'Let's cook' so it won't reappear."
    ]
  },
  {
    "version": "1.20.2",
    "title": "Level-unlock celebration",
    "emoji": "🔓",
    "category": "polish",
    "changes": [
      "When a round earns the first star on a level, a toast pops up announcing the newly unlocked level.",
      "Campaign progress is now visible the moment it happens instead of quietly un-greying in the roadmap.",
      "Never fires just from joining a crew."
    ]
  },
  {
    "version": "1.20.1",
    "title": "Character-unlock celebration",
    "emoji": "🎉",
    "category": "polish",
    "changes": [
      "Banking enough stars to unlock a character now throws a celebration toast on the results screen.",
      "Comes with an unlock chime and a little haptic buzz so progression actually feels rewarding.",
      "Handles unlocking several characters in a single round.",
      "No longer misfires on the initial page load."
    ]
  },
  {
    "version": "1.20.0",
    "title": "Progression dashboard",
    "emoji": "📊",
    "category": "feature",
    "changes": [
      "Added an at-a-glance progress banner at the top of the Levels card.",
      "Tracks stars earned, 3-star levels, characters unlocked, and Sous-Chef skills taught.",
      "Shows a 'next character' hint telling you exactly which chef unlocks next and how many stars away it is.",
      "Gives players clear goals across the whole progression."
    ]
  },
  {
    "version": "1.19.1",
    "title": "Juicier serve feedback",
    "emoji": "🎊",
    "category": "polish",
    "changes": [
      "Serving a dish now throws a coin shower — more coins the bigger the tip.",
      "A burst ring grows with your combo, plus confetti and a bigger gold score pop for VIP and big serves.",
      "Added a 'COMBO ×N!' flourish that escalates as you keep a streak going."
    ]
  },
  {
    "version": "1.19.0",
    "title": "In-lobby character switcher",
    "emoji": "🎭",
    "category": "feature",
    "changes": [
      "Added a 'Change character' button in the lobby that opens the full character grid as a modal.",
      "You can now switch characters mid-lobby, not just from the home screen.",
      "See what everyone's choosing — each character is badged with the crew members on it, updating live.",
      "Your own pick shows as a green 'You'.",
      "The same unlock gating applies in the modal."
    ]
  },
  {
    "version": "1.18.0",
    "title": "Level roadmap menu",
    "emoji": "🗺️",
    "category": "feature",
    "changes": [
      "The campaign level list is redesigned as a visual roadmap.",
      "Each world is a labelled stage with a dotted trail and its levels as compact map nodes.",
      "Every node shows its emoji, star progress, and name; locked levels show a lock icon.",
      "Your next objective gets a glowing 'you are here' marker.",
      "Far more scannable and game-like than the old vertical card list."
    ]
  },
  {
    "version": "1.17.0",
    "title": "Character unlock progression",
    "emoji": "🔒",
    "category": "feature",
    "changes": [
      "You now start with the Golden Girls plus the house Chef and Grandma Rose, and unlock the rest by banking stars.",
      "Every ~2 lifetime stars unlocks the next character in roster order.",
      "Locked characters are greyed out with a star-requirement hint; tapping one tells you how far off you are.",
      "Redesigned the character menu as a dense Smash-Bros-style grid — the whole roster readable at a glance.",
      "Each section header shows an unlock tally, like Sitcom Stars 3/14."
    ]
  },
  {
    "version": "1.16.0",
    "title": "AI Sous-Chef as earned progression",
    "emoji": "🤖",
    "category": "balance",
    "changes": [
      "The AI bot is no longer a free toggle — hire a Sous-Chef in the Kitchen Shop, then buy each skill separately.",
      "Teach it Chopping, Dishwashing, Cooking, Plating, and Delivery; it only does what you've taught it.",
      "Dropped the old Prep/Expo modes — the bot's behaviour now emerges from its skills.",
      "Shop is grouped into AI Sous-Chef and Kitchen Tools with prerequisite locks (Cooking needs Chopping, Delivery needs Plating).",
      "Reworked the useless Auto-Chopper powerup into a cheaper 2× board chop speed, and retuned costs so tools are a real progression."
    ]
  },
  {
    "version": "1.15.4",
    "title": "Tidier tutorial popup",
    "emoji": "📋",
    "category": "polish",
    "changes": [
      "The \"dishes to learn\" tutorial popup no longer crams everything together: the customer face, name, and steps now stack cleanly with room to breathe.",
      "Bigger face portrait and step badges matching the new order-ticket style.",
      "The Next button now hugs its label instead of stretching full-width."
    ]
  },
  {
    "version": "1.15.3",
    "title": "Redesigned order tickets",
    "emoji": "🎫",
    "category": "polish",
    "changes": [
      "Order cards are much easier to read at a glance: the customer's face is now a bigger, zoomed-in portrait so you can tell who's ordering.",
      "Each prep step (chop 🔪, boil 🍲, bake 🔥, fry 🍳) sits in its own bigger white badge so the steps read distinctly.",
      "The boil step now uses a steaming-pot icon that clearly means \"boil in a pot\".",
      "Deeper ticket background and stronger shadow for better contrast."
    ]
  },
  {
    "version": "1.15.2",
    "title": "Forgiving station taps",
    "emoji": "👆",
    "category": "fix",
    "changes": [
      "Tapping just above a station, or over the food floating on it, used to miss and make your chef walk instead.",
      "Stations now have a larger tap area covering their whole footprint plus the surface just above them, so near-misses still interact.",
      "Overlapping stations still resolve cleanly to the one in front."
    ]
  },
  {
    "version": "1.15.1",
    "title": "AI teammate modes explained",
    "emoji": "💬",
    "category": "content",
    "changes": [
      "A one-line description now sits under the lobby AI toggle so you know what each mode does.",
      "Prep chops, rescues, and washes; Expo cooks, plates, and serves whole orders on its own.",
      "The text updates live as you tap through the modes."
    ]
  },
  {
    "version": "1.15.0",
    "title": "Sous-Chef cooks: full solo cook levels",
    "emoji": "👨‍🍳",
    "category": "ai",
    "changes": [
      "The Expo bot now starts the cooks your orders need, so it can run soup, pizza, stew, sushi, and burger levels entirely on its own.",
      "It ferries the right inputs into idle pots, ovens, and pans, chopped onions to the pot for soup, dough plus tomato and cheese to the oven for pizza, and more.",
      "Smart about not over-producing: it only starts a cook when an order still needs one and won't over-chop.",
      "Works around tight-board situations (like soup needing three onions) so it doesn't get stuck.",
      "Solo test run: it cooked and served 5 soups on Soup's On by itself."
    ]
  },
  {
    "version": "1.14.1",
    "title": "Fix see-through character and plate sprites",
    "emoji": "🎨",
    "category": "art",
    "changes": [
      "Pale artwork, like white dish-rack plates and light characters such as Marilyn Monroe, no longer turns partly transparent so you could see the background through them.",
      "Background removal was eating into the sprite bodies; it now trims only the studio backdrop and cleans the edges, leaving the art solid.",
      "Marilyn went from 70% see-through to fully solid, and colored characters still key cleanly."
    ]
  },
  {
    "version": "1.14.0",
    "title": "Sous-Chef Expo mode: it plates and serves",
    "emoji": "🍽️",
    "category": "ai",
    "changes": [
      "The lobby toggle now cycles Off → Prep 🔪 → Expo 🍽️.",
      "Expo mode turns the bot into an expediter: it assembles orders on plates from whatever's ready and serves them itself.",
      "On chop-only recipes like salads it can run the whole level solo (served 12 salads on Salad Days on its own).",
      "For cooked dishes it plates and serves them as your crew stages them.",
      "Prep mode no longer stands idle when boards are full: it clears finished chops onto counters so it always has something useful to do."
    ]
  },
  {
    "version": "1.13.2",
    "title": "Fill-count badges on cookers",
    "emoji": "🔢",
    "category": "feature",
    "changes": [
      "Pots, ovens, and mixers now show a live 0/1/2/3 count while you're loading them, so you can tell at a glance how many ingredients are already in.",
      "The count hands off to the progress bar once cooking starts.",
      "Empty pots keep their proper empty look."
    ]
  },
  {
    "version": "1.13.1",
    "title": "Station contents always readable",
    "emoji": "👀",
    "category": "fix",
    "changes": [
      "A chef or the AI bot standing in front of a board, counter, or pot no longer hides what's on it.",
      "Ingredients and their state (chopped, cooking, done) now always draw on top, so you can always read the surface you're working with."
    ]
  },
  {
    "version": "1.13.0",
    "title": "Sous-Chef rescue mode",
    "emoji": "🛟",
    "category": "ai",
    "changes": [
      "The Sous-Chef now rescues cooked food, pulling finished dishes off the stove, pot, or oven right before they burn.",
      "It stages the rescued dish on a free counter for you to plate, saving one of the biggest sources of lost points on cook-heavy levels.",
      "Only acts when it has somewhere to set the dish down, so it never gets stuck holding food."
    ]
  },
  {
    "version": "1.12.0",
    "title": "Meet the Sous-Chef: your new AI teammate",
    "emoji": "🤖",
    "category": "ai",
    "changes": [
      "Flip the new \"🤖 AI teammate\" toggle in the lobby and a Sous-Chef bot chef joins your round as an extra player.",
      "It focuses on prep: keeping the cutting boards stocked with the chopped ingredients your open orders need.",
      "Understands cook recipes too, chopping onions for soup, tomato and cheese for pizza, patties for burgers, and so on.",
      "Washes dishes when the clean-plate stack runs low.",
      "Never grabs plates or serves, so it can't steal your dishes or trip you up, and it only preps what's actually in demand."
    ]
  },
  {
    "version": "1.11.0",
    "title": "Star Recalibration & Tyler's Salad Bar",
    "emoji": "⭐",
    "category": "balance",
    "changes": [
      "Recalibrated the star goals on every level against real playtest scores, so 1, 2 and 3 stars now line up with what's actually achievable at the new order pacing",
      "New bonus level, Tyler's Salad Bar, in a fresh Bonus Kitchen section — a free-form crowd-built board that's always unlocked and ready to play",
      "The bonus level runs at the fast tuning it was built and scored on, so a 3-star finish sits just under the record run"
    ]
  },
  {
    "version": "1.10.0",
    "title": "Order Pacing Rebalance & Anyone Can Start",
    "emoji": "⚖️",
    "category": "balance",
    "changes": [
      "Rebalanced how fast orders arrive across every campaign level, with each dish type getting its own cadence for a fairer, more consistent rush",
      "Every level now runs on a 60-second order timer with up to 5 open orders at once",
      "Tuned default chef speed and character size for the campaign",
      "Any crew member can now start a level or custom round — no more waiting on just the host (board editing stays host-only)"
    ]
  },
  {
    "version": "1.9.1",
    "title": "Four New Chefs & Docs Rescue",
    "emoji": "🎭",
    "category": "content",
    "changes": [
      "Added four new character portraits: Mike Tyson, Mrs. Doubtfire, Judge Judy and Napoleon Dynamite",
      "Recovered project design and how-it-works documentation that had gone missing"
    ]
  },
  {
    "version": "1.9.0",
    "title": "AI Director in Play",
    "emoji": "📊",
    "category": "ai",
    "changes": [
      "The AI Director now plugs into live games — capturing what's happening in your kitchen as telemetry",
      "Added an on-screen Director HUD overlay and a training pipeline behind the scenes",
      "Groundwork for the AI reading real matches and eventually offering smarter assistance"
    ]
  },
  {
    "version": "1.8.2",
    "title": "Multi-Countertop Art",
    "emoji": "🖼️",
    "category": "art",
    "changes": [
      "Added new counter artwork for kitchens with runs of multiple countertops, for cleaner, better-connected worktops"
    ]
  },
  {
    "version": "1.8.1",
    "title": "Dish Rack & Sink Count Art",
    "emoji": "🖼️",
    "category": "art",
    "changes": [
      "Added dedicated artwork for the dish rack and sink so their clean and dirty counts read more clearly in the kitchen"
    ]
  },
  {
    "version": "1.8.0",
    "title": "AI Lab",
    "emoji": "🧠",
    "category": "ai",
    "changes": [
      "New AI Lab, opened from the home screen, showcasing a neural network built entirely from scratch with no ML libraries",
      "Self-Taught Chef: watch a reinforcement-learning agent teach itself the cook-and-serve loop from rewards alone, with a live reward curve and a view of the network thinking",
      "AI Director: reads live kitchen telemetry to predict failure risk and suggest the next best action, with gauges, charts and difficulty calls",
      "Reward sliders let you nudge the AI chef toward a role — an early seed of a future AI teammate",
      "Fixed a background bug where visiting a sub-page could break the cached app"
    ]
  },
  {
    "version": "1.7.1",
    "title": "Plain HD Station Art",
    "emoji": "🎨",
    "category": "art",
    "changes": [
      "Cutting boards, ovens, stockpots, mixers, plating and serve counters, plus icing and garnish stations all get crisp new plain HD artwork outside Cake World",
      "Kitchens now use each theme's painted wall illustration as a full backdrop over a glossy checkerboard floor",
      "Objects and characters are grounded with soft contact shadows, and recipe cards get bigger ingredient icons"
    ]
  },
  {
    "version": "1.7.0",
    "title": "Clean-Plate Rack, Sturdier Taps & Edit Chef",
    "emoji": "🍽️",
    "category": "feature",
    "changes": [
      "The clean-plate badge on the dish rack now actually shows up, alongside the dirty count on the sink",
      "Hardened the replay tap fix so double-firing taps can't come back through any path, even after finishing and reopening a level",
      "New Edit Chef button in the lobby lets you swap your character without leaving your kitchen or getting dropped into a new random one",
      "Celebrity chefs now lead the picker, with House Specials moved to the bottom"
    ]
  },
  {
    "version": "1.6.1",
    "title": "Replay Tap Fix",
    "emoji": "🐛",
    "category": "fix",
    "changes": [
      "Fixed a bug where replaying a level made every tap fire twice, which cancelled itself out on counters (you couldn't pick up anything you'd just put down)",
      "Taps now register exactly once on every replay — no more refreshing the page to unstick it"
    ]
  },
  {
    "version": "1.6.0",
    "title": "One-Tap Dishwashing & Live Plate Counts",
    "emoji": "🧼",
    "category": "balance",
    "changes": [
      "Washing up is now one dish per tap — stand at the sink and tap to scrub a single plate, so you never get locked into scrubbing the whole pile at once",
      "Once a dish finishes you're free to walk away immediately, no need to tap off the station first",
      "The dish rack now shows your clean-plate count and the sink shows how many are still dirty, so you can see your stock at a glance",
      "The Dish-Bot upgrade still keeps washing on its own in the background"
    ]
  },
  {
    "version": "1.5.1",
    "title": "Soundboard clips organized by context",
    "emoji": "🔊",
    "category": "content",
    "changes": [
      "Reorganized the character soundboard clips into per-show, per-character folders behind the scenes",
      "Sets up voice lines to be picked more reliably for each character and moment"
    ]
  },
  {
    "version": "1.5.0",
    "title": "Themed room wallpapers",
    "emoji": "🖼️",
    "category": "content",
    "changes": [
      "Nine new full-room scene backdrops in the Level Builder's background picker: Brady Bunch kitchen, Cheers bar, Golden Girls, I Love Lucy, Seinfeld, Willy Wonka's chocolate room, Oz technicolor, Mediterranean market, and Warm Sage",
      "Pick a wallpaper in the builder and it applies as your board's backdrop",
      "Fixed the default 'wood' board backdrop that was failing to load and falling back to a flat beige"
    ]
  },
  {
    "version": "1.4.2",
    "title": "Cake World art tidy-up",
    "emoji": "🧁",
    "category": "art",
    "changes": [
      "Wired up art that existed but was never shown in Cake World's 'Sweet Beginnings' level: the Mixing Bowl, Icing Dispenser, and Garnish Counter now use their real sprites instead of plain counters",
      "Cake pantry ingredients (flour, eggs, chocolate, honeycomb) and their crates replace the old emoji placeholders",
      "Ambient Cake World decor — rug, mascot, wall sconces, bees, butterflies — now draws in the scene",
      "Reorganized the cake-world asset library into tidy folders behind the scenes"
    ]
  },
  {
    "version": "1.4.1",
    "title": "Tight-lane stations work again",
    "emoji": "🔧",
    "category": "fix",
    "changes": [
      "Fixed wall-hugging counters and boards on narrow one-lane levels becoming unresponsive to taps",
      "You can once again place, grab, and chop at these stations, while sprinting past counters in a corridor still won't grab items by accident"
    ]
  },
  {
    "version": "1.4.0",
    "title": "Bigger chefs, richer builder & smarter voices",
    "emoji": "🎨",
    "category": "feature",
    "changes": [
      "Chefs and customers now render twice as big by default, with the kitchen spaced out so they fit",
      "Level Builder gains a Look & feel card: a character-size slider and a background wallpaper picker, plus a live mini-preview that shows your board exactly as it'll play",
      "Voice lines now match the moment — a pleased line on a delivery, an exasperated yell when you burn or miss an order",
      "Saved boards become their own playable levels under 'Your Kitchens', and edits to built-in levels save a per-crew version you can revert or delete",
      "Custom boards and edits ride along in device backups so they survive server data loss"
    ]
  },
  {
    "version": "1.3.1",
    "title": "Stations face into the room",
    "emoji": "↔️",
    "category": "art",
    "changes": [
      "Counters, chopping boards, ovens, plate stacks, serve counters, sinks and trash now use directional art, so pieces on the left and right walls turn to face the kitchen",
      "Applies to their busy and dirty states too, making the room read more naturally"
    ]
  },
  {
    "version": "1.3.0",
    "title": "Drag-and-drop level building",
    "emoji": "🛠️",
    "category": "feature",
    "changes": [
      "Build levels by touch or mouse: tap to place a piece, drag a placed piece to move it, or drag across the floor to paint",
      "New Facing brush lets you point each station Front, Left, or Right, with an arrow shown in the editor",
      "Facing choices save with your boards"
    ]
  },
  {
    "version": "1.2.0",
    "title": "Grouped customer picker & saved boards",
    "emoji": "💾",
    "category": "feature",
    "changes": [
      "Save your custom boards to your kitchen code so they stick around between sessions, ready to reload and share with your crew",
      "Level Builder's customer picker now mirrors the main menu groups (House Specials, Sitcom Stars, Politics & Royals…) with Add all / Remove all per group",
      "Fixed a bug where walking past the trash bin while carrying a plate could accidentally throw your food away"
    ]
  },
  {
    "version": "1.1.3",
    "title": "Customers you can actually see",
    "emoji": "👥",
    "category": "fix",
    "changes": [
      "Waiting customers no longer show up as just a shadow",
      "The line of diners is now drawn from the full character roster — the same faces you can pick to play as"
    ]
  },
  {
    "version": "1.1.2",
    "title": "Diner kitchens look like diners",
    "emoji": "🍳",
    "category": "fix",
    "changes": [
      "Stations and ingredients in diner levels now show the right art — stoves are stoves, not mixers",
      "Fixed diner boards that were mistakenly rendering with cake-shop sprites"
    ]
  },
  {
    "version": "1.1.1",
    "title": "Orders read as diner food again",
    "emoji": "🥗",
    "category": "fix",
    "changes": [
      "Order tickets now correctly show diner dishes like salads and burgers instead of leftover cake names",
      "Restored all 13 diner recipe names and the 6 diner dish names, complete with their proper food emoji"
    ]
  }
];
