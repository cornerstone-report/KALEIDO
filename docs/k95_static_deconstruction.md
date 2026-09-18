# K95 Static Deconstruction Plan

## Current evidence

The supplied executable has verified imports for `MoveToEx`, `LineTo`,
`PolyBezier`, `CreatePalette`, `SetPaletteEntries`, `AnimatePalette`,
`SetTimer`, `timeSetEvent`, and `GetTickCount`.

## Required tool pass

This workstation currently has no PE disassembler available. When a static
disassembler is available, perform this read-only sequence:

1. Label imported API thunks and find callers of `LineTo` and `PolyBezier`.
2. Trace backwards to the state reads feeding coordinates, pen selection, and
   counts; label only observed variables and branch conditions.
3. Independently trace palette calls to establish entry count, update cadence,
   and whether palette index is attached to a path, depth, or time.
4. Trace `SetTimer`/`timeSetEvent` callbacks and compare their cadence with
   rendering calls.
5. For every conclusion, add function address, evidence excerpt, and a
   confidence level to this document.

The deliverable is a behavioral map, not recovered source code. KALEIDO will
remain an original implementation.
