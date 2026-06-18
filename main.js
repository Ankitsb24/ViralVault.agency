gsap.registerPlugin(ScrollTrigger);

// ─── Smooth Scroll ────────────────────────────────────────────────────────────
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

// ─── Atmospheric Light ────────────────────────────────────────────────────────
const light = document.getElementById('light');
window.addEventListener('mousemove', (e) => {
  gsap.to(light, { x: e.clientX - 400, y: e.clientY - 400, duration: 1.5, ease: 'power2.out' });
});

// ─── Kinetic Hero Typography ──────────────────────────────────────────────────
gsap.to('#word-1', {
  scrollTrigger: { trigger: '#hero', start: 'top top', scrub: true },
  scaleX: 2.5, letterSpacing: '0.2em',
});
gsap.to('#word-2', {
  scrollTrigger: { trigger: '#hero', start: 'top top', scrub: true },
  scaleX: 0.5, letterSpacing: '-0.1em',
});
gsap.to('#hero', {
  scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  opacity: 0, y: -100, scale: 0.95,
});

// ─── Reel Wall Entrance ───────────────────────────────────────────────────────
gsap.from('.reel-item', {
  scrollTrigger: { trigger: '.reel-grid', start: 'top 85%' },
  opacity: 0, y: 60, stagger: 0.05, duration: 1, ease: 'power3.out',
});

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const SVG_MUTED = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
</svg>`;
const SVG_UNMUTED = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
</svg>`;

// ─── Player Registry ──────────────────────────────────────────────────────────
// keyed by video ID: { player, isMuted, progressFill }
const registry = {};

// ─── Build Controls on a reel-item ───────────────────────────────────────────
function buildControls(reelItem, videoId) {
  const overlay   = document.createElement('div');
  overlay.className = 'video-overlay';

  const playIndicator = document.createElement('div');
  playIndicator.className = 'play-indicator';
  playIndicator.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg>`;
  overlay.appendChild(playIndicator);

  const progressBar  = document.createElement('div');
  progressBar.className = 'progress-bar';
  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressBar.appendChild(progressFill);

  const muteBtn = document.createElement('button');
  muteBtn.className = 'mute-btn';
  muteBtn.innerHTML = SVG_MUTED;
  muteBtn.setAttribute('aria-label', 'Toggle mute');

  overlay.appendChild(progressBar);
  overlay.appendChild(muteBtn);
  reelItem.appendChild(overlay);

  registry[videoId] = { player: null, isMuted: true, progressFill };

  // Play / pause on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === muteBtn || muteBtn.contains(e.target)) return;
    const r = registry[videoId];
    if (!r.player) return;
    const state = r.player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) r.player.pauseVideo();
    else r.player.playVideo();
  });

  // Mute toggle
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const r = registry[videoId];
    if (!r.player) return;
    if (r.isMuted) {
      r.player.unMute(); r.isMuted = false;
      muteBtn.innerHTML = SVG_UNMUTED;
      muteBtn.setAttribute('aria-label', 'Mute video');
    } else {
      r.player.mute(); r.isMuted = true;
      muteBtn.innerHTML = SVG_MUTED;
      muteBtn.setAttribute('aria-label', 'Unmute video');
    }
  });
}

// ─── Inject iframe + init YT.Player ──────────────────────────────────────────
let ytReady = false;
const pendingInits = []; // items waiting for YT API

function injectPlayer(reelItem) {
  const videoId = reelItem.dataset.videoId;
  if (!videoId || reelItem.dataset.loaded) return;
  reelItem.dataset.loaded = '1';

  // Set thumbnail as background while iframe loads
  reelItem.style.backgroundImage = `url(https://img.youtube.com/vi/${videoId}/mqdefault.jpg)`;
  reelItem.style.backgroundSize  = 'cover';
  reelItem.style.backgroundPosition = 'center';

  // Build overlay controls
  buildControls(reelItem, videoId);

  // Create iframe element
  const iframeId = `yt-${videoId}`;
  const iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.allow = 'autoplay; encrypted-media';
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&enablejsapi=1`;
  reelItem.insertBefore(iframe, reelItem.firstChild);

  const init = () => {
    new YT.Player(iframeId, {
      events: {
        onReady(event) {
          registry[videoId].player = event.target;
          event.target.mute();
          // Clear thumbnail once video is ready
          reelItem.style.backgroundImage = '';
          // Progress polling
          setInterval(() => {
            const r = registry[videoId];
            if (!r.player || typeof r.player.getDuration !== 'function') return;
            const dur = r.player.getDuration();
            const cur = r.player.getCurrentTime();
            if (dur > 0) {
              const pct = (cur / dur) * 100;
              r.progressFill.style.transition = pct > 98 ? 'none' : 'width 0.4s linear';
              r.progressFill.style.width = pct + '%';
            }
          }, 500);
        },
        onStateChange(event) {
          const state = event.data;
          if (state === YT.PlayerState.PLAYING) {
            reelItem.classList.add('is-playing');
            reelItem.classList.remove('is-paused');
          } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
            reelItem.classList.add('is-paused');
            reelItem.classList.remove('is-playing');
          }
        }
      }
    });
  };

  if (ytReady) init();
  else pendingInits.push(init);
}

// ─── YouTube API Ready Callback ───────────────────────────────────────────────
window.onYouTubeIframeAPIReady = function () {
  ytReady = true;
  pendingInits.forEach(fn => fn());
  pendingInits.length = 0;
};

// ─── Lazy Load Observer (fires 200 px before card enters screen) ──────────────
const lazyObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      injectPlayer(entry.target);
      lazyObserver.unobserve(entry.target); // only inject once
    }
  });
}, { rootMargin: '200px 0px', threshold: 0 });

document.querySelectorAll('.reel-item[data-video-id]').forEach(el => lazyObserver.observe(el));

// ─── Scroll-based Play / Pause (after iframe is loaded) ──────────────────────
const playObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const reelItem = entry.target;
    const videoId  = reelItem.dataset.videoId;
    if (!videoId) return;
    const r = registry[videoId];
    if (!r || !r.player) return;
    if (entry.isIntersecting) r.player.playVideo();
    else r.player.pauseVideo();
  });
}, { threshold: 0.3 });

// We observe all reel-items — playObserver skips items whose player isn't ready yet
document.querySelectorAll('.reel-item[data-video-id]').forEach(el => playObserver.observe(el));

// ─── Lenis ↔ ScrollTrigger sync ───────────────────────────────────────────────
ScrollTrigger.addEventListener('refresh', () => lenis.resize());
ScrollTrigger.refresh();
