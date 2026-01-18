# Leashline

Leashline is a **local-first dog escape detection system** designed for areas
with poor cellular coverage.

It uses:
- LoRa/Meshtastic for local radio tracking
- Geofencing on a local base station
- Optional remote notifications (SMS / push)

Leashline is **not** a global GPS tracker.
It is designed to detect when a dog leaves a defined area and alert you immediately.

Status: early alpha.

---

# Leashline – Starter Kit BOM (Development / Reference)

This document describes a **known-good hardware setup** for developing and testing Leashline.

**Design goals**
- Immediate local escape detection
- Works with poor or nonexistent cellular coverage
- No subscription
- Dog-safe hardware (no long whip antennas on the collar)
- <$500 total for a full setup
- All logic runs locally

This is **not** a consumer plug-and-play product.  
It is a local radio system built from commodity hardware.

---

## Overview

Minimum working system:

- 1× dog collar tracker (LoRa + GPS)
- 1× LoRa node (handheld or base)
- 1× outdoor antenna

Recommended full system:

- 1× dog collar tracker
- 1× dedicated base station
- 1× dedicated handheld
- Outdoor antenna mounted high

---

## Phase 1: Minimum Viable Setup (~$250–$320)

This is enough to:
- see live dog position on your phone
- detect escapes immediately
- walk around terrain obstacles (e.g. hills) to regain signal

### 1. Dog Collar Tracker

**Spec5 Trace (standard, non-XR)**  
Small integrated antenna (dog-safe)

- Product page:  
  https://specfive.com/products/spec5-trace-gps-tracker
- Frequency: US915
- Firmware: Meshtastic-compatible
- Battery life: ~8–12h active tracking
- Cost: ~$130 USD

**Notes**
- Avoid the XR version unless your dog tolerates long external antennas.
- This unit only transmits; all intelligence lives off-collar.

---

### 2. LoRa Node (Handheld *or* Temporary Base)

**RAK WisBlock Meshtastic Starter Kit (US915)**

- Product page:  
  https://store.rakwireless.com/products/wisblock-meshtastic-starter-kit
- Includes:
  - ESP32-based core
  - SX1262 LoRa radio
  - BLE support
- Cost: ~$35–40 USD

**Why this choice**
- Well-supported by Meshtastic
- Stable BLE pairing with iOS
- SMA antenna connector
- Can act as:
  - handheld receiver
  - temporary base station

---

### 3. Outdoor Antenna (Critical)

**915 MHz Omnidirectional Antenna (Outdoor Rated)**

Example options (any equivalent is fine):

- Rokland 915 MHz 6 dBi Outdoor Antenna  
  https://store.rokland.com/products/915mhz-6dbi-omni-outdoor-antenna

- Approx cost: $40–70 USD

**Accessories**
- SMA coax cable (LMR-240 or similar): $20–40
- Simple mast / eave mount: $10–20

**Notes**
- Antenna height matters more than antenna gain.
- Mount as high and as clear of obstructions as possible.

---

### Phase 1 Total Cost

| Item | Approx |
|----|----|
| Dog tracker | $130 |
| LoRa node | $40 |
| Antenna + coax + mount | $80–120 |
| **Total** | **$250–320** |

---

## Phase 2: Recommended Full Setup (~$350–$450)

Adds reliability and convenience.

### 4. Second LoRa Node (Dedicated Base)

Same as Phase 1 node.

- RAK WisBlock Meshtastic Starter Kit (US915)  
  https://store.rakwireless.com/products/wisblock-meshtastic-starter-kit

Cost: ~$35–40 USD

**Role**
- Always-on base station
- Connected to your local compute (PC, NUC, Pi, server)

---

### 5. Handheld Antenna (Optional but Recommended)

**Portable 915 MHz SMA Antenna**

- Example: Telescoping SMA antenna (915 MHz)
- Approx cost: $15–30 USD

Improves handheld reception when walking around terrain shadows.

---

### 6. Handheld Battery + Case

- 18650 or LiPo battery
- Simple enclosure
- USB charging

Approx cost: $20–40 USD

---

### Phase 2 Total Cost

| Item | Approx |
|----|----|
| Phase 1 total | $250–320 |
| Second node | $40 |
| Handheld antenna | $20 |
| Battery + case | $30 |
| **Total** | **$350–450** |

---

## Software

- **Meshtastic iOS app**  
  https://meshtastic.org/docs/software/clients/ios/

- **Leashline (this project)**  
  Local packet ingestion, geofencing, alerts, and APIs

---

## What This Setup Is Good At

- Immediate escape detection
- Local awareness even with bad LTE
- Deterministic behavior
- Multi-dog support
- Custom geofences (rectangles or polygons)

## What This Setup Is Not

- Global tracking
- Satellite-backed
- Zero-maintenance
- Guaranteed continuous signal

Terrain and physics still apply.

---

## Recommended Next Steps

1. Start with Phase 1
2. Validate coverage around your property
3. Add Phase 2 once comfortable
4. Tune GPS interval and alert thresholds
5. Mount base antenna higher if range is insufficient

---

## Safety & Expectations

This system is **awareness tooling**, not a safety guarantee.
Always supervise dogs appropriately.

---

