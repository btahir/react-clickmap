# Rendering and Performance Guide

## Rendering modes

- `heatmap`
- `clickmap`
- `scrollmap`

## Renderer behavior

- Prefers WebGL when available.
- Falls back to Canvas2D when needed.
- Handles WebGL context loss and restoration.

## Runtime behavior

- Throttled scroll handling with trailing updates.
- Batcher supports in-flight overlap and shutdown best-effort drain.
- Route transitions flush current queue boundaries.
