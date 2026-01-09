# Video Recorder with Local Backup - Feasibility Spike

A proof-of-concept mobile web app that demonstrates video recording with automatic local device backup using IndexedDB. Videos persist even when uploads fail, proving that a native app is not required for this functionality.

##  Project Overview

**Problem:** Currently, if a video upload fails (network loss, page refresh, tab closed), the recording can be lost because it is not persisted locally on the device.

**Solution:** This web app proves that browsers can record video and store it locally using IndexedDB, ensuring videos survive upload failures without requiring a native app.

##  Success Criteria Met

This spike successfully demonstrates:

1.  **Video recorded in a mobile browser** - Uses MediaRecorder API to capture video from device camera
2.  **Upload is interrupted or fails** - Simulates network failures and upload errors
3.  **Video is still present locally on device** - Videos persist in IndexedDB across page refreshes and tab closures

##  Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern browser (Chrome, Edge, Safari, Firefox)
- Camera/microphone access

### Installation
```bash