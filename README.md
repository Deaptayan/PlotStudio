![Version](https://img.shields.io/badge/version-v0.3.7-blue)
![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-AGPL--3.0-green)

# PlotterNC Studio

**Open-source plotting and CAM software for PlotterNC-powered machines.**

![PlotterNC Studio Toolpath Preview](src/image-1.png)

PlotterNC Studio is a modern web-based CAM application designed for pen plotters and other 2D CNC machines. It allows users to import vector artwork, generate optimized toolpaths, preview jobs, simulate machine motion, and export machine-ready G-code directly from the browser.

> PlotterNC Studio currently focuses on CAM and toolpath generation for pen plotters. Support for additional PlotterNC-powered machines is planned for future releases.

---

## Highlights

* SVG → G-code workflow
* Browser-based operation
* Interactive workspace
* Toolpath optimization
* Toolpath simulation
* Undo / Redo support
* Exact SVG fill mode
* Out-of-bounds protection
* GitHub Pages deployment

---

## Features

### Import & File Handling

* SVG Import
* Drag & Drop SVG Import
* Native SVG Size Detection
* Multi-Subpath SVG Parsing
* Layer-Aware SVG Processing

### Fill Modes

* Outline Only Mode
* Exact as SVG Fill Mode
* Hole-Aware Fill Handling
* Adjustable Hatch Spacing
* Adjustable Sample Quality

### Object Transform

* Drag to Move
* Resize Handles
* Width / Height Editing
* Lock Aspect Ratio
* Scale X / Scale Y
* Mirror Horizontal
* Mirror Vertical
* Center on Bed
* Fit to Bed
* Native SVG Size Restore
* Multi-Unit Support (mm / cm / in / px)
* Remove Object

### Editing

* Undo
* Redo
* Ctrl+Z Support
* Ctrl+Shift+Z Support
* Ctrl+Y Support

### Bed & Machine

* 200×200 Bed Preset
* 300×300 Bed Preset
* 500×500 Bed Preset
* Custom Bed Sizes
* Origin Selection

  * Top Left
  * Bottom Left
  * Center
* Out-of-Bounds Detection
* Warning Banner
* One-Click Fit to Bed
* Invalid Slice Protection

### G-code & CAM

* Toolpath Generation
* Nearest-Neighbor Path Optimization
* Feedrate Configuration
* Travel Speed Configuration
* Custom Pen Up Commands
* Custom Pen Down Commands
* Syntax Highlighted G-code Viewer
* G-code Export

### Preview & Playback

* Toolpath Scrubbing
* Playback Controls
* Play
* Pause
* Rewind
* Jump to End
* Draw Path Visualization
* Travel Path Visualization
* Pen Event Visualization
* Live Tool Position Tracking

### Interface

* Modern Dark Theme
* File Panel
* Machine Panel
* G-code Panel
* Layers Panel
* Feature Status Checklist
* Browser-Based Workflow

---

## Workflow

```text
SVG
 ↓
Parse Paths
 ↓
Sample Geometry
 ↓
Optimize Toolpaths
 ↓
Generate G-code
 ↓
Preview
 ↓
Export
```

---

## Try it Now

**PlotterNC Studio Demo:** [plotterncstudio.deaptayan.in](https://plotterncstudio.deaptayan.in/)

---

## Screenshots

![PlotterNC Studio Interface](src/image.png)

---

## What's New in v0.3.7

### New Features

* Exact as SVG fill mode
* Adjustable hatch spacing
* Drag-to-resize handles
* Undo / Redo system
* Native SVG size detection
* Native SVG size restore button
* Multi-unit transform system
* Out-of-bounds warning banner
* One-click Fit to Bed action
* Invalid slice protection
* Improved slice workflow

### Fixes

* Fixed proportional resize flickering
* Fixed out-of-bounds slicing
* Improved warning visibility
* Fixed stale project packaging issues
* Fixed clearHistory loading issues

---

## Roadmap

### v0.3.7 - Current Release ✅

#### Completed

* [x] SVG Import
* [x] Native SVG Size Detection
* [x] Drag & Drop Import
* [x] Multi-Subpath Parsing
* [x] Outline Mode
* [x] Exact SVG Fill Mode
* [x] Adjustable Hatch Spacing
* [x] Adjustable Sample Quality
* [x] Drag Move
* [x] Resize Handles
* [x] Width / Height Editing
* [x] Lock Aspect Ratio
* [x] Scale X / Scale Y
* [x] Mirror Horizontal
* [x] Mirror Vertical
* [x] Center on Bed
* [x] Fit to Bed
* [x] Native SVG Size Restore
* [x] Undo / Redo
* [x] Multi-Unit Support
* [x] Bed Presets
* [x] Custom Bed Sizes
* [x] Origin Selection
* [x] Out-of-Bounds Detection
* [x] Slice Protection
* [x] Toolpath Generation
* [x] Path Optimization
* [x] Feedrate Configuration
* [x] Travel Speed Configuration
* [x] Pen Commands
* [x] G-code Viewer
* [x] G-code Export
* [x] Playback Controls
* [x] Toolpath Scrubbing
* [x] Live Preview
* [x] GitHub Pages Deployment

---

### v0.4 - Workflow & Machine Integration

* [ ] A4 Paper Preset
* [ ] A3 Paper Preset
* [ ] A5 Paper Preset
* [ ] Additional Standard Paper Sizes
* [ ] Machine Profiles
* [ ] Profile Manager
* [ ] Estimated Plot Time
* [ ] Draw Distance Statistics
* [ ] Travel Distance Statistics
* [ ] Multi-Object Selection
* [ ] Group / Ungroup Objects
* [ ] Direct PlotterNC Upload
* [ ] PlotterNC WiFi Connection
* [ ] Job Queue System
* [ ] Workspace Improvements

---

### v0.5 - Advanced Import & Editing

* [ ] PDF Import
* [ ] DXF Import
* [ ] PNG Import
* [ ] JPG Import
* [ ] Automatic Image Vectorization
* [ ] Layer Operations
* [ ] Object Tree Improvements
* [ ] Path Editing Tools
* [ ] Node Editing
* [ ] Boolean Operations

---

### Future Goals

* [ ] Live PlotterNC Monitoring
* [ ] Real-Time Job Control
* [ ] Pause / Resume from Browser
* [ ] Laser Engraver Support
* [ ] Vinyl Cutter Support
* [ ] Plugin System
* [ ] Multi-Machine Management
* [ ] Cloud Profile Sync
* [ ] Mobile Companion App

---

## Related Projects

### PlotterNC

Open-source firmware for ESP32-powered pen plotters and CNC machines.

Repository: https://github.com/Deaptayan/PlotterNC

---

## Technology

* HTML5
* CSS3
* JavaScript
* SVG Processing
* Toolpath Generation
* G-code Generation
* GitHub Pages

---

## Project Status

**Active Development**

PlotterNC Studio v0.3.7 is a functional browser-based CAM application capable of importing SVG artwork, generating optimized toolpaths, simulating machine motion, and exporting production-ready G-code for pen plotters.

---

## Contributing

Contributions, bug reports, feature requests, and feedback are welcome.

---

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

If you distribute modified versions of PlotterNC Studio or host a modified version as a network service, you must make the corresponding source code available under the same license.

See the LICENSE file for details.

## Author

**Deaptayan Bondopadhay**
