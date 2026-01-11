import { ctx } from './audio-context.js';

export class MelodicSynth {
    constructor(masterBus) {
        this.masterBus = masterBus;
        this.type = 'rhodes'; // rhodes, piano, organ, pad, lead
        this.polyphony = 8;
        this.activeVoices = [];

        // Params
        this.params = {
            cutoff: 2000,
            resonance: 0,
            attack: 0.01,
            decay: 0.5,
            sustain: 0.5,
            release: 0.5,
            delaySend: 0,
            reverbSend: 0,
            volume: 0.5
        };

        this.volGain = ctx.createGain();
        this.volGain.gain.value = 0.5;
        this.volGain.connect(this.masterBus.input);
    }

    setType(type) {
        this.type = type;
    }

    setVolume(val) {
        this.params.volume = val;
        this.volGain.gain.setTargetAtTime(val, ctx.currentTime, 0.05);
    }

    triggerAttack(freq, time) {
        const t = time || ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // 1. Oscillator Setup
        if (this.type === 'rhodes') {
            osc.type = 'sine';
        } else if (this.type === 'piano') {
            osc.type = 'triangle';
        } else if (this.type === 'organ') {
            osc.type = 'square';
        } else if (this.type === 'pad') {
            osc.type = 'sawtooth';
        } else if (this.type === 'lead') {
            osc.type = 'sawtooth';
        }

        osc.frequency.setValueAtTime(freq, t);

        // 2. Filter Setup
        filter.type = 'lowpass';
        filter.frequency.setTargetAtTime(this.params.cutoff, t, 0.02);
        filter.Q.setTargetAtTime(this.params.resonance, t, 0.02);

        // 3. Amp Envelope (Anti-Click)
        gain.gain.setValueAtTime(0, t);
        // Small 2ms ramp for instant attacks to avoid clicks
        const atk = Math.max(0.002, this.params.attack);
        gain.gain.setTargetAtTime(0.5, t, atk / 2);

        // 4. Connect
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.volGain);

        osc.start(t);

        const voice = { osc, gain, filter, start: t };
        this.activeVoices.push(voice);
        return voice;
    }

    triggerRelease(voice, time) {
        if (!voice) return;
        const t = time || ctx.currentTime;
        const rel = Math.max(0.01, this.params.release);

        voice.gain.gain.cancelScheduledValues(t);
        // Smoothed release to prevent pops
        voice.gain.gain.setTargetAtTime(0, t, rel / 3);

        const stopTime = t + rel;
        voice.osc.stop(stopTime);

        // Cleanup after stop
        setTimeout(() => {
            voice.gain.disconnect();
            this.activeVoices = this.activeVoices.filter(v => v !== voice);
        }, rel * 1000 + 100);
    }

    setParam(key, val) {
        this.params[key] = val;
    }
}
