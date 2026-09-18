# Phase 1 — Snoqualmie Static Binary Analysis

## Scope

`Original/Snoqualmie/Snoqualmie.scr` was inspected with the repeatable static parser at `tools/inspect-pe.mjs`; it was not executed. The directory also contains source screenshots and Internet Archive metadata. This report uses those files only as supplied reference material and does not reproduce or use any third-party registration or licensing data.

## Identity and binary layout

Snoqualmie is a 315,392-byte x86 PE32 Windows screensaver. Its SHA-256 is `f927dacc95f72cc2507e5b7bcbd6b197e77d2d6c8ed04c9f171afc34676b8c3c`; the PE timestamp is 1998-09-02 18:53:17 UTC; entry point RVA is `0x195A8`. Direct dialog text identifies it as **Snoqualmie 1.0** and credits Syntrillium Software Corporation (1998).

| Section | RVA | Raw offset | Raw size |
| --- | ---: | ---: | ---: |
| `.text` | `0x1000` | `0x1000` | 131,072 |
| `.rdata` | `0x21000` | `0x21000` | 4,096 |
| `.data` | `0x22000` | `0x22000` | 24,576 |
| `.idata` | `0x29000` | `0x28000` | 8,192 |
| `.rsrc` | `0x2B000` | `0x2A000` | 131,072 |
| `.reloc` | `0x4B000` | `0x4A000` | 12,288 |

## Rendering evidence

Static imports show both vector and pixel-buffer capabilities:

- **Path/pixel drawing:** `MoveToEx`, `LineTo`, `SetPixel`, `GetPixel`, `BitBlt`, `CreateDIBSection`, `CreateDIBitmap`, `CreateCompatibleDC`.
- **Timing:** `SetTimer` and `GetTickCount`.
- **Optional DirectDraw:** the UI exposes “Use Direct Draw,” while the executable imports `LoadLibraryA` and `GetProcAddress` but has no static `DDRAW.dll` import. This is consistent with dynamic loading, but the exact code path is unverified.
- **No static audio input API:** unlike Kaleidoscope 95, Snoqualmie has no `WINMM.dll` wave-in imports. Audio should not be inferred as a Snoqualmie feature.

Snoqualmie therefore looks like a dot/bitmap-field renderer with optional DirectDraw acceleration, not a direct substitute for Kaleidoscope 95’s palette-animated line/Bezier pipeline. Its settings language, however, is a very strong UI and product-model reference.

## Resource map

All discovered resources are English (`LANGID 1033`). There is no menu, manifest, or version resource.

| Type | IDs | Count | Details |
| --- | --- | ---: | --- |
| `CURSOR` / `GROUP_CURSOR` | 5 / 129 | 1 each | 32 × 32 cursor resource. |
| `BITMAP` | 104–111, 133, 141 | 10 | Eight 38 × 24 8-bit assets; one 231 × 155 8-bit asset; one 190 × 360 8-bit asset. |
| `ICON` / `GROUP_ICON` | 1–4 / 128 | 4 / 1 | 16 × 16 and 32 × 32, in 4-bit and 8-bit variants. |
| `DIALOG` | 100, 104, 131, 132, 134–136, 138, 143, 144, 2003 | 11 | About, purchase/registration, favorites/messages, auxiliary settings, and main property-sheet UI. |
| `STRING` | 1, 7 | 2 | Product name, About command, and standard “not standalone” message. |

## Recovered user-facing settings

The main dialog (ID `2003`) is a tabbed property sheet with the following direct labels:

- Favorites with add/remove and multi-select random rotation;
- Dimensionality, Initial Configuration, and Grains;
- Low Activity ↔ Lots O' Action;
- Low Viscosity ↔ Very Viscous;
- Low Complexity ↔ Fancier Stuff;
- Subtle Colors ↔ Bright;
- Dot styles: Dots, Sparkles, Fuzzies, Large Dots, Vertical Bars;
- Extra Twist, Leave Trails, Trail Spin, Dither, Reflections, Reflect Spin, and Symmetry;
- Random delay range in seconds;
- Use Direct Draw, Clock Face, Zodiac, Messages, and editable pop-up messages;
- Preview, Help, About, and standard OK/Cancel commands.

Associated dialogs define the remaining safe settings vocabulary:

| Dialog ID | Purpose | Settings / labels |
| ---: | --- | --- |
| 131, 135, 136 | Favorite management | Add New Favorite; remove/replace confirmation. |
| 132 | Pop-up Messages | message list, delay range, font, italic, bold, and multiline entry instruction. |
| 138 | Additional Configuration Settings | Initial Dots Color: Black, White, or Random; defaults; Help. |
| 100 | About | product description: dancing, rainbow-colored patterns made from many dots; high-color modes and DirectX are recommended. |
| 104, 143, 144 | Purchase / registration | Legacy commercial flow only; exclude from KALEIDO. |
| 134 | Password | Legacy Windows screensaver password flow; exclude from KALEIDO. |

## Relationship to the other references

Snoqualmie’s control vocabulary—activity, viscosity, complexity, color intensity, dot styles, trails, reflections, symmetry, favorites, and messages—closely overlaps the Zen Light configuration UI. That makes Snoqualmie the best evidence so far for a reusable **tabbed settings shell** around KALEIDO’s engine.

It does not supersede Kaleidoscope 95 as the primary behavior source. Kaleidoscope 95 has directly evidenced palette animation, vector/Bezier calls, and audio capture; Snoqualmie has directly evidenced DIB/pixel operations and optional DirectDraw. Phase 2 must keep those rendering models distinct rather than merging them into an assumed formula.

## Next code-analysis target

For Snoqualmie, trace callers of `CreateDIBSection`, `SetPixel`, `GetPixel`, `BitBlt`, `LineTo`, `SetTimer`, and the dynamically resolved DirectDraw entry points. That would establish whether the controls above mutate particles, a field texture, or rendered dot samples—and whether the screenshots reflect software or DirectDraw output.
