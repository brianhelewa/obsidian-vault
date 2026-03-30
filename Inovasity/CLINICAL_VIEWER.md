# Clinical Viewer - Dark Theme UI

Comprehensive guide for the new clinical-grade wound analysis viewer with depth heatmap rendering.

## Overview

The clinical viewer has been completely redesigned to match professional medical imaging software with:

- **Dark theme** throughout (optimized for extended use)
- **Depth heatmap rendering directly on 3D mesh** (toggleable via button)
- **Analytics panel** with tabbed metrics (Size/Depth/Tissue)
- **Priority indicators** (elevated/normal based on wound severity)
- **Fallback support** for older runs without `outputs/` directory
- **Depth legend** with color scale and labeled ticks

## Features

### 1. 3D Viewport (Left Side)

**Top Controls:**
- **View Toggle**: Switch between "3D View" (original colors) and "Depth Heatmap" (jet colormap)
- **Icon Buttons**: Reset camera, toggle wireframe

**Main Canvas:**
- Interactive Three.js 3D mesh rendering
- Orbit controls (rotate, zoom, pan)
- Dark background (#0a0a0a) for clinical aesthetic

**Depth Legend** (appears in Depth Heatmap mode):
- Positioned on right side of viewport
- Vertical gradient bar (red→yellow→green→cyan→blue)
- Labeled tick marks (max, mid, min)
- Units displayed (mm or rel)
- Semi-transparent backdrop

**Bottom Controls:**
- Screenshot / Fullscreen buttons (placeholders)
- Status pill showing mesh load status with colored indicator

### 2. Analytics Panel (Right Side)

**Header:**
- MediMorph AI branding
- Logo support (if available)

**Priority Banner:**
- Green indicator = Normal Priority
- Amber indicator = Elevated Priority (based on max_depth > 0.5 threshold)

**Run Info Cards:**
- Run ID (from metadata)
- Capture Date (formatted from timestamp)

**Wound Measurements Tabs:**

**Size Tab:**
- Area (mm² or pixels)
- Perimeter (mm or pixels)

**Depth Tab:**
- Max Depth (relative units or mm)
- Mean Depth (relative units or mm)

**Tissue Tab:**
- Segmented bar (horizontal stacked bar chart with tissue colors)
- 4 tissue tiles in 2x2 grid:
  - Granulation (red, #ef4444)
  - Slough (amber, #f59e0b)
  - Eschar (black, #171717)
  - Epithelial (pink, #ec4899)
- Each tile shows percentage

**Flowsheet Tab:**
- Placeholder for future progression tracking

**Processing Artifacts Section:**
- Collapsible toggle (arrow icon)
- Tabs for: Preprocessed, Mask, Depth, Confidence
- Compact artifact viewer (max 300px height)

**Footer:**
- "Generate Report" button (blue, opens /api/report.html)
- Version info (v2.2 Build 20260121-clinical)

### 3. Depth Heatmap Implementation

**Technique:** Vertex-colors from Z-coordinates

**Algorithm:**
1. Load PLY mesh geometry
2. Store original vertex colors (for restoration)
3. When "Depth Heatmap" clicked:
   - Find zMin/zMax from all vertex positions
   - For each vertex: normalize t = (z - zMin) / (zMax - zMin)
   - Apply jet colormap: `applyJetColormap(t)` → RGB color
   - Write to geometry color attribute
4. When "3D View" clicked:
   - Restore original colors

**Jet Colormap:**
Matches server-side implementation:
```javascript
function applyJetColormap(value) {
    // value in [0, 1]
    const r = Math.max(0, Math.min(255, (1.5 - 4 * Math.abs(value - 0.75)) * 255));
    const g = Math.max(0, Math.min(255, (1.5 - 4 * Math.abs(value - 0.5)) * 255));
    const b = Math.max(0, Math.min(255, (1.5 - 4 * Math.abs(value - 0.25)) * 255));
    return new THREE.Color(r / 255, g / 255, b / 255);
}
```

**Depth Legend:**
- Displays zMin, zMid (zMin + zMax)/2, zMax
- Scales values if `scale_mm_per_px` available (converts to mm)
- Shows "rel" or "mm" unit label
- Gradient matches jet colormap (top=red, bottom=blue)

**Fallback (No Mesh):**
If mesh unavailable, creates a plane with depth.png texture:
- Shows depth map as flat surface
- Displays amber warning: "Mesh unavailable — showing depth map plane"
- Still provides visual insight into wound depth

## Backend Changes

### `preview.py` - Fallback Detection

Updated `/api/run-info` endpoint to detect files in both `outputs/` and root:

```python
def file_exists_with_fallback(filename):
    if (outputs_dir / filename).exists():
        return outputs_dir / filename
    elif (self.run_dir / filename).exists():
        return self.run_dir / filename
    return None

mesh_path = file_exists_with_fallback("mesh.ply")
metrics_path = file_exists_with_fallback("metrics.json")
tissue_path = file_exists_with_fallback("tissue_analysis.json")

info = {
    "mesh_available": mesh_path is not None,
    "metrics_available": metrics_path is not None,
    "tissue_available": tissue_path is not None,
    "has_outputs_dir": outputs_dir.exists(),
    # ... other fields
}
```

**Benefits:**
- Works with both old runs (no `outputs/`) and new runs (has `outputs/`)
- Client JS checks `has_outputs_dir` to build correct mesh URL
- Graceful degradation if data missing

## Files Modified

### 1. `src/zstamp/viewer_assets/index.html`

**Before:** Light theme, 2-column grid layout, basic mesh viewer

**After:** Full-page dark theme app with:
- `<div class="app-container">` (flexbox, 100vh)
- Left: `<div class="viewport-section">` (flex: 1)
  - Top controls with toggle buttons
  - Canvas container
  - Depth legend (hidden by default)
  - Bottom status pill
- Right: `<div class="analytics-panel">` (fixed 420px width)
  - Header, priority banner, info cards
  - Measurement tabs with content
  - Collapsible artifacts
  - Footer with report button

**Key JavaScript additions:**
- `applyJetColormap(value)` function
- `toggleDepthHeatmap(enable)` function
- `updateDepthLegend(zMin, zMax)` function
- `createDepthMapPlane()` fallback function
- Tab switching for measurements
- Artifacts collapsible logic

### 2. `src/zstamp/viewer_assets/report.css`

**Before:** Print-focused report styles (A4, white background)

**After:** Interactive dark theme UI:
- Colors: #0a0a0a (bg), #121212 (cards), #262626 (borders)
- Typography: Inter/SF Pro-style system fonts
- Components:
  - `.viewport-section` (flexbox column)
  - `.view-toggle` with `.toggle-btn.active` (blue bg)
  - `.depth-legend` (absolute positioned, semi-transparent)
  - `.analytics-panel` (420px, overflow-y scrollable)
  - `.priority-banner.elevated` (amber indicator)
  - `.measurement-tabs` with underline active state
  - `.tissue-segmented-bar` (horizontal stacked bar)
  - `.tissue-tile` (2x2 grid cards)
  - Custom scrollbar styling (webkit)

**Responsive:**
- `@media (max-width: 1200px)`: Panel narrows to 360px, metric grids go single-column

### 3. `src/zstamp/commands/preview.py`

**Changes:**
- `_api_run_info()`: Added `file_exists_with_fallback()` helper
- Returns `has_outputs_dir: bool` field
- Metrics/tissue loaded from fallback paths if needed

### 4. `tests/test_clinical_viewer.py` (New)

Automated test covering:
1. HTML contains all new UI elements (viewport-section, analytics-panel, depth-legend, etc.)
2. `/api/run-info` includes `has_outputs_dir` field and fallback logic works
3. CSS is dark theme (#0a0a0a, etc.)

**Usage:**
```bash
python tests/test_clinical_viewer.py runs/test_clinical_ui
```

## Testing

### Run Automated Test

```bash
# Create a fresh run
medimorph run --image examples/sample_images/wound_sample.png --out runs/test_clinical_ui

# Run automated test
python tests/test_clinical_viewer.py runs/test_clinical_ui

# Should show:
# Results: 3/3 tests passed
# [SUCCESS] Clinical viewer is working correctly!
```

### Manual Testing

```bash
# Start preview server
medimorph preview --run runs/test_clinical_ui

# Open browser to http://localhost:8000
```

**What to test:**

1. **Dark Theme:**
   - Entire UI should be dark (#0a0a0a background)
   - Cards use #121212
   - Borders use #262626

2. **3D View Toggle:**
   - Mesh loads with original wound texture colors
   - No depth legend visible

3. **Depth Heatmap Toggle:**
   - Click "Depth Heatmap" button
   - Mesh colors change to jet colormap (blue=shallow, red=deep)
   - Depth legend appears on right side of viewport
   - Shows max/mid/min values
   - Units shown (rel or mm)

4. **Analytics Panel:**
   - Priority banner shows "Normal Priority" or "Elevated Priority"
   - Run ID and Capture Date populated
   - Click "Size" tab: See area and perimeter
   - Click "Depth" tab: See max/mean depth
   - Click "Tissue" tab: See segmented bar + 4 tiles

5. **Artifacts Section:**
   - Click "Processing Artifacts" to expand
   - Tabs: Preprocessed, Mask, Depth, Confidence
   - Images load correctly

6. **Status Pill:**
   - Bottom right shows "Mesh loaded" with green dot
   - Or "Mesh load failed" with red dot if error

7. **Fallback Handling:**
   - Test with old run: `medimorph preview --run runs/20260119_161954`
   - Should still load (no mesh, but graceful)
   - Status pill shows "No mesh data"
   - Depth map plane fallback may appear

## Acceptance Criteria ✅

All criteria met:

1. ✅ Running `medimorph run --image <img> --preview` opens dark report-style layout
2. ✅ Clicking "Depth Heatmap" shows heatmap **on the mesh** (not 2D image)
3. ✅ Depth legend appears next to model with labeled ticks (max/mid/min + unit)
4. ✅ Right panel shows metrics + tissue from `/api/run-info` (hides gracefully when absent)
5. ✅ No console spam 404 for `/favicon.ico` or `/api/ai-note` (returns 204)
6. ✅ Older run dirs without `outputs/` do not break viewer (fallback detection works)

## Troubleshooting

### Depth heatmap not showing colors

**Cause:** Mesh may have no Z variation (flat)

**Fix:** Check mesh in 3D view first - if it's completely flat, depth heatmap will have no gradient

### Legend shows all same values

**Cause:** `zRange < 0.001` (mesh is essentially flat)

**Solution:** This is expected for very shallow wounds - the colormap will be uniform

### Mesh loads in wrong position

**Cause:** Mesh not centered

**Fix:** Click "Reset Camera" button (circular arrow icon) to recenter view

### Analytics panel shows "--" for all values

**Cause:** Run doesn't have `metrics.json` or `tissue_analysis.json`

**Solution:** Re-run pipeline to completion:
```bash
medimorph run --image <path> --out runs/my_run
```

### Dark theme not loading

**Cause:** Browser cached old CSS

**Fix:**
1. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. Or restart preview server (it serves from `src/` in dev mode)

## Future Enhancements

Potential improvements:

1. **Screenshot Button:** Implement canvas.toBlob() download
2. **Fullscreen Button:** Use Fullscreen API
3. **Depth Scale Calibration:** When ArUco markers implemented, show mm instead of rel
4. **Flowsheet Tab:** Implement progression tracking across multiple runs
5. **Depth Contour Lines:** Overlay isolines on mesh in heatmap mode
6. **Measurement Tools:** Click to measure distance on mesh
7. **Compare Mode:** Side-by-side view of two runs (progression)

## Summary

The clinical viewer now provides:

- **Professional dark UI** matching medical imaging software
- **Depth visualization** directly on 3D mesh with toggleable jet colormap
- **Comprehensive analytics** with tabbed metrics (Size/Depth/Tissue)
- **Priority indicators** for clinical decision support
- **Robust fallback** handling for older runs
- **Depth legend** with labeled scale and units
- **Clean dark theme** optimized for extended viewing

All implemented with **zero new dependencies** - pure HTML/CSS/JS + Three.js (CDN).

Version: v2.2 (Build 20260121-clinical)
