#!/usr/bin/env python3
"""Analyze production GPS data and alert history to evaluate detection pipeline.

Compares the before/after behavior around the altitude gate + N-of-M deployment.

Usage:
    # First export data:
    #   npx sst shell --stage production -- uv run python scripts/analyze_gps.py \
    #       --dynamo --pack 5d27a7716e49 --device '!e3543f61' --hours 720 --csv /tmp/recent_data.csv
    #
    # Then run this script:
    uv run python scripts/analyze_production_run.py --csv /tmp/recent_data.csv --outdir docs/images
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import statistics
from datetime import datetime, timezone, timedelta

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Circle, Polygon
import numpy as np


# ---------------------------------------------------------------------------
# Geofence from production (GEOFENCE#f418e0b4 "Home")
# ---------------------------------------------------------------------------

GEOFENCE_VERTICES = [
    (20.89010348073583, -156.31906716382375),
    (20.89079009491556, -156.3179674581276),
    (20.891336376954, -156.31835906064367),
    (20.890624706522203, -156.31945876624425),
]

# Alerts pulled from production DynamoDB
ALERTS = [
    # (timestamp_utc, type, message_excerpt)
    ("2026-02-22T19:45:28", "boundary_approach", "19m"),
    ("2026-02-22T19:56:59", "escape_detected", "ESCAPED"),
    ("2026-02-22T19:58:29", "return_detected", "returned"),
    ("2026-02-22T21:05:06", "escape_detected", "ESCAPED"),
    ("2026-02-22T21:05:36", "return_detected", "returned"),
    ("2026-02-22T21:07:36", "escape_detected", "ESCAPED"),
    ("2026-02-22T21:10:06", "return_detected", "returned"),
    ("2026-02-22T21:20:07", "escape_detected", "ESCAPED"),
    ("2026-02-22T21:21:07", "return_detected", "returned"),
    ("2026-02-22T21:34:07", "escape_detected", "ESCAPED"),
    ("2026-02-22T21:50:08", "return_detected", "returned"),
    ("2026-02-22T21:54:38", "escape_detected", "ESCAPED"),
    ("2026-02-22T22:06:08", "return_detected", "returned"),
    ("2026-02-22T22:19:09", "escape_detected", "ESCAPED"),
    ("2026-02-22T22:20:09", "return_detected", "returned"),
    ("2026-02-22T22:41:09", "escape_detected", "ESCAPED"),
    ("2026-02-22T22:42:09", "return_detected", "returned"),
    ("2026-02-22T22:48:40", "escape_detected", "ESCAPED"),
    ("2026-02-22T23:24:59", "return_detected", "returned"),
    ("2026-02-22T23:49:40", "escape_detected", "ESCAPED"),
    ("2026-02-23T02:45:52", "escape_detected", "ESCAPED"),
    ("2026-02-23T02:49:51", "escape_detected", "ESCAPED"),
    ("2026-02-23T03:39:53", "return_detected", "returned"),
    ("2026-02-23T06:49:20", "return_detected", "returned"),
    ("2026-02-23T12:26:01", "return_detected", "returned"),
]

# Approximate deploy time of altitude gate + N-of-M confirmation
# Commit was at 2026-02-22 14:00 HST = 2026-02-23 00:00 UTC
# SST deploy takes a few minutes after commit
DEPLOY_TIME = datetime(2026, 2, 23, 0, 15, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def point_in_polygon(lat: float, lon: float, vertices: list[tuple[float, float]]) -> bool:
    """Ray-casting point-in-polygon test."""
    n = len(vertices)
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = vertices[i]
        yj, xj = vertices[j]
        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def min_distance_to_boundary(lat: float, lon: float, vertices: list[tuple[float, float]]) -> float:
    """Minimum distance from point to polygon edges (meters)."""
    min_d = float("inf")
    n = len(vertices)
    for i in range(n):
        j = (i + 1) % n
        # Distance to line segment
        d = _point_to_segment_distance(lat, lon, vertices[i], vertices[j])
        min_d = min(min_d, d)
    return min_d


def _point_to_segment_distance(
    lat: float, lon: float, p1: tuple[float, float], p2: tuple[float, float]
) -> float:
    """Distance from (lat, lon) to the segment p1-p2, in meters."""
    # Project onto segment using parameterized form
    lat1, lon1 = p1
    lat2, lon2 = p2

    # Convert to local meters
    cos_lat = math.cos(math.radians(lat))
    dx = (lon2 - lon1) * cos_lat * 111_320
    dy = (lat2 - lat1) * 110_540
    px = (lon - lon1) * cos_lat * 111_320
    py = (lat - lat1) * 110_540

    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq < 1e-10:
        return math.hypot(px, py)

    t = max(0, min(1, (px * dx + py * dy) / seg_len_sq))
    proj_x = t * dx
    proj_y = t * dy
    return math.hypot(px - proj_x, py - proj_y)


def load_csv(path: str) -> list[dict]:
    rows = []
    seen: set[str] = set()
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            gps_ts = row["gps_timestamp"]
            if gps_ts in seen:
                continue
            seen.add(gps_ts)
            rows.append({
                "received_at": datetime.fromisoformat(row["received_at"]),
                "lat": float(row["lat"]),
                "lon": float(row["lon"]),
                "alt": float(row["alt"]) if row["alt"] else None,
                "speed": float(row["speed"]) if row["speed"] else None,
                "sats": int(row["sats"]) if row["sats"] else None,
                "pdop": float(row["pdop"]) if row["pdop"] else None,
                "hdop": float(row["hdop"]) if row["hdop"] else None,
                "rssi": int(row["rssi"]) if row["rssi"] else None,
                "snr": float(row["snr"]) if row["snr"] else None,
            })
    return rows


def running_median(values: list[float | None], window: int = 20) -> list[float | None]:
    result: list[float | None] = []
    for i in range(len(values)):
        if values[i] is None:
            result.append(None)
            continue
        start = max(0, i - window + 1)
        valid = [v for v in values[start : i + 1] if v is not None]
        result.append(statistics.median(valid) if len(valid) >= 5 else None)
    return result


# ---------------------------------------------------------------------------
# Plot 1: Timeline — displacement + alerts overlay
# ---------------------------------------------------------------------------

def plot_timeline(rows: list[dict], outdir: str) -> None:
    times = [r["received_at"] for r in rows]

    # Compute distance to nearest geofence edge (signed: negative = inside)
    boundary_dists = []
    for r in rows:
        inside = point_in_polygon(r["lat"], r["lon"], GEOFENCE_VERTICES)
        d = min_distance_to_boundary(r["lat"], r["lon"], GEOFENCE_VERTICES)
        boundary_dists.append(-d if inside else d)

    # Also compute displacement from centroid
    avg_lat = sum(r["lat"] for r in rows) / len(rows)
    avg_lon = sum(r["lon"] for r in rows) / len(rows)
    displacements = [haversine(avg_lat, avg_lon, r["lat"], r["lon"]) for r in rows]

    # Parse alerts
    escape_times = [datetime.fromisoformat(a[0]).replace(tzinfo=timezone.utc) for a in ALERTS if a[1] == "escape_detected"]
    return_times = [datetime.fromisoformat(a[0]).replace(tzinfo=timezone.utc) for a in ALERTS if a[1] == "return_detected"]
    approach_times = [datetime.fromisoformat(a[0]).replace(tzinfo=timezone.utc) for a in ALERTS if a[1] == "boundary_approach"]

    plt.style.use("seaborn-v0_8-whitegrid")
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(16, 10), sharex=True)

    # --- Top: boundary distance ---
    colors = ["#CC3333" if d > 0 else "#4477AA" for d in boundary_dists]
    ax1.scatter(times, boundary_dists, c=colors, s=8, alpha=0.6, zorder=3)
    ax1.axhline(0, color="black", linewidth=1.5, label="Geofence boundary")
    ax1.axhline(20, color="orange", linewidth=1, linestyle="--", alpha=0.7, label="Warning buffer (20m)")
    ax1.axhline(-20, color="orange", linewidth=1, linestyle="--", alpha=0.7)

    # Mark deploy time
    ax1.axvline(DEPLOY_TIME, color="green", linewidth=2, linestyle="-.", alpha=0.8, label="Deploy: altitude gate + N-of-M")

    # Mark escape alerts
    for et in escape_times:
        ax1.axvline(et, color="red", linewidth=0.8, alpha=0.4)
    if escape_times:
        ax1.axvline(escape_times[0], color="red", linewidth=0.8, alpha=0.4, label=f"Escape alerts ({len(escape_times)})")

    ax1.set_ylabel("Distance to boundary (m)\n← inside | outside →")
    ax1.set_title("Production Run: Stationary Collar vs Geofence Boundary")
    ax1.legend(fontsize=8, loc="upper right")

    # Count pre/post deploy alerts
    pre_escapes = sum(1 for t in escape_times if t < DEPLOY_TIME)
    post_escapes = sum(1 for t in escape_times if t >= DEPLOY_TIME)
    pre_hours = (DEPLOY_TIME - times[0]).total_seconds() / 3600
    post_hours = (times[-1] - DEPLOY_TIME).total_seconds() / 3600

    ax1.annotate(
        f"Before deploy: {pre_escapes} escapes in {pre_hours:.1f}h",
        xy=(0.02, 0.95), xycoords="axes fraction", ha="left", va="top",
        fontsize=10, fontweight="bold", color="red",
        bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="red", alpha=0.8),
    )
    ax1.annotate(
        f"After deploy: {post_escapes} escapes in {post_hours:.1f}h",
        xy=(0.02, 0.82), xycoords="axes fraction", ha="left", va="top",
        fontsize=10, fontweight="bold", color="green" if post_escapes <= 2 else "orange",
        bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="green" if post_escapes <= 2 else "orange", alpha=0.8),
    )

    # --- Bottom: GPS quality indicators ---
    sats = [r["sats"] if r["sats"] is not None else 0 for r in rows]
    alts = [r["alt"] for r in rows]
    alt_medians = running_median(alts, window=20)
    alt_devs = []
    for i in range(len(rows)):
        if alts[i] is not None and alt_medians[i] is not None:
            alt_devs.append(abs(alts[i] - alt_medians[i]))
        else:
            alt_devs.append(None)

    ax2.scatter(times, sats, s=6, alpha=0.5, color="#4477AA", label="Satellites", zorder=3)
    ax2.set_ylabel("Satellite count", color="#4477AA")
    ax2.tick_params(axis="y", labelcolor="#4477AA")
    ax2.axhline(6, color="orange", linewidth=0.8, linestyle=":", alpha=0.5, label="Min sats (6)")
    ax2.set_ylim(0, max(sats) + 2)

    ax2r = ax2.twinx()
    valid_alt_times = [times[i] for i in range(len(rows)) if alt_devs[i] is not None]
    valid_alt_devs = [alt_devs[i] for i in range(len(rows)) if alt_devs[i] is not None]
    ax2r.scatter(valid_alt_times, valid_alt_devs, s=6, alpha=0.5, color="#CC3333", label="Alt deviation", zorder=3)
    ax2r.axhline(50, color="red", linewidth=1, linestyle="--", alpha=0.7, label="Alt gate (50m)")
    ax2r.set_ylabel("|Alt − median| (m)", color="#CC3333")
    ax2r.tick_params(axis="y", labelcolor="#CC3333")

    ax2.axvline(DEPLOY_TIME, color="green", linewidth=2, linestyle="-.", alpha=0.8)

    # Combine legends
    h1, l1 = ax2.get_legend_handles_labels()
    h2, l2 = ax2r.get_legend_handles_labels()
    ax2.legend(h1 + h2, l1 + l2, fontsize=8, loc="upper right")

    ax2.set_xlabel("Time (UTC)")
    ax2.set_title("GPS Quality: Satellites & Altitude Stability")
    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d %H:%M"))
    ax2.xaxis.set_major_locator(mdates.AutoDateLocator())
    fig.autofmt_xdate()

    fig.tight_layout()
    path = os.path.join(outdir, "production-timeline.png")
    fig.savefig(path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Plot 2: Scatter with geofence overlay
# ---------------------------------------------------------------------------

def plot_scatter_with_geofence(rows: list[dict], outdir: str) -> None:
    avg_lat = sum(r["lat"] for r in rows) / len(rows)
    avg_lon = sum(r["lon"] for r in rows) / len(rows)
    cos_lat = math.cos(math.radians(avg_lat))

    x_m = [(r["lon"] - avg_lon) * cos_lat * 111_320 for r in rows]
    y_m = [(r["lat"] - avg_lat) * 110_540 for r in rows]

    # Split into before/after deploy
    before_x, before_y, after_x, after_y = [], [], [], []
    for i, r in enumerate(rows):
        if r["received_at"] < DEPLOY_TIME:
            before_x.append(x_m[i])
            before_y.append(y_m[i])
        else:
            after_x.append(x_m[i])
            after_y.append(y_m[i])

    # Geofence polygon in local meters
    gf_x = [(v[1] - avg_lon) * cos_lat * 111_320 for v in GEOFENCE_VERTICES]
    gf_y = [(v[0] - avg_lat) * 110_540 for v in GEOFENCE_VERTICES]

    plt.style.use("seaborn-v0_8-whitegrid")
    fig, ax = plt.subplots(figsize=(10, 10))

    # Draw geofence
    gf_xy = list(zip(gf_x, gf_y))
    gf_patch = Polygon(gf_xy, closed=True, fill=True, facecolor="#4477AA", alpha=0.08,
                       edgecolor="#4477AA", linewidth=2, label="Home geofence")
    ax.add_patch(gf_patch)

    # Plot points
    ax.scatter(before_x, before_y, c="#CC3333", s=10, alpha=0.4, label=f"Before deploy ({len(before_x)} pts)", zorder=3)
    ax.scatter(after_x, after_y, c="#44AA77", s=10, alpha=0.4, label=f"After deploy ({len(after_x)} pts)", zorder=3)
    ax.plot(0, 0, "k+", markersize=15, markeredgewidth=2, label="Centroid", zorder=5)

    # Noise radius circle
    noise_radius = 7.1  # from production NOISEPROFILE
    noise_circle = Circle((0, 0), noise_radius, fill=False, color="gray", linestyle=":", linewidth=1,
                          label=f"Noise radius ({noise_radius:.1f}m)")
    ax.add_patch(noise_circle)

    # Square axes
    all_x = gf_x + x_m
    all_y = gf_y + y_m
    pad = 20
    x_span = max(all_x) - min(all_x) + 2 * pad
    y_span = max(all_y) - min(all_y) + 2 * pad
    half = max(x_span, y_span) / 2
    x_mid = (max(all_x) + min(all_x)) / 2
    y_mid = (max(all_y) + min(all_y)) / 2
    ax.set_xlim(x_mid - half, x_mid + half)
    ax.set_ylim(y_mid - half, y_mid + half)
    ax.set_aspect("equal")

    ax.set_xlabel("East–West (m)")
    ax.set_ylabel("North–South (m)")
    ax.set_title(f"GPS Scatter vs Geofence — {len(rows)} Stationary Fixes")
    ax.legend(fontsize=9, loc="upper left")

    path = os.path.join(outdir, "production-scatter-geofence.png")
    fig.savefig(path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Plot 3: Before vs after — detection simulation
# ---------------------------------------------------------------------------

def plot_before_after_comparison(rows: list[dict], outdir: str) -> None:
    """Show what naive detection vs full pipeline would produce."""
    times = [r["received_at"] for r in rows]
    alts = [r["alt"] for r in rows]
    alt_medians = running_median(alts, window=20)

    # Compute boundary distance for each point
    boundary_dists = []
    outside_mask = []
    for r in rows:
        inside = point_in_polygon(r["lat"], r["lon"], GEOFENCE_VERTICES)
        d = min_distance_to_boundary(r["lat"], r["lon"], GEOFENCE_VERTICES)
        boundary_dists.append(d if not inside else -d)
        outside_mask.append(not inside)

    # --- Simulate pipeline layers ---
    # Layer 1: Speed gate (implied speed > 30 m/s)
    speed_rejected = set()
    for i in range(1, len(rows)):
        dt = (times[i] - times[i - 1]).total_seconds()
        if dt > 0:
            dist = haversine(rows[i - 1]["lat"], rows[i - 1]["lon"],
                             rows[i]["lat"], rows[i]["lon"])
            if dist / dt > 30.0:
                speed_rejected.add(i)

    # Layer 2: Altitude gate (deviation > 50m from running median)
    alt_rejected = set()
    for i in range(len(rows)):
        if alts[i] is not None and alt_medians[i] is not None:
            if abs(alts[i] - alt_medians[i]) > 50.0:
                alt_rejected.add(i)

    all_rejected = speed_rejected | alt_rejected

    # Points outside geofence after filtering
    outside_after_filter = [i for i in range(len(rows))
                            if outside_mask[i] and i not in all_rejected]

    # Group consecutive outside points into "breach events" for naive
    def group_events(mask):
        events = []
        in_evt = False
        for i, m in enumerate(mask):
            if m:
                if not in_evt:
                    in_evt = True
                    events.append([i])
                else:
                    events[-1].append(i)
            else:
                in_evt = False
        return events

    naive_events = group_events(outside_mask)
    # Filter to events lasting > 30s (matching breach_confirm_s)
    naive_confirmed = [e for e in naive_events
                       if (times[e[-1]] - times[e[0]]).total_seconds() >= 30]

    # Filtered events
    filtered_outside = [outside_mask[i] and i not in all_rejected for i in range(len(rows))]
    filtered_events = group_events(filtered_outside)
    filtered_confirmed = [e for e in filtered_events
                          if (times[e[-1]] - times[e[0]]).total_seconds() >= 30]

    plt.style.use("seaborn-v0_8-whitegrid")
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(16, 9), sharex=True)

    # --- Top: naive (just point-in-polygon) ---
    ax1.plot(times, boundary_dists, color="#4477AA", linewidth=0.6, alpha=0.6, zorder=2)
    ax1.scatter(times, boundary_dists, c=["#CC3333" if o else "#4477AA" for o in outside_mask],
                s=6, alpha=0.5, zorder=3)
    ax1.axhline(0, color="black", linewidth=1.5)
    ax1.axvline(DEPLOY_TIME, color="green", linewidth=2, linestyle="-.", alpha=0.8)

    for event in naive_confirmed:
        t_start = times[event[0]]
        t_end = times[event[-1]]
        ax1.axvspan(t_start, t_end, alpha=0.2, color="red", zorder=1)

    ax1.set_ylabel("Signed distance to boundary (m)")
    ax1.set_title(f"Naive Detection: Point-in-Polygon Only → {len(naive_confirmed)} false escape events")
    ax1.annotate(f"{len(naive_confirmed)} confirmed escapes\n(all false positives)",
                 xy=(0.98, 0.92), xycoords="axes fraction", ha="right", va="top",
                 fontsize=12, fontweight="bold", color="red",
                 bbox=dict(boxstyle="round,pad=0.4", fc="white", ec="red", alpha=0.8))

    # --- Bottom: full pipeline ---
    ax2.plot(times, boundary_dists, color="#4477AA", linewidth=0.6, alpha=0.3, zorder=2)

    # Accepted points
    accepted = [i for i in range(len(rows)) if i not in all_rejected]
    ax2.scatter([times[i] for i in accepted], [boundary_dists[i] for i in accepted],
                c=["#CC3333" if outside_mask[i] else "#4477AA" for i in accepted],
                s=6, alpha=0.5, zorder=3)
    ax2.axhline(0, color="black", linewidth=1.5)
    ax2.axvline(DEPLOY_TIME, color="green", linewidth=2, linestyle="-.", alpha=0.8,
                label="Deploy")

    # Rejected points
    if speed_rejected:
        ax2.scatter([times[i] for i in speed_rejected], [boundary_dists[i] for i in speed_rejected],
                    marker="x", color="orange", s=40, linewidths=1.5, zorder=4,
                    label=f"Speed gate ({len(speed_rejected)})")
    if alt_rejected:
        ax2.scatter([times[i] for i in alt_rejected], [boundary_dists[i] for i in alt_rejected],
                    marker="x", color="red", s=40, linewidths=1.5, zorder=4,
                    label=f"Altitude gate ({len(alt_rejected)})")

    for event in filtered_confirmed:
        t_start = times[event[0]]
        t_end = times[event[-1]]
        ax2.axvspan(t_start, t_end, alpha=0.2, color="red", zorder=1)

    ax2.set_ylabel("Signed distance to boundary (m)")
    ax2.set_xlabel("Time (UTC)")
    ax2.set_title(f"Full Pipeline: Speed + Altitude Gates + N-of-M → {len(filtered_confirmed)} escape events")
    ax2.legend(fontsize=8, loc="upper left")

    color = "green" if len(filtered_confirmed) == 0 else "orange"
    ax2.annotate(f"{len(filtered_confirmed)} confirmed escapes",
                 xy=(0.98, 0.92), xycoords="axes fraction", ha="right", va="top",
                 fontsize=12, fontweight="bold", color=color,
                 bbox=dict(boxstyle="round,pad=0.4", fc="white", ec=color, alpha=0.8))

    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d %H:%M"))
    ax2.xaxis.set_major_locator(mdates.AutoDateLocator())
    fig.autofmt_xdate()

    fig.tight_layout()
    path = os.path.join(outdir, "production-before-after.png")
    fig.savefig(path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Console summary
# ---------------------------------------------------------------------------

def print_summary(rows: list[dict]) -> None:
    avg_lat = sum(r["lat"] for r in rows) / len(rows)
    avg_lon = sum(r["lon"] for r in rows) / len(rows)
    displacements = [haversine(avg_lat, avg_lon, r["lat"], r["lon"]) for r in rows]

    before = [r for r in rows if r["received_at"] < DEPLOY_TIME]
    after = [r for r in rows if r["received_at"] >= DEPLOY_TIME]

    before_outside = sum(1 for r in before if not point_in_polygon(r["lat"], r["lon"], GEOFENCE_VERTICES))
    after_outside = sum(1 for r in after if not point_in_polygon(r["lat"], r["lon"], GEOFENCE_VERTICES))

    sats = [r["sats"] for r in rows if r["sats"] is not None]
    hdops = [r["hdop"] for r in rows if r["hdop"] is not None]

    print(f"\n{'='*60}")
    print("PRODUCTION RUN ANALYSIS")
    print(f"{'='*60}")
    print(f"Period:     {rows[0]['received_at']:%Y-%m-%d %H:%M} → {rows[-1]['received_at']:%Y-%m-%d %H:%M} UTC")
    print(f"Duration:   {(rows[-1]['received_at'] - rows[0]['received_at']).total_seconds()/3600:.1f} hours")
    print(f"Points:     {len(rows)} (deduplicated)")
    print(f"Deploy at:  {DEPLOY_TIME:%Y-%m-%d %H:%M} UTC")
    print()
    print(f"BEFORE deploy ({len(before)} pts, {(DEPLOY_TIME - rows[0]['received_at']).total_seconds()/3600:.1f}h):")
    print(f"  Outside geofence: {before_outside} / {len(before)} ({100*before_outside/len(before):.1f}%)")
    print()
    print(f"AFTER deploy ({len(after)} pts, {(rows[-1]['received_at'] - DEPLOY_TIME).total_seconds()/3600:.1f}h):")
    print(f"  Outside geofence: {after_outside} / {len(after)} ({100*after_outside/len(after):.1f}%)")
    print()
    print(f"Displacement from centroid:")
    print(f"  Median: {statistics.median(displacements):.1f}m")
    print(f"  P95:    {float(np.percentile(displacements, 95)):.1f}m")
    print(f"  P99:    {float(np.percentile(displacements, 99)):.1f}m")
    print(f"  Max:    {max(displacements):.1f}m")
    print()
    print(f"GPS quality:")
    if sats:
        print(f"  Sats:  median {statistics.median(sats):.0f}, range {min(sats)}-{max(sats)}")
    if hdops:
        print(f"  HDOP:  median {statistics.median(hdops):.1f}, range {min(hdops):.1f}-{max(hdops):.1f}")
    print()

    # Alert summary
    escape_times = [datetime.fromisoformat(a[0]).replace(tzinfo=timezone.utc) for a in ALERTS if a[1] == "escape_detected"]
    pre_escapes = sum(1 for t in escape_times if t < DEPLOY_TIME)
    post_escapes = sum(1 for t in escape_times if t >= DEPLOY_TIME)
    print(f"Actual production alerts (from DynamoDB):")
    print(f"  Total escape alerts: {len(escape_times)}")
    print(f"  Before deploy:       {pre_escapes}")
    print(f"  After deploy:        {post_escapes}")
    last_escape = max(escape_times)
    hours_since = (rows[-1]["received_at"] - last_escape).total_seconds() / 3600
    print(f"  Last escape at:      {last_escape:%H:%M} UTC")
    print(f"  Clean hours since:   {hours_since:.1f}h")
    print(f"{'='*60}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Analyze production GPS run")
    parser.add_argument("--csv", default="/tmp/recent_data.csv", help="Path to exported CSV")
    parser.add_argument("--outdir", default="docs/images", help="Output directory for PNGs")
    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    print(f"Loading {args.csv}...")
    rows = load_csv(args.csv)
    print(f"  {len(rows)} rows (deduplicated)")

    print_summary(rows)

    print("\nGenerating plots:")
    plot_timeline(rows, args.outdir)
    plot_scatter_with_geofence(rows, args.outdir)
    plot_before_after_comparison(rows, args.outdir)
    print("Done.")


if __name__ == "__main__":
    main()
