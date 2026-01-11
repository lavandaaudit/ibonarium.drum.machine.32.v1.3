import { ctx, resumeAudio } from './audio/audio-context.js';
import { MasterBus } from './audio/master-fx.js';
import { DrumChannel } from './audio/drum-channels.js';
import { MelodicSynth } from './audio/melodic-synth.js';
import { Sequencer } from './sequencer/sequencer.js';
import { Knob } from './ui/knob.js';

console.log("Ibonarium Drum Machine V2.0 Init...");

// --- CONFIG ---
const DRUM_defs = [
    { id: 'kick', name: 'KICK', type: 'kick' },
    { id: 'clap', name: 'CLAP', type: 'clap' },
    { id: 'snare', name: 'SNARE', type: 'snare' },
    { id: 'hat', name: 'HAT', type: 'hat' },
    { id: 'perc', name: 'PERC', type: 'perc' },
    { id: 'bass', name: 'BASS', type: 'kick' },
];

const SYNTH_defs = [
    { id: 'rhodes', name: 'RHODES', type: 'rhodes' },
    { id: 'piano', name: 'PIANO', type: 'piano' },
    { id: 'organ', name: 'ORGAN', type: 'organ' },
    { id: 'pad', name: 'PAD', type: 'pad' },
    { id: 'lead', name: 'LEAD', type: 'lead' }
];

// --- STATE ---
const state = {
    bpm: 120,
    patterns: {},
    melodicPatterns: {},
    drumChannels: {},
    melodicSynths: {},
    activeSynthId: 'rhodes',
    master: null,
    sequencer: null,
    solos: new Set(),
};

let lastPressedNote = { note: 'C', octave: 3 };

// --- DATA ACCESS ---
const saveState = () => {
    localStorage.setItem('ibonarium_patterns_v2', JSON.stringify(state.patterns));
    localStorage.setItem('ibonarium_melodic_v2', JSON.stringify(state.melodicPatterns));
};

const loadState = () => {
    try {
        const pRaw = localStorage.getItem('ibonarium_patterns_v2');
        if (pRaw) {
            const saved = JSON.parse(pRaw);
            DRUM_defs.forEach(d => { if (saved[d.id]) state.patterns[d.id] = saved[d.id]; });
        }
        const mRaw = localStorage.getItem('ibonarium_melodic_v2');
        if (mRaw) {
            const saved = JSON.parse(mRaw);
            SYNTH_defs.forEach(s => { if (saved[s.id]) state.melodicPatterns[s.id] = saved[s.id]; });
        }
    } catch (e) { console.error("Load failed", e); }
};

// Init Patterns (V2.0 Note Object: { note, octave, duration })
DRUM_defs.forEach(d => state.patterns[d.id] = new Array(32).fill(0));
SYNTH_defs.forEach(s => state.melodicPatterns[s.id] = new Array(32).fill(null));
loadState();

// Audio Init
state.master = new MasterBus();
SYNTH_defs.forEach(s => {
    state.melodicSynths[s.id] = new MelodicSynth(state.master);
    state.melodicSynths[s.id].setType(s.type);
});
DRUM_defs.forEach(def => {
    state.drumChannels[def.id] = new DrumChannel(def.name, def.type, state.master.drumsInput);
});

const getFreq = (note, octave) => {
    const map = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
    return 440 * Math.pow(2, ((octave - 4) * 12 + (map[note] - 9)) / 12);
};

// --- UI GENERATION ---
const makeKnob = (container, callback, lbl, min, max, initial) => {
    const box = document.createElement('div');
    box.className = 'knob-box';
    const wrap = document.createElement('div'); wrap.className = 'knob-wrap';
    const kEl = document.createElement('div'); kEl.className = 'knob';
    kEl.dataset.min = min; kEl.dataset.max = max; kEl.dataset.value = initial;
    wrap.appendChild(kEl); box.appendChild(wrap);
    const label = document.createElement('div'); label.className = 'knob-label'; label.innerText = lbl;
    box.appendChild(label);
    new Knob(kEl, callback);
    container.appendChild(box);
};

const addSoloBtn = (parent, id) => {
    const btn = document.createElement('div');
    btn.className = 'solo-btn';
    btn.innerText = 'S';
    btn.onclick = (e) => {
        e.stopPropagation();
        if (state.solos.has(id)) {
            state.solos.delete(id);
            btn.classList.remove('active');
        } else {
            state.solos.add(id);
            btn.classList.add('active');
        }
    };
    parent.appendChild(btn);
};

// 1. Drum Rack
const drumRackEl = document.getElementById('drum-rack-container');
DRUM_defs.forEach(def => {
    const row = document.createElement('div'); row.className = 'drum-channel';
    const head = document.createElement('div'); head.className = 'drum-header';
    const nameSpan = document.createElement('span'); nameSpan.innerText = def.name;
    head.appendChild(nameSpan);
    addSoloBtn(head, def.id);
    row.appendChild(head);

    const controls = document.createElement('div'); controls.className = 'drum-controls';
    const channel = state.drumChannels[def.id];
    makeKnob(controls, (v) => channel.setParam('volume', v), 'VOL', 0, 1, 0.8);
    makeKnob(controls, (v) => channel.setParam('tune', v), 'TUNE', -12, 12, 0);
    makeKnob(controls, (v) => channel.setParam('decay', v), 'DEC', 0.1, 2.0, 0.5);
    makeKnob(controls, (v) => channel.setParam('cutoff', v), 'CUT', 100, 20000, 10000);
    row.appendChild(controls);

    const stepsCont = document.createElement('div'); stepsCont.className = 'sequencer-steps';
    for (let i = 0; i < 32; i++) {
        const step = document.createElement('div'); step.className = 'step-btn'; step.dataset.idx = i;
        if (state.patterns[def.id][i]) step.classList.add('active');
        step.onclick = () => {
            state.patterns[def.id][i] = state.patterns[def.id][i] ? 0 : 1;
            step.classList.toggle('active', !!state.patterns[def.id][i]);
            saveState();
        };
        stepsCont.appendChild(step);
    }
    row.appendChild(stepsCont);
    drumRackEl.appendChild(row);
});

// 2. Melodic Rack (Fixed Rendering)
const melodicRackEl = document.getElementById('melodic-rack-container');
SYNTH_defs.forEach(def => {
    const row = document.createElement('div'); row.className = 'drum-channel melodic-channel';
    if (def.id === state.activeSynthId) row.classList.add('active-synth');
    const head = document.createElement('div'); head.className = 'drum-header';
    const nameSpan = document.createElement('span'); nameSpan.innerText = def.name;
    head.appendChild(nameSpan);
    addSoloBtn(head, def.id);
    head.onclick = () => {
        state.activeSynthId = def.id;
        document.querySelectorAll('.melodic-channel').forEach(r => r.classList.remove('active-synth'));
        row.classList.add('active-synth');
    };
    row.appendChild(head);

    const controls = document.createElement('div'); controls.className = 'drum-controls';
    const synth = state.melodicSynths[def.id];
    makeKnob(controls, (v) => synth.setVolume(v), 'VOL', 0, 1, 0.5);
    makeKnob(controls, (v) => synth.setParam('cutoff', v), 'CUT', 100, 5000, 2000);
    makeKnob(controls, (v) => synth.setParam('atk', v), 'ATK', 0.01, 1, 0.05);
    makeKnob(controls, (v) => synth.setParam('dec', v), 'DEC', 0.1, 2, 0.5);
    row.appendChild(controls);

    const stepsCont = document.createElement('div'); stepsCont.className = 'sequencer-steps';
    for (let i = 0; i < 32; i++) {
        const step = document.createElement('div'); step.className = 'step-btn melodic-step'; step.dataset.idx = i;
        step.onclick = (e) => {
            if (e.altKey && state.melodicPatterns[def.id][i]) {
                state.melodicPatterns[def.id][i].duration = (state.melodicPatterns[def.id][i].duration % 8) + 1;
            } else if (state.melodicPatterns[def.id][i]) {
                state.melodicPatterns[def.id][i] = null;
            } else {
                state.melodicPatterns[def.id][i] = { ...lastPressedNote, duration: 1 };
            }
            renderMelodicRow(def.id, stepsCont);
            saveState();
        };
        stepsCont.appendChild(step);
    }
    row.appendChild(stepsCont); // CRITICAL: Added back
    renderMelodicRow(def.id, stepsCont);
    melodicRackEl.appendChild(row);
});

function renderMelodicRow(synthId, container) {
    const steps = container.children;
    for (let i = 0; i < 32; i++) {
        const step = steps[i];
        const m = state.melodicPatterns[synthId][i];
        step.classList.remove('active', 'sustain-part', 'sustain-head');
        step.innerText = '';
        if (m) {
            step.classList.add('active');
            if (m.duration > 1) step.classList.add('sustain-head');
            step.innerText = `${m.note}${m.octave}`;
        }
        // Check for sustain from previous
        for (let prev = Math.max(0, i - 7); prev < i; prev++) {
            const pm = state.melodicPatterns[synthId][prev];
            if (pm && prev + pm.duration > i) {
                step.classList.add('sustain-part');
            }
        }
    }
}

// 3. FX Rack UI
const fxRackEl = document.getElementById('fx-rack-container');
const addFXGroup = (title, knobs) => {
    const group = document.createElement('div'); group.className = 'fx-group';
    group.innerHTML = `<div class="fx-title">${title}</div>`;
    const pack = document.createElement('div'); pack.className = 'fx-knobs';
    knobs.forEach(k => makeKnob(pack, k.cb, k.lbl, k.min, k.max, k.val));
    group.appendChild(pack);
    fxRackEl.appendChild(group);
};

addFXGroup('DLY', [
    { cb: (v) => state.master.setDelayTime(v), lbl: 'T', min: 0.05, max: 2, val: 0.3 },
    { cb: (v) => state.master.setDelayFeedback(v), lbl: 'F', min: 0, max: 0.9, val: 0.3 },
    { cb: (v) => state.master.setDelayMix(v), lbl: 'M', min: 0, max: 1, val: 0 }
]);
addFXGroup('RVB', [{ cb: (v) => state.master.setReverbMix(v), lbl: 'MIX', min: 0, max: 1, val: 0 }]);
addFXGroup('TRM', [
    { cb: (v) => state.master.setTremoloSpeed(v), lbl: 'S', min: 0.1, max: 20, val: 5 },
    { cb: (v) => state.master.setTremoloDepth(v), lbl: 'D', min: 0, max: 1, val: 0 }
]);
addFXGroup('SYS', [
    { cb: (v) => SYNTH_defs.forEach(s => state.melodicSynths[s.id].setParam('release', v)), lbl: 'SUS', min: 0.01, max: 2, val: 0.5 },
    { cb: (v) => state.master.setDroneMix(v), lbl: 'DRN', min: 0, max: 1, val: 0 },
    { cb: (v) => state.master.setBitcrushMix(v), lbl: 'CRH', min: 0, max: 1, val: 0 }
]);
addFXGroup('CHR', [
    { cb: (v) => state.master.setChorusSpeed(v), lbl: 'S', min: 0.1, max: 10, val: 1.5 },
    { cb: (v) => state.master.setChorusDepth(v), lbl: 'D', min: 0, max: 1, val: 0 }
]);
addFXGroup('FLG', [
    { cb: (v) => state.master.setFlangerSpeed(v), lbl: 'S', min: 0.05, max: 5, val: 0.25 },
    { cb: (v) => state.master.setFlangerDepth(v), lbl: 'D', min: 0, max: 1, val: 0 }
]);

// 4. Keyboard
const kbEl = document.getElementById('keyboard-container');
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
for (let i = 0; i < 52; i++) {
    const noteName = notes[i % 12];
    const octave = 1 + Math.floor(i / 12);
    const isBlack = noteName.includes('#');
    const key = document.createElement('div');
    key.className = `key ${isBlack ? 'black' : 'white'}`;
    const play = () => {
        resumeAudio();
        lastPressedNote = { note: noteName, octave: octave };
        return state.melodicSynths[state.activeSynthId].triggerAttack(getFreq(noteName, octave));
    };
    const stop = (v) => state.melodicSynths[state.activeSynthId].triggerRelease(v);
    key.onmousedown = (e) => { if (e.button === 0) { key._v = play(); key.classList.add('pressed'); } };
    const rel = () => { if (key._v) { stop(key._v); key._v = null; key.classList.remove('pressed'); } };
    key.onmouseup = rel; key.onmouseleave = rel;
    key.ontouchstart = (e) => { e.preventDefault(); key._v = play(); key.classList.add('pressed'); };
    key.ontouchend = (e) => { e.preventDefault(); rel(); };
    key.ontouchcancel = rel;
    kbEl.appendChild(key);
}

// 5. Sequencer
const bpmValEl = document.getElementById('bpm-value');
state.sequencer = new Sequencer(state.bpm, (stepIdx, time) => {
    DRUM_defs.forEach(d => {
        if (state.patterns[d.id][stepIdx]) {
            if (state.solos.size === 0 || state.solos.has(d.id)) state.drumChannels[d.id].trigger(time);
        }
    });

    const stepTime = 60 / state.bpm / 4;
    SYNTH_defs.forEach(s => {
        const m = state.melodicPatterns[s.id][stepIdx];
        if (m) {
            if (state.solos.size === 0 || state.solos.has(s.id)) {
                const duration = m.duration || 1;
                const v = state.melodicSynths[s.id].triggerAttack(getFreq(m.note, m.octave), time);
                state.melodicSynths[s.id].triggerRelease(v, time + (stepTime * duration) * 0.95);
            }
        }
    });

    requestAnimationFrame(() => {
        document.querySelectorAll('.step-btn').forEach(b => b.classList.remove('playing'));
        document.querySelectorAll(`.step-btn[data-idx="${stepIdx}"]`).forEach(b => b.classList.add('playing'));
    });
});

document.getElementById('btn-play').onclick = () => { resumeAudio(); state.sequencer.start(); };
document.getElementById('btn-stop').onclick = () => state.sequencer.stop();

new Knob(document.getElementById('knob-bpm'), (v) => {
    state.bpm = Math.round(v);
    state.sequencer.setBpm(state.bpm);
    bpmValEl.innerText = state.bpm;
});

new Knob(document.getElementById('knob-master-vol'), (v) => state.master.setMasterVolume(v));
new Knob(document.getElementById('knob-master-low'), (v) => state.master.setLowGain(v));
new Knob(document.getElementById('knob-master-mid'), (v) => state.master.setMidGain(v));
new Knob(document.getElementById('knob-master-high'), (v) => state.master.setHighGain(v));
