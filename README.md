# CX7 Programmable Visual Intelligence System

CX7 is a highly efficient programmable visual cell system designed for CozanetOS. It separation-of-concerns philosophy is customized for AI-centric visual construction, orchestration, and validation.

## Architectural Philosophy

1. **Programmable Units (Cells) have NO intelligence**: A `CX7Unit` is purely reactive. It contains coordinates, orientation, visual aspects (color, material, scaling, transparency), and capabilities, but doesn't make any decisions.
2. **Central Orchestration (WorldEngine)**: The CEO AI interfaces directly with the `WorldEngine` to emit `WorldCommand` batches. The `WorldEngine` coordinates millions of units efficiently across layouts and templates.
3. **Reactive Scheduling (AnimationEngine)**: Handles scheduling and relative transformations of units or entire semantic groups with easing support.
4. **Scene Inspection (VisionEngine)**: Inspects the layout, checks for constraints/collisions (e.g. overlap), calculates visual bounds, and verifies scene completeness so that the CEO AI can confirm its intent.

## Structure

- `src/types.ts`: Defines interfaces for scene state, unit properties, world commands, vision reports, and layout templates.
- `src/CX7Unit/unit.ts`: A purely reactive visual cell containing positional/rotational vectors, scaling, materials, transparency, and interaction settings.
- `src/WorldEngine/worldengine.ts`: Maintains the high-level scene state, handles batch commands, template layouts (Diagrams, Architecture, Networks), and scene lifecycle.
- `src/AnimationEngine/animation.ts`: Periodically tick-updates attributes (rotations, scales, custom waveforms like pulse, or linear movements) smoothly.
- `src/VisionEngine/vision.ts`: Evaluates spatial structure, visual overlap, bounds, and outputs structured natural language verification metrics.
