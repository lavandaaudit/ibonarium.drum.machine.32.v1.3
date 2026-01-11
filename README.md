# IBONARIUM • DRUM MACHINE

A professional, high-density web-based drum machine and melodic sequencer with a "Studio Rack" aesthetic.

![Ibonarium Logo](https://via.placeholder.com/800x200?text=IBONARIUM+DRUM+MACHINE)

## Features

- **Master Control (V3.0)**: Dedicated Global Volume knob and professional compressor/limiter.
- **Melodic Mixing (V3.0)**: Individual volume knobs for all Melodic Synth channels.
- **Note Stretch (V3.0)**: Multi-step note sustain logic (Alt + Click to extend notes visually).
- **Pro FX Expansion (V3.0)**: New **DRN (Drone)** and **CRH (Crush)** effectors for cinematic and lo-fi textures.
- **11-Track Sequencer**: 6 Drum channels + 5 Melodic synth channels.
- **32-Step Grid**: High-precision sequencing for complex rhythms and melodies.
- **Professional FX Rack**: Delay, Reverb, Tremolo, Chorus, and Flanger.
- **Solo Functionality**: Solo any track to focus on specific parts.
- **52-Key Keyboard**: Integrated playable keyboard for melodic input.
- **Responsive Dashboard**: Zero-scroll compact layout optimized for both desktop and mobile.
- **Low Latency**: Built with the Web Audio API for tight timing.

## Project Structure

```text
/
├── index.html          # Main application shell
├── css/
│   └── style.css       # Studio rack styling and responsiveness
└── js/
    ├── app.js          # Core application logic and UI binding
    ├── audio/
    │   ├── audio-context.js    # Shared Web Audio context
    │   ├── master-fx.js        # Master bus and FX chain
    │   ├── drum-channels.js    # Drum sound engine
    │   └── melodic-synth.js    # Melodic synth engine
    ├── sequencer/
    │   └── sequencer.js        # Master clock and tick logic
    └── ui/
        └── knob.js             # Reusable high-precision knob component
```

## How to Run

Simply open `index.html` in any modern web browser.
*Note: Due to browser security policies, you may need to host it via a local server (e.g., Live Server, Python http.server) if using some advanced features.*

## Tech Stack

- **Pure JavaScript (ES Modules)**
- **Web Audio API**
- **Vanilla CSS3**
- **HTML5 Canvas/DOM**

## License

MIT
