#!/usr/bin/env python3
"""GPS diagnostic analysis — visualize scatter, dropouts, and signal quality."""

from __future__ import annotations

import argparse
import asyncio
import math
import statistics
import sys
from datetime import datetime, timedelta, timezone

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Circle

from app.storage.sqlite import SqliteStorage
from engine.detection.noise import compute_noise_from_stationary, update_noise_profile
from engine.geo.distance import haversine
from engine.models.position import TrackPoint


# ---------------------------------------------------------------------------
# Cluster-based noise analysis
# ---------------------------------------------------------------------------

def find_stationary_clusters(
    points: list[TrackPoint],
    window_size: int = 20,
    max_spread_m: float = 60.0,
) -> list[list[TrackPoint]]:
    """Find clusters of consecutive points where all are within max_spread_m.

    Slides a window of `window_size` points across the timeline.
    Merges overlapping windows into contiguous clusters.
    """
    if len(points) < window_size:
        return []

    # Find all qualifying window start indices
    qualifying: list[tuple[int, int]] = []
    for start in range(len(points) - window_size + 1):
        window = points[start : start + window_size]
        # Check max pairwise distance (only need to check against extremes)
        spread_ok = True
        for i in range(len(window)):
            if not spread_ok:
                break
            for j in range(i + 1, len(window)):
                d = haversine(
                    window[i].reading.lat, window[i].reading.lon,
                    window[j].reading.lat, window[j].reading.lon,
                )
                if d > max_spread_m:
                    spread_ok = False
                    break
        if spread_ok:
            qualifying.append((start, start + window_size))

    if not qualifying:
        return []

    # Merge overlapping ranges
    merged: list[tuple[int, int]] = [qualifying[0]]
    for s, e in qualifying[1:]:
        if s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))

    return [points[s:e] for s, e in merged]


def analyze_clusters(clusters: list[list[TrackPoint]]) -> list[dict]:
    """Compute noise radius for each cluster."""
    results = []
    for cluster in clusters:
        noise = compute_noise_from_stationary(cluster)
        n = len(cluster)
        t_start = cluster[0].received_at
        t_end = cluster[-1].received_at
        results.append({
            "points": n,
            "noise_m": noise,
            "start": t_start,
            "end": t_end,
            "duration_s": (t_end - t_start).total_seconds(),
        })
    return results


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

async def load_data(db_path: str, pack_id: str):
    storage = await SqliteStorage.create(db_path)
    try:
        positions = await storage.positions.list_for_pack(pack_id)
        telemetry = await storage.telemetry.list_for_pack(pack_id)
        noise_profiles = await storage.noise_profiles.list_for_pack(pack_id)
        return positions, telemetry, noise_profiles, storage
    except Exception:
        await storage.close()
        raise


async def save_profile(storage: SqliteStorage, profile, pack_id: str):
    await storage.noise_profiles.put(profile.device_id, profile, pack_id)
    await storage.close()


# ---------------------------------------------------------------------------
# Console summary
# ---------------------------------------------------------------------------

def rssi_quality(rssi: int) -> str:
    if rssi >= -90:
        return "Strong"
    if rssi >= -110:
        return "Good"
    if rssi >= -120:
        return "Weak"
    return "Very weak"


def print_summary(
    device_id: str,
    points: list[TrackPoint],
    telemetry_pts: list,
    cluster_results: list[dict],
    hours: float,
):
    if not points:
        print("No points to summarize.")
        return

    t_start = points[0].received_at
    t_end = points[-1].received_at

    # Gap analysis
    gaps = []
    for i in range(1, len(points)):
        dt = (points[i].received_at - points[i - 1].received_at).total_seconds()
        if dt > 300:  # >5 min
            gaps.append(dt)

    longest_gap = max(gaps) if gaps else 0

    print(f"\nDevice: {device_id}")
    print(f"Period: {t_start:%Y-%m-%d %H:%M} → {t_end:%Y-%m-%d %H:%M}")
    print(f"Points: {len(points)}")
    if gaps:
        print(f"Gaps >5min: {len(gaps)} (longest: {longest_gap / 60:.0f}min)")
    else:
        print("Gaps >5min: 0")

    # GPS quality
    sats = [p.reading.sats for p in points if p.reading.sats is not None]
    hdops = [p.reading.hdop for p in points if p.reading.hdop is not None]

    print("\nGPS Quality:")
    if sats:
        print(f"  Sats:  median {statistics.median(sats):.0f}, range {min(sats)}-{max(sats)}")
    else:
        print("  Sats:  no data")
    if hdops:
        print(f"  HDOP:  median {statistics.median(hdops):.1f}, range {min(hdops):.1f}-{max(hdops):.1f}")
    else:
        print("  HDOP:  no data")

    # LoRa signal
    rssis = [p.rssi for p in points if p.rssi is not None]
    snrs = [p.snr for p in points if p.snr is not None]

    print("\nLoRa Signal:")
    if rssis:
        med_rssi = statistics.median(rssis)
        print(f"  RSSI:  median {med_rssi:.0f} dBm ({rssi_quality(int(med_rssi))})")
    else:
        print("  RSSI:  no data")
    if snrs:
        print(f"  SNR:   median {statistics.median(snrs):.1f} dB")
    else:
        print("  SNR:   no data")

    # Noise analysis
    print("\nNoise Analysis:")
    if cluster_results:
        noise_values = [c["noise_m"] for c in cluster_results]
        median_noise = statistics.median(noise_values)
        print(f"  Stationary clusters found: {len(cluster_results)}")
        print(f"  Noise radius (median): {median_noise:.1f}m")
        print(f"  Noise radius (range):  {min(noise_values):.1f}m - {max(noise_values):.1f}m")
        print(f"  Recommended noise_radius_m: {median_noise:.1f}")
    else:
        print("  No stationary clusters found")

        # Fallback: compute noise from all points
        if len(points) >= 2:
            overall_noise = compute_noise_from_stationary(points)
            print(f"  Overall scatter (all points): {overall_noise:.1f}m")


# ---------------------------------------------------------------------------
# Plotting
# ---------------------------------------------------------------------------

def plot_diagnostics(
    device_id: str,
    points: list[TrackPoint],
    telemetry_pts: list,
    cluster_results: list[dict],
    noise_radius: float | None,
    save_path: str | None = None,
):
    if not points:
        print("No points to plot.")
        return

    lats = [p.reading.lat for p in points]
    lons = [p.reading.lon for p in points]
    times = [p.received_at for p in points]

    # Centroid
    avg_lat = sum(lats) / len(lats)
    avg_lon = sum(lons) / len(lons)

    # Distances from centroid
    dists = [haversine(avg_lat, avg_lon, lat, lon) for lat, lon in zip(lats, lons)]

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))

    # --- Panel 1: Position scatter ---
    ax1 = axes[0, 0]
    # Convert lat/lon offsets to meters for better visualization
    x_m = [(lon - avg_lon) * math.cos(math.radians(avg_lat)) * 111_320 for lon in lons]
    y_m = [(lat - avg_lat) * 110_540 for lat in lats]

    sc = ax1.scatter(x_m, y_m, c=range(len(points)), cmap="viridis", s=12, alpha=0.7)
    ax1.plot(0, 0, "r+", markersize=15, markeredgewidth=2, label="Centroid")

    if noise_radius is not None:
        circle = Circle((0, 0), noise_radius, fill=False, color="red", linestyle="--", linewidth=1.5,
                         label=f"Noise radius: {noise_radius:.1f}m")
        ax1.add_patch(circle)

    ax1.set_xlabel("East-West (m)")
    ax1.set_ylabel("North-South (m)")
    ax1.set_title(f"{device_id}  |  {len(points)} pts  |  {times[0]:%m/%d %H:%M}–{times[-1]:%m/%d %H:%M}")
    ax1.set_aspect("equal")
    ax1.legend(fontsize=8)
    ax1.grid(True, alpha=0.3)
    plt.colorbar(sc, ax=ax1, label="Point index (time →)")

    # --- Panel 2: Displacement vs time ---
    ax2 = axes[0, 1]

    # Color by GPS quality (sats)
    sats = [p.reading.sats if p.reading.sats is not None else 0 for p in points]
    sc2 = ax2.scatter(times, dists, c=sats, cmap="RdYlGn", s=10, alpha=0.7, vmin=3, vmax=12)
    plt.colorbar(sc2, ax=ax2, label="Satellites")

    if noise_radius is not None:
        ax2.axhline(noise_radius, color="red", linestyle="--", linewidth=1, label=f"Noise: {noise_radius:.1f}m")
        ax2.legend(fontsize=8)

    ax2.set_xlabel("Time")
    ax2.set_ylabel("Distance from centroid (m)")
    ax2.set_title("Position displacement vs time")
    ax2.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
    ax2.xaxis.set_major_locator(mdates.AutoDateLocator())
    fig.autofmt_xdate()
    ax2.grid(True, alpha=0.3)

    # --- Panel 3: GPS quality vs time ---
    ax3 = axes[1, 0]

    sat_vals = [p.reading.sats for p in points if p.reading.sats is not None]
    sat_times = [p.received_at for p in points if p.reading.sats is not None]

    hdop_vals = [p.reading.hdop for p in points if p.reading.hdop is not None]
    hdop_times = [p.received_at for p in points if p.reading.hdop is not None]

    if sat_times:
        ax3.plot(sat_times, sat_vals, "g.-", markersize=3, linewidth=0.8, label="Satellites", alpha=0.8)
    ax3.set_xlabel("Time")
    ax3.set_ylabel("Satellites", color="green")
    ax3.tick_params(axis="y", labelcolor="green")

    # Quality bands (background shading)
    t_min, t_max = times[0], times[-1]
    ax3.axhspan(8, 15, alpha=0.05, color="green", label="Excellent (8+)")
    ax3.axhspan(6, 8, alpha=0.05, color="yellow")
    ax3.axhspan(4, 6, alpha=0.05, color="orange")
    ax3.axhspan(0, 4, alpha=0.08, color="red", label="Poor (<4)")

    if hdop_vals:
        ax3r = ax3.twinx()
        ax3r.plot(hdop_times, hdop_vals, "o-", color="orange", markersize=2, linewidth=0.8, label="HDOP", alpha=0.8)
        ax3r.set_ylabel("HDOP", color="orange")
        ax3r.tick_params(axis="y", labelcolor="orange")
        ax3r.invert_yaxis()

    ax3.set_title("GPS quality vs time")
    ax3.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
    ax3.legend(fontsize=8, loc="upper left")
    ax3.grid(True, alpha=0.3)

    # --- Panel 4: LoRa signal vs time ---
    ax4 = axes[1, 1]

    rssi_vals = [p.rssi for p in points if p.rssi is not None]
    rssi_times = [p.received_at for p in points if p.rssi is not None]
    snr_vals = [p.snr for p in points if p.snr is not None]
    snr_times = [p.received_at for p in points if p.snr is not None]

    if rssi_vals:
        ax4.plot(rssi_times, rssi_vals, "b.-", markersize=3, linewidth=0.8, label="RSSI", alpha=0.8)
        # Signal quality bands (within data range)
        ax4.axhspan(-90, 0, alpha=0.05, color="green", label="Strong")
        ax4.axhspan(-110, -90, alpha=0.05, color="yellow")
        ax4.axhspan(-120, -110, alpha=0.05, color="orange")
        ax4.axhspan(-140, -120, alpha=0.08, color="red", label="Very weak")
        rssi_pad = 5
        ax4.set_ylim(min(rssi_vals) - rssi_pad, max(max(rssi_vals), -85) + rssi_pad)
    ax4.set_xlabel("Time")
    ax4.set_ylabel("RSSI (dBm)", color="blue")
    ax4.tick_params(axis="y", labelcolor="blue")

    if snr_vals:
        ax4r = ax4.twinx()
        ax4r.plot(snr_times, snr_vals, ".-", color="purple", markersize=2, linewidth=0.8, label="SNR", alpha=0.8)
        ax4r.set_ylabel("SNR (dB)", color="purple")
        ax4r.tick_params(axis="y", labelcolor="purple")

    ax4.set_title("LoRa signal vs time")
    ax4.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
    ax4.legend(fontsize=8, loc="upper left")
    ax4.grid(True, alpha=0.3)

    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"\nPlot saved to {save_path}")
    else:
        plt.show()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def async_main(args):
    positions, telemetry, noise_profiles, storage = await load_data(args.db, args.pack)

    # List unique devices if none specified
    device_ids = sorted({p.device_id for p in positions})

    if not args.device:
        print(f"Available devices in pack '{args.pack}':")
        for did in device_ids:
            count = sum(1 for p in positions if p.device_id == did)
            print(f"  {did}  ({count} positions)")
        await storage.close()
        return

    if args.device not in device_ids:
        print(f"Device '{args.device}' not found. Available: {', '.join(device_ids)}")
        await storage.close()
        return

    # Filter by device and time range
    cutoff = datetime.now(timezone.utc) - timedelta(hours=args.hours)
    points = sorted(
        [p for p in positions if p.device_id == args.device and p.received_at >= cutoff],
        key=lambda p: p.received_at,
    )

    telemetry_pts = sorted(
        [t for t in telemetry if t.device_id == args.device and t.received_at >= cutoff],
        key=lambda t: t.received_at,
    )

    print(f"Loaded {len(points)} positions, {len(telemetry_pts)} telemetry records")

    if len(points) < 2:
        print("Not enough points for analysis.")
        await storage.close()
        return

    # Find stationary clusters
    clusters = find_stationary_clusters(points, window_size=10, max_spread_m=60.0)
    cluster_results = analyze_clusters(clusters)

    # Compute recommended noise
    noise_radius = None
    if cluster_results:
        noise_radius = statistics.median([c["noise_m"] for c in cluster_results])
    elif len(points) >= 2:
        noise_radius = compute_noise_from_stationary(points)

    # Console summary
    print_summary(args.device, points, telemetry_pts, cluster_results, args.hours)

    # Save noise profile if requested
    if args.save_profile and noise_radius is not None:
        existing = None
        for np_ in noise_profiles:
            if np_.device_id == args.device:
                existing = np_
                break

        total_cluster_pts = sum(c["points"] for c in cluster_results) if cluster_results else len(points)
        profile = update_noise_profile(
            existing=existing,
            new_noise_radius_m=noise_radius,
            new_sample_count=total_cluster_pts,
            device_id=args.device,
            timestamp=datetime.now(timezone.utc),
        )
        await save_profile(storage, profile, args.pack)
        print(f"\nNoise profile saved: {profile.noise_radius_m:.1f}m "
              f"(confidence: {profile.confidence:.0%}, samples: {profile.sample_count})")
    else:
        await storage.close()

    # Plot
    plot_diagnostics(
        device_id=args.device,
        points=points,
        telemetry_pts=telemetry_pts,
        cluster_results=cluster_results,
        noise_radius=noise_radius,
        save_path=args.save,
    )


def main():
    parser = argparse.ArgumentParser(description="GPS diagnostic analysis for Leashline")
    parser.add_argument("--db", default="leashline.db", help="SQLite database path (default: leashline.db)")
    parser.add_argument("--device", help="Device hex ID (omit to list available devices)")
    parser.add_argument("--pack", default="local", help="Pack ID (default: local)")
    parser.add_argument("--hours", type=float, default=24, help="Hours of history to analyze (default: 24)")
    parser.add_argument("--save", metavar="FILE", help="Save plot to file instead of showing (e.g. plots.png)")
    parser.add_argument("--save-profile", action="store_true", help="Write computed noise profile to DB")
    args = parser.parse_args()

    asyncio.run(async_main(args))


if __name__ == "__main__":
    main()
