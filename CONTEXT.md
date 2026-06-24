# Kitchen Sync

A real-time, co-op cooking game for phones: a crew joins one shared kitchen with a
4-letter code and fills customer orders together before they expire.

## Language

**Order ticket**:
A live customer request shown as a card during a round. It carries the item
ordered, the ingredients and prep steps to build it, the time left before it
expires, and the customer who placed it. Often shortened to "order" (the request)
or "ticket" (the card that shows it).
_Avoid_: Recipe card.

**Recipe**:
The fixed formula for a dish — its ingredients, prep states, and station chain
(e.g. flour + sugar + chopped strawberry → batter → bake). A recipe is a
definition; an [[order ticket]] is one live demand for a dish built from it.

**Customer**:
The person who places an [[order ticket]]. Shown on the ticket as a small
avatar + name; the least important element on the card.
_Avoid_: Client, orderer, guest.

**Board**:
The kitchen play area — the isometric grid of stations the crew moves around and
cooks on, rendered to the game canvas. The thing that goes full-screen.
_Avoid_: Map, level (a "level" is one configured board + order pool + goals).

## Audio

**Game soundtrack**:
The built-in background music that ships with the game (e.g. the "Caketown"
track while cooking). One of the two things the music source toggle picks between.
_Avoid_: BGM, music (ambiguous — see crew radio).

**Crew radio**:
The shared YouTube queue for one kitchen, synced across every chef in the crew.
The other thing the music source toggle picks between. Muting it per-phone falls
back to the [[game soundtrack]].
_Avoid_: YouTube music, radio (when ambiguous), playlist.

**Music (master)**:
Whether *any* background music plays at all. When on, the source toggle selects
[[game soundtrack]] vs [[crew radio]]; when off, both are silent. Distinct from
**sound effects** (the gameplay SFX synth), which has its own on/off.
