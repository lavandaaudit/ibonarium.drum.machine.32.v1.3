export const ctx = new (window.AudioContext || window.webkitAudioContext)();

export function resumeAudio() {
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
}
