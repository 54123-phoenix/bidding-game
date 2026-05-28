"""Generate project-specific SVG visual assets for the frontend.

The assets are deterministic, copyright-safe, and tuned for the dark cyber
negotiation UI. Run from the repository root.
"""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "visual-assets"

THEMES = [
    ("negotiation", "#22d3ee", "#60a5fa", "谈判"),
    ("intelligence", "#5eead4", "#22d3ee", "情报"),
    ("hr-mind", "#c084fc", "#fb7185", "心理"),
    ("market", "#34d399", "#fbbf24", "市场"),
    ("debrief", "#fbbf24", "#22d3ee", "复盘"),
]

SELECTED = {
    "hero-orbit": ("negotiation", 7),
    "mission-brief": ("intelligence", 18),
    "hr-mind": ("hr-mind", 33),
    "market-signal": ("market", 42),
    "debrief-lab": ("debrief", 64),
}


def svg_card(theme: str, idx: int, primary: str, secondary: str, label: str) -> str:
    seed = idx * 17 + len(theme)
    cx = 120 + seed % 160
    cy = 90 + (seed * 3) % 120
    a = 24 + seed % 42
    b = 16 + (seed * 5) % 36
    lines = []
    for i in range(6):
        y = 70 + i * 34 + (seed % 7)
        x1 = 48 + ((seed + i * 13) % 60)
        x2 = 430 - ((seed + i * 19) % 80)
        opacity = 0.22 + (i % 3) * 0.08
        lines.append(f'<path d="M{x1} {y} C {x1 + 80} {y - 28}, {x2 - 80} {y + 28}, {x2} {y}" stroke="{primary}" stroke-opacity="{opacity:.2f}" stroke-width="1.2" fill="none"/>')

    nodes = []
    for i in range(9):
        x = 50 + ((seed * (i + 3)) % 380)
        y = 44 + ((seed * (i + 7)) % 220)
        r = 3 + (i % 4)
        color = primary if i % 2 == 0 else secondary
        nodes.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" fill-opacity="0.75"/>')

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300" role="img" aria-label="{label} visual asset {idx}">
  <defs>
    <radialGradient id="g{idx}" cx="45%" cy="35%" r="70%">
      <stop offset="0%" stop-color="{primary}" stop-opacity="0.34"/>
      <stop offset="48%" stop-color="{secondary}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#080a10" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="line{idx}" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="{primary}"/>
      <stop offset="1" stop-color="{secondary}"/>
    </linearGradient>
    <filter id="glow{idx}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="480" height="300" rx="28" fill="#080a10"/>
  <rect x="1" y="1" width="478" height="298" rx="27" fill="url(#g{idx})" stroke="{primary}" stroke-opacity="0.22"/>
  <g opacity="0.22">{''.join(lines)}</g>
  <ellipse cx="{cx}" cy="{cy}" rx="{a * 2}" ry="{b * 2}" fill="none" stroke="url(#line{idx})" stroke-width="1.8" filter="url(#glow{idx})"/>
  <ellipse cx="{cx}" cy="{cy}" rx="{a}" ry="{b}" fill="none" stroke="{secondary}" stroke-opacity="0.65" stroke-width="1.2" transform="rotate({seed % 60} {cx} {cy})"/>
  <g>{''.join(nodes)}</g>
  <text x="34" y="252" fill="#e8e6e0" font-family="ui-sans-serif, system-ui" font-size="22" font-weight="800">{label}</text>
  <text x="34" y="274" fill="{primary}" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3">{theme.upper()} / {idx:03d}</text>
</svg>'''


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"assets": [], "selected": {}}

    for theme, primary, secondary, label in THEMES:
        for idx in range(1, 61):
            name = f"{theme}-{idx:03d}.svg"
            path = OUT / name
            path.write_text(svg_card(theme, idx, primary, secondary, label), encoding="utf-8")
            manifest["assets"].append({"theme": theme, "id": idx, "path": f"/visual-assets/{name}"})

    for slot, (theme, idx) in SELECTED.items():
        manifest["selected"][slot] = f"/visual-assets/{theme}-{idx:03d}.svg"

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(manifest['assets'])} SVG assets in {OUT}")


if __name__ == "__main__":
    main()
