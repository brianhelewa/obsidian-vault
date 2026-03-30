# Onboarding -- New Team Members

## Week 1 checklist

### Admin
- [ ] Sign NDA (Inovasity_NDA.docx)
- [ ] Sign Team Agreement (Inovasity_Team_Agreement.docx)
- [ ] Join Discord (#backend or #frontend channel)
- [ ] Get GitHub repo access
- [ ] Confirm availability for Monday 6 PM meetings

### Technical
- [ ] Clone repo and install: `pip install -e .`
- [ ] Run a pipeline: `medimorph run --image examples/sample_images/wound_tissue_demo.png --preview`
- [ ] Or preview existing data: `medimorph preview --run runs/brown_skin_synthetic`
- [ ] Walk through all viewer tabs (Tissue/Depth/Texture/QV/AI Analysis/Flowsheet)
- [ ] Find where depth shows "1.00 rel" and volume shows "N/A"
- [ ] Read README.md, CONTRIBUTING.md, and this file
- [ ] Post a viewer screenshot in Discord

## Key concepts

### Pipeline flow
Photo capture --> AI segmentation --> 3D reconstruction --> Metrics --> Viewer --> Clinical notes

### CLI commands
```bash
# Run pipeline on an image (with live viewer)
medimorph run --image ./path/to/wound.jpg --preview

# Preview an existing run
medimorph preview --run runs/brown_skin_synthetic

# Generate synthetic test data
medimorph synth

# Train tissue segmentation model
medimorph train

# Evaluate against ground truth
medimorph evaluate
```

### Known gaps (your sprint work)
- Depth displays relative units ("1.00 rel") -- needs absolute mm calibration
- Volume shows "N/A" -- computation not implemented
- No synthetic ground-truth data for validation
- Tissue confidence at 69% -- needs to reach 80%+
- QA grade at C -- needs improvement to A/B

### Viewer architecture
The clinical viewer is a single HTML file (`src/zstamp/viewer_assets/index.html`) using:
- Three.js for 3D rendering (PLY mesh loading, orbit controls)
- Vanilla JS for all UI logic
- CSS custom properties for theming
- Fetch API for loading metrics.json and mesh files

The preview server (`src/zstamp/commands/preview.py`) serves the viewer and maps
`/run/outputs/*` URLs to the actual run folder on disk.

### Project structure
See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full repo map.

### Architecture docs
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) -- system architecture
- [docs/CLINICAL_VIEWER.md](CLINICAL_VIEWER.md) -- viewer design
- [docs/OUTPUT_CONTRACT.md](OUTPUT_CONTRACT.md) -- output file format spec
- [docs/RUN_FOLDER_SCHEMA.md](RUN_FOLDER_SCHEMA.md) -- run folder layout
- [docs/DEV_GUIDE.md](DEV_GUIDE.md) -- developer guide
