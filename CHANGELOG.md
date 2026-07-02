# Kitchen Sync — Changelog

Every release, newest first. Also viewable in-game via **📋 What's new** on the home screen (or by tapping the version footer).

## v1.23.0 — 📋 In-game "What's new" page  
_Feature_

- Added a What's new page listing every release — open it from the home screen or by tapping the version footer.
- The newest version is highlighted at the top so you can see what just changed.
- A little pink dot marks an unread release and clears once you've looked.

## v1.22.2 — 🛒 Contextual shop toasts  
_Polish_

- Shop purchases now give next-step guidance instead of a generic 'unlocked' message.
- Hiring the Sous-Chef tells you to teach it skills, then toggle it on for your next round.
- Teaching a skill reminds you it only kicks in once the bot is toggled on.
- Makes the hire → teach → toggle flow self-explanatory.

## v1.22.1 — 🐛 AI teammate toggle fix  
_Fix_

- Fixed a bug that silently broke the AI teammate On/Off toggle in the lobby.
- Restored the builder's board-size buttons and the tuning-slider live readouts.
- The character-switch modal now opens and closes properly instead of trapping you.
- Everything binds correctly again after the switcher was introduced.

## v1.22.0 — 🏅 Milestones panel  
_Feature_

- New Milestones panel with 12 goals spanning every progression system.
- Goals include first service, hiring help, mastering all bot skills, unlocking the full cast, clearing every level, and serving 100 / 500 meals.
- Each milestone shows a live progress bar and turns green with a checkmark when complete.
- The header tallies how many you've unlocked (X/12).
- Open it from 'See all milestones' under the lobby progress banner.

## v1.21.2 — ✨ Shop affordability cues  
_Polish_

- Items you can afford right now get a soft gold glow to catch your eye.
- Items you can't afford yet show exactly how much more to save.
- Turns the shop from a static price list into a visible savings goal.

## v1.21.1 — 🪙 Coins-earned pill on results  
_Polish_

- The results screen now shows how many coins your score just earned, plus your crew's running total.
- Makes it clear that score banks 1:1 as coins to spend in the shop.
- Closes the loop from score to coins to shop right at the moment of reward.

## v1.21.0 — 👋 First-run welcome card  
_Feature_

- New players get a one-time welcome card explaining the whole game loop in three lines.
- Cook to earn stars that unlock characters and open new levels.
- Bank coins to hire and train your AI Sous-Chef.
- Start with the Golden Girls and unlock the rest by playing.
- Dismisses for good with 'Let's cook' so it won't reappear.

## v1.20.2 — 🔓 Level-unlock celebration  
_Polish_

- When a round earns the first star on a level, a toast pops up announcing the newly unlocked level.
- Campaign progress is now visible the moment it happens instead of quietly un-greying in the roadmap.
- Never fires just from joining a crew.

## v1.20.1 — 🎉 Character-unlock celebration  
_Polish_

- Banking enough stars to unlock a character now throws a celebration toast on the results screen.
- Comes with an unlock chime and a little haptic buzz so progression actually feels rewarding.
- Handles unlocking several characters in a single round.
- No longer misfires on the initial page load.

## v1.20.0 — 📊 Progression dashboard  
_Feature_

- Added an at-a-glance progress banner at the top of the Levels card.
- Tracks stars earned, 3-star levels, characters unlocked, and Sous-Chef skills taught.
- Shows a 'next character' hint telling you exactly which chef unlocks next and how many stars away it is.
- Gives players clear goals across the whole progression.

## v1.19.1 — 🎊 Juicier serve feedback  
_Polish_

- Serving a dish now throws a coin shower — more coins the bigger the tip.
- A burst ring grows with your combo, plus confetti and a bigger gold score pop for VIP and big serves.
- Added a 'COMBO ×N!' flourish that escalates as you keep a streak going.

## v1.19.0 — 🎭 In-lobby character switcher  
_Feature_

- Added a 'Change character' button in the lobby that opens the full character grid as a modal.
- You can now switch characters mid-lobby, not just from the home screen.
- See what everyone's choosing — each character is badged with the crew members on it, updating live.
- Your own pick shows as a green 'You'.
- The same unlock gating applies in the modal.

## v1.18.0 — 🗺️ Level roadmap menu  
_Feature_

- The campaign level list is redesigned as a visual roadmap.
- Each world is a labelled stage with a dotted trail and its levels as compact map nodes.
- Every node shows its emoji, star progress, and name; locked levels show a lock icon.
- Your next objective gets a glowing 'you are here' marker.
- Far more scannable and game-like than the old vertical card list.

## v1.17.0 — 🔒 Character unlock progression  
_Feature_

- You now start with the Golden Girls plus the house Chef and Grandma Rose, and unlock the rest by banking stars.
- Every ~2 lifetime stars unlocks the next character in roster order.
- Locked characters are greyed out with a star-requirement hint; tapping one tells you how far off you are.
- Redesigned the character menu as a dense Smash-Bros-style grid — the whole roster readable at a glance.
- Each section header shows an unlock tally, like Sitcom Stars 3/14.

## v1.16.0 — 🤖 AI Sous-Chef as earned progression  
_Balance_

- The AI bot is no longer a free toggle — hire a Sous-Chef in the Kitchen Shop, then buy each skill separately.
- Teach it Chopping, Dishwashing, Cooking, Plating, and Delivery; it only does what you've taught it.
- Dropped the old Prep/Expo modes — the bot's behaviour now emerges from its skills.
- Shop is grouped into AI Sous-Chef and Kitchen Tools with prerequisite locks (Cooking needs Chopping, Delivery needs Plating).
- Reworked the useless Auto-Chopper powerup into a cheaper 2× board chop speed, and retuned costs so tools are a real progression.

## v1.15.4 — 📋 Tidier tutorial popup  
_Polish_

- The "dishes to learn" tutorial popup no longer crams everything together: the customer face, name, and steps now stack cleanly with room to breathe.
- Bigger face portrait and step badges matching the new order-ticket style.
- The Next button now hugs its label instead of stretching full-width.

## v1.15.3 — 🎫 Redesigned order tickets  
_Polish_

- Order cards are much easier to read at a glance: the customer's face is now a bigger, zoomed-in portrait so you can tell who's ordering.
- Each prep step (chop 🔪, boil 🍲, bake 🔥, fry 🍳) sits in its own bigger white badge so the steps read distinctly.
- The boil step now uses a steaming-pot icon that clearly means "boil in a pot".
- Deeper ticket background and stronger shadow for better contrast.

## v1.15.2 — 👆 Forgiving station taps  
_Fix_

- Tapping just above a station, or over the food floating on it, used to miss and make your chef walk instead.
- Stations now have a larger tap area covering their whole footprint plus the surface just above them, so near-misses still interact.
- Overlapping stations still resolve cleanly to the one in front.

## v1.15.1 — 💬 AI teammate modes explained  
_Content_

- A one-line description now sits under the lobby AI toggle so you know what each mode does.
- Prep chops, rescues, and washes; Expo cooks, plates, and serves whole orders on its own.
- The text updates live as you tap through the modes.

## v1.15.0 — 👨‍🍳 Sous-Chef cooks: full solo cook levels  
_AI_

- The Expo bot now starts the cooks your orders need, so it can run soup, pizza, stew, sushi, and burger levels entirely on its own.
- It ferries the right inputs into idle pots, ovens, and pans, chopped onions to the pot for soup, dough plus tomato and cheese to the oven for pizza, and more.
- Smart about not over-producing: it only starts a cook when an order still needs one and won't over-chop.
- Works around tight-board situations (like soup needing three onions) so it doesn't get stuck.
- Solo test run: it cooked and served 5 soups on Soup's On by itself.

## v1.14.1 — 🎨 Fix see-through character and plate sprites  
_Art_

- Pale artwork, like white dish-rack plates and light characters such as Marilyn Monroe, no longer turns partly transparent so you could see the background through them.
- Background removal was eating into the sprite bodies; it now trims only the studio backdrop and cleans the edges, leaving the art solid.
- Marilyn went from 70% see-through to fully solid, and colored characters still key cleanly.

## v1.14.0 — 🍽️ Sous-Chef Expo mode: it plates and serves  
_AI_

- The lobby toggle now cycles Off → Prep 🔪 → Expo 🍽️.
- Expo mode turns the bot into an expediter: it assembles orders on plates from whatever's ready and serves them itself.
- On chop-only recipes like salads it can run the whole level solo (served 12 salads on Salad Days on its own).
- For cooked dishes it plates and serves them as your crew stages them.
- Prep mode no longer stands idle when boards are full: it clears finished chops onto counters so it always has something useful to do.

## v1.13.2 — 🔢 Fill-count badges on cookers  
_Feature_

- Pots, ovens, and mixers now show a live 0/1/2/3 count while you're loading them, so you can tell at a glance how many ingredients are already in.
- The count hands off to the progress bar once cooking starts.
- Empty pots keep their proper empty look.

## v1.13.1 — 👀 Station contents always readable  
_Fix_

- A chef or the AI bot standing in front of a board, counter, or pot no longer hides what's on it.
- Ingredients and their state (chopped, cooking, done) now always draw on top, so you can always read the surface you're working with.

## v1.13.0 — 🛟 Sous-Chef rescue mode  
_AI_

- The Sous-Chef now rescues cooked food, pulling finished dishes off the stove, pot, or oven right before they burn.
- It stages the rescued dish on a free counter for you to plate, saving one of the biggest sources of lost points on cook-heavy levels.
- Only acts when it has somewhere to set the dish down, so it never gets stuck holding food.

## v1.12.0 — 🤖 Meet the Sous-Chef: your new AI teammate  
_AI_

- Flip the new "🤖 AI teammate" toggle in the lobby and a Sous-Chef bot chef joins your round as an extra player.
- It focuses on prep: keeping the cutting boards stocked with the chopped ingredients your open orders need.
- Understands cook recipes too, chopping onions for soup, tomato and cheese for pizza, patties for burgers, and so on.
- Washes dishes when the clean-plate stack runs low.
- Never grabs plates or serves, so it can't steal your dishes or trip you up, and it only preps what's actually in demand.

## v1.11.0 — ⭐ Star Recalibration & Tyler's Salad Bar  
_Balance_

- Recalibrated the star goals on every level against real playtest scores, so 1, 2 and 3 stars now line up with what's actually achievable at the new order pacing
- New bonus level, Tyler's Salad Bar, in a fresh Bonus Kitchen section — a free-form crowd-built board that's always unlocked and ready to play
- The bonus level runs at the fast tuning it was built and scored on, so a 3-star finish sits just under the record run

## v1.10.0 — ⚖️ Order Pacing Rebalance & Anyone Can Start  
_Balance_

- Rebalanced how fast orders arrive across every campaign level, with each dish type getting its own cadence for a fairer, more consistent rush
- Every level now runs on a 60-second order timer with up to 5 open orders at once
- Tuned default chef speed and character size for the campaign
- Any crew member can now start a level or custom round — no more waiting on just the host (board editing stays host-only)

## v1.9.1 — 🎭 Four New Chefs & Docs Rescue  
_Content_

- Added four new character portraits: Mike Tyson, Mrs. Doubtfire, Judge Judy and Napoleon Dynamite
- Recovered project design and how-it-works documentation that had gone missing

## v1.9.0 — 📊 AI Director in Play  
_AI_

- The AI Director now plugs into live games — capturing what's happening in your kitchen as telemetry
- Added an on-screen Director HUD overlay and a training pipeline behind the scenes
- Groundwork for the AI reading real matches and eventually offering smarter assistance

## v1.8.2 — 🖼️ Multi-Countertop Art  
_Art_

- Added new counter artwork for kitchens with runs of multiple countertops, for cleaner, better-connected worktops

## v1.8.1 — 🖼️ Dish Rack & Sink Count Art  
_Art_

- Added dedicated artwork for the dish rack and sink so their clean and dirty counts read more clearly in the kitchen

## v1.8.0 — 🧠 AI Lab  
_AI_

- New AI Lab, opened from the home screen, showcasing a neural network built entirely from scratch with no ML libraries
- Self-Taught Chef: watch a reinforcement-learning agent teach itself the cook-and-serve loop from rewards alone, with a live reward curve and a view of the network thinking
- AI Director: reads live kitchen telemetry to predict failure risk and suggest the next best action, with gauges, charts and difficulty calls
- Reward sliders let you nudge the AI chef toward a role — an early seed of a future AI teammate
- Fixed a background bug where visiting a sub-page could break the cached app

## v1.7.1 — 🎨 Plain HD Station Art  
_Art_

- Cutting boards, ovens, stockpots, mixers, plating and serve counters, plus icing and garnish stations all get crisp new plain HD artwork outside Cake World
- Kitchens now use each theme's painted wall illustration as a full backdrop over a glossy checkerboard floor
- Objects and characters are grounded with soft contact shadows, and recipe cards get bigger ingredient icons

## v1.7.0 — 🍽️ Clean-Plate Rack, Sturdier Taps & Edit Chef  
_Feature_

- The clean-plate badge on the dish rack now actually shows up, alongside the dirty count on the sink
- Hardened the replay tap fix so double-firing taps can't come back through any path, even after finishing and reopening a level
- New Edit Chef button in the lobby lets you swap your character without leaving your kitchen or getting dropped into a new random one
- Celebrity chefs now lead the picker, with House Specials moved to the bottom

## v1.6.1 — 🐛 Replay Tap Fix  
_Fix_

- Fixed a bug where replaying a level made every tap fire twice, which cancelled itself out on counters (you couldn't pick up anything you'd just put down)
- Taps now register exactly once on every replay — no more refreshing the page to unstick it

## v1.6.0 — 🧼 One-Tap Dishwashing & Live Plate Counts  
_Balance_

- Washing up is now one dish per tap — stand at the sink and tap to scrub a single plate, so you never get locked into scrubbing the whole pile at once
- Once a dish finishes you're free to walk away immediately, no need to tap off the station first
- The dish rack now shows your clean-plate count and the sink shows how many are still dirty, so you can see your stock at a glance
- The Dish-Bot upgrade still keeps washing on its own in the background

## v1.5.1 — 🔊 Soundboard clips organized by context  
_Content_

- Reorganized the character soundboard clips into per-show, per-character folders behind the scenes
- Sets up voice lines to be picked more reliably for each character and moment

## v1.5.0 — 🖼️ Themed room wallpapers  
_Content_

- Nine new full-room scene backdrops in the Level Builder's background picker: Brady Bunch kitchen, Cheers bar, Golden Girls, I Love Lucy, Seinfeld, Willy Wonka's chocolate room, Oz technicolor, Mediterranean market, and Warm Sage
- Pick a wallpaper in the builder and it applies as your board's backdrop
- Fixed the default 'wood' board backdrop that was failing to load and falling back to a flat beige

## v1.4.2 — 🧁 Cake World art tidy-up  
_Art_

- Wired up art that existed but was never shown in Cake World's 'Sweet Beginnings' level: the Mixing Bowl, Icing Dispenser, and Garnish Counter now use their real sprites instead of plain counters
- Cake pantry ingredients (flour, eggs, chocolate, honeycomb) and their crates replace the old emoji placeholders
- Ambient Cake World decor — rug, mascot, wall sconces, bees, butterflies — now draws in the scene
- Reorganized the cake-world asset library into tidy folders behind the scenes

## v1.4.1 — 🔧 Tight-lane stations work again  
_Fix_

- Fixed wall-hugging counters and boards on narrow one-lane levels becoming unresponsive to taps
- You can once again place, grab, and chop at these stations, while sprinting past counters in a corridor still won't grab items by accident

## v1.4.0 — 🎨 Bigger chefs, richer builder & smarter voices  
_Feature_

- Chefs and customers now render twice as big by default, with the kitchen spaced out so they fit
- Level Builder gains a Look & feel card: a character-size slider and a background wallpaper picker, plus a live mini-preview that shows your board exactly as it'll play
- Voice lines now match the moment — a pleased line on a delivery, an exasperated yell when you burn or miss an order
- Saved boards become their own playable levels under 'Your Kitchens', and edits to built-in levels save a per-crew version you can revert or delete
- Custom boards and edits ride along in device backups so they survive server data loss

## v1.3.1 — ↔️ Stations face into the room  
_Art_

- Counters, chopping boards, ovens, plate stacks, serve counters, sinks and trash now use directional art, so pieces on the left and right walls turn to face the kitchen
- Applies to their busy and dirty states too, making the room read more naturally

## v1.3.0 — 🛠️ Drag-and-drop level building  
_Feature_

- Build levels by touch or mouse: tap to place a piece, drag a placed piece to move it, or drag across the floor to paint
- New Facing brush lets you point each station Front, Left, or Right, with an arrow shown in the editor
- Facing choices save with your boards

## v1.2.0 — 💾 Grouped customer picker & saved boards  
_Feature_

- Save your custom boards to your kitchen code so they stick around between sessions, ready to reload and share with your crew
- Level Builder's customer picker now mirrors the main menu groups (House Specials, Sitcom Stars, Politics & Royals…) with Add all / Remove all per group
- Fixed a bug where walking past the trash bin while carrying a plate could accidentally throw your food away

## v1.1.3 — 👥 Customers you can actually see  
_Fix_

- Waiting customers no longer show up as just a shadow
- The line of diners is now drawn from the full character roster — the same faces you can pick to play as

## v1.1.2 — 🍳 Diner kitchens look like diners  
_Fix_

- Stations and ingredients in diner levels now show the right art — stoves are stoves, not mixers
- Fixed diner boards that were mistakenly rendering with cake-shop sprites

## v1.1.1 — 🥗 Orders read as diner food again  
_Fix_

- Order tickets now correctly show diner dishes like salads and burgers instead of leftover cake names
- Restored all 13 diner recipe names and the 6 diner dish names, complete with their proper food emoji

