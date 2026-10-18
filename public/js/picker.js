let _pickerInstances = 0;
class HorizontalPicker {
    constructor(containerElement, initialColor, onChange) {
        this.container = containerElement;
        this.onChange = onChange;
        this.id = _pickerInstances++;

        this.currHue = 0;
        this.currSat = 0;
        this.currVal = 0;

        this.init(initialColor);
    }

    init(initialColor) {
        // Create the popover element ensuring unique IDs for internal parts if needed
        // but mostly using class selectors for internal query
        const popover = document.createElement('div');
        popover.className = 'picker-popover';
        popover.innerHTML = `
            <div class="picker-area">
                <div class="picker-cursor"></div>
            </div>
            <div class="picker-slider-wrap">
                <div class="picker-hue-slider"></div>
                <div class="picker-hue-cursor"></div>
            </div>
        `;

        this.container.appendChild(popover);

        this.popover = popover;
        this.area = popover.querySelector('.picker-area');
        this.cursor = popover.querySelector('.picker-cursor');
        this.hueSlider = popover.querySelector('.picker-hue-slider');
        this.hueCursor = popover.querySelector('.picker-hue-cursor');

        this.setInitialColor(initialColor);
        this.attachEvents();
    }

    setInitialColor(hex) {
        if (!hex || hex[0] !== '#') hex = '#FFFFFF';
        const hsv = this.hexToHsv(hex);
        this.currHue = hsv.h;
        this.currSat = hsv.s;
        this.currVal = hsv.v;
        this.updateUI();
    }

    attachEvents() {
        let isDraggingArea = false;
        let isDraggingHue = false;

        const handleArea = (e) => {
            const rect = this.area.getBoundingClientRect();
            const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
            let x = (clientX - rect.left) / rect.width;
            let y = (clientY - rect.top) / rect.height;
            this.currSat = Math.max(0, Math.min(100, x * 100));
            this.currVal = Math.max(0, Math.min(100, (1 - y) * 100));
            this.updateUI();
            this.fireChange();
        };

        const handleHue = (e) => {
            const rect = this.hueSlider.getBoundingClientRect();
            const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
            let x = (clientX - rect.left) / rect.width;
            this.currHue = Math.max(0, Math.min(360, x * 360));
            this.updateUI();
            this.fireChange();
        };

        this.area.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDraggingArea = true;
            handleArea(e);
        });
        this.hueSlider.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDraggingHue = true;
            handleHue(e);
        });

        this.area.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            isDraggingArea = true;
            handleArea(e);
        }, { passive: true });
        this.hueSlider.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            isDraggingHue = true;
            handleHue(e);
        }, { passive: true });

        // Prevent popover from closing when clicking inside it
        this.popover.addEventListener('click', (e) => e.stopPropagation());
        this.popover.addEventListener('mousedown', (e) => e.stopPropagation());
        this.popover.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingArea) handleArea(e);
            if (isDraggingHue) handleHue(e);
        });

        window.addEventListener('touchmove', (e) => {
            if (isDraggingArea) handleArea(e);
            if (isDraggingHue) handleHue(e);
        }, { passive: true });

        window.addEventListener('mouseup', () => {
            isDraggingArea = false;
            isDraggingHue = false;
        });

        window.addEventListener('touchend', () => {
            isDraggingArea = false;
            isDraggingHue = false;
        });
    }

    updateUI() {
        this.area.style.backgroundColor = `hsl(${this.currHue}, 100%, 50%)`;
        this.cursor.style.left = `${this.currSat}%`;
        this.cursor.style.top = `${100 - this.currVal}%`;
        this.hueCursor.style.left = `${(this.currHue / 360) * 100}%`;
    }

    fireChange() {
        const hex = this.hsvToHex(this.currHue, this.currSat, this.currVal);
        if (this.onChange) this.onChange(hex);
    }

    toggle() {
        const isActive = this.popover.classList.contains('active');
        // Close all other pickers first
        document.querySelectorAll('.picker-popover').forEach(p => p.classList.remove('active'));
        if (!isActive) this.popover.classList.add('active');
    }

    close() {
        this.popover.classList.remove('active');
    }

    hexToHsv(hex) {
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
        let d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, v: v * 100 };
    }

    hsvToHex(h, s, v) {
        s /= 100; v /= 100;
        let i = Math.floor(h / 60);
        let f = h / 60 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);
        let r, g, b;
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0').toUpperCase();
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}
