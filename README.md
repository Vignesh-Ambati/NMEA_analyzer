# ACCORD - GNSS Log Analyzer

> A sophisticated desktop application for analyzing GNSS/NMEA satellite positioning data with advanced visualization and real-time performance metrics.

![Python](https://img.shields.io/badge/Python-3.9+-3776ab?style=flat-square&logo=python)
![Tkinter](https://img.shields.io/badge/UI-Tkinter-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)

---

## 📋 Overview

**ACCORD** is an enterprise-grade GNSS (Global Navigation Satellite System) data analysis platform designed to process, visualize, and analyze satellite positioning logs from NMEA-compliant receivers. The application extracts critical metrics from raw binary log files and presents them through an intuitive graphical interface with 14+ specialized analysis tasks.

### Key Metrics

- **Processing Speed**: High-speed binary streaming with 8 MB buffering for optimal performance
- **Data Support**: Comprehensive GNSS constellations (GPS, GLONASS, GALILEO, BEIDOU, QZSS, IRNSS, SBAS)
- **Analysis Tasks**: 14+ pre-built visualization and analysis modes
- **Architecture**: Modular, layered design with separation of concerns

---

## ✨ Features

### 🎯 Core Capabilities

#### Data Processing

- **High-Speed NMEA Parsing**: Binary-safe streaming reader with configurable buffering
- **Multi-Constellation Support**: Automatic detection and routing of GPS, GLONASS, Galileo, BeiDou, QZSS, and IRNSS signals
- **Robust Time Handling**: Epoch-based processing with precise second-resolution timestamps
- **Intelligent Caching**: Temporary on-disk JSONL storage with NumPy-based time indexing for O(1) range queries

#### Visualization & Analysis (14 Tasks)

| Task                           | Description                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| 📈 **Plot C/N₀ (Single/Dual)** | Carrier-to-noise density visualization across constellations |
| ⚙️ **MIPS Analysis**           | Monitor satellite usage efficiency (SVs used vs. in-view)    |
| 📍 **Position Loss Detection** | Identify and track fix acquisition/loss events               |
| 🏔️ **Altitude Plots**          | Track receiver altitude from GGA/GNS messages                |
| 🎯 **DOP Visualization**       | Display Dilution of Precision (PDOP, HDOP, VDOP) trends      |
| 🔢 **Satellite Count**         | Monitor visible and tracked satellite quantities             |
| 🔄 **Reset Detection**         | Count system resets and fix reacquisition events             |
| 🛰️ **SBAS Analysis**           | Track SBAS (Space-Based Augmentation System) usage           |
| 📐 **Statistical Comparison**  | Compare receiver metrics against reference truth values      |
| 💨 **Velocity Tracking**       | Visualize speed and course data in real-time                 |

### 🎨 User Experience

- **Modern Dark Theme**: Professional design with accent colors and smooth interactions
- **Responsive Grid Layout**: Dynamic task card arrangement (4-6 columns based on window size)
- **Real-Time Progress Tracking**: Multi-threaded processing with live console output
- **Interactive Plots**: Matplotlib & Plotly support with zoom, pan, and export capabilities
- **CSV Export**: Data extraction for external analysis
- **Navigation History**: Back/Forward buttons for seamless UI navigation

---

## 🏗️ Architecture

### Layered Design (v4.0+ Modular Structure)

```
ACCORD/
├── core/                    # Processing Engine
│   ├── parser.py           # NMEA sentence parsing & streaming
│   ├── processor.py        # Message routing & epoch aggregation
│   ├── stage2.py           # Named tuple data models (CNoPoint, AltPoint, etc.)
│   ├── query.py            # Time-range query engine with NumPy indexing
│   ├── cache.py            # Temporary file management
│   ├── constants.py        # Constellation mapping tables
│   └── __init__.py         # Public API surface
│
├── ui/                      # User Interface Layer
│   ├── app.py              # Main application controller
│   ├── theme.py            # Centralized design tokens & ttk styling
│   ├── widgets.py          # Reusable button/control factories
│   ├── plot_helpers.py     # Matplotlib/Plotly integration
│   └── pages/              # Page components (file, task, graph)
│
├── main.py                 # Application entry point
└── LOGS/                   # Runtime log storage

```

### Processing Pipeline

```
Raw NMEA Log File
       ↓
[Stream NMEA] ──→ High-speed binary reading
       ↓
[Parse Messages] ──→ Route by sentence type
       ↓
[Aggregate Epochs] ──→ Group by timestamp
       ↓
[Generate Points] ──→ Named tuple models
       ↓
[JSONL + Index] ──→ Cache (on-disk storage + NumPy time index)
       ↓
[Query Engine] ──→ O(n log n) range lookup
       ↓
[Visualization] ──→ Matplotlib/Plotly rendering
```

---

## 🔧 Technical Stack

| Component           | Technology           | Purpose                    |
| ------------------- | -------------------- | -------------------------- |
| **Language**        | Python 3.9+          | Core implementation        |
| **GUI Framework**   | Tkinter (ttk)        | Cross-platform desktop UI  |
| **Plotting**        | Matplotlib / Plotly  | Advanced visualization     |
| **Data Processing** | NumPy                | Efficient array indexing   |
| **Image Handling**  | PIL (Pillow)         | Logo & asset rendering     |
| **Storage**         | JSONL + Binary Cache | Efficient data persistence |

### Key Design Patterns

- **Stream Processing**: High-speed binary reading with buffering
- **Epoch-Based Aggregation**: Time-window grouping for satellite metrics
- **Named Tuples**: Type-safe, immutable data models (CNoPoint, AltPoint, DOPPoint, etc.)
- **Temporal Indexing**: NumPy arrays for O(1) range query resolution
- **Threading**: Non-blocking UI with background processing
- **Factory Pattern**: Widget and plot creation helpers
- **Theme System**: Single-source-of-truth for design tokens

---

## 🚀 Getting Started

### Requirements

```bash
Python 3.9+
tkinter (usually included with Python)
PIL/Pillow
numpy
matplotlib (optional, for enhanced plotting)
plotly (optional, for interactive plots)
```

### Installation

```bash
git clone https://github.com/Vignesh-Ambati/NMEA_analyzer.git
cd NMEA_analyzer
pip install -r requirements.txt
```

### Running the Application

```bash
python main.py
```

### Workflow

1. **Launch** → Click "ACCORD - Log Analyser" window opens
2. **Load** → Click "Browse Files" and select a `.txt` or `.log` NMEA file
3. **Process** → Click "🚀 Start Analysis" (status bar updates in real-time)
4. **Analyze** → Select from 14 analysis tasks
5. **Visualize** → Interactive plot with zoom, pan, and export options
6. **Export** → Save figures (PNG/PDF/SVG) or data (CSV)

---

## 📊 Data Models

### Core Named Tuples (stage2.py)

```python
CNoPoint(t, constellation, sv_id, cno)          # Signal strength
AltPoint(t, alt_m)                              # Altitude
DOPPoint(t, pdop, hdop, vdop)                   # Positioning dilution
SVCountPoint(t, sv_count)                       # Satellite count
VelocityPoint(t, speed_kmh, course_deg)         # Speed & heading
SBASPoint(t, sbas_svs)                          # SBAS augmentation
MIPSPoint(t, svs_used, svs_in_view, ratio)      # Efficiency metric
FixEventPoint(t, event)                         # Loss/reacquire events
```

---

## 💾 Performance Optimizations

### Caching Strategy

- **JSONL Format**: Human-readable, line-based JSON for quick iteration
- **NumPy Indexing**: Pre-computed time arrays for sub-millisecond range queries
- **Temporary Storage**: Automatic cleanup of `.logcache/` directories
- **8 MB Buffering**: Configurable I/O buffering for large files

### Memory Management

- **Streaming Reader**: Never loads entire file into memory
- **Epoch Aggregation**: Processes one time-window at a time
- **Temporary Cache**: Deletes intermediate data after analysis completes

---

## 📈 Version History

| Version    | Date       | Highlights                                                    |
| ---------- | ---------- | ------------------------------------------------------------- |
| **v4.3.0** | 2026-03-23 | Stage 2 backend optimization, improved processing performance |
| **v4.2.0** | 2026-03-18 | JSONL logging, cache system, structured data storage          |
| **v4.1.0** | 2026-03-17 | Graph visualization system, Plotter UI integration            |
| **v4.0.0** | 2026-03-11 | Modular architecture (EXP structure), core/UI separation      |
| **v3.0.0** | 2026-03-05 | Filesystem-based architecture                                 |
| **v2.x**   | 2026-02-XX | Database-based processing, backend optimization               |
| **v1.x**   | 2026-01-XX | Initial system, UI foundation                                 |

---

## 🎯 Use Cases

### 🛰️ GNSS Receiver Testing

- Validate receiver performance across constellation types
- Identify signal dropouts and reacquisition patterns
- Analyze positioning accuracy metrics (DOP, altitude)

### 📡 Network Monitoring

- Monitor SBAS augmentation effectiveness
- Track satellite visibility and geometry changes
- Detect environmental interference patterns

### 🔬 Research & Development

- Extract metrics for algorithm development
- Visualize multi-constellation interactions
- Compare receiver firmware versions

### 🏗️ System Integration

- Pre-flight verification for UAV/drone systems
- Marine navigation system validation
- Automotive GNSS diagnostics

---

## 🔮 Future Enhancements

- [ ] Real-time streaming from serial/network receivers
- [ ] Advanced filtering (Kalman, particle filters)
- [ ] Multi-log comparison & statistical analysis
- [ ] Report generation (PDF, HTML)
- [ ] Cloud data synchronization
- [ ] REST API for headless operation

---

## 📝 Code Quality & Standards

- **Modular Design**: Clear separation of concerns (core vs. UI)
- **Type Safety**: Named tuples for self-documenting data structures
- **Documentation**: Comprehensive docstrings and inline comments
- **Error Handling**: Robust exception handling with user-friendly messages
- **Threading**: Non-blocking UI with daemon threads for background work

---

## 🤝 Project Structure (Resume Highlights)

### Skills Demonstrated

✅ **Backend Engineering**

- Binary file I/O and streaming protocols
- Data parsing and validation (NMEA protocol)
- Time-series data processing and aggregation
- NumPy for scientific computing

✅ **Frontend Development**

- Tkinter GUI design and layout management
- Responsive UI with dynamic grid systems
- Real-time progress tracking and logging
- Integration with matplotlib/plotly

✅ **Software Architecture**

- Modular design patterns
- Clean separation of concerns
- Extensible task-based system
- Theme/design token system

✅ **Performance Optimization**

- High-speed I/O with buffering strategies
- Intelligent caching with indexing
- Non-blocking UI with threading
- Memory-efficient streaming

---

## 📄 License

This project is part of the ACCORD suite. Contact for licensing information.

---

## 👤 Author

**Vignesh Ambati**  
GNSS/Satellite Systems Developer

---

## 📞 Support

For issues, feature requests, or questions:

- Open an issue on GitHub
- Check the CHANGELOG.md for recent updates
- Review the inline documentation in source files

---

**Last Updated**: May 4, 2026  
**Status**: Active Development  
**Version**: 4.3.0
