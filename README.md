![Version](https://img.shields.io/badge/version-v0.3-blue)
![Status](https://img.shields.io/badge/status-active-success)

# PlotStudio

**Open-source plotting, CAM, and slicing software for PlotOS-powered machines.**

![PlotStudio Toolpath Preview](image-1.png)

PlotStudio is a modern web-based CAM application designed for pen plotters and other 2D CNC machines. It allows users to import vector artwork, generate optimized toolpaths, preview jobs, and export machine-ready G-code directly from the browser.

> PlotStudio currently focuses on CAM and toolpath generation for pen plotters. Support for additional PlotOS-powered machines is planned for future releases.

---

## Highlights

- SVG → G-code workflow
- Browser-based operation
- Toolpath optimization
- Interactive workspace
- Toolpath simulation
- GitHub Pages deployment

## Features

### Current Features

* SVG Import
* SVG Path Parsing
* Toolpath Generation
* Path Optimization
* G-code Generation
* Toolpath Preview
* Workspace Visualization
* Layer Management
* G-code Export
* Modern Web Interface
* Runs entirely in the browser

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

**PlotStudio Demo:** https://deaptayan.github.io/PlotStudio/

---

## Screenshots

![PlotStudio Interface](image.png)


---

## Roadmap

### v0.3 - Core Slicer Foundation ✅

#### Completed

* [x] Modern dark-themed UI
* [x] SVG file import
* [x] SVG path parsing
* [x] Workspace and machine bed visualization
* [x] Coordinate grid system
* [x] Object transform controls

  * [x] Move
  * [x] Scale
  * [x] Mirror
* [x] Toolpath generation
* [x] Path sampling engine
* [x] Path optimization
* [x] G-code generation
* [x] G-code viewer
* [x] Toolpath preview
* [x] Travel path visualization
* [x] Pen event visualization
* [x] Playback timeline / scrubber
* [x] G-code export (.gcode)
* [x] Bed information panel
* [x] Feature status tracking
* [x] Browser-based workflow (no installation required)
* [x] GitHub Pages deployment

---

### v0.4 - Plotter Workflow Improvements

* [ ] Machine profiles
* [ ] Custom bed sizes
* [ ] Feedrate controls
* [ ] Pen up/down configuration
* [ ] Plot statistics

  * [ ] Estimated plot time
  * [ ] Travel distance
  * [ ] Draw distance
* [ ] Improved path optimization
* [ ] Multi-object selection
* [ ] Undo / Redo system
* [ ] Direct PlotOS integration

---

### v0.5 - Advanced Import Tools

* [ ] PDF import
* [ ] DXF import
* [ ] Image import (PNG/JPG)
* [ ] Automatic image vectorization
* [ ] Layer operations
* [ ] Path editing tools

---

### Future Goals

* [ ] WiFi job upload
* [ ] Live PlotOS machine monitoring
* [ ] Real-time job control
* [ ] Laser engraver support
* [ ] Vinyl cutter support
* [ ] Plugin system
* [ ] Multi-machine management

---

## Related Projects

### PlotOS

Open-source firmware for ESP32-powered pen plotters and CNC machines.

Repository: Coming Soon

---

## Technology

* HTML5
* CSS3
* JavaScript
* SVG Processing
* G-code Generation
* GitHub Pages

---

## Project Status

Active Development

PlotStudio v0.3 is a functional web-based CAM application capable of importing SVG files, generating optimized toolpaths, previewing jobs, and exporting machine-ready G-code.

---

## Contributing

Contributions, bug reports, feature requests, and feedback are welcome.

---

## Author

Deaptayan
