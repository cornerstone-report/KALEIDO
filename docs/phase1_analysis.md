# Phase 1 — Static Binary and Resource Analysis

## Scope and method

This inspection was performed without launching any supplied executable. `tools/inspect-pe.mjs` reads Portable Executable headers, resource directory entries, string tables, dialog templates, and manifests as data only.

> Important identity correction: the supplied primary binary is **Zen Light**, not an executable named `Kaleidoscope`. “Kaleidoscope” should remain only the working name of this port until a different original binary is supplied. A perfect-behavior port must use Zen Light as its reference.

## Supplied files

| Path | Finding |
| --- | --- |
| `Original/ZenLight/ZenLight.scr` | Primary PE32 Windows screensaver, 1,238,532 bytes. SHA-256 `d3d3addcc0a3bab375b0721b7bd55a415390af7f577854e33a4881db18024c36`. |
| `Original/ZenLight/ZenLight.exe` | Byte-identical copy of `ZenLight.scr`; same SHA-256. |
| `Original/ZenLight/Zen Light/ShowSSZM.exe` | 35,328-byte companion executable; not analyzed as a rendering source in this phase. |
| `Original/ZenLight/Zen Light/StartZenLight.exe` | 46,080-byte launcher; not analyzed as a rendering source in this phase. |
| `Original/ZenLight/Zen Light/regid.2008-07.com.ZenDogSoftware_58234FCF-B951-48CD-A47B-4BFEC2D2FEB4.swidtag` | Identifies product as Zen Light 2.1.4051 by Zen Dog Software. |
| `Original/ZenLight/Zen Light/ZenDog-EULA.rtf` | License artifact; review before redistributing derived assets or branding. |

Version resource facts: **Zen Light Screen Saver**, `ZenLight.scr`, Zen Dog Software, LLC, copyright 2013; PE timestamp 2014-02-01 11:19:36 UTC. The version fields and SWID tag both report `2.1.4051`.

## PE layout

The binary is an x86 PE32 executable (machine `0x014c`), image base `0x00400000`, entry point RVA `0x99253`. It has no packer section and exposes a normal Windows resource directory.

| Section | RVA | Raw offset | Raw size | Characteristics |
| --- | ---: | ---: | ---: | --- |
| `.text` | `0x001000` | `0x000400` | 695,808 | executable/read |
| `.rdata` | `0x0AB000` | `0x0AA200` | 119,296 | read |
| `.data` | `0x0C9000` | `0x0C7400` | 132,096 | read/write |
| `.rsrc` | `0x0F0000` | `0x0E7800` | 290,304 | read |

The resource directory starts at RVA `0x0F0000` (file offset `948,224`) and is 289,856 bytes. Every discovered localized resource is English (`LANGID 1033`) and declares Windows-1252.

## Resource inventory

There is **no `RT_MENU` resource**. The configuration UI is driven by dialog/property-page resources, not a classic Windows menu.

| Resource type | IDs | Count | Notes |
| --- | --- | ---: | --- |
| `CURSOR` | 12 | 1 | 308 bytes; group cursor 129 references it. |
| `BITMAP` | 116 | 1 | 128 × 128, 24-bit uncompressed DIB; 49,194 bytes. |
| `ICON` | 1–11 | 11 | One group icon, below. |
| `DIALOG` | 131, 132, 135, 136, 138, 144, 2003–2017, 2019, 2020 | 23 | All are extended dialog templates. |
| `STRING` | 1, 7, 8, 9, 10, 11, 127 | 7 | Native string-table blocks. Entries 3–9 and 104–162 are intentionally unreadable/obfuscated rather than useful UI prose. |
| `GROUP_CURSOR` | 129 | 1 | One cursor entry. |
| `GROUP_ICON` | 1 | 1 | References all 11 `ICON` resources. |
| `VERSION` | 1 | 1 | Product metadata summarized above. |
| `MANIFEST` | 1 | 1 | Common Controls v6 and `asInvoker`; no elevation request. |

### Icon table

Group icon 1 contains 48, 32, and 16-pixel assets in 4-bit, 8-bit, and 32-bit forms, plus 256, 128, 48, 32, and 16-pixel 32-bit variants. Icon 7 is PNG-encoded (`89 50 4E 47`); icon 8 is 128 × 128. These are product-shell assets, not evidence of the screensaver’s rendered pattern format.

## Configuration dialogs and visible strings

The table below is the complete catalog of direct, user-visible dialog text recovered from the resource templates. `#128`, `#129`, `#130`, and `#132` are standard button/edit/static/trackbar window-class ordinals; the actual control IDs are preserved in the binary inspection tool if needed for a UI recreation.

| Dialog ID | Title / page | Direct visible controls and labels |
| ---: | --- | --- |
| 131 | Add New Favorite | New Favorite's Name; OK; Cancel |
| 132 | Pop-up Messages | Messages; Message delay between / and / seconds; Font; Italic; Bold; Help; text-entry instruction; OK; Cancel |
| 135 | Remove Favorite? | Press OK to remove this favorite; OK; Cancel |
| 136 | Replace Existing Favorite? | Click Yes to replace this favorite; Repeat this answer for all following items; Yes; No |
| 138 | Additional Configuration Settings | Initial Dots Color; Black; White; Random; Set To Defaults; Help; OK; Cancel |
| 144 | Serial Number | registration/order-number copy; Name; Serial Number; Handle (Nickname); Location/Website; Close; OK |
| 2003 | Zen Light (main property sheet) | Power; Max CPU Usage; Lower CPU after; About; Help; Buy Now; Evolve Settings Now; Preview; Favorites; Zen; Mine; Web; Allow Pattern Drift; Evolve; OK; Cancel |
| 2004 | Dots! | Grains; Reflections; Symmetric; Wrap; Movement; Low Activity ↔ Lots O' Action; Gentle ↔ Turbulent; Low Viscosity ↔ Very Viscous; Low Complexity ↔ Fancier Stuff; Confinement; Influence Range |
| 2005 | Color | Subtle Colors ↔ Bright; Pure Tones ↔ Pastels; Point Magnitude ↔ Full; Field Based Color; New Dots; Black; White; Random; Dim; Fainter Detail ↔ More Contrast; Gamma; White Background (Invert) |
| 2006 | Random Slideshow | On; Off; All; Variation from original (evolutions); Time between slides (seconds); to; multi-select instruction |
| 2007 | Dot Style | Pixels; Points; Large Points; Sparkles; Vertical Bars; Fuzzies; Discs; Rings; Trails; Leave Trails; Dither; Fuzziness; Quick-n-Dirty; Shimmering; Off ↔ Bright; Broad Highlight ↔ Narrow; Add Shine; Add Glitter |
| 2008 | Pattern | Style; Motion; Extra Twist; Wrap; Mobius; Customize Pattern; Leisurely Pace ↔ Frantic |
| 2009 | Display / extras | Active Monitor; Snapshots; Resolution; High Accuracy Preview; Limit Frame Rate; fps; Extras; Slideshow Titles; Clock; Zodiac; Show Messages; Edit Messages; Auto Save; Choose Save Folder; System; Show Layers; OpenGL |
| 2010 | Share Your Creation | Choose a Favorite; Title; Keywords; Your Nickname; Your Location; Change; Share with World; Snap Screenshot; Submit Now; Export to File; Export; Export to a single file; Select Slideshow; Select All |
| 2011 | Add New Favorite (import) | Choose the Favorite's you'd like to import; Import to Favorites; Cancel |
| 2012 | Export Favorites to Individual Files | Save selected favorites to this folder; Browse; Use this prefix for filenames; following files; Save; Cancel |
| 2013 | Choose Auto Save Folder and Filename Prefix | save-screen-shot folder; Browse; filename prefix; Explore; F12 or P snapshot instruction; Save `.zen` settings file with image; OK; Cancel |
| 2014 | About Zen Light | product description; F12 save; `0`–`9` change symmetry; My Zen Light; Visit ZenDogSoftware.com; Registration; License Agreement |
| 2015 | My Zen Light | share identity explanation; Handle (Nickname); Location/Website; Close; OK |
| 2016 | Buy Zen Light | product purchase/registration text; Visit ZenDogSoftware.com; Registration; contact email |
| 2017 | Audio Sync | On; Off; Less Sensitive ↔ Quite Touchy; Broad ↔ Pinpoint; Selectivity; Devices; Static |
| 2019 | World Library | Search; All; Mine; Show More Details; Show Mine; Widthdraw [sic]; Info |
| 2020 | Shared Favorite Details | sharing status; Title; Keywords; Description; Sharing since; Downloads; Stop Sharing; Update Library; Add to Favorites; Go Back |

The first product string table also contributes IDs: `1 = Zen Light`, `2 = My New Favorite`, `99 = 2.1.4051`, `101 = &About Zen Light...`, and `103 = This is a screen saver and can not be run as a standalone executable.` Remaining readable prose comes directly from the dialogs above.

## Native implementation clues

The read-only string scan exposes RTTI class names including `CDrawWnd`, `CFlipperBase`, `CFlipperGDI32`, `CColorPage`, `CConfigPage`, `CDisplayPage`, `CPropertyPage`, `CRandomPage`, `CExportPage`, and `CAudioPage`. Imported symbol names include GDI+ image/color routines and OpenGL pixel operations (`glDrawPixels`, `glPixelTransferf`, `glPixelZoom`).

This supports the following facts:

- The original contains several rendering/display paths and its configuration is broader than a simple N-segment kaleidoscope.
- `CFlipperGDI32` strongly suggests a GDI drawing path, but it does **not** prove that a Canvas `difference` composite is pixel-identical.
- A symmetry setting is explicit: the About dialog maps keyboard `0` through `9` to symmetry changes.
- “Reflections,” “Symmetric,” “Wrap,” “Mobius,” “Extra Twist,” “Viscosity,” “Confinement,” and “Influence Range” are actual exposed controls, not proposed controls.

## What phase 1 cannot establish

Resource analysis cannot recover exact equations, random seeds, frame-step behavior, palette transforms, or collision/boundary logic. Those require static code analysis of `.text` (disassembly/decompilation), plus controlled behavioral capture from a safe reference environment. Therefore Phase 2 must label every formula as either **verified from code**, **verified from observation**, or **implementation hypothesis**; it must not claim 100% fidelity from the present resource evidence alone.

## Recommended architecture decision

React remains a sensible shell for a reusable settings UI, but it should not own frame-to-frame state. Use a framework-neutral TypeScript/WebGL-or-Canvas engine with a thin React wrapper. Keep the first port’s settings model focused on the rendering-relevant controls discovered above; defer registration, World Library, product links, system power throttling, and Windows-only save/export flows.

Before Phase 2, define the intended target in writing: (1) a behavioral Zen Light preservation port, or (2) a new kaleidoscope inspired by it. That decision determines whether reverse engineering native control flow is necessary.
