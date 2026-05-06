/* ============================================================
   VOODOO HUT — Easter Egg System
   No hurries, no worries. But there are secrets everywhere.
   ============================================================ */

(function () {
  'use strict';

  /* --- State (localStorage) --- */
  const CLUE_KEY = 'vh_scavenger';

  function getClues() {
    try { return JSON.parse(localStorage.getItem(CLUE_KEY) || '[]'); }
    catch { return []; }
  }
  function addClue(id) {
    const c = getClues();
    if (!c.includes(id)) { c.push(id); localStorage.setItem(CLUE_KEY, JSON.stringify(c)); }
  }
  function hasClue(id) { return getClues().includes(id); }
  function resetClues() { localStorage.removeItem(CLUE_KEY); }

  /* ============================================================
     EASTER EGG 1 — SKULL CLICK × 5 → Tarot Reading
     Click the logo 5 times within 4 seconds.
     ============================================================ */
  let skullClicks = 0;
  let skullTimer  = null;

  function initSkullClick() {
    document.querySelectorAll('.nav-logo-wrap, .hero-logo-wrap').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        skullClicks++;
        clearTimeout(skullTimer);

        // Pulse the logo cyan on each click
        const img = el.querySelector('img');
        if (img) {
          img.style.filter = 'hue-rotate(' + (skullClicks * 72) + 'deg) brightness(1.5)';
          setTimeout(() => { img.style.filter = ''; }, 350);
        }

        if (skullClicks >= 5) {
          skullClicks = 0;
          flyToTarot();
        } else {
          skullTimer = setTimeout(() => { skullClicks = 0; }, 4000);
        }
      });
    });
  }

  function flyToTarot() {
    const veil = document.createElement('div');
    veil.style.cssText = [
      'position:fixed;inset:0;z-index:99999;background:#000',
      'display:flex;align-items:center;justify-content:center',
      'opacity:0;transition:opacity .5s ease;font-family:Georgia,serif',
      'font-size:clamp(24px,5vw,64px);color:#00c8c8;letter-spacing:.2em;text-align:center'
    ].join(';');
    veil.textContent = '🕯️ THE SPIRITS SPEAK 🕯️';
    document.body.appendChild(veil);
    requestAnimationFrame(() => { veil.style.opacity = '1'; });
    setTimeout(() => {
      const base = window.location.pathname.includes('/secret/') ? '' : 'secret/';
      window.location.href = base + 'tarot.html';
    }, 1200);
  }

  /* ============================================================
     EASTER EGG 2 — KONAMI CODE → Skull eyes spin + evil laugh
     ↑ ↑ ↓ ↓ ← → ← → B A
     ============================================================ */
  const KONAMI_SEQ = [
    'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
    'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
    'b','a'
  ];
  let konamiIdx = 0;

  function initKonami() {
    document.addEventListener('keydown', e => {
      const expected = KONAMI_SEQ[konamiIdx];
      if (e.key === expected) {
        konamiIdx++;
        if (konamiIdx === KONAMI_SEQ.length) {
          konamiIdx = 0;
          activateKonami();
        }
      } else {
        konamiIdx = (e.key === KONAMI_SEQ[0]) ? 1 : 0;
      }
    });
  }

  function activateKonami() {
    // Spin the logo eyes (CSS class)
    document.querySelectorAll('.logo-img').forEach(img => {
      img.classList.add('skull-konami');
      setTimeout(() => img.classList.remove('skull-konami'), 3500);
    });

    // Glitch every h1 / h2
    const headings = document.querySelectorAll('h1, h2');
    const glitch   = setInterval(() => {
      headings.forEach(h => {
        h.style.textShadow = [
          (Math.random()*12-6)+'px 0 #0ff',
          (Math.random()*-12+6)+'px 0 #f0f'
        ].join(',');
      });
    }, 60);
    setTimeout(() => {
      clearInterval(glitch);
      headings.forEach(h => { h.style.textShadow = ''; });
    }, 3000);

    // Evil laugh via SpeechSynthesis (no audio file needed)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance('Mwahahahahaha! You found the secret! No hurries. No worries. The spirits are with you tonight.');
      u.rate  = 0.55;
      u.pitch = 0.15;
      u.volume = 1;
      window.speechSynthesis.speak(u);
    }

    showToast('🕯️ THE SPIRITS HAVE BEEN AWAKENED 🕯️', 4000);
  }

  /* ============================================================
     EASTER EGG 3 — HIDDEN FREQUENCY (radio.html)
     Drag volume to exactly max → secret broadcast activates.
     ============================================================ */
  function initRadioFrequency() {
    const vol = document.getElementById('radio-volume');
    if (!vol) return;

    let triggered = false;
    vol.addEventListener('input', () => {
      const v = parseFloat(vol.value);
      if (v >= 1.0 && !triggered) {
        triggered = true;
        setTimeout(activateSecretBroadcast, 900);
      }
      if (v < 0.98) { triggered = false; }
    });
  }

  function activateSecretBroadcast() {
    addClue('radio');

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(
        'Hidden frequency detected. Nine years of magic. The spirits are listening. What serves drinks... but never opens? Find it... where something extraordinary... was once parked.'
      );
      u.rate  = 0.65;
      u.pitch = 0.3;
      window.speechSynthesis.speak(u);
    }

    const overlay = document.createElement('div');
    overlay.id = 'secret-broadcast';
    overlay.innerHTML = `
      <div class="sb-inner">
        <div class="sb-scanline"></div>
        <p class="sb-alert">⚠ &nbsp; HIDDEN FREQUENCY DETECTED &nbsp; ⚠</p>
        <p class="sb-title">SECRET BROADCAST</p>
        <div class="sb-body">
          <p>The spirits are listening.</p>
          <p>Nine years of magic. Hundreds of secrets still buried in these walls.</p>
          <div class="sb-riddle">
            <span class="sb-riddle-num">CLUE 1 / 4</span>
            <p>"What serves drinks but never opens?<br>
            Find it on this very site — hidden where something extraordinary was once parked."</p>
          </div>
          <p class="sb-hint">Somewhere on this website, a door is hidden. Find it.</p>
        </div>
        <button class="sb-close" onclick="document.getElementById('secret-broadcast').remove()">
          — CLOSE TRANSMISSION —
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  /* ============================================================
     SCAVENGER HUNT — Page-specific clue handlers
     ============================================================ */
  function initPageClues() {
    const page = window.location.pathname.split('/').pop() || 'index.html';

    if (page === 'the-bus.html')  initBusClue();
    if (page === 'live.html')     initLiveClue();
    if (page === 'menu.html')     initMenuClue();
    if (page === 'about.html')    initAboutClue();
  }

  /* Bus page — clue 2 */
  function initBusClue() {
    const el = document.getElementById('bus-secret-clue');
    if (!el) return;
    // Only show if radio clue was found
    if (!hasClue('radio')) return;
    el.style.display = 'block';
    el.addEventListener('click', () => {
      addClue('bus');
      showClueModal(
        'CLUE 2 / 4',
        'The Hut has three voices. One roars. One whispers. One spills into the night air.',
        'Find the stage that faces the water. Look beneath what plays tonight.',
        'Go to the Live Streams page. Something is hiding below the Patio Stage.'
      );
    });
  }

  /* Live page — clue 3 */
  function initLiveClue() {
    const el = document.getElementById('live-secret-clue');
    if (!el) return;
    if (!hasClue('bus')) return;
    el.style.display = 'block';
    el.addEventListener('click', () => {
      addClue('live');
      showClueModal(
        'CLUE 3 / 4',
        'Every night has to end somewhere. Find what feeds the night owls.',
        'Look where the kitchen stays open past midnight.',
        'Go to the Menu page. Open the Late Night tab. Something is waiting at the bottom.'
      );
    });
  }

  /* Menu page — clue 4 */
  function initMenuClue() {
    const el = document.getElementById('menu-secret-clue');
    if (!el) return;
    if (!hasClue('live')) return;
    el.style.display = 'block';
    el.addEventListener('click', () => {
      addClue('menu');
      showClueModal(
        'CLUE 4 / 4 — THE FINAL RIDDLE',
        'The Hut has been here nine years. In that time, walls grew memories and faces appeared.',
        'Find where we tell our story. Look for the face that doesn\'t want to be found.',
        'Go to the About page. Look carefully. The reward is waiting.'
      );
    });
  }

  /* About page — final reward */
  function initAboutClue() {
    const el = document.getElementById('about-secret-reward');
    if (!el) return;
    if (!hasClue('menu')) return;
    el.style.display = 'block';
    el.style.cursor  = 'pointer';
    el.addEventListener('click', showFinalReward);
  }

  function showFinalReward() {
    const overlay = document.createElement('div');
    overlay.id = 'final-reward-overlay';
    overlay.innerHTML = `
      <div class="reward-inner">
        <div class="reward-skull" aria-hidden="true">💀</div>
        <p class="reward-eyebrow">YOU FOUND ALL FOUR CLUES</p>
        <h2 class="reward-title">THE SPIRITS ARE PLEASED</h2>
        <div class="reward-coupon">
          <p class="coupon-label">SHOW THIS SCREEN TO YOUR SERVER</p>
          <p class="coupon-offer">½ OFF ANY APPETIZER</p>
          <div class="coupon-code-box">
            <span class="coupon-code">NOHURRIES</span>
          </div>
          <p class="coupon-sub">Valid tonight only &nbsp;·&nbsp; Dine-in only &nbsp;·&nbsp; One per table</p>
        </div>
        <p class="reward-flavor">"Four clues. Nine years. No hurries, no worries." — The Hut</p>
        <button class="reward-close" onclick="document.getElementById('final-reward-overlay').remove();resetClues();">
          — CLOSE —
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    resetClues(); // Reset so they can do it again
  }

  /* ============================================================
     UTILITY — Modals & Toasts
     ============================================================ */
  function showClueModal(title, riddle, hint, next) {
    const m = document.createElement('div');
    m.className = 'clue-modal-overlay';
    m.innerHTML = `
      <div class="clue-modal">
        <p class="clue-eyebrow">🕯️ ${title} 🕯️</p>
        <div class="clue-riddle-text">"${riddle}"</div>
        <p class="clue-hint">${hint}</p>
        <p class="clue-next">${next}</p>
        <button class="clue-btn" onclick="this.closest('.clue-modal-overlay').remove()">— I UNDERSTAND —</button>
      </div>
    `;
    document.body.appendChild(m);
  }

  function showToast(msg, ms = 3000) {
    const old = document.getElementById('voodoo-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'voodoo-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, ms);
  }

  // Expose resetClues for inline onclick
  window.resetClues = resetClues;

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    initSkullClick();
    initKonami();
    initRadioFrequency();
    initPageClues();
  });

})();
