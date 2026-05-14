/* ============================================================
   VOODOO HUT — Real Astronomical Starfield
   Observer: Kemah, TX  Lat=29.5426°N  Lon=-95.0187°W
   Shows the ACTUAL night sky visible from this location.
   ============================================================ */

(function () {
  'use strict';

  /* ── OBSERVER CONSTANTS ── */
  var LAT_DEG = 29.5426;
  var LON_DEG = -95.0187;
  var LAT_RAD = LAT_DEG * Math.PI / 180;

  /* ── STAR CATALOG ──
     [ra_deg, dec_deg, vmag, spectral, name]
     Source: Yale Bright Star Catalog / Hipparcos
  */
  var CATALOG = [
    // ORION  (indices 0-8)
    [78.634,  -8.201, 0.13, 'B', 'Rigel'],         // 0
    [88.793,   7.407, 0.50, 'M', 'Betelgeuse'],     // 1
    [81.283,   6.350, 1.64, 'B', 'Bellatrix'],      // 2
    [83.002,  -0.299, 2.25, 'O', 'Mintaka'],        // 3
    [84.053,  -1.202, 1.70, 'B', 'Alnilam'],        // 4
    [85.190,  -1.943, 1.77, 'O', 'Alnitak'],        // 5
    [86.939,  -9.670, 2.09, 'B', 'Saiph'],          // 6
    [83.784,   9.934, 3.47, 'O', 'Meissa'],         // 7
    [83.858,  -5.909, 2.77, 'O', 'Iota Ori'],       // 8
    // CANIS MAJOR (indices 9-13)
    [101.287, -16.716,-1.46, 'A', 'Sirius'],        // 9
    [104.656, -28.972, 1.50, 'B', 'Adhara'],        // 10
    [107.098, -26.394, 1.84, 'F', 'Wezen'],         // 11
    [95.675,  -17.956, 1.98, 'B', 'Mirzam'],        // 12
    [111.024, -29.303, 2.45, 'A', 'Aludra'],        // 13
    // CANIS MINOR (indices 14-15)
    [114.826,   5.225, 0.38, 'F', 'Procyon'],       // 14
    [111.788,   8.289, 2.90, 'B', 'Gomeisa'],       // 15
    // GEMINI (indices 16-21)
    [116.329,  28.026, 1.16, 'K', 'Pollux'],        // 16
    [113.649,  31.888, 1.58, 'A', 'Castor'],        // 17
    [99.428,   16.399, 1.93, 'A', 'Alhena'],        // 18
    [95.741,   22.513, 2.88, 'M', 'Tejat'],         // 19
    [108.772,  21.982, 3.53, 'F', 'Wasat'],         // 20
    [93.717,   22.506, 3.31, 'M', 'Propus'],        // 21
    // TAURUS (indices 22-26)
    [68.980,   16.509, 0.85, 'K', 'Aldebaran'],     // 22
    [81.573,   28.608, 1.65, 'B', 'Elnath'],        // 23
    [56.871,   24.105, 2.87, 'B', 'Alcyone'],       // 24
    [57.290,   24.053, 3.63, 'B', 'Atlas'],         // 25
    [56.458,   24.367, 3.88, 'B', 'Maia'],          // 26
    // AURIGA (indices 27-30)
    [79.172,   45.998, 0.08, 'G', 'Capella'],       // 27
    [89.882,   44.948, 1.90, 'A', 'Menkalinan'],    // 28
    [74.248,   33.166, 2.69, 'K', 'Hassaleh'],      // 29
    [75.492,   43.823, 3.03, 'K', 'Almaaz'],        // 30
    // URSA MAJOR (indices 31-37)
    [165.932,  61.751, 1.79, 'K', 'Dubhe'],         // 31
    [165.460,  56.383, 2.37, 'A', 'Merak'],         // 32
    [178.458,  53.695, 2.44, 'A', 'Phecda'],        // 33
    [183.857,  57.033, 3.31, 'A', 'Megrez'],        // 34
    [193.507,  55.960, 1.76, 'A', 'Alioth'],        // 35
    [200.981,  54.926, 2.23, 'A', 'Mizar'],         // 36
    [206.885,  49.313, 1.86, 'B', 'Alkaid'],        // 37
    // URSA MINOR (indices 38-40)
    [37.954,   89.264, 1.97, 'F', 'Polaris'],       // 38
    [222.676,  74.156, 2.08, 'K', 'Kochab'],        // 39
    [230.182,  71.834, 3.05, 'A', 'Pherkad'],       // 40
    // CASSIOPEIA (indices 41-45)
    [10.127,   56.537, 2.24, 'K', 'Schedar'],       // 41
    [2.295,    59.150, 2.27, 'F', 'Caph'],          // 42
    [14.177,   60.717, 2.47, 'B', 'Gamma Cas'],     // 43
    [21.454,   60.235, 2.68, 'A', 'Ruchbah'],       // 44
    [28.599,   63.670, 3.38, 'B', 'Segin'],         // 45
    // PERSEUS (indices 46-47)
    [51.081,   49.861, 1.79, 'F', 'Mirfak'],        // 46
    [47.042,   40.956, 2.12, 'B', 'Algol'],         // 47
    // ANDROMEDA + PEGASUS (indices 48-55)
    [2.097,    29.090, 2.07, 'B', 'Alpheratz'],     // 48
    [17.433,   35.620, 2.07, 'M', 'Mirach'],        // 49
    [30.975,   42.330, 2.17, 'K', 'Almach'],        // 50
    [345.944,  28.083, 2.44, 'M', 'Scheat'],        // 51
    [346.190,  15.205, 2.49, 'B', 'Markab'],        // 52
    [3.309,    15.184, 2.83, 'B', 'Algenib'],       // 53
    [326.043,   9.875, 2.38, 'K', 'Enif'],          // 54
    // SCORPIUS (indices 55-62)
    [247.352, -26.432, 1.06, 'M', 'Antares'],       // 55
    [263.402, -37.103, 1.62, 'B', 'Shaula'],        // 56
    [264.330, -42.998, 1.87, 'F', 'Sargas'],        // 57
    [241.357, -19.806, 2.62, 'B', 'Graffias'],      // 58
    [240.083, -22.622, 2.32, 'B', 'Dschubba'],      // 59
    [248.971, -28.216, 2.82, 'B', 'Tau Sco'],       // 60
    [252.541, -34.293, 2.29, 'K', 'Epsilon Sco'],   // 61
    [245.296, -25.592, 2.89, 'B', 'Sigma Sco'],     // 62
    // SAGITTARIUS (Teapot) (indices 63-69)
    [276.043, -34.385, 1.79, 'B', 'Kaus Australis'],// 63
    [283.816, -26.297, 2.05, 'B', 'Nunki'],         // 64
    [275.248, -29.828, 2.71, 'K', 'Kaus Media'],    // 65
    [274.407, -25.422, 2.82, 'K', 'Kaus Borealis'], // 66
    [276.993, -29.880, 2.59, 'A', 'Zeta Sgr'],      // 67
    [271.452, -26.993, 3.17, 'B', 'Phi Sgr'],       // 68
    [288.922, -27.670, 3.32, 'K', 'Tau Sgr'],       // 69
    // OPHIUCHUS (indices 70-72)
    [263.734,  12.560, 2.08, 'A', 'Rasalhague'],    // 70
    [257.595, -15.725, 2.43, 'A', 'Sabik'],         // 71
    [243.587,  -3.694, 2.73, 'M', 'Yed Prior'],     // 72
    // LEO (indices 73-77)
    [152.093,  11.967, 1.35, 'B', 'Regulus'],       // 73
    [154.993,  19.841, 2.01, 'K', 'Algieba'],       // 74
    [177.265,  14.572, 2.14, 'A', 'Denebola'],      // 75
    [168.527,  20.524, 2.56, 'A', 'Zosma'],         // 76
    [146.463,  23.774, 2.97, 'G', 'Algenubi'],      // 77
    // VIRGO (indices 78-80)
    [201.298, -11.161, 0.97, 'B', 'Spica'],         // 78
    [190.415,  -1.449, 2.74, 'F', 'Porrima'],       // 79
    [195.544,  10.959, 2.83, 'G', 'Vindemiatrix'],  // 80
    // HYDRA (index 81)
    [141.897,  -8.658, 1.98, 'K', 'Alphard'],       // 81
    // CORVUS (indices 82-85)
    [183.786, -17.541, 2.59, 'B', 'Gienah Crv'],    // 82
    [188.597, -23.397, 2.65, 'K', 'Kraz'],          // 83
    [187.466, -16.515, 2.95, 'B', 'Algorab'],       // 84
    [184.976, -22.620, 3.02, 'K', 'Minkar'],        // 85
    // BOOTES (indices 86-89)
    [213.915,  19.182,-0.04, 'K', 'Arcturus'],      // 86
    [221.247,  27.074, 2.35, 'K', 'Izar'],          // 87
    [218.019,  18.398, 2.68, 'G', 'Muphrid'],       // 88
    [219.046,  38.308, 3.03, 'A', 'Seginus'],       // 89
    // CORONA BOREALIS (index 90)
    [233.672,  26.715, 2.23, 'A', 'Alphecca'],      // 90
    // HERCULES (indices 91-92)
    [247.555,  21.490, 2.77, 'G', 'Kornephoros'],   // 91
    [250.323,  31.602, 2.81, 'F', 'Zeta Her'],      // 92
    // LYRA (indices 93-95)
    [279.235,  38.783, 0.03, 'A', 'Vega'],          // 93
    [284.736,  32.690, 3.25, 'B', 'Sulafat'],       // 94
    [282.520,  33.363, 3.52, 'B', 'Sheliak'],       // 95
    // CYGNUS (indices 96-100)
    [310.358,  45.280, 1.25, 'A', 'Deneb'],         // 96
    [305.557,  40.257, 2.20, 'F', 'Sadr'],          // 97
    [292.680,  27.960, 3.09, 'K', 'Albireo'],       // 98
    [311.552,  33.970, 2.46, 'K', 'Gienah Cyg'],    // 99
    [297.692,  45.131, 2.87, 'B', 'Delta Cyg'],     // 100
    // AQUILA (indices 101-103)
    [297.695,   8.868, 0.77, 'A', 'Altair'],        // 101
    [296.565,  10.613, 2.72, 'K', 'Tarazed'],       // 102
    [298.828,   6.407, 3.71, 'G', 'Alshain'],       // 103
    // FOMALHAUT + CETUS (indices 104-106)
    [344.413, -29.621, 1.16, 'A', 'Fomalhaut'],     // 104
    [10.897,  -17.987, 2.04, 'G', 'Diphda'],        // 105
    [45.570,    4.090, 2.54, 'M', 'Menkar'],        // 106
    // ARIES (indices 107-108)
    [31.793,   23.462, 2.00, 'K', 'Hamal'],         // 107
    [28.660,   20.808, 2.64, 'A', 'Sheratan'],      // 108
    // CANOPUS (index 109)
    [95.988,  -52.696,-0.74, 'F', 'Canopus'],       // 109
    // VELA / SOUTHERN (indices 110-111)
    [122.383, -47.337, 1.78, 'O', 'Gamma Vel'],     // 110
    [136.999, -43.433, 2.21, 'K', 'Suhail'],        // 111
    // CENTAURUS (index 112)
    [190.379, -48.959, 2.20, 'A', 'Muhlifain'],     // 112
    // LUPUS (index 113)
    [220.482, -47.388, 2.30, 'B', 'Alpha Lup'],     // 113
    // SCORPIUS more (index 114)
    [238.456, -15.961, 2.56, 'B', 'Pi Sco'],        // 114
    // VELA (index 115)
    [131.176, -54.709, 1.96, 'A', 'Delta Vel'],     // 115
  ];

  /* ── CONSTELLATION LINES ──
     Each pair is [indexA, indexB] into CATALOG
  */
  var LINES = [
    // ORION
    [0,  4], [4,  5], [5,  6], [6,  0],
    [2,  4], [4,  3], [3,  2],
    [1,  2], [1,  7], [2,  7],
    [5,  8], [8,  0],
    // CANIS MAJOR
    [9, 12], [9, 10], [10, 11], [11, 13], [9, 13],
    // GEMINI
    [16, 20], [17, 19], [16, 17], [18, 20], [19, 21], [18, 9],
    // TAURUS
    [22, 23], [22, 24], [24, 25], [24, 26], [22, 27],
    // AURIGA
    [27, 28], [28, 29], [29, 30], [30, 27], [23, 27],
    // URSA MAJOR (Big Dipper)
    [31, 32], [32, 33], [33, 34], [34, 35], [35, 36], [36, 37],
    // URSA MINOR (simplified)
    [38, 39], [39, 40], [40, 38],
    // CASSIOPEIA (W shape)
    [42, 41], [41, 43], [43, 44], [44, 45],
    // PERSEUS
    [46, 47], [46, 41],
    // ANDROMEDA + GREAT SQUARE OF PEGASUS
    [51, 52], [52, 53], [53, 48], [48, 51],
    [48, 49], [49, 50],
    // SCORPIUS
    [58, 59], [59, 62], [62, 55], [55, 60], [60, 61], [61, 56], [56, 57],
    // SAGITTARIUS (Teapot)
    [65, 66], [66, 68], [68, 63], [63, 67], [67, 65],
    [64, 67], [64, 69],
    // OPHIUCHUS
    [70, 71], [71, 72],
    // LEO
    [73, 74], [74, 75], [75, 76], [76, 73], [73, 77],
    // VIRGO
    [78, 79], [79, 80],
    // CORVUS
    [82, 83], [83, 84], [84, 85], [85, 82],
    // BOOTES
    [86, 87], [87, 88], [88, 86], [87, 89],
    // HERCULES
    [91, 92],
    // LYRA
    [93, 94], [94, 95], [95, 93],
    // CYGNUS (Northern Cross)
    [96, 97], [97, 98], [100, 97], [99, 97],
    // AQUILA
    [101, 102], [101, 103],
    // CANIS MINOR
    [14, 15],
  ];

  /* ── SPECTRAL COLORS ── */
  var SPECTRAL_COLOR = {
    'O': '#cce0ff',
    'B': '#cce0ff',
    'A': '#eef5ff',
    'F': '#fff8f0',
    'G': '#ffe8a0',
    'K': '#ffcc80',
    'M': '#ff9966',
  };

  function spectralColor(sp) {
    return SPECTRAL_COLOR[sp] || '#eef5ff';
  }

  /* ── MILKY WAY PATH (Alt/Az waypoints from Kemah, summer sky) ── */
  var MW_PATH = [
    { az: 30,  alt: 60 },
    { az: 55,  alt: 80 },
    { az: 90,  alt: 72 },
    { az: 130, alt: 55 },
    { az: 175, alt: 30 },
    { az: 195, alt: 18 },
  ];

  /* ── ASTRONOMICAL MATH ── */

  function julianDate(d) {
    // d = Date object
    var y = d.getUTCFullYear();
    var m = d.getUTCMonth() + 1;
    var day = d.getUTCDate();
    var ut = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + ut / 24 + B - 1524.5;
  }

  function gmst(jd) {
    // GMST in degrees
    var T = jd - 2451545.0;
    var g = 280.46061837 + 360.98564736629 * T;
    return ((g % 360) + 360) % 360;
  }

  function lst(gmstDeg) {
    // Local Sidereal Time in degrees; LON_DEG is negative (west)
    var l = gmstDeg + LON_DEG;
    return ((l % 360) + 360) % 360;
  }

  function toAltAz(raDeg, decDeg, lstDeg) {
    var RA  = raDeg  * Math.PI / 180;
    var dec = decDeg * Math.PI / 180;
    var LST = lstDeg * Math.PI / 180;
    var HA  = LST - RA;

    var sinAlt = Math.sin(dec) * Math.sin(LAT_RAD)
               + Math.cos(dec) * Math.cos(LAT_RAD) * Math.cos(HA);
    var alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

    var cosAlt = Math.cos(alt);
    var az;
    if (Math.abs(cosAlt) < 1e-9) {
      az = 0;
    } else {
      var cosA = (Math.sin(dec) - Math.sin(alt) * Math.sin(LAT_RAD))
                 / (cosAlt * Math.cos(LAT_RAD));
      cosA = Math.max(-1, Math.min(1, cosA));
      az = Math.acos(cosA);
      if (HA > 0) az = 2 * Math.PI - az;
    }

    return {
      alt: alt * 180 / Math.PI,
      az:  ((az  * 180 / Math.PI) + 360) % 360,
    };
  }

  /* ── PROJECTION ── */

  function project(azDeg, altDeg, W, H) {
    var x = (azDeg / 360) * W;
    var y = H * (1 - altDeg / 90);
    return { x: x, y: y };
  }

  /* ── CANVAS SETUP ── */

  var canvas, ctx;
  var W, H;
  var positions   = [];   // [{x, y, alt, az, color, r}]
  var lastCompute = 0;
  var COMPUTE_INTERVAL = 60000; // ms

  // Shooting star state
  var shootingStar = null;
  var nextShootTime = 0;

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'starfield-bg';
    canvas.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:100vw',
      'height:100vh',
      'z-index:-1',
      'pointer-events:none',
      'display:block',
    ].join(';');
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    // Force recompute after resize
    lastCompute = 0;
  }

  /* ── COMPUTE STAR POSITIONS ── */

  function computePositions() {
    var now  = new Date();
    var jd   = julianDate(now);
    var gst  = gmst(jd);
    var lstD = lst(gst);

    positions = CATALOG.map(function (s, i) {
      var ra  = s[0];
      var dec = s[1];
      var mag = s[2];
      var sp  = s[3];
      var pos = toAltAz(ra, dec, lstD);
      var r   = Math.min(4, Math.max(0.5, (4.5 - mag) * 0.55));
      return {
        x:     0,   // will be set per frame via project()
        y:     0,
        alt:   pos.alt,
        az:    pos.az,
        r:     r,
        color: spectralColor(sp),
        idx:   i,
      };
    });

    // Project once (static relative to W/H; only needs reproject on resize)
    reprojectAll();
    lastCompute = Date.now();
  }

  function reprojectAll() {
    for (var i = 0; i < positions.length; i++) {
      var p   = positions[i];
      var xy  = project(p.az, p.alt, W, H);
      p.x = xy.x;
      p.y = xy.y;
    }
  }

  /* ── DRAW BACKGROUND ── */

  function drawBackground() {
    var grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
    grad.addColorStop(0,   '#03060f');
    grad.addColorStop(1,   '#000204');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── DRAW MILKY WAY ── */

  function drawMilkyWay() {
    var degPerPx = W / 360;  // pixels per degree of azimuth
    var altPerPx = H / 90;   // pixels per degree of altitude

    for (var i = 0; i < MW_PATH.length; i++) {
      var wp = MW_PATH[i];
      var xy = project(wp.az, wp.alt, W, H);
      var rx = 18 * degPerPx;  // ~18° wide
      var ry = 10 * altPerPx;  // ~10° tall

      ctx.save();
      ctx.translate(xy.x, xy.y);

      var gr = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
      gr.addColorStop(0,   'rgba(160,140,220,0.025)');
      gr.addColorStop(0.5, 'rgba(150,120,200,0.012)');
      gr.addColorStop(1,   'rgba(0,0,0,0)');

      ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();

      ctx.restore();
    }
  }

  /* ── DRAW CONSTELLATION LINES ── */

  function drawLines() {
    ctx.lineWidth = 0.7;

    for (var l = 0; l < LINES.length; l++) {
      var pair = LINES[l];
      var pi   = positions[pair[0]];
      var pj   = positions[pair[1]];

      if (!pi || !pj) continue;
      if (pi.alt <= 0 || pj.alt <= 0) continue;

      // Draw line (and wrapped variants)
      for (var wx = -1; wx <= 1; wx++) {
        var xi = pi.x + wx * W;
        var xj = pj.x + wx * W;

        var grad = ctx.createLinearGradient(xi, pi.y, xj, pj.y);
        var ci = pi.color;
        var cj = pj.color;
        grad.addColorStop(0, hexToRgba(ci, 0.15));
        grad.addColorStop(1, hexToRgba(cj, 0.15));

        ctx.beginPath();
        ctx.moveTo(xi, pi.y);
        ctx.lineTo(xj, pj.y);
        ctx.strokeStyle = grad;
        ctx.stroke();
      }
    }
  }

  /* ── DRAW STARS ── */

  function drawStars(now) {
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      if (p.alt <= -2) continue;

      // Twinkle
      var alpha = 0.75 + 0.25 * Math.sin(now * 0.002 + i * 2.3);

      for (var wx = -1; wx <= 1; wx++) {
        var sx = p.x + wx * W;
        if (sx < -p.r * 4 || sx > W + p.r * 4) continue;

        var gr = ctx.createRadialGradient(sx, p.y, 0, sx, p.y, p.r * 2.5);
        gr.addColorStop(0,   hexToRgba(p.color, alpha));
        gr.addColorStop(0.4, hexToRgba(p.color, alpha * 0.4));
        gr.addColorStop(1,   'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(sx, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();
      }
    }
  }

  /* ── SHOOTING STAR ── */

  function scheduleNextShoot(now) {
    nextShootTime = now + 8000 + Math.random() * 7000; // 8-15s
  }

  function spawnShootingStar(now) {
    // Start somewhere in upper portion of sky
    var startAz  = Math.random() * 360;
    var startAlt = 30 + Math.random() * 55;
    var xy       = project(startAz, startAlt, W, H);

    var angle    = Math.PI * 0.3 + Math.random() * Math.PI * 0.4; // mostly downward
    var speed    = 250 + Math.random() * 350; // pixels per second
    var length   = 80 + Math.random() * 120;

    shootingStar = {
      x:      xy.x,
      y:      xy.y,
      dx:     Math.cos(angle) * speed,
      dy:     Math.sin(angle) * speed,
      length: length,
      start:  now,
      dur:    700 + Math.random() * 200, // ~800ms
    };
  }

  function drawShootingStar(now) {
    if (!shootingStar) return;
    var ss = shootingStar;
    var elapsed = now - ss.start;

    if (elapsed >= ss.dur) {
      shootingStar = null;
      return;
    }

    var t    = elapsed / ss.dur;
    var prog = t;
    var fade = 1 - t;

    var cx = ss.x + ss.dx * (elapsed / 1000);
    var cy = ss.y + ss.dy * (elapsed / 1000);

    var tailX = cx - Math.cos(Math.atan2(ss.dy, ss.dx)) * ss.length * fade;
    var tailY = cy - Math.sin(Math.atan2(ss.dy, ss.dx)) * ss.length * fade;

    var grad = ctx.createLinearGradient(tailX, tailY, cx, cy);
    grad.addColorStop(0,   'rgba(255,255,255,0)');
    grad.addColorStop(0.6, 'rgba(200,220,255,' + (fade * 0.4) + ')');
    grad.addColorStop(1,   'rgba(255,255,255,' + (fade * 0.9) + ')');

    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.restore();

    // Bright head
    ctx.save();
    var hGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 3);
    hGrad.addColorStop(0, 'rgba(255,255,255,' + (fade * 0.95) + ')');
    hGrad.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = hGrad;
    ctx.fill();
    ctx.restore();
  }

  /* ── UTILITY: hex color → rgba string ── */

  function hexToRgba(hex, alpha) {
    // Accepts '#rrggbb'
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
  }

  /* ── ANIMATION LOOP ── */

  var lastFrameTime = 0;
  var FRAME_INTERVAL = 1000 / 30; // ~30fps

  function frame(timestamp) {
    requestAnimationFrame(frame);

    // Throttle to ~30fps
    if (timestamp - lastFrameTime < FRAME_INTERVAL) return;
    lastFrameTime = timestamp;

    var now = Date.now();

    // Recompute positions every 60s (or on first run)
    if (now - lastCompute >= COMPUTE_INTERVAL || positions.length === 0) {
      computePositions();
    }

    // Shooting star scheduling
    if (now >= nextShootTime && !shootingStar) {
      spawnShootingStar(now);
      scheduleNextShoot(now);
    }

    // Draw
    drawBackground();
    drawMilkyWay();
    drawLines();
    drawStars(now);
    drawShootingStar(now);
  }

  /* ── INIT ── */

  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (!document.body) return;
      if (!window.HTMLCanvasElement) return;

      createCanvas();
      computePositions();
      scheduleNextShoot(Date.now());

      window.addEventListener('resize', function () {
        resize();
        reprojectAll();
      });

      requestAnimationFrame(frame);
    } catch (e) {
      // Graceful degradation — starfield is cosmetic only
      if (window.console && console.warn) {
        console.warn('[starfield] init failed:', e);
      }
    }
  });

}());
