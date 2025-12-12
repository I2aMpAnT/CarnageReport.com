# Map GLB Files

Place Halo 2 map GLB files in this directory for the 3D viewer.

## Naming Convention

GLB files should be named exactly as the map appears in the game data:

- `Midship.glb`
- `Lockout.glb`
- `Sanctuary.glb`
- `Warlock.glb`
- `Beaver Creek.glb`
- `Ascension.glb`
- `Coagulation.glb`
- `Zanzibar.glb`
- `Ivory Tower.glb`
- `Burial Mounds.glb`
- `Colossus.glb`
- `Headlong.glb`
- `Waterworks.glb`
- `Foundation.glb`
- `Backwash.glb`
- `Containment.glb`
- `Desolation.glb`
- `District.glb`
- `Elongation.glb`
- `Gemini.glb`
- `Relic.glb`
- `Terminal.glb`
- `Tombstone.glb`
- `Turf.glb`
- `Uplift.glb`

## GLB Requirements

- Format: glTF Binary (.glb)
- Coordinate system: Y-up (standard glTF)
- The viewer will handle coordinate conversion from Halo's coordinate system
- Draco compression is supported for smaller file sizes

## Coordinate Mapping

Halo uses: X=forward, Y=left, Z=up
The viewer converts to Three.js: X=right, Y=up, Z=forward

Telemetry positions are automatically converted when rendering.

## Fallback

If a GLB file is not found for a map, the viewer will display player positions on a grid.
