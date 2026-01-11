export class Knob {
    constructor(element, onChange) {
        this.element = element;
        this.onChange = onChange;
        this.min = parseFloat(element.dataset.min || 0);
        this.max = parseFloat(element.dataset.max || 1);
        this.value = parseFloat(element.dataset.value || this.min);
        this.steps = parseFloat(element.dataset.steps || 0);

        this.isDragging = false;
        this.startY = 0;
        this.startVal = 0;

        this.init();
    }

    init() {
        this.updateVisuals();

        // Mouse Events
        this.element.addEventListener('mousedown', (e) => this.handleStart(e.clientY, e));

        // Touch Events
        this.element.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;
            this.handleStart(e.touches[0].clientY, e);
        }, { passive: false });

        // Global Move/Up
        window.addEventListener('mouseup', () => this.handleEnd());
        window.addEventListener('touchend', () => this.handleEnd());

        window.addEventListener('mousemove', (e) => this.handleMove(e.clientY, e));
        window.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            this.handleMove(e.touches[0].clientY, e);
        }, { passive: false });
    }

    handleStart(y, e) {
        this.isDragging = true;
        this.startY = y;
        this.startVal = this.value;
        document.body.style.cursor = 'ns-resize';
        // e.preventDefault(); // Don't prevent default always, might block scrolling? 
        // For knobs we DO want to prevent scroll usually
        if (e.cancelable) e.preventDefault();
    }

    handleEnd() {
        if (this.isDragging) {
            this.isDragging = false;
            document.body.style.cursor = 'default';
        }
    }

    handleMove(y, e) {
        if (!this.isDragging) return;
        if (e.cancelable) e.preventDefault(); // Prevent scroll while twisting knob

        const deltaY = this.startY - y;
        const range = this.max - this.min;
        const sensitivity = 200; // pixels to full range

        let deltaVal = (deltaY / sensitivity) * range;
        let newVal = this.startVal + deltaVal;

        // Clamp
        newVal = Math.max(this.min, Math.min(this.max, newVal));

        // Steps
        if (this.steps > 0) {
            newVal = Math.round(newVal / this.steps) * this.steps;
        }

        this.value = newVal;
        this.updateVisuals();
        if (this.onChange) this.onChange(this.value);
    }

    updateVisuals() {
        // Map value to rotation (-135 to 135 deg usually)
        const range = this.max - this.min;
        const pct = (this.value - this.min) / range;
        const deg = -135 + (pct * 270);

        this.element.style.transform = `rotate(${deg}deg)`;

        // Update active style if not default
        if (pct > 0) {
            this.element.classList.add('knob-active');
        } else {
            this.element.classList.remove('knob-active');
        }
    }

    setValue(val) {
        this.value = val;
        this.updateVisuals();
    }
}
