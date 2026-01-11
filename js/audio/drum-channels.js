import { ctx } from './audio-context.js';

export class DrumChannel {
    constructor(name, type, masterBus) {
        this.name = name;
        this.type = type; // 'kick', 'snare', 'hat', 'noise'
        this.masterBus = masterBus;

        // Default Params
        this.params = {
            tune: 0,    // Semi-tones or arbitrary
            decay: 0.3, // Seconds
            attack: 0.005,
            cutoff: 20000,
            pan: 0,
            volume: 0.8
        };
    }

    trigger(time) {
        const t = time || ctx.currentTime;

        // Setup Nodes
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // Filtering
        filter.type = 'lowpass';
        filter.frequency.setTargetAtTime(this.params.cutoff, t, 0.05);

        // Output Gain (Anti-Click Envelope)
        gain.gain.setValueAtTime(0, t);
        // Rapid but smoothed attack
        const atkTime = Math.max(0.002, this.params.attack);
        gain.gain.setTargetAtTime(this.params.volume, t, atkTime / 3);
        // Exponential-like decay
        gain.gain.setTargetAtTime(0, t + atkTime, this.params.decay / 3);

        // Synthesis Logic
        if (this.type.includes('kick')) {
            osc.frequency.setValueAtTime(150 + (this.params.tune * 5), t);
            osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.connect(filter);
        } else if (this.type.includes('snare')) {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(250 + (this.params.tune * 10), t);

            const noise = this.createNoiseBuffer();
            const noiseNode = ctx.createBufferSource();
            noiseNode.buffer = noise;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(this.params.volume * 0.5, t);
            noiseGain.gain.setTargetAtTime(0, t, 0.05);
            noiseNode.connect(noiseGain);
            noiseGain.connect(filter);
            noiseNode.start(t);
            osc.connect(filter);
        } else if (this.type.includes('hat') || this.type.includes('noise')) {
            const noise = this.createNoiseBuffer();
            const noiseNode = ctx.createBufferSource();
            noiseNode.buffer = noise;
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.setValueAtTime(5000 + (this.params.tune * 100), t);

            noiseNode.connect(hp);
            hp.connect(filter);
            noiseNode.start(t);
        } else if (this.type === 'clap') {
            const bursts = 3;
            for (let i = 0; i < bursts; i++) {
                const burstT = t + (i * 0.015);
                const noise = this.createNoiseBuffer();
                const noiseNode = ctx.createBufferSource();
                noiseNode.buffer = noise;

                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0, burstT);
                noiseGain.gain.setTargetAtTime(this.params.volume, burstT, 0.002);
                noiseGain.gain.setTargetAtTime(0, burstT + 0.002, 0.02);

                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.setValueAtTime(1000 + (this.params.tune * 50), t);
                bp.Q.value = 1;

                noiseNode.connect(noiseGain);
                noiseGain.connect(bp);
                bp.connect(filter);
                noiseNode.start(burstT);
                noiseNode.stop(burstT + 0.1);
            }
        } else {
            osc.frequency.setValueAtTime(400 + (this.params.tune * 20), t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
            osc.connect(filter);
        }

        // Connect chain
        filter.connect(gain);
        gain.connect(this.masterBus);

        // Start/Stop
        if (!this.type.includes('hat') && !this.type.includes('noise')) {
            osc.start(t);
            osc.stop(t + this.params.decay + 0.2);
        }

        // Cleanup
        setTimeout(() => {
            gain.disconnect();
            filter.disconnect();
            osc.disconnect();
        }, (this.params.decay + 0.5) * 1000);
    }

    createNoiseBuffer() {
        const bufferSize = ctx.sampleRate * 2; // 2 sec buffer
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    setParam(param, value) {
        if (this.params.hasOwnProperty(param)) {
            this.params[param] = value;
        }
    }
}
