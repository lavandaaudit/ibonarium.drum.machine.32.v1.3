import { ctx } from './audio-context.js';

export class MasterBus {
    constructor() {
        this.input = ctx.createGain();
        this.output = ctx.destination;

        // --- FX NODES ---

        // 1. Tremolo (Speed, Depth)
        this.tremolo = ctx.createGain();
        this.tremoloOsc = ctx.createOscillator();
        this.tremoloDepth = ctx.createGain();
        this.tremoloOsc.type = 'sine';
        this.tremoloOsc.frequency.value = 5;
        this.tremoloDepth.gain.value = 0; // Starts at 0 depth
        this.tremoloOsc.connect(this.tremoloDepth);
        this.tremoloDepth.connect(this.tremolo.gain);
        this.tremoloOsc.start();

        // 2. Chorus (Speed, Depth)
        this.chorusDelay = ctx.createDelay();
        this.chorusLFO = ctx.createOscillator();
        this.chorusLFOGain = ctx.createGain();
        this.chorusWet = ctx.createGain();
        this.chorusDelay.delayTime.value = 0.02;
        this.chorusLFO.frequency.value = 1.5;
        this.chorusLFOGain.gain.value = 0;
        this.chorusLFO.connect(this.chorusLFOGain);
        this.chorusLFOGain.connect(this.chorusDelay.delayTime);
        this.chorusLFO.start();

        // 3. Flanger (Speed, Feedback)
        this.flangerDelay = ctx.createDelay();
        this.flangerLFO = ctx.createOscillator();
        this.flangerLFOGain = ctx.createGain();
        this.flangerFeedback = ctx.createGain();
        this.flangerWet = ctx.createGain();
        this.flangerDelay.delayTime.value = 0.005;
        this.flangerLFO.frequency.value = 0.25;
        this.flangerLFOGain.gain.value = 0;
        this.flangerFeedback.gain.value = 0;
        this.flangerLFO.connect(this.flangerLFOGain);
        this.flangerLFOGain.connect(this.flangerDelay.delayTime);
        this.flangerDelay.connect(this.flangerFeedback);
        this.flangerFeedback.connect(this.flangerDelay);
        this.flangerLFO.start();

        // 4. Delay (Time, Feedback)
        this.delayNode = ctx.createDelay();
        this.delayFeedback = ctx.createGain();
        this.delayWet = ctx.createGain();
        this.delayNode.delayTime.value = 0.3;
        this.delayFeedback.gain.value = 0.3;
        this.delayWet.gain.value = 0; // Start dry
        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);

        // 5. Reverb (Mix)
        this.reverbNode = ctx.createConvolver();
        this.reverbWet = ctx.createGain();
        this.reverbWet.gain.value = 0;
        this.buildReverb(1.5, 2.0); // Generate simple IR

        // 6. Drone (Sub-harmonic wash)
        this.droneOsc = ctx.createOscillator();
        this.droneFilter = ctx.createBiquadFilter();
        this.droneWet = ctx.createGain();
        this.droneOsc.type = 'sine';
        this.droneOsc.frequency.value = 40; // Low frequency
        this.droneFilter.type = 'lowpass';
        this.droneFilter.frequency.value = 100;
        this.droneFilter.Q.value = 10;
        this.droneWet.gain.value = 0;
        this.droneOsc.connect(this.droneFilter);
        this.droneFilter.connect(this.droneWet);
        this.droneOsc.start();

        // 7. Bitcrush (Digital Distortion)
        this.bitcrushNode = ctx.createWaveShaper();
        this.bitcrushWet = ctx.createGain();
        this.bitcrushWet.gain.value = 0;
        this.updateBitcrushCurve(0);

        // --- MASTER CHAIN ---
        // Global Volume Control
        this.masterGain = ctx.createGain();
        this.masterGain.gain.value = 0.8;

        // Limiter / Compressor
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -10;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.01;
        this.compressor.release.value = 0.1;

        // 3-Band Isolator (Master EQ)
        this.lowFilter = ctx.createBiquadFilter();
        this.lowFilter.type = 'lowshelf';
        this.lowFilter.frequency.value = 250;
        this.lowFilter.gain.value = 0;

        this.midFilter = ctx.createBiquadFilter();
        this.midFilter.type = 'peaking';
        this.midFilter.frequency.value = 1000;
        this.midFilter.Q.value = 1;
        this.midFilter.gain.value = 0;

        this.highFilter = ctx.createBiquadFilter();
        this.highFilter.type = 'highshelf';
        this.highFilter.frequency.value = 4000;
        this.highFilter.gain.value = 0;

        // --- NEW ISOLATED ROUTING NODES ---
        this.drumsInput = ctx.createGain();   // DRY path for drums
        this.melodicFXSum = ctx.createGain();  // Summing point for wet/dry melodic

        this.preEQSum = ctx.createGain();     // Summing point before EQ

        // --- WIRING ---
        // 1. MELODIC PATH (Wet path)
        this.input.connect(this.tremolo);
        this.tremolo.connect(this.melodicFXSum); // Base melodic signal (dry)

        // Parallel Effectors (Melodic Only)
        this.melodicFXSum.connect(this.chorusDelay); this.chorusDelay.connect(this.chorusWet); this.chorusWet.connect(this.preEQSum);
        this.melodicFXSum.connect(this.flangerDelay); this.flangerDelay.connect(this.flangerWet); this.flangerWet.connect(this.preEQSum);
        this.melodicFXSum.connect(this.delayNode); this.delayNode.connect(this.delayWet); this.delayWet.connect(this.preEQSum);
        this.melodicFXSum.connect(this.reverbNode); this.reverbNode.connect(this.reverbWet); this.reverbWet.connect(this.preEQSum);

        // Dry Melodic Path
        this.melodicFXSum.connect(this.preEQSum);

        // 2. DRUM PATH (Dry path)
        this.drumsInput.connect(this.preEQSum);

        // 3. MASTER SECTION (Universal)
        this.preEQSum.connect(this.lowFilter);
        this.lowFilter.connect(this.midFilter);
        this.midFilter.connect(this.highFilter);

        // Add new Master FX (Post-EQ, Pre-Compressor)
        this.highFilter.connect(this.bitcrushNode);
        this.bitcrushNode.connect(this.bitcrushWet);
        this.bitcrushWet.connect(this.compressor);

        this.droneWet.connect(this.compressor); // Drone feeds directly to compressor

        this.highFilter.connect(this.compressor); // Direct path to compressor

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.output);
    }

    buildReverb(duration, decay) {
        const length = ctx.sampleRate * duration;
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let i = 0; i < 2; i++) {
            const channel = impulse.getChannelData(i);
            for (let j = 0; j < length; j++) {
                channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
            }
        }
        this.reverbNode.buffer = impulse;
    }

    updateBitcrushCurve(amount) {
        const n_samples = 4096;
        const curve = new Float32Array(n_samples);
        const k = amount * 100;
        for (let i = 0; i < n_samples; i += 1) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 57 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
        }
        this.bitcrushNode.curve = curve;
    }

    // --- MASTER CONTROLS ---
    setMasterVolume(val) { this.masterGain.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }

    // --- ANALOG ISOLATOR ---
    setLowGain(val) { this.lowFilter.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }
    setMidGain(val) { this.midFilter.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }
    setHighGain(val) { this.highFilter.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }

    // --- FX SETTERS ---
    setDelayTime(val) { this.delayNode.delayTime.setTargetAtTime(val, ctx.currentTime, 0.05); }
    setDelayFeedback(val) { this.delayFeedback.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }
    setDelayMix(val) { this.delayWet.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }

    setReverbMix(val) { this.reverbWet.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }

    setTremoloSpeed(val) { this.tremoloOsc.frequency.setTargetAtTime(val, ctx.currentTime, 0.05); }
    setTremoloDepth(val) { this.tremoloDepth.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }

    setChorusDepth(val) { this.chorusWet.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }
    setChorusSpeed(val) { this.chorusLFO.frequency.setTargetAtTime(val, ctx.currentTime, 0.05); }

    setFlangerFeedback(val) { this.flangerFeedback.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }
    setFlangerSpeed(val) { this.flangerLFO.frequency.setTargetAtTime(val, ctx.currentTime, 0.05); }
    setFlangerDepth(val) { this.flangerWet.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }

    setDroneMix(val) { this.droneWet.gain.setTargetAtTime(val, ctx.currentTime, 0.05); }
    setDroneFreq(val) { this.droneOsc.frequency.setTargetAtTime(val * 100 + 30, ctx.currentTime, 0.05); }
    setBitcrushMix(val) {
        this.bitcrushWet.gain.setTargetAtTime(val, ctx.currentTime, 0.05);
        this.updateBitcrushCurve(val);
    }
}
