# Viewer Integration Summary

This document summarizes the unified viewer integration completed for MediMorph AI Z-Stamp.

## Overview

The viewer has been fully integrated into the main repository. There is **no separate viewer repository** required. All viewer assets are packaged with the Python distribution and work immediately after `pip install`.

## What Was Implemented

### 1. Viewer Assets Packaging

**Location**: `src/zstamp/viewer_assets/`

- `index.html` - Interactive web viewer with Three.js 3D mesh rendering
- `report.css` - Professional report styling for PDF generation
- `brand/` - Directory for brand logos (MediMorph AI, Inovasity)

**Packaging**: Assets are included via `pyproject.toml` package-data configuration and extracted to a temp directory at runtime using `importlib.resources`.

### 2. Preview Server

**Location**: `src/zstamp/commands/preview.py`

HTTP server with the following features:
- Serves viewer HTML/CSS/assets
- Serves run outputs from `<run_dir>/outputs/`
- REST API endpoints for programmatic access

**API Endpoints**:
- `GET /api/run-info` - Run metadata and available outputs
- `GET /api/report.html` - Generated HTML report
- `GET /api/tissue` - Tissue analysis data
- `GET /api/ai-note` - AI clinical note (if available)
- `POST /api/ai-note` - Save AI clinical note
- `POST /api/draft-note` - Generate draft note (stub)
- `GET /run/outputs/*` - Direct file access

### 3. CLI Commands

**Two commands available** (both `medimorph` and `zstamp` work as aliases):

```bash
# Run analysis with integrated preview
medimorph run --image <path> [--preview] [--no-browser] [--port <port>]

# Preview existing results
medimorph preview --run <run_dir> [--no-browser] [--port <port>]
```

**Run Command Options**:
- `--preview` / `--no-preview` - Launch preview server after processing (default: false)
- `--no-browser` - Don't open browser automatically
- `--port <N>` - Custom port (default: 8000, use 0 for ephemeral)

### 4. Report Generation

**Location**: `src/zstamp/report/build_report.py`

Generates professional HTML reports with:
- Run metadata and stage information
- Wound measurements (area, perimeter, depth)
- Tissue analysis breakdown with visualization
- 3D mesh information
- PDF-ready styling using `report.css`

### 5. Viewer Features

The web viewer (`http://localhost:8000`) provides:

**3D Visualization**:
- Interactive Three.js mesh rendering
- Orbit controls (rotate, zoom, pan)
- Wireframe toggle
- Vertex colors from original image
- Auto-centering and camera reset

**Metrics Dashboard**:
- Area (mm² and pixels)
- Perimeter (mm and pixels)
- Maximum depth (relative units)
- Mean depth (relative units)

**Tissue Analysis**:
- Percentage breakdown by type
- Visual distribution bars
- Confidence statistics
- Available tissue types: granulation, slough, eschar, epithelial

**Controls**:
- "Reset View" button
- "Toggle Wireframe" button
- "Open Report" button - Opens printable HTML report in new tab

## File Structure

```
src/zstamp/
├── viewer_assets/          # Packaged viewer assets
│   ├── index.html          # Main viewer page
│   ├── report.css          # Report styling
│   └── brand/              # Brand logos
│       └── README.txt      # Logo placeholder instructions
├── commands/               # CLI command implementations
│   ├── __init__.py
│   └── preview.py          # Preview server
├── report/                 # Report generation
│   └── build_report.py     # HTML report builder
└── cli.py                  # Updated with preview command
```

## Output Contract Compliance

The pipeline now writes outputs to the correct locations per the viewer contract:

**Viewer-facing outputs** (`runs/<id>/outputs/`):
- `mesh.ply` - 3D mesh
- `mesh_meta.json` - Mesh metadata
- `metrics.json` - Wound measurements
- `tissue_analysis.json` - Tissue classification
- `confidence.png` - Confidence heatmap
- `masks/*.png` - Individual tissue masks

**Internal artifacts** (`runs/<id>/`):
- `preprocessed.png` - Preprocessed image
- `calibration.json` - Calibration data
- `mask.png` - Binary wound mask
- `depth_rel.tiff` - Relative depth map
- `depth_confidence.tiff` - Depth confidence
- `metadata.json` - Run metadata

## Installation & Testing

### Install

```bash
pip install -e .
```

This installs both `medimorph` and `zstamp` commands.

### Test Viewer Integration

```bash
# Run viewer integration tests
python tests/test_viewer_integration.py

# All tests should pass:
# - Viewer assets packaged correctly
# - Preview server imports
# - CLI commands registered
```

### Test End-to-End

```bash
# Run analysis without preview
medimorph run --image examples/sample_images/wound_tissue_demo.png

# Preview the results
medimorph preview --run runs/<timestamp>

# Or run with automatic preview
medimorph run --image examples/sample_images/wound_tissue_demo.png --preview
```

## Usage Examples

### Example 1: Quick Analysis with Preview

```bash
medimorph run --image path/to/wound.jpg --preview
# Opens browser automatically showing:
# - 3D mesh visualization
# - Wound metrics
# - Tissue analysis
# - Downloadable report
```

### Example 2: Batch Processing

```bash
# Process without viewer
for img in *.jpg; do
    medimorph run --image "$img" --out "runs/batch_$(basename $img)"
done

# Later, preview any result
medimorph preview --run runs/batch_wound1.jpg
```

### Example 3: Programmatic API Access

```bash
# Start preview server
medimorph preview --run runs/my_analysis --no-browser &

# Access via curl
curl http://localhost:8000/api/run-info
curl http://localhost:8000/run/outputs/metrics.json
curl http://localhost:8000/api/report.html > report.html
```

## Dependencies

**Added for viewer**:
- None! Uses standard library HTTP server
- Three.js loaded via CDN (no npm/webpack needed)

**Existing dependencies**:
- `numpy>=1.20` - Array operations
- `Pillow>=8.0` - Image I/O
- `click>=8.0` - CLI framework

## Cross-Platform Support

The implementation works on **macOS, Linux, and Windows**:
- Uses `tempfile.gettempdir()` instead of hardcoded `/tmp`
- Uses `pathlib.Path` for cross-platform path handling
- HTTP server uses standard library (no platform-specific deps)

## Security Considerations

- Run outputs are served read-only
- Path traversal protection (ensures files are within run directory)
- Server binds to `localhost` only (not exposed to network)
- No authentication required (local development tool)

## Future Enhancements

Potential improvements:
1. Add brand logos (currently placeholders)
2. Implement AI clinical note generation (currently stub)
3. Add progression tracking across multiple runs
4. Support for comparative analysis (multiple wounds)
5. Export capabilities (JSON, CSV, PDF)

## Troubleshooting

### Viewer assets not found
```bash
# Reinstall package
pip install -e . --force-reinstall --no-deps
```

### Port already in use
```bash
# Use different port
medimorph preview --run runs/my_run --port 9000

# Or use ephemeral port (auto-assigned)
medimorph preview --run runs/my_run --port 0
```

### Browser doesn't open
```bash
# Use --no-browser and manually navigate
medimorph preview --run runs/my_run --no-browser
# Then open: http://localhost:8000
```

## Implementation Notes

- Viewer assets are extracted once per temp directory lifetime (cached)
- HTTP server is single-threaded (sufficient for local dev)
- Three.js uses importmap (modern browsers only)
- Report CSS is mobile-responsive and print-optimized
- All file paths use `pathlib.Path` for consistency

## Testing Coverage

The viewer integration includes:
- Asset packaging verification
- Preview server import tests
- CLI command registration tests
- End-to-end pipeline + viewer workflow

Run all tests:
```bash
python tests/test_viewer_integration.py  # Viewer-specific
python tests/run_tests.py                # Full pipeline tests
```

## Summary

The viewer is now **fully integrated** into the main repository:
- ✅ No separate viewer repo needed
- ✅ Works after `pip install -e .`
- ✅ Viewer assets packaged correctly
- ✅ Preview command available
- ✅ Run + preview integration
- ✅ Cross-platform support
- ✅ Complete test coverage

Users can now run `medimorph run --image <path> --preview` and immediately see interactive 3D visualization and analysis results in their browser.
