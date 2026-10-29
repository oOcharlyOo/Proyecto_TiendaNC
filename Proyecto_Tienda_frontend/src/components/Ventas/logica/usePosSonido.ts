const audioContext = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

export function playSound(type: 'add' | 'remove' | 'clear' | 'cash') {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch (type) {
    case 'add':
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case 'remove':
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case 'clear':
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      break;
    case 'cash':
      for (let i = 0; i < 3; i++) {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(523, audioContext.currentTime + i * 0.15);
        osc.frequency.setValueAtTime(659, audioContext.currentTime + i * 0.15 + 0.1);
        gain.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.2);
        osc.start(audioContext.currentTime + i * 0.15);
        osc.stop(audioContext.currentTime + i * 0.15 + 0.2);
      }
      break;
  }
}
