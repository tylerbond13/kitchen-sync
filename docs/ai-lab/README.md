# 🧠 Kitchen Sync — AI Lab

A self-contained machine-learning showcase built **into the game**, from scratch, with **no ML libraries**. Open it at **`/ai-lab.html`** (there's a button on the home screen) and you'll find two live demos running on one hand-written neural network:

1. **The Self-Taught Chef** — a Deep Q-Network (reinforcement learning) agent that starts out clueless and *teaches itself* the cook → serve loop, with the neural network visualised as it thinks.
2. **The AI Director** — two supervised neural nets that read live kitchen telemetry and output a **failure-risk %** and the **next best action**, then a rule layer turns that into **dynamic difficulty**, **contextual hints**, and **AI sous-chef** behaviour.

> This is the foundation for the AI features in `kitchen_sync_neural_network_game_only.md` — failure prediction, the AI Director, the sous-chef, and a future AI teammate. Everything here is real and tested (see `test/nn.test.js`, `test/ai-dqn.test.js`, `test/ai-director.test.js`, `test/ai-lab-smoke.test.js`).

---

## Why this is legit (not a toy)

- **The neural network is hand-written** (`public/js/ai/nn.js`): forward pass, backpropagation, and the Adam optimizer — and its gradients are verified against a **numerical gradient check** in CI. If the calculus were wrong, the tests fail.
- **The RL agent really learns**: a headless test trains it and asserts it **beats a random baseline** at serving dishes.
- **The Director really predicts**: a test trains it on a simulated kitchen and asserts a held-out **AUC > 0.8** (it can rank doomed orders above safe ones) plus **calibration** (when it says 70%, ~70% really fail).

Resume-ready framing:

> Built a from-scratch neural network (no libraries) powering two systems in an Overcooked-style game: a Deep Q-Network agent that learns optimal play via reinforcement learning, and an AI Director that predicts order-failure risk and the next best action from live telemetry to drive dynamic difficulty, hints, and an AI sous-chef.

---

## File map

```
public/
  ai-lab.html              the Lab page (UI + styles)
  js/ai/
    nn.js                  from-scratch MLP: forward, backprop, Adam   (window.KSNN)
    kitchenEnv.js          the RL environment (a kitchen MDP)          (window.KSEnv)
    dqn.js                 the Deep Q-Network agent                    (window.KSDQN)
    director.js            telemetry sim + FailureModel + ActionModel + Director (window.KSDirector)
    lab.js                 the front-end controller (charts, brain viz, sliders)
test/
  nn.test.js               gradient check + learns XOR + save/load
  ai-dqn.test.js           env sanity + DQN beats random
  ai-director.test.js      feature builder + AUC + behaviour-cloning accuracy + Director
  ai-lab-smoke.test.js     boots the page logic headlessly (no browser) without throwing
```

Every `ai/*.js` module is **dual-export**: it attaches to `window` for the browser *and* `module.exports` for Node, so the maths is unit-tested headlessly before it ships.

---

## A short tour of the ideas (this is the "learn ML" part)

### Neural network
A network is a function with thousands of tunable numbers ("weights"). Numbers go in (the kitchen state), flow through layers of `a = activation(W·x + b)`, and numbers come out (a value per action, or a risk score). **Training** = predict, measure the error, and nudge every weight slightly to reduce it. Repeat a lot.

### Backpropagation + Adam
To nudge each weight correctly you need its **gradient** (how the error changes if you wiggle it). Backprop is the chain rule run backwards through the layers; Adam is a smart "step downhill" that adapts the step size per weight. We prove backprop is correct by comparing it to a brute-force numerical gradient.

### Reinforcement learning (the Chef)
No answer key — only **reward**. The agent learns `Q(state, action)` = expected total future reward, via the Bellman update `Q(s,a) ← r + γ·max Q(s',·)`. Three tricks make deep RL stable, all in `dqn.js`:
- **ε-greedy** exploration (random early, greedy later),
- **experience replay** (re-learn from random past moments),
- a **target network** (stable learning targets).

**Reward shaping = giving the AI a role.** The "Shape your chef" sliders change *what* it's rewarded for; crank washing up and it babysits the sink. That's the seed of an AI teammate you can assign tasks to.

### Supervised learning (the Director)
Here we *do* have labels. `FailureModel` learns `P(order fails)` with **binary cross-entropy**; `ActionModel` learns the next best move by **imitating a strong player** (behaviour cloning). We judge them with **AUC**, **calibration**, and **Brier score** — because a model the game acts on must be *trustworthy*, not just accurate.

---

## Roadmap — taking it from the Lab into the live game

The Lab proves the brains work. Here's the concrete path to the features in your design doc, in build order.

### 1. In-game Director HUD (failure % + next-best-action, live)
Ship a pre-trained Director and run it during real play as a read-only overlay.

- **Pre-train offline:** a small node script trains `FailureModel` + `ActionModel` on `KitchenSim` and dumps `toJSON()` to `public/assets/ai/director-weights.json`.
- **Feature extraction (the only real work):** map the client's live `state` → the `KSDirector.FEATURES` vector. Suggested sources:
  | feature | from |
  |---|---|
  | `timeRemaining` | the active order ticket's TTL countdown |
  | `activeOrders` | length of the orders strip |
  | `ingredientsNeeded` / `ingredientsPrepped` | recipe `needs[]` vs. what's plated/prepped |
  | `distToStation` / `distToServe` | player tile → nearest needed station / serve window (renderer has the grid) |
  | `dirtyDishes` / `cleanPlates` | `state.stations` sink `dirty` / `state.plates` |
  | `burning` | cook stations in `state==='done'` near burn |
  | `stoveOccupied` / `boardOccupied` | station `contents`/`item` present |
  | `mistakes30s`, `comboStreak`, `avgSpeed`, `playerSkill` | rolling client-side counters |
- **Wire safely:** in `socket.on('state')`, call `try { DirectorHUD.update(state) } catch {}` behind an off-by-default toggle, so it can **never** affect gameplay.
- **Payoff:** a live risk meter + "Serve the burger now!" hints, exactly like the Director read-out in the Lab.

### 2. Dynamic difficulty (the AI Director's whole point)
Feed the Director's rolling **average risk** to the server's order generator: `assess().difficulty` already returns `{spawnRateMult, timeBonus, hazardMult}`. Multiply the level's `orders.every` / `ttl` by those live. Start with the Lab's thresholds (avg risk > 0.7 → ease, < 0.3 → press).

### 3. The AI teammate (single-player partner with role sliders)
- Add a server-side "bot player" to `room.players` (a chef with no socket). Each server tick, pick its action from a policy.
- **v1 policy:** the `ActionModel` (it already outputs the next best action from telemetry) + simple pathfinding (the game already has `findPath`).
- **Role sliders (your idea):** bias the bot's action selection by per-skill weights ("80% dishes, 20% chop"), or — better — train a **DQN partner** in a 2-agent version of `kitchenEnv` with the role baked into its reward (the exact reward-shaping the Lab demonstrates). Expose the sliders on the pre-level screen.
- **Multi-agent:** extend `kitchenEnv` to two chefs sharing stations; train with independent DQN or self-play. The Lab's single-agent env is built to grow into this.

### 4. Real telemetry pipeline (learn from *real* games)
Log a state snapshot every ~2s + the eventual order outcome (the schema in your design doc), append to a store, and periodically **fine-tune** the Director on real data so it models *your* players, not just the simulator. This turns the synthetic models into a genuine analytics product.

### 5. More models from the design doc
- **Player skill estimator** → matchmaking / level selection.
- **Movement-efficiency coach** → post-level "you lost 23s to station-switching."
- **Level difficulty predictor** → simulate a level with the RL agent and predict completion rate / stars before shipping.

---

## Running the tests

```
npm test            # runs everything, including the AI gradient check + learning tests
```

All of it runs in plain Node and in the browser — no Python, no TensorFlow, no build step.
