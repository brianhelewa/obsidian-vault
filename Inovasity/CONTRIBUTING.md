# Contributing to MediMorphAI

## Getting started

```bash
git clone <repo-url>
cd medimorphai
pip install -e .
medimorph run --image examples/sample_images/wound_tissue_demo.png --preview
```

## Repository structure

```
src/zstamp/                 # Main package (installed as both `medimorph` and `zstamp`)
  __main__.py               # CLI entrypoint (`python -m zstamp`)
  cli.py                    # Click CLI definition
  pipeline.py               # Pipeline orchestration
  commands/                 # CLI subcommands (preview, run, synth, learn)
  stages/                   # Pipeline stages (preprocess, segment, depth, mesh, metrics...)
  backends/                 # Pluggable backends (mvp, ml, depth_ai)
  ml/                       # ML model training / inference
  mesh/                     # Mesh post-processing (smoothing, sculpting, roughness)
  metric_depth/             # Metric depth estimation (SfM, LiDAR, single-image)
  clinical/                 # Clinical notes, scales (WBP/TIME/TEXAS), charting
  llm/                      # LLM integration for AI clinical reports
  qa/                       # QA gates and reporting
  synth/                    # Synthetic data generation
  segmentation/             # Wound segmentation
  learning/                 # Ground truth & depth calibration learning
  viewer_assets/            # Production clinical viewer (Three.js)
    index.html              # Main viewer (~6500 lines)
    capture.html            # Camera capture UI
  viewer/                   # View server module

data/                       # Ground truth data and synthetic datasets
  synth/                    # Synthetic samples (50 samples)
  ground_truth_template.json

models/                     # Trained model weights (gitignored)

runs/                       # Pipeline output folders (gitignored, except samples)

docs/                       # Documentation
scripts/                    # Dev scripts (smoke test, model download, validation)
tests/                      # Test suite
examples/                   # Sample images and quickstart guide
knowledge_base/             # Clinical knowledge for LLM RAG
```

## Branching

- `main` -- stable, always working
- `dev` -- active development, merges to main weekly
- `feat/<name>` -- feature branches off dev
- `fix/<name>` -- bug fixes

## Workflow

1. Pull latest `dev`
2. Create `feat/<your-feature>` branch
3. Make changes, test locally
4. Push and open PR to `dev`
5. Get review from Brian or another team member

## Backend team

Tech stack: Python 3.10+, PyTorch, NumPy, Pillow, Click

Key files:
- [pipeline.py](src/zstamp/pipeline.py) -- pipeline orchestration
- [stages/](src/zstamp/stages/) -- individual pipeline stages
- [backends/](src/zstamp/backends/) -- pluggable reconstruction backends
- [ml/](src/zstamp/ml/) -- model training and inference
- [mesh/](src/zstamp/mesh/) -- mesh post-processing
- [clinical/scales.py](src/zstamp/clinical/scales.py) -- WBP/TIME/TEXAS clinical scales

## Frontend team

Tech stack: HTML/CSS/JS, Three.js, Chart.js

Key files:
- [viewer_assets/index.html](src/zstamp/viewer_assets/index.html) -- production clinical viewer (~6500 lines)
- [viewer_assets/capture.html](src/zstamp/viewer_assets/capture.html) -- camera capture UI
- [commands/preview.py](src/zstamp/commands/preview.py) -- preview server

## Run format

Each pipeline run produces:
```
runs/<run_id>/
  inputs/               # Source images
  intermediate/         # Working files
  outputs/
    mesh.ply            # 3D wound mesh
    mesh_tissue.ply     # Tissue-colored mesh
    metrics.json        # Measurements + tissue analysis
    tissue_analysis.json
    qa_report.json      # QA grading
    run_manifest.json   # Run metadata
    clinical_scales.json
    masks/              # Segmentation masks
```

## Testing

```bash
# Run test suite
pytest tests/

# Quick smoke test
bash scripts/dev_smoke.sh

# Validate a run's outputs
python scripts/validate_run.py runs/<run_id>

# Test preview server
medimorph preview --run runs/brown_skin_synthetic --port 9999
```

## Code style

- Python: follow PEP 8, use type hints where practical
- JavaScript: consistent with existing viewer code (vanilla JS, no framework)
- Comments: explain WHY, not WHAT
- Do NOT include API keys, patient data, or patent-specific implementation details in comments
