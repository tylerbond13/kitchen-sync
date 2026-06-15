# Recipes, States & Customization

The five signature cakes from your notes, expressed as **buildable token
recipes** in the engine's existing `id.state` format, plus the icing-colour and
topper layer that turns them into a scalable co-op customization game.

Design rule: **work backwards from beautiful.** We pick gorgeous final cakes
first (the art is the point), then define the shortest sequence of legible steps
that earns each one. Every step is a station interaction a player can *see*.

## Ingredient vocabulary

Grouped into the four "supply line" families from your notes. Crates pull these
as `id.raw`.

| Family | Ingredients |
|---|---|
| **Pantry** | `flour`, `sugar`, `egg`, `butter`, `cream` |
| **Produce** | `strawberry`, `blueberry`, `mint`, `carrot` |
| **Sweeteners / chocolate** | `dark_chocolate`, `white_chocolate`, `toffee`, `honeycomb`, `honey` |
| **Aromatics / finishing** | `rose_petal`, `vanilla`, `espresso_bean`, `matcha`, `gold_dust`, `silver_glitter`, `sugar_crystal` |

(Level 1 only needs `flour`, `sugar`, `strawberry`, `rose_petal`.)

## Processing states (the board & beyond)

| State | Means | Station |
|---|---|---|
| `raw` | straight from the crate | crate |
| `chopped` | sliced produce (strawberry, mint) | board |
| `ground` | espresso beans, gold leaf → dust | board (a chop variant) |
| `smashed` | hard blocks (toffee, chocolate, honeycomb) | board (a chop variant) |
| `batter` | combined in the bowl (per-cake id, e.g. `rose_batter`) | mixing bowl |
| `baked` | batter run through the oven → a `*_cake` | oven |
| `glaze` | fruit/chocolate boiled or melted on the stove | stove |
| `iced.<colour>` | coated at the dispenser | icing dispenser |
| `garnished` | topper applied | garnish counter |

`ground` and `smashed` are just **chop with a different output token** — no new
verb, so the board stays one simple station that does the right thing per
ingredient.

## The five cakes

Each table is the literal recipe chain. **L#** marks which level it's intended to
debut in (so difficulty ramps). Points are placeholders to tune.

### 1. Royal Ruby Rose 🌹 — *debut: L1*
Tiered **pink** cake, crystalline sugar berries, red roses. The teaching cake.

| Step | Station | Inputs → Output |
|---|---|---|
| chop | `B` | `strawberry.raw` → `strawberry.chopped` |
| chop | `B` | `rose_petal.raw` → `rose_petal.chopped` |
| mix | `M` | `flour.raw` + `sugar.raw` + `strawberry.chopped` → `rose_batter` |
| bake | `V` | `rose_batter` → `rose_cake.baked` *(burnAfter ~11s)* |
| plate | `P` | pull clean plate, place `rose_cake.baked` |
| ice | `I` | coat → `rose_cake.iced.pink` |
| garnish | `G` | + `rose_petal.chopped` → `rose_cake.garnished` |
| serve | `W` | deliver 🎉 |

### 2. Golden Honeycomb Crunch 🍯 — *debut: L2*
**Golden-yellow** sponge, honey drip, amber shards. Teaches *burns faster*.

| Step | Station | Inputs → Output |
|---|---|---|
| smash | `B` | `toffee.raw` → `toffee.smashed` |
| slice | `B` | `honeycomb.raw` → `honeycomb.chopped` |
| mix | `M` | `egg.raw` + `butter.raw` + `toffee.smashed` → `toffee_batter` |
| bake | `V` | `toffee_batter` → `honeycomb_cake.baked` **(burnAfter ~7s — high sugar!)** |
| plate + ice | `P`,`I` | `iced.gold` (honey drizzle) |
| garnish | `G` | + `honeycomb.chopped` → `garnished` |
| serve | `W` | deliver |

### 3. Midnight Espresso Truffle ☕ — *debut: L3 (introduces the stove)*
Glossy **dark-chocolate**, gold leaf, coffee. Teaches the stove bottleneck.

| Step | Station | Inputs → Output |
|---|---|---|
| chop | `B` | `dark_chocolate.raw` → `dark_chocolate.smashed` |
| grind | `B` | `espresso_bean.raw` → `espresso_bean.ground` |
| **melt** | `S` | `dark_chocolate.smashed` + `cream.raw` → `ganache.glaze` *(can burn!)* |
| mix | `M` | `ganache.glaze` + `espresso_bean.ground` + `flour.raw` → `espresso_batter` |
| bake | `V` | → `espresso_cake.baked` |
| plate + ice | `P`,`I` | `iced.chocolate` (mirror glaze) |
| garnish | `G` | + `gold_dust.ground` → `garnished` |
| serve | `W` | deliver |

### 4. Enchanted Matcha Forest 🌿 — *debut: L4 (the hand-off cake)*
Mossy **green**, white-chocolate curls. Teaches the timed two-player hand-off.

| Step | Station | Inputs → Output |
|---|---|---|
| chop | `B` | `mint.raw` → `mint.chopped` |
| curl | `B` | `white_chocolate.raw` → `white_chocolate.smashed` |
| mix | `M` | `matcha.raw` + `flour.raw` + `sugar.raw` → `matcha_batter` |
| bake | `V` | → `matcha_cake.baked` |
| plate + ice | `P`,`I` | `iced.green` (sweet cream) |
| **hand-off garnish** | `G` | + `mint.chopped` + `white_chocolate.smashed` — *two toppers, must both land before patience goes red* |
| serve | `W` | deliver |

### 5. Celestial Blueberry Galaxy 🌌 — *debut: L5 (parallel stove + mix)*
Deep **purple/blue** mirror glaze, silver sparkle. The showpiece finale.

| Step | Station | Inputs → Output |
|---|---|---|
| scrape | `B` | `vanilla.raw` → `vanilla.chopped` |
| crush | `B` | `blueberry.raw` → `blueberry.smashed` |
| **boil** | `S` | `blueberry.smashed` + `sugar_crystal.raw` → `galaxy_glaze.glaze` |
| mix (parallel) | `M` | `vanilla.chopped` + `flour.raw` + `sugar.raw` → `vanilla_batter` |
| bake | `V` | → `galaxy_cake.baked` |
| plate + ice | `P`,`I` | pour `galaxy_glaze` → `iced.galaxy` |
| garnish | `G` | + `silver_glitter.raw` → `garnished` |
| serve | `W` | deliver |

## Customization — the co-op depth knob

This is what makes Cake World *scale to 5+ players* without adding rules. The
finished-cake identity is a small struct:

```
{ cake: 'rose_cake', icing: 'pink', topper: 'rose_petal' }
```

An order can demand **specific variants**, and the same baked cake can become
different products:

- **Icing colour** is set by the dispenser's current colour, flipped at the
  far-side **colour button** (`C`). Colours: `pink, gold, chocolate, green,
  galaxy, lavender, …`.
- **Topper** is whatever the garnish counter applies (`rose_petal, honeycomb,
  gold_dust, silver_glitter, white_chocolate, …`).

Why it scales:

- **More open orders → more parallel variants.** With 5 players you might have a
  pink-rose, a gold-honeycomb, and a green-matcha cooking at once. Someone owns
  the colour button as a *job* ("I'm on icing colour — call out what you need!").
- **The button is a deliberate bottleneck.** One dispenser, one colour at a time,
  button across the room. Two differently-coloured orders = a co-op route-planning
  problem, exactly the Overcooked "you take left, I'll flip the dispenser" beat.
- **Keep L1 single-variant** (pink only, fixed topper). Introduce colour at L2,
  multi-topper at L4. Complexity ramps; the *rules* never change.

### Difficulty ramp (orders)

| Level | Cakes in pool | Customization | New mechanic |
|---|---|---|---|
| L1 Sweet Beginnings | Rose | fixed pink | the core chain |
| L2 | Rose, Honeycomb | **icing colour** (button) | fast-burn cake |
| L3 | + Espresso | colour + topper | **stove** glaze |
| L4 | + Matcha | 2-topper hand-off | timed hand-off |
| L5 Grand Patisserie | all 5 | full colour + topper matrix | parallel stove+mix |

## Open recipe questions

Collected in [open-questions.md](open-questions.md) — e.g. exact burn timings,
whether icing needs a clean plate first (your notes say yes), and how many
distinct icing colours to actually author art for.
