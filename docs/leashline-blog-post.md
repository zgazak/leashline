# Turning Noisy GPS Into Reliable Dog Escape Alerts

*What 679 stationary GPS fixes revealed about consumer tracker accuracy, and how a layered detection pipeline eliminated false alerts entirely.*

---

## Meet Rufio

![Rufio, living his best life](rufio.jpg)

*Originally published on [Medium](https://medium.com/@zgazak/turning-noisy-gps-into-reliable-dog-escape-alerts-c93df8be7848).*

This is Rufio. He has a sweet, gentle heart, but hes anxious about **everything**, and he treats the backyard fence as a polite suggestion. After enough panicked neighborhood searches following his escapes, I went looking for a GPS collar that could do one thing well: **tell me the moment he gets out.**

Over the last five years I've struggled through several commercial collars — Fi, Whistle, Halo — and none of them solved this reliably. The core issue is shared across the industry: cellular collars send position data to a cloud server, the server evaluates a geofence, and a push notification comes back to your phone. Each hop adds latency, and if your dog is not in cell service, your dog is invisible. By the time you get the alert, Rufio has an aggressive head start.

So with the advent of Claude code (helping me with my weak spots, like complex web deployments, MQTT, general infrastructure) I started building [Leashline](https://leashline.io), an open-source escape detection system using LoRa radio instead of cellular. A base station in the house receives GPS fixes directly from the collar every thirty seconds with sub-second latency, and the data can be processed locally or pushed to MQTT for cloud processing.  The tradeoff is range — LoRa is a local solution, not a continent-wide tracker — but for the "know immediately when the dog crosses the fence" problem, it removes the bottleneck.  I also carry a second hub when we're hiking or if I have to go out looking — that one connects to my phone over Bluetooth.

### The Hardware

The current setup uses off-the-shelf components — nothing custom yet.

![Spec5 Trace collar unit, closed](images/spec5-trace-closed.jpg)
![Spec5 Trace collar unit, open — RAK LoRa + GPS board inside a 3D-printed case](images/spec5-trace-open.jpg)
*The collar: a [Spec5 Trace](https://specfive.com/products/specfive-trace-gps-tracker-for-dogs-teams) GPS/LoRa tracker in a 3D-printed enclosure that clips onto a standard collar strap. The open view shows the RAK board with GPS module (the gold square) and LoRa radio.*

![Heltec WiFi LoRa 32 V4 board with spring antenna, penny for scale](images/heltec-base-station.jpg)
*The base station: a [Heltec WiFi LoRa 32 V4](https://store.rokland.com/collections/other-lora-products) — an ESP32 dev board with built-in LoRa and WiFi. It sits inside the house, receives GPS fixes from the collar, and forwards them to the detection engine over WiFi. About the size of a thumb drive.*

![RAK WisMesh Pocket BLE hub, penny for scale](images/rak-ble-hub.jpg)
*The mobile hub: a [RAK WisMesh Pocket](https://store.rakwireless.com/products/wismesh-pocket) — bridges LoRa to your phone over BLE when you're out walking or chasing an escapee.*

This is prototype-grade hardware. The Spec5 is bulky and wasn't designed for this duty cycle, and the Heltec is a bare dev board. But the pieces are cheap, available, and good enough to validate the approach — which is the point at this stage.

What I didn't expect was that the harder problem wasn't communication latency. It was GPS noise.
---

## The GPS Problem Nobody Talks About

Consumer GPS trackers — especially low-power LoRa hardware — are noisy. A collar sitting motionless in a yard will report positions that wander by tens or even hundreds of meters. Draw a geofence around that yard, and those phantom positions look exactly like a dog walking out.

False alerts destroy trust.  With the Halo, they would also beep at Rufio from his collar (a feature that can't be disabled), and wake him from a deep nap freaked enough to then decide an escape is in order!  After a few phantom escapes at 2 AM, you disable notifications. Then you miss the real one.

I wanted to understand this noise quantitatively before trying to filter it, so I ran a simple experiment.

### 679 Points, Zero Movement

I placed a Spec5 Trace LoRa collar at a known fixed location and collected 679 consecutive GPS fixes over ~6 hours, reporting every ~30 seconds via LoRa to a Heltec WiFi LoRa 32 V4 base station. The collar did not move.

![GPS scatter plot showing stationary fixes with outliers well beyond a 50m geofence](images/gps-scatter-plot.png)
*Reported positions from a stationary collar. Dashed circle = 50m geofence. Red crosshair = true position.*

The median fix was only ~10m off — perfectly usable. But the distribution has a vicious tail:

| Percentile | Displacement |
|:----------:|:------------:|
| P50 | ~10 m |
| P75 | ~18 m |
| P90 | ~35 m |
| P95 | ~52 m |
| P99 | ~107 m |
| Max | ~231 m |

4.4% of fixes landed more than 50m from truth. That produced **12 distinct jump events** in 6 hours — roughly two false "escapes" per hour from a collar that never moved.

### Finding a Better Signal: Altitude

The obvious next step was to see which GPS quality indicators predicted these bad fixes. HDOP, PDOP, and satellite count all showed some correlation with position error, but they missed a lot of the worst offenders. Several of the 12 jump events had perfectly normal DOP values and adequate satellite counts.

Then I looked at altitude deviation — the difference between each fix's reported altitude and the running median.

![Altitude deviation vs. horizontal displacement showing strong correlation](images/altitude-vs-displacement.png)
*Altitude deviation vs. horizontal displacement. Pearson r = 0.70. Red circles = jump events (>50m). The cluster of jump events with normal DOP/satellite counts is visible in the upper-left — altitude catches what other indicators miss.*

| Indicator | Correlation with Position Error |
|:----------|:-------------------------------:|
| **Altitude deviation** | **0.73** |
| PDOP | 0.41 |
| HDOP | 0.38 |
| Satellite count (inverse) | 0.29 |

The intuition is geometric. When multipath reflections or constellation handoffs corrupt the position solution, altitude gets hit hardest because vertical geometry is inherently weak — all satellites are above the receiver, so vertical dilution of precision is always worse than horizontal. A fix that suddenly reports altitude 200m higher than 30 seconds ago almost certainly has a corrupted horizontal position too.

Altitude deviation caught **all 12 jump events**, including 4 that had completely normal DOP and satellite counts. It's not a subtle improvement — it's catching an entire failure mode that the standard quality indicators are blind to.

---

## Designing the Detection Pipeline

With the noise characterized, the design question became: how do you filter unreliable fixes without also filtering real escapes?

A real escape and a GPS teleport can look identical in a single fix — the dog is suddenly 80m from where it was. The difference only becomes apparent in context: a real escape shows coherent, sustained, outward motion. A GPS glitch shows a single spike or random scatter.

This suggested a layered architecture where each layer addresses a different failure mode, ordered from cheapest (immediate rejection) to most expensive (trajectory analysis). No single layer needs to be perfect — you're building defense in depth.

### The Layers

**Speed gate.** If the implied speed between two fixes exceeds 30 m/s (~67 mph), reject the fix outright. No dog runs that fast. This catches the most extreme teleports — cheap and obvious.

**Altitude gate.** If altitude deviates more than 50m from the running median, reject the fix. This is the key insight from the data analysis. It catches the jump events that DOP and satellite count miss entirely. 

**Scatter threshold.** If the scatter radius of the recent-point window exceeds 50m, pause detection. This handles sustained periods of poor GPS rather than isolated spikes.

**Per-fix uncertainty scaling.** Each fix gets a quality multiplier based on its HDOP, PDOP, and satellite count. Poor-quality fixes have to clear a higher bar to register as a breach.

**Noise profiling.** The system auto-learns each device's noise floor from stationary periods using an exponential moving average. A collar with 3m noise in open sky gets a tighter baseline than one with 15m noise under tree cover.

**Motion coherence.** When a fix is outside the fence but within the noise radius, check whether the recent trajectory shows coherent outward motion — linearity and boundary trend. GPS jitter zigzags; a walking dog traces a line.

**N-of-M confirmation.** Require 3 of the last 5 evaluated fixes to be outside the fence before firing a breach alert. A single GPS spike doesn't trigger anything.

**Duration timer.** After breach confirmation, wait 90 seconds of continuous outside readings before escalating to a full escape alert.

### Architecture Note

The detection engine is a pure-function, zero-I/O Python library. No database connections, no network calls, no file handles. Every function takes data in and returns results out. This makes it easy to test — feed it `TrackPoint` objects, assert on the `Alert` objects that come out. No mocks, no fixtures, no test infrastructure.

---

## Results

![Before/after comparison: 13 false alerts with naive detection, 0 with the full pipeline](images/before-after-alerts.png)
*Top: Naive point-in-polygon detection fires on every GPS spike past the fence. Bottom: The full pipeline rejects bad fixes (red X = altitude gate, grey diamond = N-of-M/coherence/noise suppression) and produces zero false alerts from the same data.*

Naive point-in-polygon + timer: **13 false breach events** from 679 stationary fixes.

Full pipeline: **0 false breach events.**

The speed gate caught 3 of the 12 jump events. The altitude gate caught the remaining 9, including the 4 with normal DOP and satellite counts. N-of-M confirmation would have independently caught 10 of 12. The layers reinforce each other — that's the point.

---

## Current State and Limitations

This is an open-source project, not a product. The [source is on GitHub](https://github.com/zgazak/leashline) under MIT license.

I should be honest about the gaps. Battery life on the current hardware isn't good — the collar uses off-the-shelf LoRa modules that weren't designed for this duty cycle.  It lasts 10-12 hours so you need to charge it every night (like the Halo collar).  The form factor needs work. Waterproofing is held together with optimism.  It's bulky and difficult to attach to normal dog collars.  Definitley not for small dogs (Rufio is fine, but he's 60 pounds). Getting from "works on my dog" to something others can rely on requires purpose-built hardware, and that's a different kind of problem than the signal processing.

The detection engine, though, is solid. It's tested against real GPS data, the architecture is clean, and the approach generalizes beyond dog collars to any application where you need reliable geofence detection from noisy consumer GPS.

If your commercial tracker is failing you and you're comfortable with some hardware tinkering, I'd love to build together — check out the [repo](https://github.com/zgazak/leashline) or find me through [leashline.io](https://leashline.io) or [zach@leashline.io](mailto:zach@leashline.io)

---

*All data and plots are from real GPS fixes collected from a Spec5 Trace LoRa collar. The full analysis methodology and configuration reference are in the [project docs](https://github.com/zgazak/leashline).*
