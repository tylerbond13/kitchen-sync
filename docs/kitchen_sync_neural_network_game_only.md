# Kitchen Sync Neural Network Project Notes

This Markdown file contains only the **Kitchen Sync / Overcooked-style mobile game** neural network project details. The unrelated NFL fan-churn suggestion has been removed.

---

## User

how could i make a neral network example that connects to my kitchen-sync mobile game im building thats like overcooked

---

## Assistant

A great neural network project for your **Kitchen Sync / Overcooked-style mobile game** would be:

# AI Kitchen Assistant: Predicting Order Failure Risk

Build a neural network that predicts whether the player is likely to fail an order before the timer runs out.

That connects directly to the game loop and gives you a legit ML project that is more interesting than a toy classifier.

## Core idea

During gameplay, the model watches the current kitchen state and predicts:

> “Is this order likely to be completed on time?”

Output:

```text
failure_risk = 0.00 to 1.00
```

So if an order has a 0.82 failure risk, the game could react by:

- giving a subtle hint
- adjusting difficulty
- changing NPC behavior
- spawning fewer new orders
- recommending the next best action
- triggering “panic music” or visual urgency
- powering an AI sous-chef assistant

# Example project: Neural Network for Dynamic Difficulty Adjustment

## What the model predicts

For every active order, predict:

```text
order_failed = 1 or 0
```

Given the game state at a specific moment.

Example:

| Feature | Example |
|---|---:|
| Time remaining on order | 18 seconds |
| Number of required ingredients | 4 |
| Ingredients already prepped | 2 |
| Player distance to station | 3.2 tiles |
| Player distance to serving window | 6.5 tiles |
| Number of dirty dishes | 5 |
| Number of active orders | 4 |
| Number of hazards active | 2 |
| Is stove occupied? | 1 |
| Is cutting board occupied? | 0 |
| Average player speed last 10 sec | 2.8 tiles/sec |
| Mistakes last 30 sec | 3 |
| Current combo streak | 5 |
| Remaining kitchen capacity | low |

Target:

```text
Will this order fail? 1/0
```

## What the neural network looks like

This can start as a simple feedforward neural network:

```text
Game State Features
        ↓
Dense Layer
        ↓
ReLU
        ↓
Dropout
        ↓
Dense Layer
        ↓
ReLU
        ↓
Sigmoid Output
        ↓
Failure Risk Score
```

Example in Python/Keras:

```python
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.optimizers import Adam

num_features = 32

model = Sequential([
    Dense(64, activation="relu", input_shape=(num_features,)),
    Dropout(0.2),
    Dense(32, activation="relu"),
    Dense(1, activation="sigmoid")
])

model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss="binary_crossentropy",
    metrics=["accuracy", "AUC"]
)
```

The output is a probability:

```python
failure_risk = model.predict(current_game_state)
```

## What data you need to collect

Every few seconds during gameplay, log the game state.

Example event log:

```json
{
  "session_id": "abc123",
  "player_id": "test_user_1",
  "level_id": "sushi_level_03",
  "timestamp": 86.2,
  "order_id": "order_17",
  "time_remaining": 14.7,
  "active_orders": 5,
  "ingredients_needed": 3,
  "ingredients_prepped": 1,
  "player_x": 4,
  "player_y": 7,
  "nearest_station_distance": 2.4,
  "serving_window_distance": 8.1,
  "dirty_dishes": 4,
  "burning_items": 1,
  "mistakes_last_30_sec": 2,
  "completed_on_time": 0
}
```

Then your training table becomes:

| time_remaining | active_orders | ingredients_needed | ingredients_prepped | dirty_dishes | mistakes_last_30_sec | completed_on_time |
|---:|---:|---:|---:|---:|---:|---:|
| 14.7 | 5 | 3 | 1 | 4 | 2 | 0 |
| 32.1 | 3 | 2 | 2 | 1 | 0 | 1 |
| 8.4 | 4 | 5 | 2 | 2 | 1 | 0 |

Target can be:

```text
completed_on_time
```

or inverse:

```text
failed_order
```

## Why this is actually useful in the game

This gives you several real gameplay features.

### 1. Dynamic difficulty

If the model predicts the player is overwhelmed:

```text
Average failure risk > 0.75
```

Then the game can:

- slow down new order generation
- extend timers slightly
- reduce hazard frequency
- spawn easier recipes
- delay customer impatience

If the model predicts the player is cruising:

```text
Average failure risk < 0.25
```

Then the game can:

- add more complex orders
- increase customer flow
- introduce station conflicts
- add timed hazards
- increase combo opportunities

That makes the game feel more responsive and less static.

### 2. Smart hint system

Instead of generic hints, the model can detect when the player is likely to fail and offer contextual help.

Example:

```text
“Chop the tomato next — this order is running out of time.”
```

or:

```text
“Serve the burger before starting another dish.”
```

The neural network predicts risk. Then a rule-based layer chooses the actual hint.

That is important: the neural network does **not** need to decide everything. It just identifies risk.

### 3. AI sous-chef behavior

You could have an assistant character who decides what to do based on the predicted failure risk.

Example:

| Situation | AI action |
|---|---|
| Order failure risk high | Help with that order |
| Dirty dishes blocking plates | Wash dishes |
| Ingredients low | Prep ingredients |
| Stove item likely to burn | Move to stove |
| Player far from serving window | Deliver completed dish |

This could become a legit “AI helper” mechanic.

# Stronger version: predict the next best action

A more advanced project:

> Given the current kitchen state, predict what action a strong player would take next.

Actions:

```text
move_to_cutting_board
move_to_stove
pick_up_ingredient
drop_item
serve_order
wash_plate
extinguish_fire
throw_away_bad_food
```

Training data:

You play the game manually and record your actions. Then the model learns from demonstrations.

This is called **behavior cloning**.

Input:

```text
current kitchen state
```

Output:

```text
next player action
```

Example model:

```text
Game State → Neural Network → Action Probabilities
```

Output:

| Action | Probability |
|---|---:|
| serve_order | 0.62 |
| chop_ingredient | 0.21 |
| wash_plate | 0.08 |
| pick_up_tomato | 0.06 |
| idle | 0.03 |

Then the AI assistant can choose the highest-probability action.

This is closer to “game AI” than just analytics.

# Best version for your portfolio

I’d frame it as:

## Kitchen Sync AI Director

A neural-network-driven system that monitors player state and adjusts the kitchen in real time.

It has three layers:

| Layer | What it does |
|---|---|
| **Prediction model** | Predicts order failure risk |
| **Game director logic** | Converts risk into difficulty adjustments |
| **Action/hint engine** | Suggests player or AI sous-chef actions |

Architecture:

```text
Gameplay Telemetry
      ↓
Feature Builder
      ↓
Neural Network
      ↓
Failure Risk Score
      ↓
AI Director
      ↓
Difficulty / Hints / Assistant Behavior
```

# MVP version you could actually build

Do this first:

## MVP: Order Failure Predictor

### Step 1: Log gameplay data

Every 2 seconds, save:

```text
level_id
time_elapsed
order_id
time_remaining
active_orders
recipe_complexity
ingredients_needed
ingredients_completed
distance_to_needed_station
distance_to_serving_window
dirty_dishes
hazards_active
mistakes_last_30_sec
combo_streak
order_completed_on_time
```

### Step 2: Train simple model

Use:

```text
logistic regression baseline
random forest baseline
small neural network
```

### Step 3: Evaluate

Metrics:

| Metric | Why it matters |
|---|---|
| AUC | Can the model rank risky orders? |
| Precision at top 10% risk | Are the riskiest predictions actually failures? |
| Recall | How many failures did it catch? |
| Calibration | Does 80% risk really mean roughly 80% failure? |

### Step 4: Plug into gameplay

During gameplay:

```text
if failure_risk > 0.80:
    show_hint()
elif average_risk < 0.25:
    increase_order_pressure()
```

# Why this is a good neural network example

This is strong because it connects to:

- mobile game analytics
- player behavior modeling
- real-time prediction
- dynamic difficulty adjustment
- AI assistant mechanics
- telemetry pipelines
- applied ML
- personalization

It also lets you say something like:

> “I built a neural network-powered AI Director for an Overcooked-style mobile game that predicts order failure risk from real-time gameplay telemetry and dynamically adjusts difficulty, hints, and assistant behavior.”

That sounds 10x more impressive than:

> “I trained a neural network on handwritten digits.”

# Even cooler project variants

## 1. Recipe Recommendation Model

Predict which recipe/order type creates the most fun challenge for the player.

```text
player skill + recent performance → next recipe difficulty
```

Use it to personalize levels.

## 2. Player Skill Estimator

Predict a player’s hidden skill rating based on:

```text
completion speed
mistake rate
movement efficiency
station usage
combo rate
order failure rate
```

Then match levels to their skill.

## 3. Movement Efficiency Model

Train a model to classify player movement as:

```text
efficient / chaotic / stuck / overburdened
```

This could power coaching-style feedback after each level.

Example:

```text
“You lost 23 seconds from unnecessary station switching.”
```

## 4. AI Sous-Chef Imitation Model

Record good player gameplay and train an agent to imitate it.

This becomes:

```text
human gameplay → neural network → AI helper behavior
```

## 5. Level Difficulty Predictor

Before shipping a level, simulate or analyze it and predict:

```text
expected completion rate
average stars earned
rage-quit probability
replay likelihood
```

That would be especially useful for designing mobile levels.

# My recommendation

For your first neural network project, build this:

## Kitchen Sync Order Failure Predictor

It is:

- easiest to scope
- directly tied to the game
- useful for real gameplay
- explainable
- good for interviews
- not too computationally insane
- expandable into an AI Director later

The finished project could have this structure:

```text
/kitchen-sync-ml
  /data
    gameplay_logs.csv
  /notebooks
    01_feature_exploration.ipynb
    02_model_training.ipynb
    03_model_evaluation.ipynb
  /src
    feature_builder.py
    train_model.py
    predict_failure_risk.py
  /game_integration
    risk_api.py
    unity_client_example.cs
  README.md
```

Portfolio title:

> **Kitchen Sync AI Director: Neural Network-Based Dynamic Difficulty for a Cooperative Cooking Game**

Resume bullet:

> Built a neural network model for an Overcooked-style mobile game to predict order failure risk from real-time gameplay telemetry, enabling dynamic difficulty adjustment, contextual hints, and AI sous-chef behavior.

---

## Notes for Claude Code

Implementation target: a small ML module/repository for **Kitchen Sync**, an **Overcooked-inspired mobile game**. Focus on predicting order failure risk from gameplay telemetry, then using that score for dynamic difficulty, contextual hints, and AI sous-chef behavior.

Recommended first implementation:

1. Add gameplay telemetry logging.
2. Create a sample `gameplay_logs.csv` schema.
3. Build a simple neural network training script.
4. Add a prediction wrapper for `failure_risk`.
5. Add a lightweight integration example for Unity or another mobile game runtime.
6. Document the MVP in `README.md`.

Suggested repo structure:

```text
/kitchen-sync-ml
  /data
    gameplay_logs.csv
  /notebooks
    01_feature_exploration.ipynb
    02_model_training.ipynb
    03_model_evaluation.ipynb
  /src
    feature_builder.py
    train_model.py
    predict_failure_risk.py
  /game_integration
    risk_api.py
    unity_client_example.cs
  README.md
```
