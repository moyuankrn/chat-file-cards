import { fileCard, mountFileActions } from './chat-files.js';

const samples = document.getElementById('samples');
const note = new Blob(['A small note from the browser demo.\n\nPreviewed text is inserted with textContent, so markup cannot run.\n'], { type: 'text/plain;charset=utf-8' });
const data = new Blob([JSON.stringify({ feature: 'chat file cards', preview: true, download: true, privateData: false }, null, 2)], { type: 'application/json' });
const canvas = document.createElement('canvas');
canvas.width = 480; canvas.height = 320;
const ctx = canvas.getContext('2d');
const wash = ctx.createLinearGradient(0, 0, 480, 320);
wash.addColorStop(0, '#d6ece9'); wash.addColorStop(1, '#8bbac1');
ctx.fillStyle = wash; ctx.fillRect(0, 0, 480, 320);
ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(350, 68, 55, 0, Math.PI * 2); ctx.fill();
ctx.fillStyle = '#416f76'; ctx.beginPath(); ctx.moveTo(0, 280); ctx.bezierCurveTo(135, 175, 260, 320, 480, 190); ctx.lineTo(480, 320); ctx.lineTo(0, 320); ctx.fill();
const picture = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

const files = [
  { name: 'project-note.txt', data: note },
  { name: 'sample-art.png', data: picture },
  { name: 'metadata.json', data },
].map(({ name, data }) => ({ name, size: data.size, url: URL.createObjectURL(data) }));
samples.innerHTML = files.map(fileCard).join('');
const unmount = mountFileActions(samples);
addEventListener('pagehide', () => { unmount(); files.forEach(file => URL.revokeObjectURL(file.url)); }, { once: true });
