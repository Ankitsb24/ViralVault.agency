gsap.registerPlugin(ScrollTrigger);

// Initialize Smooth Scroll
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

// Atmospheric Light Source
const light = document.getElementById('light');
window.addEventListener('mousemove', (e) => {
  gsap.to(light, {
    x: e.clientX - 400,
    y: e.clientY - 400,
    duration: 1.5,
    ease: 'power2.out'
  });
});

// Kinetic Typography Stretching
gsap.to('#word-1', {
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    scrub: true,
  },
  scaleX: 2.5,
  letterSpacing: '0.2em',
});

gsap.to('#word-2', {
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    scrub: true,
  },
  scaleX: 0.5,
  letterSpacing: '-0.1em',
});

// Hero Exit: Smooth Fade & Slide
gsap.to('#hero', {
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  },
  opacity: 0,
  y: -100,
  scale: 0.95
});

// Reel Wall Entrance Animation
gsap.from('.reel-item', {
  scrollTrigger: {
    trigger: '.reel-grid',
    start: 'top 85%',
  },
  opacity: 0,
  y: 60,
  stagger: 0.05,
  duration: 1,
  ease: 'power3.out'
});

// ─── YouTube Player API ───────────────────────────────────────────────────────

const SVG_MUTED = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
</svg>`;

const SVG_UNMUTED = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
</svg>`;

// Map of player instances: index -> { player, isMuted, progressFill }
const players = {};

// Assign unique IDs to every iframe in the reel grid
const iframes = document.querySelectorAll('.reel-grid iframe');

iframes.forEach((iframe, i) => {
  // Give the iframe a unique ID for the YT.Player constructor
  iframe.id = `yt-player-${i}`;

  // Inject overlay, progress bar, and mute button into the parent .reel-item
  const reelItem = iframe.parentElement;

  // Overlay (intercepts clicks for play/pause, blocks YouTube links)
  const overlay = document.createElement('div');
  overlay.className = 'video-overlay';
  overlay.dataset.index = i;

  // Play indicator (centered play triangle icon)
  const playIndicator = document.createElement('div');
  playIndicator.className = 'play-indicator';
  playIndicator.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5v14l11-7z"/>
  </svg>`;
  overlay.appendChild(playIndicator);

  // Progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressBar.appendChild(progressFill);

  // Mute button
  const muteBtn = document.createElement('button');
  muteBtn.className = 'mute-btn';
  muteBtn.innerHTML = SVG_MUTED; // starts muted
  muteBtn.setAttribute('aria-label', 'Toggle mute');
  muteBtn.dataset.index = i;

  overlay.appendChild(progressBar);
  overlay.appendChild(muteBtn);
  reelItem.appendChild(overlay);

  // Store progress fill reference early
  players[i] = { player: null, isMuted: true, progressFill };

  // Click on overlay body = play/pause
  overlay.addEventListener('click', (e) => {
    if (e.target === muteBtn || muteBtn.contains(e.target)) return;
    const p = players[i];
    if (!p.player) return;
    const state = p.player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      p.player.pauseVideo();
    } else {
      p.player.playVideo();
    }
  });

  // Click on mute button = toggle mute
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const p = players[i];
    if (!p.player) return;
    if (p.isMuted) {
      p.player.unMute();
      p.isMuted = false;
      muteBtn.innerHTML = SVG_UNMUTED;
      muteBtn.setAttribute('aria-label', 'Mute video');
    } else {
      p.player.mute();
      p.isMuted = true;
      muteBtn.innerHTML = SVG_MUTED;
      muteBtn.setAttribute('aria-label', 'Unmute video');
    }
  });
});

// Setup function for players
function initPlayers() {
  iframes.forEach((iframe, i) => {
    const player = new YT.Player(`yt-player-${i}`, {
      events: {
        onReady: (event) => {
          players[i].player = event.target;
          // Start muted
          event.target.mute();

          // Start progress polling
          setInterval(() => {
            const p = players[i];
            if (!p.player || typeof p.player.getDuration !== 'function') return;
            const duration = p.player.getDuration();
            const current = p.player.getCurrentTime();
            if (duration > 0) {
              const pct = (current / duration) * 100;
              p.progressFill.style.width = pct + '%';
              // Remove transition briefly near end to avoid jump back
              if (pct > 98) {
                p.progressFill.style.transition = 'none';
              } else {
                p.progressFill.style.transition = 'width 0.4s linear';
              }
            }
          }, 500);
        },
        onStateChange: (event) => {
          const state = event.data;
          const reelItem = iframe.parentElement;
          if (state === YT.PlayerState.PLAYING) {
            reelItem.classList.remove('is-paused');
            reelItem.classList.add('is-playing');
          } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
            reelItem.classList.add('is-paused');
            reelItem.classList.remove('is-playing');
          }
        }
      }
    });
  });
}

// Check if YT is already loaded (race condition safety)
if (window.YT && window.YT.Player) {
  initPlayers();
} else {
  window.onYouTubeIframeAPIReady = initPlayers;
}

// Scroll-based play/pause using IntersectionObserver
function attachScrollObserver() {
  const observerOptions = { threshold: 0.3 };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      const isVideo = el.tagName.toLowerCase() === 'video';

      if (isVideo) {
        entry.isIntersecting
          ? el.play().catch(() => {})
          : el.pause();
        return;
      }

      // It's an iframe
      const idx = Array.from(iframes).indexOf(el);
      const p = players[idx];
      const reelItem = el.parentElement;

      if (!p || !p.player) {
        // Fallback: postMessage if player not ready
        el.contentWindow?.postMessage(JSON.stringify({
          event: 'command',
          func: entry.isIntersecting ? 'playVideo' : 'pauseVideo'
        }), '*');
        return;
      }

      if (entry.isIntersecting) {
        p.player.playVideo();
      } else {
        p.player.pauseVideo();
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reel-grid video, .reel-grid iframe').forEach(el => {
    observer.observe(el);
  });
}

// Attach Scroll Observer immediately
attachScrollObserver();

// Update Lenis on ScrollTrigger refresh
ScrollTrigger.addEventListener('refresh', () => lenis.resize());
ScrollTrigger.refresh();
