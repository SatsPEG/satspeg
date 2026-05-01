// ===== SatsPEG NFT Engine v7 =====
// Image-based variants + animated particle effects

const VARIANTS = [
  { name: 'Common',   hue: 0,   sat: 0.0,  colors: ['#9E9E9E','#BDBDBD','#757575','#E0E0E0'] },
  { name: 'Uncommon', hue: 120, sat: 1.0,  colors: ['#4CAF50','#81C784','#2E7D32','#C8E6C9'] },
  { name: 'Rare',     hue: 210, sat: 1.0,  colors: ['#2196F3','#64B5F6','#1565C0','#BBDEFB'] },
  { name: 'Epic',     hue: 280, sat: 1.0,  colors: ['#9C27B0','#CE93D8','#6A1B9A','#E1BEE7'] },
  { name: 'Legend',   hue: 30,  sat: 1.0,  colors: ['#F7931A','#FFAB40','#C06000','#FFD54F'] },
  { name: 'Mystic',   hue: 310, sat: 0.85, colors: ['#E91E9E','#F48FB1','#AD1457','#F8BBD0'] },
];

let baseImage = null;
let activeVariant = 4;

// ===== IMAGE LOADING =====
function loadBaseImage() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { baseImage = img; resolve(); };
    img.onerror = () => resolve();
    img.src = 'nft-orange.png';
  });
}

// ===== COLOR CONVERSION =====
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

function hslToRgb(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const f = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = f(p, q, h + 1/3); g = f(p, q, h); b = f(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ===== DRAW VARIANT =====
function drawVariant(canvas, vi, size) {
  if (!baseImage) return;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  canvas.width = size; canvas.height = size;
  ctx.drawImage(baseImage, 0, 0, size, size);
  if (vi === 4) return; // Legend = original
  const v = VARIANTS[vi];
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+3] < 10) continue;
    if (d[i] < 15 && d[i+1] < 15 && d[i+2] < 15) continue;
    if (d[i] > 240 && d[i+1] > 240 && d[i+2] > 240) continue;
    const [oh, os, ol] = rgbToHsl(d[i], d[i+1], d[i+2]);
    if (os < 0.05) continue;
    const [nr, ng, nb] = hslToRgb(v.hue, os * v.sat, ol);
    d[i] = nr; d[i+1] = ng; d[i+2] = nb;
  }
  ctx.putImageData(imgData, 0, 0);
}

// ===== PARTICLE SYSTEM =====
const particles = [];
const MAX_PARTICLES = 40;

class Particle {
  constructor(colors) {
    this.reset(colors);
    // Random initial life so they don't all spawn at once
    this.life = Math.random() * this.maxLife;
  }
  reset(colors) {
    // Spawn from center area of the crystal
    this.x = 100 + (Math.random() - 0.5) * 80;
    this.y = 90 + (Math.random() - 0.5) * 60;
    // Move outward and upward
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.8;
    this.vx = Math.cos(angle) * speed;
    this.vy = -0.4 - Math.random() * 1.0; // upward bias
    this.size = 1 + Math.random() * 3;
    this.maxLife = 60 + Math.random() * 80;
    this.life = 0;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.type = Math.random() < 0.15 ? 'cross' : (Math.random() < 0.3 ? 'square' : 'dot');
  }
  update() {
    this.life++;
    this.x += this.vx;
    this.y += this.vy;
    this.vy -= 0.005; // slight upward acceleration
    this.vx *= 0.99;
  }
  get alpha() {
    const progress = this.life / this.maxLife;
    if (progress < 0.1) return progress / 0.1;
    if (progress > 0.7) return 1 - (progress - 0.7) / 0.3;
    return 1;
  }
  get dead() { return this.life >= this.maxLife; }
}

function initParticles() {
  const colors = VARIANTS[activeVariant].colors;
  particles.length = 0;
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push(new Particle(colors));
  }
}

function drawParticles() {
  const canvas = document.getElementById('particleLayer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 240, 240);

  const colors = VARIANTS[activeVariant].colors;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.update();
    if (p.dead) {
      p.reset(colors);
    }

    ctx.globalAlpha = p.alpha * 0.8;
    ctx.fillStyle = p.color;

    if (p.type === 'cross') {
      // + shaped spark
      const s = p.size;
      ctx.fillRect(p.x - s/2, p.y - s*1.5, s, s*3); // vertical
      ctx.fillRect(p.x - s*1.5, p.y - s/2, s*3, s); // horizontal
    } else if (p.type === 'square') {
      // Pixel square
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    } else {
      // Small dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ===== ANIMATION LOOP =====
function animate() {
  drawParticles();
  requestAnimationFrame(animate);
}

// ===== LOGO =====
function drawLogoIcon(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const s = 4;
  ctx.fillStyle = '#1A1611';
  ctx.fillRect(0, 0, 28, 28);
  const icon = [
    [0,0,0,1,0,0,0],[0,0,1,2,1,0,0],[0,1,2,3,2,1,0],
    [1,2,3,3,3,2,1],[0,1,2,3,2,1,0],[0,0,1,2,1,0,0],[0,0,0,1,0,0,0],
  ];
  const c = {0:'#1A1611',1:'#8B5E0A',2:'#F7931A',3:'#FFD180'};
  for (let y=0;y<7;y++) for (let x=0;x<7;x++) {
    ctx.fillStyle = c[icon[y][x]]; ctx.fillRect(x*s,y*s,s,s);
  }
}

// ===== INIT =====
async function init() {
  drawLogoIcon(document.getElementById('logoIcon'));
  await loadBaseImage();
  if (!baseImage) return;

  drawVariant(document.getElementById('mainNft'), 4, 240);

  document.querySelectorAll('.variant-canvas').forEach(c => {
    drawVariant(c, parseInt(c.dataset.variant), 72);
  });

  document.querySelectorAll('.variant-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.variant-card').forEach(c => c.classList.remove('active-variant'));
      card.classList.add('active-variant');
      const vi = parseInt(card.querySelector('canvas').dataset.variant);
      activeVariant = vi;
      drawVariant(document.getElementById('mainNft'), vi, 240);
      initParticles(); // reset particles to match new variant colors
    });
  });

  initParticles();
  animate();
}

document.addEventListener('DOMContentLoaded', init);
