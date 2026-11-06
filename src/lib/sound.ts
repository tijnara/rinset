// src/lib/sound.ts
'use client';

class SoundManager {
    private ctx: AudioContext | null = null;
    private isUnlocked = false;

    private init() {
        if (typeof window === 'undefined') return;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Pre-unlocks audio context on initial touch/click to comply with mobile autoplay policies
    public unlock() {
        if (this.isUnlocked) return;
        this.init();
        if (this.ctx) {
            this.isUnlocked = true;
        }
    }

    // Synthetic Dual-Tone Chime (D5 587.33Hz -> A5 880Hz) with resonant decay
    public playCycleCompleteChime() {
        try {
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const notes = [
                { freq: 587.33, start: 0, duration: 0.6 },  // D5
                { freq: 880.00, start: 0.16, duration: 0.9 }, // A5
            ];

            notes.forEach(({ freq, start, duration }) => {
                const osc = this.ctx!.createOscillator();
                const gain = this.ctx!.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + start);

                // Smooth volume envelope
                gain.gain.setValueAtTime(0, now + start);
                gain.gain.linearRampToValueAtTime(0.35, now + start + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

                osc.connect(gain);
                gain.connect(this.ctx!.destination);

                osc.start(now + start);
                osc.stop(now + start + duration);
            });

            // Hardware haptic vibration for Android / tablets
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([250, 100, 250]);
            }
        } catch (err) {
            console.warn('[SoundManager] Could not play cycle chime:', err);
        }
    }

    // Quick crisp acknowledgment beep (1200Hz) for barcode/QR scans
    public playScanBeep() {
        try {
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.09);

            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(30);
            }
        } catch {}
    }
}

export const sound = new SoundManager();

if (typeof window !== 'undefined') {
    const handleInteraction = () => {
        sound.unlock();
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
    };
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
}