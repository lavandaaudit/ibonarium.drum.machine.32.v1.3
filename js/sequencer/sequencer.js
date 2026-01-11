import { ctx } from '../audio/audio-context.js';

export class Sequencer {
    constructor(bpm, onStep) {
        this.bpm = bpm;
        this.onStep = onStep; // Callback(stepIndex, time)
        this.isPlaying = false;
        this.currentStep = 0;
        this.nextStepTime = 0;
        this.timerID = null;
        this.steps = 32;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.currentStep = 0;
        this.nextStepTime = ctx.currentTime + 0.05;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }

    scheduler() {
        if (!this.isPlaying) return;

        while (this.nextStepTime < ctx.currentTime + this.scheduleAheadTime) {
            this.onStep(this.currentStep, this.nextStepTime);
            this.advanceStep();
        }

        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    advanceStep() {
        // 16th notes: (60 / BPM) / 4
        const secondsPerBeat = 60.0 / this.bpm;
        const stepTime = secondsPerBeat / 4;

        this.nextStepTime += stepTime;
        this.currentStep++;
        if (this.currentStep === this.steps) {
            this.currentStep = 0;
        }
    }

    setBpm(bpm) {
        this.bpm = bpm;
    }
}
