# Phase 1 — Kaleidoscope 95 and Geiss Reference Analysis

## Provenance and scope

This document is separate from `phase1_analysis.md`, which records the later Zen Light reference. All inspection here was static: files were parsed or read as data and were never launched.

| Reference | Role in KALEIDO | Do not conflate with |
| --- | --- | --- |
| Kaleidoscope 95 | Primary historical behavior and settings reference. | Zen Light and Geiss rendering algorithms. |
| Zen Light 2.1.4051 | Possible modern UI/settings inspiration. | The 1995 Kaleidoscope 95 implementation. |
| Geiss 4.29 | Audio-reactive, palette and performance reference. | The primary kaleidoscope port target. |

Copyright and registration-related text remains in the supplied reference material. It must not be copied into KALEIDO's product UI or used to bypass the original software's registration.

## Kaleidoscope 95 (`KALEID95.SCR`)

### Identity and PE layout

`Original/Kaleidoscope95/KALEID95.SCR` is the actual supplied Kaleidoscope 95 executable. It is a 122,368-byte x86 PE32 file with SHA-256 `d33ded0c437bb5b32599c14dc0a4710e81a675656246843b2793877c31cc6122`, an entry point at RVA `0xE730`, and a PE timestamp of 1995-10-26 19:33:41 UTC. Its embedded UI names copyright 1995 Syntrillium Software Corporation.

| Section | RVA | Raw offset | Raw size |
| --- | ---: | ---: | ---: |
| `.text` | `0x1000` | `0x400` | 81,920 |
| `.rdata` | `0x15000` | `0x14400` | 1,536 |
| `.data` | `0x16000` | `0x14A00` | 13,312 |
| `.idata` | `0x1C000` | `0x17E00` | 4,096 |
| `.rsrc` | `0x1D000` | `0x18E00` | 10,752 |
| `.reloc` | `0x20000` | `0x1B800` | 9,728 |

The supplied ZIP contains the same `KALEID95.SCR` and a readme. The extracted `.SCR` is the analyzed artifact.

### Rendering and timing evidence

Static imports provide concrete, high-value implementation clues:

- **Vector path construction:** `MoveToEx`, `LineTo`, and `PolyBezier`; `CreatePen` and `SelectObject`.
- **Indexed palette animation:** `CreatePalette`, `SetPaletteEntries`, `SelectPalette`, `RealizePalette`, and `AnimatePalette`.
- **Frame/timing:** `SetTimer`, multimedia `timeSetEvent`, `timeBeginPeriod`, `GetTickCount`.
- **Audio capture:** `waveInOpen`, `waveInStart`, buffer preparation/add/reset/close functions, and device enumeration.

This is evidence for a line/Bezier renderer with 8-bit palette cycling, not evidence for a Windows GDI XOR raster operation. The binary does **not** import `SetROP2`, `BitBlt`, `PatBlt`, or `StretchDIBits`. The prior proposal to prescribe Canvas `globalCompositeOperation = 'difference'` is therefore ungrounded for Kaleidoscope 95 and should not be made a Phase 3 requirement.

### Resource map

All resources are English (`LANGID 1033`). No `RT_MENU`, bitmap, cursor, manifest, or version resource was found.

| Type | IDs | Count | Details |
| --- | --- | ---: | --- |
| `ICON` | 1 | 1 | 32 × 32, 4-bit DIB icon. |
| `GROUP_ICON` | 100 | 1 | References icon 1. |
| `DIALOG` | 102, 103, 104, 2003, 2005 | 5 | Configuration, color, speed, audio, and registration UI. |
| `STRING` | 1, 49, 63, 64, 66 | 5 | Product, configuration-store, help, password, and registration prompts. |
| `RCDATA` | `DLGINCLUDE` | 1 | 9-byte dialog include marker. |

### Recovered settings and direct strings

These labels are direct executable resources and should be the primary settings vocabulary if a historically faithful settings model is built:

| Dialog ID | Page | Controls / settings recovered |
| ---: | --- | --- |
| 2003 | Kaleidoscope 95 main configuration | Symmetry; Spin; Line Size; Trail Length; Speed; Rotations; Cheese Size; Cheese Type; Width; Splitting; Coloring; Rotation; Snazziness; Palette; Bands; Band Width; Free Floating; Migrating Depths; Depth (1–4); Audio; Configure Audio; Polite; Speed Limit; Favorites; Choose Randomly; Add; Remove; Last Pattern; New Design every _seconds_; Register; Help; OK; Cancel. |
| 2005 | Audio Configuration | Recording Device; Bands (stripes); Spinning; Sensitivity Settings; Red/Green/Blue Variations; Default Recording Method; Splitting; Dream Time; start dreaming after _seconds of silence_; Help; OK; Cancel. |
| 102 | Custom Color Palette | Lowest ↔ Highest RGB channel values, 0 (darkest) through 255 (brightest); Help; OK; Cancel. |
| 103 | System Speed Adjustments | Sets of Lines per Interval (1–50); Update Interval (10–100 ms); Divisor (1–50); estimated sets of lines per second; Help; OK; Cancel. |
| 104 | Registration | Registered User's Name; Registration Number; registration status; OK; Cancel. Not a port feature. |

Other recovered application strings identify `control.ini`, `ScreenSaver.Kaleid`, `kaleid95.hlp`, and an audio entitlement message. They are legacy storage/help artifacts rather than web-app requirements.

### Phase 2 implications

1. Treat the renderer as a **stateful sequence of lines/Bezier paths**, with a palette-index field, rather than assuming wedge duplication or pixel inversion.
2. Determine how `Symmetry`, `Rotations`, `Spin`, `Splitting`, `Width`, `Cheese Type`, `Cheese Size`, `Depth`, and `Migrating Depths` map to geometry by disassembling and labeling the code paths that read those settings.
3. Model the legacy color behavior as an indexed palette whose entries animate. A modern implementation can reproduce the visual result with a `Uint8Array` index buffer + 256-color lookup texture/canvas palette, or an RGB canvas shader; it should not start with `difference` blending.
4. Keep audio analysis optional and separate from core animation. The original supports wave-in input, but the core screensaver must also be deterministic without a microphone.

## Geiss 4.29 (`geiss.scr`)

### Identity and architecture

`Original/geiss_saver_429/geiss.scr` is a 180,224-byte x86 PE32 file with SHA-256 `dc14fdb40fb7e40089e37680618e80d8aac5264bb82cadbf58799a44156aac84`, timestamp 2009-06-20 18:03:45 UTC, and entry point RVA `0x1157A`.

Its imports are direct evidence for an audio-reactive DirectDraw architecture: `DDRAW.dll`, `DSOUND.dll`, `WINMM.dll`, `GDI32.dll`, `USER32.dll`, `KERNEL32.dll`, `COMCTL32.dll`, and `ADVAPI32.dll`. The documentation states that Geiss uses hand-tuned x86 assembly, DirectX, sound input, and mostly integer math; it specifically says it is neither polygon- nor sprite-based. This is a distinct generative-image pipeline, not a Kaleidoscope 95 implementation.

### Resources

| Type | IDs | Count | Details |
| --- | --- | ---: | --- |
| `ICON` | 1–4 | 4 | 32 × 32 4-bit, 16 × 16 4-bit, 32 × 32 8-bit, and 32 × 32 4-bit images. |
| `GROUP_ICON` | 102, 110, 116 | 3 | Icon groups. |
| `DIALOG` | 101, 109, 114, 117 | 4 | Main config, license, About, advanced config. |

There are no executable string-table resources. The accompanying `geiss_about.txt`, `geiss_faq.txt`, and `geiss_whatsnew.txt` are the authoritative readable settings documentation retained in `Original/geiss_saver_429/`.

### Recovered controls and documented behavior

| Dialog ID | Page | Settings recovered |
| ---: | --- | --- |
| 101 | Geiss 4.29 | Video Mode; Monitor; Vertical screen size (30–100%); sound input device and SOUND ENABLED; beat-driven wave brightness; music-independent wave colors; shifting effect frequency; coarse and solar palette frequency; 8-bit gamma correction; default wave scaling; dither; text/song-title suppression; debug info; advanced options. |
| 117 | Advanced Options | Frame idle delay (0–25 ms); Seconds between map changes (1–60); random song-title popup frequency; minimum frames between shifts; embedded-message display frames. |
| 109 | First Use | License acknowledgement. |
| 114 | About | Release identity and legacy platform requirements. |

The documentation additionally establishes: 25 selectable maps; presets that save map ID, random parameters, palette, waveform, extra effects, and wave scaling; 8/16/32-bit modes; and map selection/rating controls. In version 4.29, the mode-switch control was changed from frames to **1–60 seconds** and default display-mode selection follows the primary monitor.

### Reuse boundaries

Useful inspiration: explicit performance pacing, deterministic preset serialization, palette behavior, optional audio-reactive modulation, user ratings, and modes/maps as clean named configurations. Do not port Geiss binary assets, maps, text, trademarks, or effects verbatim. Its documentation reserves rights for generated images and commercial use.

## Consolidated direction for KALEIDO

Build the core around verified Kaleidoscope 95 concepts: parameterized line/Bezier generation, animated palette entries, symmetry/rotation, trails, depth/migration, and optional audio modulation. Borrow only interaction patterns from Zen Light and Geiss when they are independently redesigned and legally safe.

The next research pass should be **Kaleidoscope 95 code deconstruction**, starting at the imports above and tracing callers of `LineTo`, `PolyBezier`, `AnimatePalette`, `SetPaletteEntries`, `SetTimer`, and `timeSetEvent`. That can turn the current static evidence into verified state variables and formulas before a TypeScript engine is designed.
