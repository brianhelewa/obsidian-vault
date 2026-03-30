# Changes Summary - Fresh Assets & Depth Visualization

## Problem Statement

**Before**:
1. Viewer served stale cached assets from temp folder - HTML changes not visible without reinstall
2. Web UI didn't show depth heatmaps or processing artifacts (HTML had the sections but they weren't working)
3. Noisy 404 errors for `/api/ai-note` and `/favicon.ico` in preview server logs
4. No automated smoke test for preview server endpoints

**After**:
1. ✅ Development mode serves fresh assets directly from `src/` - changes visible immediately
2. ✅ Depth heatmap endpoints working (`/api/depth.png`, `/api/depth-confidence.png`)
3. ✅ Clean logs - no 404 spam (returns 204 for missing optional resources)
4. ✅ Comprehensive smoke test with 6 test cases

## Files Changed

### 1. `src/zstamp/commands/preview.py` (Modified, ~100 lines changed)

**Changes**:

#### A) `extract_viewer_assets()` function - Fresh asset serving

**Before**:
```python
def extract_viewer_assets():
    """Extract viewer assets from package to temporary directory."""
    temp_dir = Path(tempfile.gettempdir()) / "medimorph_viewer"
    temp_dir.mkdir(exist_ok=True)

    # Check if already extracted (basic caching)
    index_path = temp_dir / "index.html"
    if index_path.exists():
        return temp_dir  # ← PROBLEM: Always returns cached version!
```

**After**:
```python
def extract_viewer_assets():
    """Extract viewer assets from package to temporary directory.

    In development mode (editable install), serves directly from src/.
    In installed mode, extracts to temp with version-based cache busting.
    """
    # First, check if we're in development mode (editable install)
    dev_assets_path = Path(__file__).parent.parent / 'viewer_assets'
    if dev_assets_path.exists() and (dev_assets_path / 'index.html').exists():
        # Development mode: serve directly from source
        print(f"[DEV MODE] Serving viewer assets from: {dev_assets_path}")
        return dev_assets_path  # ← SOLUTION: Serve directly from src/

    # Production mode: extract to temp with cache busting
    import hashlib
    version_hash = hashlib.md5(index_content.encode()).hexdigest()[:8]
    temp_dir = temp_base / f"v_{version_hash}"  # ← Versioned temp folder
    # ... (cache cleanup logic)
```

**Why This Matters**:
- **Development**: `pip install -e .` now serves assets from `src/zstamp/viewer_assets/` directly
- **Production**: `pip install .` uses versioned cache based on HTML content hash
- **Visibility**: Logs `[DEV MODE]` or `[CACHE HIT]` so you know which path is active

#### B) `do_GET()` method - Fixed favicon 404

**Before**:
```python
def do_GET(self):
    parsed = urlparse(self.path)
    path = parsed.path

    if path.startswith('/api/'):
        return self._handle_api(path, parsed.query)
    # ... favicon not handled → 404!
```

**After**:
```python
def do_GET(self):
    parsed = urlparse(self.path)
    path = parsed.path

    # Handle favicon to avoid 404 noise
    if path == '/favicon.ico':
        return self._api_favicon()  # ← Returns 204 No Content

    if path.startswith('/api/'):
        return self._handle_api(path, parsed.query)
    # ...
```

#### C) Depth PNG endpoints - Already working!

No changes needed. These were already implemented:
- `_api_depth_png()` - Loads depth_rel.tiff, normalizes, applies jet colormap, returns PNG
- `_api_depth_confidence_png()` - Same for depth_confidence.tiff
- `_api_favicon()` - Returns 204 No Content
- `_api_ai_note()` - Returns 204 No Content if missing (not 404)

**Key Implementation Details**:
```python
def _api_depth_png(self):
    """Generate PNG heatmap from depth_rel.tiff."""
    # Load TIFF with Pillow
    depth_img = Image.open(depth_path)
    depth = np.array(depth_img, dtype=np.float32)

    # Load mask for better normalization
    if mask_path.exists():
        masked_depth = depth[mask > 0]
        vmin, vmax = masked_depth.min(), masked_depth.max()

    # Normalize to 0-255
    normalized = ((depth - vmin) / (vmax - vmin) * 255).astype(np.uint8)

    # Apply jet colormap (pure NumPy, no matplotlib)
    heatmap_rgb = self._apply_colormap(normalized)

    # Send as PNG
    png_img = Image.fromarray(heatmap_rgb, mode='RGB')
    # ...
```

### 2. `src/zstamp/viewer_assets/index.html` (Modified, ~5 lines changed)

**Changes**:

#### Added footer with version identifier

**Before**:
```html
    </main>
</body>
</html>
```

**After**:
```html
    </main>

    <footer style="max-width: 1400px; margin: 2rem auto; padding: 1rem 2rem; text-align: center; color: #999; font-size: 0.85rem;">
        <p>MediMorph AI Viewer v2.1 (Build 20260121-artifacts) | Powered by Three.js</p>
    </footer>
</body>
</html>
```

**Why This Matters**:
- Visual confirmation that the fresh HTML is loaded
- Easy to change version string to test if assets are updating

**Note**: The HTML already had the full depth heatmap UI:
- Processing Artifacts section with tabs (lines 378-390)
- Artifact viewer with dynamic loading (lines 618-671)
- Tissue masks gallery (lines 673-692)
- These were **already present** from previous work, just not visible due to stale caching!

### 3. `tests/test_preview_smoke.py` (New file, ~205 lines)

**What It Does**:

Automated smoke test that boots a preview server on ephemeral port and verifies:

1. ✅ GET / returns HTML containing "Processing Artifacts"
2. ✅ GET /api/depth.png returns 200 image/png (when depth_rel.tiff exists)
3. ✅ GET /api/depth-confidence.png returns 200 image/png (when depth_confidence.tiff exists)
4. ✅ GET /api/ai-note returns 204 No Content (when missing, not 404)
5. ✅ GET /favicon.ico returns 204 No Content (not 404)
6. ✅ GET /api/run-info returns valid JSON with run_id and timestamp

**Usage**:
```powershell
# Windows
python .\tests\test_preview_smoke.py runs\20260119_161954

# macOS/Linux
python tests/test_preview_smoke.py runs/20260119_161954
```

**Sample Output**:
```
Testing preview server with run: 20260119_161954
============================================================
[DEV MODE] Serving viewer assets from: c:\...\src\zstamp\viewer_assets

Starting test server on port 61725...

[TEST 1] GET / (index.html)
  [PASS] HTML contains 'Processing Artifacts'

[TEST 2] GET /api/depth.png
  [PASS]: Returned 200 image/png (1388 bytes)

[TEST 3] GET /api/depth-confidence.png
  [PASS]: Returned 200 image/png (1388 bytes)

[TEST 4] GET /api/ai-note (should return 204 if missing)
  [PASS]: Returned 204 No Content (no noisy 404)

[TEST 5] GET /favicon.ico (should return 204)
  [PASS]: Returned 204 No Content (no noisy 404)

[TEST 6] GET /api/run-info
  [PASS]: Valid run info (run_id: 20260119_161954)

============================================================
Results: 6/6 tests passed
============================================================
```

### 4. `VERIFICATION.md` (New file, documentation)

Comprehensive verification guide with:
- Explanation of all changes
- Step-by-step verification commands (Windows + macOS/Linux)
- Acceptance criteria checklist
- Troubleshooting section
- Manual testing instructions

## Test Results

### Unit Tests: ✅ PASS

```
python tests/run_tests.py

Results: 7 passed, 0 failed, 7 total
```

All existing tests still pass:
- MVPSegmentationBackend
- MVPDepthBackend
- Segmentation stage
- Depth estimation stage
- Depth gradient
- Mesh stage (outputs/ directory)
- Tissue analysis stage (outputs/ directory)

### Smoke Test: ✅ PASS

```
python tests/test_preview_smoke.py runs/20260119_161954

Results: 6/6 tests passed
```

Key findings:
- ✅ `[DEV MODE]` confirms serving from `src/zstamp/viewer_assets/`
- ✅ HTML contains "Processing Artifacts" (fresh viewer UI)
- ✅ Depth PNG endpoints return valid images
- ✅ No 404s for ai-note or favicon

## Verification Commands

### Windows PowerShell

```powershell
# 1. Run unit tests
python .\tests\run_tests.py

# 2. Run smoke test
python .\tests\test_preview_smoke.py runs\20260119_161954

# 3. Run full pipeline with preview
medimorph run --image ".\examples\sample_images\wound_sample.png" --preview

# 4. Manual depth endpoint test (while preview running)
Invoke-WebRequest -Uri http://localhost:8000/api/depth.png -OutFile depth.png
Invoke-WebRequest -Uri http://localhost:8000/api/depth-confidence.png -OutFile depth_conf.png

# 5. Preview existing run
medimorph preview --run runs\20260119_161954 --no-browser
```

### macOS/Linux

```bash
# 1. Run unit tests
python tests/run_tests.py

# 2. Run smoke test
python tests/test_preview_smoke.py runs/20260119_161954

# 3. Run full pipeline with preview
medimorph run --image examples/sample_images/wound_sample.png --preview

# 4. Manual depth endpoint test (while preview running)
curl http://localhost:8000/api/depth.png > depth.png
curl http://localhost:8000/api/depth-confidence.png > depth_conf.png

# 5. Preview existing run
medimorph preview --run runs/20260119_161954 --no-browser
```

## What Users Will See

### Before (Stale Assets)

1. Run `medimorph run --image <path> --preview`
2. Browser opens showing **old viewer** without depth heatmaps
3. Edit `src/zstamp/viewer_assets/index.html`
4. Run preview again → **still shows old version** (cached!)
5. Need to manually clear temp folder or reinstall

### After (Fresh Assets)

1. Run `medimorph run --image <path> --preview`
2. Console shows: `[DEV MODE] Serving viewer assets from: .../src/zstamp/viewer_assets`
3. Browser opens showing **new viewer** with:
   - Processing Artifacts tabs (Preprocessed, Mask, Depth, Depth Conf, Tissue Conf)
   - Tissue Masks grid (6 masks)
   - Footer: "MediMorph AI Viewer v2.1 (Build 20260121-artifacts)"
4. Edit `src/zstamp/viewer_assets/index.html` (e.g., change version)
5. Run preview again → **immediately shows changes!**
6. Clean console logs (no 404 spam)

## Technical Details

### Development Mode Detection

```python
# Check if we're in editable install
dev_assets_path = Path(__file__).parent.parent / 'viewer_assets'
if dev_assets_path.exists() and (dev_assets_path / 'index.html').exists():
    print(f"[DEV MODE] Serving viewer assets from: {dev_assets_path}")
    return dev_assets_path  # Serve directly from src/
```

**Pros**:
- Simple and reliable
- Works for any editable install (`pip install -e .`)
- No environment variables or config needed

**How It Works**:
- `Path(__file__)` = `src/zstamp/commands/preview.py`
- `.parent.parent` = `src/zstamp/`
- `/ 'viewer_assets'` = `src/zstamp/viewer_assets/`
- If this path exists → development mode

### Production Mode Cache Busting

```python
# Calculate version hash based on index.html content
index_content = viewer_assets.joinpath('index.html').read_text()
version_hash = hashlib.md5(index_content.encode()).hexdigest()[:8]

# Versioned temp directory
temp_dir = temp_base / f"v_{version_hash}"
```

**Pros**:
- Automatically invalidates cache when HTML changes
- Old versions cleaned up (keeps latest 2)
- Fast cache hit when HTML unchanged

**Example**:
- First run: extracts to `C:\Users\...\Temp\medimorph_viewer\v_a1b2c3d4`
- HTML changes: new hash → extracts to `v_e5f6g7h8`
- Old version `v_a1b2c3d4` deleted

### Depth PNG Generation

**Pipeline**:
1. Load TIFF: `Image.open(depth_path)` → PIL Image
2. Convert to NumPy: `np.array(depth_img, dtype=np.float32)`
3. Normalize: Use masked region if available (better contrast)
4. Apply colormap: Pure NumPy jet approximation (no matplotlib)
5. Convert to PIL: `Image.fromarray(heatmap_rgb, mode='RGB')`
6. Send PNG: `png_img.save(buffer, format='PNG')`

**Jet Colormap (Pure NumPy)**:
```python
# Blue -> Cyan -> Green -> Yellow -> Red
rgb[:, :, 0] = np.clip((1.5 - 4 * np.abs(normalized - 0.75)) * 255, 0, 255)  # Red
rgb[:, :, 1] = np.clip((1.5 - 4 * np.abs(normalized - 0.5)) * 255, 0, 255)   # Green
rgb[:, :, 2] = np.clip((1.5 - 4 * np.abs(normalized - 0.25)) * 255, 0, 255)  # Blue
```

**Dependencies**: Only stdlib + NumPy + Pillow (no matplotlib!)

## Summary

### What Was Already Working
- ✅ Depth PNG endpoints (`_api_depth_png`, `_api_depth_confidence_png`)
- ✅ Jet colormap implementation (`_apply_colormap`)
- ✅ HTML UI with artifacts section and tabs
- ✅ 204 responses for missing ai-note
- ✅ Tissue masks gallery

### What Was Fixed
- ✅ Asset caching: Development mode now serves from `src/` (no cache!)
- ✅ Favicon 404: Now returns 204 No Content
- ✅ Visual confirmation: Footer shows version string

### What Was Added
- ✅ Comprehensive smoke test (`tests/test_preview_smoke.py`)
- ✅ Verification guide (`VERIFICATION.md`)
- ✅ Startup logging (`[DEV MODE]`, `[CACHE HIT]`, `[EXTRACTING]`)

### Impact
- **Development speed**: HTML/CSS changes visible immediately (no reinstall)
- **User experience**: Clean logs, no noisy 404s
- **Confidence**: Automated smoke test verifies all endpoints
- **Debugging**: Version string in footer confirms which HTML is loaded

All acceptance criteria met! 🎉
