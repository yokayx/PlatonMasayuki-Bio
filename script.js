const audio = document.querySelector('#audio');
const player = document.querySelector('.player');
const playButton = document.querySelector('.play-button');
const seek = document.querySelector('#seek');
const currentTime = document.querySelector('#current-time');
const duration = document.querySelector('#duration');
const errorMessage = document.querySelector('.audio-error');
const volume = document.querySelector('#volume');
const volumeValue = document.querySelector('#volume-value');

function updateVolume() {
  audio.volume = Number(volume.value) / 100;
  volume.style.setProperty('--volume', `${volume.value}%`);
  volumeValue.textContent = `${volume.value}%`;
}
volume.addEventListener('input', updateVolume);
updateVolume();

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
function updateProgress() {
  const progress = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0;
  seek.value = progress;
  seek.style.setProperty('--progress', `${progress}%`);
  currentTime.textContent = formatTime(audio.currentTime);
  if (Number.isFinite(audio.duration)) duration.textContent = formatTime(audio.duration);
}
function updatePlaybackState() {
  const playing = !audio.paused;
  player.classList.toggle('playing', playing);
  playButton.setAttribute('aria-label', playing ? 'Поставить трек на паузу' : 'Воспроизвести трек');
}
playButton.addEventListener('click', async () => {
  if (audio.paused) {
    try {
      errorMessage.hidden = true;
      await audio.play();
    } catch {
      errorMessage.hidden = false;
    }
  } else audio.pause();
});
seek.addEventListener('input', () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(seek.value) / 100 * audio.duration;
  updateProgress();
});
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', updateProgress);
audio.addEventListener('durationchange', updateProgress);
audio.addEventListener('play', updatePlaybackState);
audio.addEventListener('pause', updatePlaybackState);
audio.addEventListener('error', () => { errorMessage.hidden = false; });

// Капли на стекле: мелкие капли остаются на месте, крупные медленно стекают.
(() => {
  const canvas = document.querySelector('.rain');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, drops = [], frame = 0, last = 0;
  const random = (min, max) => min + Math.random() * (max - min);

  function makeDrop(initial = false) {
    const moving = Math.random() < 0.22;
    return {
      x: random(0, width), y: initial ? random(0, height) : random(-height * .15, -10),
      radius: moving ? random(2.1, 4.5) : random(.8, 2.5),
      speed: moving ? random(9, 34) : random(.05, .5),
      moving, trail: moving ? random(16, 65) : 0, opacity: random(.3, .7),
      wobble: random(0, Math.PI * 2)
    };
  }
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drops = Array.from({length: Math.min(220, Math.max(60, Math.round(width * height / 6500)))}, () => makeDrop(true));
  }
  function drawDrop(d) {
    const r = d.radius;
    if (d.moving) {
      const trail = ctx.createLinearGradient(d.x, d.y - d.trail, d.x, d.y);
      trail.addColorStop(0, 'rgba(220,230,240,0)');
      trail.addColorStop(1, `rgba(220,230,240,${d.opacity * .25})`);
      ctx.fillStyle = trail;
      ctx.beginPath();
      ctx.moveTo(d.x - r * .22, d.y - d.trail);
      ctx.quadraticCurveTo(d.x - r * .42, d.y - r * 2, d.x - r * .55, d.y);
      ctx.lineTo(d.x + r * .55, d.y);
      ctx.quadraticCurveTo(d.x + r * .42, d.y - r * 2, d.x + r * .22, d.y - d.trail);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(1, d.moving ? 1.35 : 1.08);
    const gradient = ctx.createRadialGradient(-r * .35, -r * .4, 0, 0, 0, r);
    gradient.addColorStop(0, `rgba(255,255,255,${d.opacity * .8})`);
    gradient.addColorStop(.28, `rgba(210,220,225,${d.opacity * .14})`);
    gradient.addColorStop(.72, `rgba(30,35,40,${d.opacity * .25})`);
    gradient.addColorStop(1, `rgba(255,255,255,${d.opacity * .45})`);
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${d.opacity * .42})`;
    ctx.lineWidth = .55;
    ctx.beginPath(); ctx.arc(0, 0, r * .88, .15, Math.PI * .8); ctx.stroke();
    ctx.restore();
  }
  function render(time) {
    const dt = last ? Math.min((time - last) / 1000, .05) : 0;
    last = time;
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y += d.speed * dt;
      if (d.moving) d.x += Math.sin(time / 1100 + d.wobble) * dt * 1.5;
      if (d.y - d.trail > height) drops[i] = makeDrop();
      drawDrop(drops[i]);
    }
    frame = requestAnimationFrame(render);
  }
  function syncMotion() {
    cancelAnimationFrame(frame);
    last = 0;
    ctx.clearRect(0, 0, width, height);
    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(render);
  }
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  resize();
  syncMotion();
})();
