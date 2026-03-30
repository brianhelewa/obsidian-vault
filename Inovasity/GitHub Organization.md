Current MediMorphAI Repo Cleanup:
## Cleanup Complete

### What was done

|Step|Action|Result|
|---|---|---|
|Audit|Full repo scan|Mapped actual structure (`src/zstamp/` package, not `medimorph/`)|
|Dead files|Removed `_ul`, `nul`, `depth.png`, `depth_conf.png`, `__pycache__/`, `.pytest_cache/`, `egg-info/`|Clean|
|.gitignore|Created comprehensive gitignore|Excludes `.venv/`, `__pycache__/`, `*.pt`, `*.onnx`, `runs/*/`, `.claude/`, IDE files|
|CLI|Verified `medimorph`/`zstamp` commands work|`v0.1.0`, preview server starts OK|
|Viewer|Verified `viewer_assets/index.html`|6591 lines, Three.js/PLYLoader/OrbitControls confirmed|
|CONTRIBUTING.md|Created with accurate repo structure|Backend + frontend team guides, branching strategy, testing|
|ONBOARDING.md|Created in `docs/`|Week 1 checklist, CLI commands, known gaps, viewer architecture|
|Dependencies|Verified `pyproject.toml`|Intentionally minimal (numpy, Pillow, click) — heavy deps are optional|
|Deprecation notices|Skipped|No legacy root-level scripts exist in this repo|

### Adapted from prompt

The prompt assumed a `medimorph/` package and `vggt/viewer_next/` structure. The actual repo uses `src/zstamp/` with `viewer_assets/`. All docs were written to reflect the **real** structure.

### Not committed (gitignored)

- `models/` (3 model weight files)
- `runs/` (30+ pipeline run folders)
- `.venv/`
- `.claude/`