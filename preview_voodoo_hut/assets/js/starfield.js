/* ============================================================
   VOODOO HUT — Ambient Effects
   1. Hero sky  — stars + moon phase (home page only)
   2. Smoke     — wisps rising from floor (all pages)
   3. Particles — red/cyan ambient glow (all pages, below hero)
   ============================================================ */
(function () {
  'use strict';

  /* ── MOON PHASE MATH ─────────────────────────────────────── */
  function julianDate(d) {
    var y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    var ut = d.getUTCHours() + d.getUTCMinutes() / 60;
    if (m <= 2) { y--; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + ut / 24 + B - 1524.5;
  }

  function calcMoonPhase(date) {
    var D2R = Math.PI / 180;
    var jd = julianDate(date), T = (jd - 2451545.0) / 36525.0;
    var L0  = 218.3164477 + 481267.88123421 * T;
    var Mp  = (134.96298 + 477198.867398 * T) * D2R;
    var D   = (297.85036 + 445267.111480  * T) * D2R;
    var sl  = 6288774 * Math.sin(Mp) + 1274027 * Math.sin(2 * D - Mp) + 658314 * Math.sin(2 * D);
    var moonLon = ((L0 + sl / 1000000) % 360 + 360) % 360;
    var Msun = (357.52911 + 35999.05029 * T) * D2R;
    var L0s  = 280.46646 + 36000.76983 * T;
    var sunLon = ((L0s + (1.914602 - 0.004817 * T) * Math.sin(Msun) + 0.019993 * Math.sin(2 * Msun)) % 360 + 360) % 360;
    return ((moonLon - sunLon) % 360 + 360) % 360 / 360;
  }

  /* Moon snapshot = 6 pm Central, today or yesterday */
  function snapshotDate() {
    try {
      var now = new Date();
      var fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false
      });
      var pts = fmt.formatToParts(now);
      var g = function (t) { return parseInt(pts.find(function (p) { return p.type === t; }).value); };
      var snap = new Date(Date.UTC(g('year'), g('month') - 1, g('day'), 18, 0, 0));
      if (g('hour') < 18) snap.setUTCDate(snap.getUTCDate() - 1);
      return snap;
    } catch (e) { return new Date(); }
  }

  function msToNext6pmCT() {
    try {
      var now = new Date();
      var fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false
      });
      var pts = fmt.formatToParts(now);
      var g = function (t) { return parseInt(pts.find(function (p) { return p.type === t; }).value); };
      var sec = g('hour') * 3600 + g('minute') * 60 + g('second');
      var rem = (18 * 3600 - sec) * 1000;
      return rem > 0 ? rem : rem + 86400000;
    } catch (e) { return 86400000; }
  }

  /* ── HERO SKY ────────────────────────────────────────────── */
  var skyC, skyX, skyW, skyH, skyStars = [], skyRot = 0, moonPh = 0;
  var ltng = { on: false, t0: 0, bolt: [], brnch: [], nextAt: 0 };

  function makeBolt(x, y0, y1, spread) {
    var pts = [[x, y0]], cx = x, n = 10 + Math.floor(Math.random() * 8);
    for (var i = 1; i <= n; i++) {
      cx += (Math.random() - 0.5) * spread * (1.2 - i / n);
      pts.push([cx, y0 + (y1 - y0) * i / n]);
    }
    return pts;
  }

  function drawBolt(ctx, pts, alpha) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#a8c8ff'; ctx.lineWidth = 5;
    ctx.shadowBlur = 18; ctx.shadowColor = '#88aaff';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = '#eef4ff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
    ctx.stroke();
    ctx.restore();
  }

  function renderLightning(ctx, W, H, ts) {
    if (ltng.nextAt === 0) ltng.nextAt = ts + 8000 + Math.random() * 10000;

    if (!ltng.on) {
      if (ts < ltng.nextAt) return;
      ltng.on = true; ltng.t0 = ts;
      var sx = W * (0.18 + Math.random() * 0.64);
      ltng.bolt  = makeBolt(sx, -4, H * (0.65 + Math.random() * 0.3), 70);
      var bi = Math.floor(ltng.bolt.length * (0.35 + Math.random() * 0.3));
      var bp = ltng.bolt[bi];
      ltng.brnch = makeBolt(bp[0], bp[1], bp[1] + H * (0.15 + Math.random() * 0.15), 45);
      return;
    }

    var el = ts - ltng.t0, TOTAL = 420;

    /* Flash — instant surge then secondary flicker at 100ms */
    var fa = 0;
    if      (el < 30)  fa = el / 30 * 0.38;
    else if (el < 55)  fa = 0.38 * (1 - (el - 30) / 25);
    if (el > 100 && el < 160) fa = Math.max(fa, 0.22 * (1 - Math.abs(el - 130) / 30));

    if (fa > 0.003) {
      var fl = ctx.createRadialGradient(ltng.bolt[0][0], 0, 0, ltng.bolt[0][0], H * 0.5, W * 0.55);
      fl.addColorStop(0, 'rgba(230,240,255,' + (fa * 0.95).toFixed(3) + ')');
      fl.addColorStop(1, 'rgba(180,210,255,' + (fa * 0.2).toFixed(3)  + ')');
      ctx.fillStyle = fl; ctx.fillRect(0, 0, W, H);
    }

    if (el > 28) {
      var ba = Math.pow(Math.max(0, 1 - (el - 28) / (TOTAL - 28)), 0.6);
      drawBolt(ctx, ltng.bolt,  ba);
      drawBolt(ctx, ltng.brnch, ba * 0.55);
    }

    if (el >= TOTAL) { ltng.on = false; ltng.nextAt = ts + 45000 + Math.random() * 55000; }
  }

  function initSky() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    skyC = document.createElement('canvas');
    skyC.setAttribute('aria-hidden', 'true');
    skyC.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;display:block;';
    hero.insertBefore(skyC, hero.firstChild);
    skyX = skyC.getContext('2d');

    /* Deterministic star layout — same every load */
    var seed = 1337;
    function rng() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    for (var i = 0; i < 300; i++) {
      skyStars.push({
        xr: rng(), yr: rng() * 0.88,
        r:  0.4 + rng() * 2.1,
        sp: 0.35 + rng() * 0.65,
        ph: rng() * Math.PI * 2,
        hi: rng() > 0.88
      });
    }

    moonPh = calcMoonPhase(snapshotDate());

    /* Refresh moon phase at each 6 pm CT */
    (function schedule() {
      setTimeout(function () { moonPh = calcMoonPhase(snapshotDate()); schedule(); }, msToNext6pmCT());
    }());

    resizeSky();
    window.addEventListener('resize', resizeSky);
    requestAnimationFrame(skyTick);
  }

  function resizeSky() {
    var hero = document.querySelector('.hero');
    if (!hero || !skyC) return;
    skyW = hero.offsetWidth; skyH = hero.offsetHeight;
    skyC.width = skyW; skyC.height = skyH;
  }

  function skyTick(ts) {
    if (!skyX || !skyW) { requestAnimationFrame(skyTick); return; }
    skyRot += 0.00005;

    var ctx = skyX, W = skyW, H = skyH;

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,    '#000208');
    bg.addColorStop(0.45, '#020410');
    bg.addColorStop(0.82, '#050515');
    bg.addColorStop(1,    '#0c051a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(skyRot);
    ctx.translate(-W / 2, -H / 2);
    for (var i = 0; i < skyStars.length; i++) {
      var s = skyStars[i];
      var sx = s.xr * W, sy = s.yr * H;
      var a  = 0.4 + 0.6 * Math.sin(ts * 0.0005 * s.sp + s.ph);
      if (s.hi) a = Math.min(1, a + 0.2);
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(215,228,255,' + a.toFixed(3) + ')';
      ctx.fill();
      if (s.hi && s.r > 1.4) {
        var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 5);
        g.addColorStop(0, 'rgba(200,220,255,' + (a * 0.3).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(sx, sy, s.r * 5, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      }
    }
    ctx.restore();

    drawMoon(ctx, W, H);
    renderLightning(ctx, W, H, ts);
    requestAnimationFrame(skyTick);
  }

  function drawMoon(ctx, W, H) {
    var mx = W * 0.74, my = H * 0.19;
    var R  = Math.max(22, Math.min(46, W * 0.052));
    var ph = moonPh, k = 4 / 3;

    var ha = 0.05 + 0.13 * Math.sin(ph * Math.PI);
    var hl = ctx.createRadialGradient(mx, my, R * 0.4, mx, my, R * 4.5);
    hl.addColorStop(0, 'rgba(255,248,210,' + ha.toFixed(3) + ')');
    hl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(mx, my, R * 4.5, 0, Math.PI * 2);
    ctx.fillStyle = hl; ctx.fill();

    ctx.beginPath(); ctx.arc(mx, my, R, 0, Math.PI * 2);
    ctx.fillStyle = '#080818'; ctx.fill();

    var eff = ph > 0.5 ? 1 - ph : ph;
    var ex  = R * Math.cos(eff * 2 * Math.PI);
    ctx.save();
    ctx.translate(mx, my);
    if (ph > 0.5) ctx.scale(-1, 1);
    ctx.beginPath();
    ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2);
    ctx.bezierCurveTo(ex * k, R, ex * k, -R, 0, -R);
    ctx.fillStyle = '#f0e4b8'; ctx.fill();
    ctx.restore();

    if (ph < 0.04 || ph > 0.96) {
      ctx.beginPath(); ctx.arc(mx, my, R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(70,70,90,0.28)'; ctx.fill();
    }
  }

  /* ── SMOKE ───────────────────────────────────────────────── */
  var smkC, smkX, smkW, smkH, smkParts = [], smkLast = 0;

  function initSmoke() {
    smkC = document.createElement('canvas');
    smkC.setAttribute('aria-hidden', 'true');
    smkC.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:5;pointer-events:none;display:block;';
    document.body.appendChild(smkC);
    smkX = smkC.getContext('2d');
    resizeSmoke();
    window.addEventListener('resize', resizeSmoke);
    requestAnimationFrame(smokeTick);
  }

  function resizeSmoke() {
    smkW = window.innerWidth; smkH = window.innerHeight;
    if (smkC) { smkC.width = smkW; smkC.height = smkH; }
  }

  function spawnSmoke() {
    smkParts.push({
      x: Math.random() * smkW,
      y: smkH + 8,
      r: 16 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.32 + Math.random() * 0.52),
      al: 0.06 + Math.random() * 0.07,
      life: 0, max: 190 + Math.random() * 150,
      hue: 248 + Math.random() * 44,
      wo: Math.random() * Math.PI * 2,
      wd: (Math.random() - 0.5) * 0.018
    });
  }

  function smokeTick(ts) {
    if (!smkX) { requestAnimationFrame(smokeTick); return; }
    smkX.clearRect(0, 0, smkW, smkH);

    if (ts - smkLast > 140 + Math.random() * 110) {
      spawnSmoke();
      if (Math.random() > 0.6) spawnSmoke();
      smkLast = ts;
    }

    for (var i = smkParts.length - 1; i >= 0; i--) {
      var p = smkParts[i];
      p.life++;
      p.x  += p.vx + Math.sin(p.wo + p.life * p.wd) * 0.55;
      p.y  += p.vy;
      p.r  += 0.42;
      p.vy *= 0.998;

      if (p.life >= p.max || p.y + p.r < 0) { smkParts.splice(i, 1); continue; }

      var t    = p.life / p.max;
      var fade = t < 0.15 ? t / 0.15 : Math.pow(1 - (t - 0.15) / 0.85, 1.6);
      var a    = p.al * fade;
      if (a < 0.004) continue;

      var gr = smkX.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      gr.addColorStop(0,    'hsla(' + p.hue + ',12%,82%,' + (a * 0.95).toFixed(4) + ')');
      gr.addColorStop(0.45, 'hsla(' + p.hue + ',8%,65%,'  + (a * 0.48).toFixed(4) + ')');
      gr.addColorStop(1,    'hsla(' + p.hue + ',5%,50%,0)');
      smkX.beginPath();
      smkX.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      smkX.fillStyle = gr; smkX.fill();
    }
    requestAnimationFrame(smokeTick);
  }

  /* ── RED / CYAN PARTICLES ────────────────────────────────── */
  var ptC, ptX, ptW, ptH, ptParts = [], ptFloor = 0;

  function heroFloor() {
    var hero = document.querySelector('.hero');
    return hero ? Math.max(0, hero.getBoundingClientRect().bottom) : 0;
  }

  function initParticles() {
    ptC = document.createElement('canvas');
    ptC.setAttribute('aria-hidden', 'true');
    ptC.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2;pointer-events:none;display:block;';
    document.body.insertBefore(ptC, document.body.firstChild);
    ptX = ptC.getContext('2d');
    resizePt();
    window.addEventListener('resize', resizePt);
    window.addEventListener('scroll', function () { ptFloor = heroFloor(); }, { passive: true });
    for (var i = 0; i < 52; i++) spawnPt(true);
    requestAnimationFrame(ptTick);
  }

  function resizePt() {
    ptW = window.innerWidth; ptH = window.innerHeight;
    if (ptC) { ptC.width = ptW; ptC.height = ptH; }
    ptFloor = heroFloor();
  }

  function spawnPt(anywhere) {
    var cyan = Math.random() > 0.55;
    ptParts.push({
      x:  Math.random() * ptW,
      y:  anywhere ? ptFloor + Math.random() * (ptH - ptFloor) : ptH + 4,
      vx: (Math.random() - 0.5) * 0.65,
      vy: (Math.random() - 0.5) * 0.5,
      r:  1.4 + Math.random() * 2.4,
      rgb: cyan ? '0,200,200' : '224,16,32',
      al: 0.3 + Math.random() * 0.45,
      ph: Math.random() * Math.PI * 2
    });
  }

  function ptTick(ts) {
    if (!ptX) { requestAnimationFrame(ptTick); return; }
    ptX.clearRect(0, 0, ptW, ptH);

    for (var i = 0; i < ptParts.length; i++) {
      var p = ptParts[i];
      p.x += p.vx; p.y += p.vy;

      if (p.x < 0)           { p.x = 0;    p.vx *= -1; }
      if (p.x > ptW)         { p.x = ptW;  p.vx *= -1; }
      if (p.y > ptH)         { p.y = ptH;  p.vy *= -1; }
      if (p.y < ptFloor + 3) { p.y = ptFloor + 3; p.vy = Math.abs(p.vy) * 0.8; }

      var a  = p.al * (0.6 + 0.4 * Math.sin(ts * 0.0017 + p.ph));
      var gr = ptX.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
      gr.addColorStop(0,    'rgba(' + p.rgb + ',' + a.toFixed(3) + ')');
      gr.addColorStop(0.38, 'rgba(' + p.rgb + ',' + (a * 0.38).toFixed(3) + ')');
      gr.addColorStop(1,    'rgba(' + p.rgb + ',0)');
      ptX.beginPath();
      ptX.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
      ptX.fillStyle = gr; ptX.fill();
    }
    requestAnimationFrame(ptTick);
  }

  /* ── CURSOR TRAIL ────────────────────────────────────────── */
  var trlC, trlX, trlParts = [], trlLast = 0;
  var TRL_COLORS = ['224,16,32', '0,200,200', '200,158,30', '148,0,210'];

  function initTrail() {
    if (window.matchMedia && window.matchMedia('(hover:none)').matches) return;

    trlC = document.createElement('canvas');
    trlC.setAttribute('aria-hidden', 'true');
    trlC.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:12;pointer-events:none;display:block;';
    document.body.appendChild(trlC);
    trlX = trlC.getContext('2d');
    trlC.width = window.innerWidth; trlC.height = window.innerHeight;
    window.addEventListener('resize', function () {
      trlC.width = window.innerWidth; trlC.height = window.innerHeight;
    });

    document.addEventListener('mousemove', function (e) {
      var now = Date.now();
      if (now - trlLast < 22) return;
      trlLast = now;
      var n = 2 + Math.floor(Math.random() * 2);
      for (var k = 0; k < n; k++) {
        trlParts.push({
          x:   e.clientX + (Math.random() - 0.5) * 8,
          y:   e.clientY + (Math.random() - 0.5) * 8,
          vx:  (Math.random() - 0.5) * 1.8,
          vy:  -0.8 - Math.random() * 1.8,
          r:   0.8 + Math.random() * 1.8,
          rgb: TRL_COLORS[Math.floor(Math.random() * TRL_COLORS.length)],
          life: 0, max: 28 + Math.floor(Math.random() * 28)
        });
      }
    });

    requestAnimationFrame(trailTick);
  }

  function trailTick() {
    if (!trlX) { requestAnimationFrame(trailTick); return; }
    trlX.clearRect(0, 0, trlC.width, trlC.height);

    for (var i = trlParts.length - 1; i >= 0; i--) {
      var p = trlParts[i];
      p.life++; p.x += p.vx; p.y += p.vy;
      p.vy += 0.04; p.vx *= 0.96;
      if (p.life >= p.max) { trlParts.splice(i, 1); continue; }
      var a  = (1 - p.life / p.max) * 0.85;
      var gr = trlX.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.8);
      gr.addColorStop(0,   'rgba(' + p.rgb + ',' + a.toFixed(3) + ')');
      gr.addColorStop(0.5, 'rgba(' + p.rgb + ',' + (a * 0.35).toFixed(3) + ')');
      gr.addColorStop(1,   'rgba(' + p.rgb + ',0)');
      trlX.beginPath();
      trlX.arc(p.x, p.y, p.r * 2.8, 0, Math.PI * 2);
      trlX.fillStyle = gr; trlX.fill();
    }
    requestAnimationFrame(trailTick);
  }

  /* ── BOOT ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (!window.HTMLCanvasElement) return;
      initSky();
      initSmoke();
      initParticles();
      initTrail();
    } catch (e) {
      if (window.console) console.warn('[voodoo-effects]', e);
    }
  });

}());
