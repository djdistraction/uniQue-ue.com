/* ============================================================
   Voodoo Hut AV & Broadcast — main.js
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     NAV: sticky scroll state + hamburger mobile menu
  ---------------------------------------------------------- */
  const nav       = document.getElementById('main-nav');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      hamburger.innerHTML = open ? '&#10005;' : '&#9776;';
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', false);
        hamburger.innerHTML = '&#9776;';
      });
    });
  }

  /* ----------------------------------------------------------
     RADIO PLAYER
     ─ Production: streams from AzuraCast Icecast + NowPlaying API
     ─ Placeholder: rotates local MP3s and simulates the same UI
  ---------------------------------------------------------- */

  /* ── Config ── */
  const AZURACAST_STREAM   = 'https://radio.voodoo-hut.com:8000/stream';
  const AZURACAST_API      = 'https://radio.voodoo-hut.com/api/nowplaying/1';

  // Placeholder tracks that stand in for the live AzuraCast stream.
  // Replace this array (or the stream URL above) when the server is live.
  const PLACEHOLDER_TRACKS = [
    {
      src:    'assets/audio/DJ Distraction on Voodoo Hut Radio v1.mp3',
      title:  'Late Night Vibes',
      artist: 'DJ Distraction',
    },
    {
      src:    'assets/audio/DJ Distraction on Voodoo Hut Radio v2.mp3',
      title:  'Kemah Nights',
      artist: 'DJ Distraction',
    },
    {
      src:    'assets/audio/DJ Distraction on Voodoo Hut Radio v3.mp3',
      title:  'Waterfront Sessions',
      artist: 'DJ Distraction',
    },
    {
      src:    'assets/audio/DJ Distraction on Voodoo Hut Radio v4.mp3',
      title:  'Voodoo Hours',
      artist: 'DJ Distraction',
    },
  ];

  // Try the live stream first; fall back to local placeholders if it fails.
  let usePlaceholder = false;
  let placeholderIndex = 0;

  /* ── DOM refs ── */
  const playBtn       = document.getElementById('radio-play');
  const playBtnBar    = document.getElementById('radio-play-bar');
  const volumeSlider  = document.getElementById('radio-volume');
  const volumeBar     = document.getElementById('radio-volume-bar');
  const nowPlayingEl  = document.getElementById('now-playing');
  const liveDot       = document.querySelector('#radio-player .live-dot');
  const listenersEl   = document.getElementById('radio-listeners');
  const heroBigNP     = document.getElementById('radio-now-playing-large');
  const eqBars        = document.querySelectorAll('.eq-bar');
  const progressFill  = document.querySelector('.radio-progress-fill');

  let audio   = null;
  let playing = false;
  let eqAnim  = null;

  /* ── Helpers ── */
  function getVolume() {
    return volumeSlider ? parseFloat(volumeSlider.value) : 0.8;
  }

  function setNowPlaying(text) {
    if (nowPlayingEl)  nowPlayingEl.textContent  = text;
    if (heroBigNP)     heroBigNP.textContent      = text;
  }

  function updatePlayBtns(isPlaying) {
    const pauseSVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    const playSVG  = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    const svg      = isPlaying ? pauseSVG : playSVG;
    const label    = isPlaying ? 'Pause radio' : 'Play radio';
    if (playBtn)    { playBtn.innerHTML    = svg + (playBtn.id === 'radio-play' ? ' ' + (isPlaying ? 'Pause' : 'Tune In') : ''); playBtn.setAttribute('aria-label', label); }
    if (playBtnBar) { playBtnBar.innerHTML = svg; playBtnBar.setAttribute('aria-label', label); }
  }

  /* ── EQ Visualiser (CSS-driven, no Web Audio needed) ── */
  function startEQ() {
    if (!eqBars.length) return;
    eqBars.forEach(bar => bar.classList.add('active'));
  }
  function stopEQ() {
    if (!eqBars.length) return;
    eqBars.forEach(bar => bar.classList.remove('active'));
  }

  /* ── Progress bar for placeholder tracks ── */
  function startProgress(audioEl) {
    if (!progressFill) return;
    function tick() {
      if (!audioEl.duration) return;
      const pct = (audioEl.currentTime / audioEl.duration) * 100;
      progressFill.style.width = pct + '%';
    }
    audioEl.addEventListener('timeupdate', tick);
  }

  /* ── Placeholder playlist ── */
  function loadPlaceholderTrack(index) {
    const track = PLACEHOLDER_TRACKS[index % PLACEHOLDER_TRACKS.length];
    audio.src    = track.src;
    setNowPlaying(track.artist + ' — ' + track.title);
    audio.play().catch(() => {});
  }

  function onPlaceholderEnded() {
    placeholderIndex = (placeholderIndex + 1) % PLACEHOLDER_TRACKS.length;
    loadPlaceholderTrack(placeholderIndex);
  }

  /* ── Create the audio element ── */
  function createAudio(isPlaceholder) {
    if (audio) {
      audio.pause();
      audio.removeEventListener('ended', onPlaceholderEnded);
    }
    audio = new Audio();
    audio.preload = 'none';
    audio.volume  = getVolume();

    audio.addEventListener('playing', () => {
      playing = true;
      updatePlayBtns(true);
      startEQ();
      if (liveDot) liveDot.style.display = 'inline-block';
    });
    audio.addEventListener('pause', () => {
      playing = false;
      updatePlayBtns(false);
      stopEQ();
    });
    audio.addEventListener('error', () => {
      playing = false;
      updatePlayBtns(false);
      stopEQ();
      if (!usePlaceholder) {
        // Live stream failed — switch to placeholder
        usePlaceholder = true;
        createAudio(true);
        setNowPlaying(PLACEHOLDER_TRACKS[0].artist + ' — ' + PLACEHOLDER_TRACKS[0].title);
        loadPlaceholderTrack(placeholderIndex);
      } else {
        setNowPlaying('Tap play to tune in');
      }
    });

    if (isPlaceholder) {
      audio.addEventListener('ended', onPlaceholderEnded);
      startProgress(audio);
    }
  }

  /* ── Toggle play/pause ── */
  function togglePlay() {
    if (!audio) {
      // First press: try live stream
      createAudio(false);
      audio.src = AZURACAST_STREAM + '?nocache=' + Date.now();
      setNowPlaying('Connecting…');
      audio.play().catch(() => {
        // Stream unreachable — fall back immediately
        usePlaceholder = true;
        createAudio(true);
        loadPlaceholderTrack(placeholderIndex);
      });
      return;
    }
    if (playing) {
      audio.pause();
      if (!usePlaceholder) audio.src = ''; // release stream connection
    } else {
      if (usePlaceholder) {
        loadPlaceholderTrack(placeholderIndex);
      } else {
        audio.src = AZURACAST_STREAM + '?nocache=' + Date.now();
        audio.play().catch(() => {});
      }
    }
  }

  if (playBtn)    playBtn.addEventListener('click',    togglePlay);
  if (playBtnBar) playBtnBar.addEventListener('click', togglePlay);

  /* ── Volume sync across both sliders ── */
  function syncVolume(val) {
    if (audio) audio.volume = parseFloat(val);
    if (volumeSlider) volumeSlider.value = val;
    if (volumeBar)    volumeBar.value    = val;
  }
  if (volumeSlider) volumeSlider.addEventListener('input', e => syncVolume(e.target.value));
  if (volumeBar)    volumeBar.addEventListener('input',    e => syncVolume(e.target.value));

  /* ── AzuraCast NowPlaying API (only runs when server is live) ── */
  function fetchNowPlaying() {
    if (usePlaceholder) return; // don't hammer a server that isn't up
    fetch(AZURACAST_API)
      .then(r => r.json())
      .then(data => {
        const song = data?.now_playing?.song;
        if (song) {
          const text = [song.artist, song.title].filter(Boolean).join(' — ') || 'Voodoo Hut Radio';
          setNowPlaying(text);
        }
        const count = data?.listeners?.current;
        if (count > 0 && listenersEl) {
          listenersEl.textContent = count.toLocaleString() + ' listeners worldwide';
        }
      })
      .catch(() => {
        // Server not live yet — quietly switch to placeholder mode
        if (!usePlaceholder) {
          usePlaceholder = true;
        }
      });
  }

  fetchNowPlaying();
  setInterval(fetchNowPlaying, 30000);

  /* ----------------------------------------------------------
     MENU TABS
  ---------------------------------------------------------- */
  const menuTabs   = document.querySelectorAll('.menu-tab');
  const menuPanels = document.querySelectorAll('.menu-panel');
  menuTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      menuTabs.forEach(t => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab);
      });
      menuPanels.forEach(panel => {
        const isTarget = panel.id === target;
        panel.classList.toggle('active', isTarget);
        panel.setAttribute('aria-hidden', !isTarget);
      });
    });
  });

  /* ----------------------------------------------------------
     FADE-IN SCROLL REVEAL
  ---------------------------------------------------------- */
  const fadeEls = document.querySelectorAll('.fade-in');
  if (fadeEls.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    fadeEls.forEach(el => observer.observe(el));
  }

  /* ----------------------------------------------------------
     EVENTS: "Load More" button
  ---------------------------------------------------------- */
  const loadMoreBtn  = document.getElementById('load-more-events');
  const hiddenCards  = document.querySelectorAll('.event-card.hidden');
  let shown = false;
  if (loadMoreBtn && hiddenCards.length) {
    loadMoreBtn.addEventListener('click', () => {
      if (!shown) {
        hiddenCards.forEach(c => c.classList.remove('hidden'));
        loadMoreBtn.textContent = 'Show Less';
      } else {
        hiddenCards.forEach(c => c.classList.add('hidden'));
        loadMoreBtn.textContent = 'Load More Events';
      }
      shown = !shown;
    });
  }

  /* ----------------------------------------------------------
     CONTACT FORM: topic-aware placeholder swap
  ---------------------------------------------------------- */
  const topicSelect  = document.getElementById('contact-topic');
  const messageArea  = document.getElementById('contact-message');
  const placeholders = {
    general:     "Tell us what's on your mind...",
    reservation: 'Date, time, party size, any special requests?',
    billing:     'Describe the issue and include your visit date...',
    booking:     'Tell us about your act — genre, social links, availability...',
    sponsorship: 'What kind of partnership are you envisioning?',
    advertising: 'Tell us about your brand and target audience...',
    press:       'Publication name, story angle, and your deadline...',
    feedback:    'We read every message. What can we do better?',
  };
  if (topicSelect && messageArea) {
    topicSelect.addEventListener('change', () => {
      const key = topicSelect.value;
      messageArea.placeholder = placeholders[key] || placeholders.general;
    });
  }

  /* ----------------------------------------------------------
     LIVE STREAM: offline placeholder detection
  ---------------------------------------------------------- */
  document.querySelectorAll('.stream-card').forEach(card => {
    const iframe  = card.querySelector('iframe');
    const offline = card.querySelector('.stream-offline');
    if (!iframe && offline) offline.style.display = 'flex';
  });

  /* ----------------------------------------------------------
     SMOOTH SCROLL for anchor links
  ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = (nav ? nav.offsetHeight : 72) + 16;
        const top    = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ----------------------------------------------------------
     ACTIVE NAV LINK highlight
  ---------------------------------------------------------- */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
    const href     = link.getAttribute('href') || '';
    const linkPage = href.split('/').pop();
    if (linkPage === currentPath) link.classList.add('active');
  });

})();
