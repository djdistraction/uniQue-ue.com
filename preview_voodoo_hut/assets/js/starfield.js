/* ============================================================
   VOODOO HUT — Real Astronomical Starfield  v2
   Observer: Kemah, TX  Lat=29.5426°N  Lon=-95.0187°W
   Moon phase, naked-eye planets, 600 background stars.
   ============================================================ */

(function () {
  'use strict';

  var LAT_DEG = 29.5426;
  var LON_DEG = -95.0187;
  var LAT_RAD = LAT_DEG * Math.PI / 180;
  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;

  /* ── NAMED STAR CATALOG ──
     [ra_deg, dec_deg, vmag, spectral, name]
  */
  var CATALOG = [
    // ORION
    [78.634,  -8.201, 0.13, 'B', 'Rigel'],
    [88.793,   7.407, 0.50, 'M', 'Betelgeuse'],
    [81.283,   6.350, 1.64, 'B', 'Bellatrix'],
    [83.002,  -0.299, 2.25, 'O', 'Mintaka'],
    [84.053,  -1.202, 1.70, 'B', 'Alnilam'],
    [85.190,  -1.943, 1.77, 'O', 'Alnitak'],
    [86.939,  -9.670, 2.09, 'B', 'Saiph'],
    [83.784,   9.934, 3.47, 'O', 'Meissa'],
    [83.858,  -5.909, 2.77, 'O', 'Iota Ori'],
    // CANIS MAJOR
    [101.287, -16.716,-1.46, 'A', 'Sirius'],
    [104.656, -28.972, 1.50, 'B', 'Adhara'],
    [107.098, -26.394, 1.84, 'F', 'Wezen'],
    [95.675,  -17.956, 1.98, 'B', 'Mirzam'],
    [111.024, -29.303, 2.45, 'A', 'Aludra'],
    // CANIS MINOR
    [114.826,   5.225, 0.38, 'F', 'Procyon'],
    [111.788,   8.289, 2.90, 'B', 'Gomeisa'],
    // GEMINI
    [116.329,  28.026, 1.16, 'K', 'Pollux'],
    [113.649,  31.888, 1.58, 'A', 'Castor'],
    [99.428,   16.399, 1.93, 'A', 'Alhena'],
    [95.741,   22.513, 2.88, 'M', 'Tejat'],
    [108.772,  21.982, 3.53, 'F', 'Wasat'],
    [93.717,   22.506, 3.31, 'M', 'Propus'],
    // TAURUS
    [68.980,   16.509, 0.85, 'K', 'Aldebaran'],
    [81.573,   28.608, 1.65, 'B', 'Elnath'],
    [56.871,   24.105, 2.87, 'B', 'Alcyone'],
    [57.290,   24.053, 3.63, 'B', 'Atlas'],
    [56.458,   24.367, 3.88, 'B', 'Maia'],
    // AURIGA
    [79.172,   45.998, 0.08, 'G', 'Capella'],
    [89.882,   44.948, 1.90, 'A', 'Menkalinan'],
    [74.248,   33.166, 2.69, 'K', 'Hassaleh'],
    [75.492,   43.823, 3.03, 'K', 'Almaaz'],
    // URSA MAJOR
    [165.932,  61.751, 1.79, 'K', 'Dubhe'],
    [165.460,  56.383, 2.37, 'A', 'Merak'],
    [178.458,  53.695, 2.44, 'A', 'Phecda'],
    [183.857,  57.033, 3.31, 'A', 'Megrez'],
    [193.507,  55.960, 1.76, 'A', 'Alioth'],
    [200.981,  54.926, 2.23, 'A', 'Mizar'],
    [206.885,  49.313, 1.86, 'B', 'Alkaid'],
    // URSA MINOR
    [37.954,   89.264, 1.97, 'F', 'Polaris'],
    [222.676,  74.156, 2.08, 'K', 'Kochab'],
    [230.182,  71.834, 3.05, 'A', 'Pherkad'],
    // CASSIOPEIA
    [10.127,   56.537, 2.24, 'K', 'Schedar'],
    [2.295,    59.150, 2.27, 'F', 'Caph'],
    [14.177,   60.717, 2.47, 'B', 'Gamma Cas'],
    [21.454,   60.235, 2.68, 'A', 'Ruchbah'],
    [28.599,   63.670, 3.38, 'B', 'Segin'],
    // PERSEUS
    [51.081,   49.861, 1.79, 'F', 'Mirfak'],
    [47.042,   40.956, 2.12, 'B', 'Algol'],
    // ANDROMEDA + PEGASUS
    [2.097,    29.090, 2.07, 'B', 'Alpheratz'],
    [17.433,   35.620, 2.07, 'M', 'Mirach'],
    [30.975,   42.330, 2.17, 'K', 'Almach'],
    [345.944,  28.083, 2.44, 'M', 'Scheat'],
    [346.190,  15.205, 2.49, 'B', 'Markab'],
    [3.309,    15.184, 2.83, 'B', 'Algenib'],
    [326.043,   9.875, 2.38, 'K', 'Enif'],
    // SCORPIUS
    [247.352, -26.432, 1.06, 'M', 'Antares'],
    [263.402, -37.103, 1.62, 'B', 'Shaula'],
    [264.330, -42.998, 1.87, 'F', 'Sargas'],
    [241.357, -19.806, 2.62, 'B', 'Graffias'],
    [240.083, -22.622, 2.32, 'B', 'Dschubba'],
    [248.971, -28.216, 2.82, 'B', 'Tau Sco'],
    [252.541, -34.293, 2.29, 'K', 'Epsilon Sco'],
    [245.296, -25.592, 2.89, 'B', 'Sigma Sco'],
    // SAGITTARIUS (Teapot)
    [276.043, -34.385, 1.79, 'B', 'Kaus Australis'],
    [283.816, -26.297, 2.05, 'B', 'Nunki'],
    [275.248, -29.828, 2.71, 'K', 'Kaus Media'],
    [274.407, -25.422, 2.82, 'K', 'Kaus Borealis'],
    [276.993, -29.880, 2.59, 'A', 'Zeta Sgr'],
    [271.452, -26.993, 3.17, 'B', 'Phi Sgr'],
    [288.922, -27.670, 3.32, 'K', 'Tau Sgr'],
    // OPHIUCHUS
    [263.734,  12.560, 2.08, 'A', 'Rasalhague'],
    [257.595, -15.725, 2.43, 'A', 'Sabik'],
    [243.587,  -3.694, 2.73, 'M', 'Yed Prior'],
    // LEO
    [152.093,  11.967, 1.35, 'B', 'Regulus'],
    [154.993,  19.841, 2.01, 'K', 'Algieba'],
    [177.265,  14.572, 2.14, 'A', 'Denebola'],
    [168.527,  20.524, 2.56, 'A', 'Zosma'],
    [146.463,  23.774, 2.97, 'G', 'Algenubi'],
    // VIRGO
    [201.298, -11.161, 0.97, 'B', 'Spica'],
    [190.415,  -1.449, 2.74, 'F', 'Porrima'],
    [195.544,  10.959, 2.83, 'G', 'Vindemiatrix'],
    // HYDRA
    [141.897,  -8.658, 1.98, 'K', 'Alphard'],
    // CORVUS
    [183.786, -17.541, 2.59, 'B', 'Gienah Crv'],
    [188.597, -23.397, 2.65, 'K', 'Kraz'],
    [187.466, -16.515, 2.95, 'B', 'Algorab'],
    [184.976, -22.620, 3.02, 'K', 'Minkar'],
    // BOOTES
    [213.915,  19.182,-0.04, 'K', 'Arcturus'],
    [221.247,  27.074, 2.35, 'K', 'Izar'],
    [218.019,  18.398, 2.68, 'G', 'Muphrid'],
    [219.046,  38.308, 3.03, 'A', 'Seginus'],
    // CORONA BOREALIS
    [233.672,  26.715, 2.23, 'A', 'Alphecca'],
    // HERCULES
    [247.555,  21.490, 2.77, 'G', 'Kornephoros'],
    [250.323,  31.602, 2.81, 'F', 'Zeta Her'],
    // LYRA
    [279.235,  38.783, 0.03, 'A', 'Vega'],
    [284.736,  32.690, 3.25, 'B', 'Sulafat'],
    [282.520,  33.363, 3.52, 'B', 'Sheliak'],
    // CYGNUS
    [310.358,  45.280, 1.25, 'A', 'Deneb'],
    [305.557,  40.257, 2.20, 'F', 'Sadr'],
    [292.680,  27.960, 3.09, 'K', 'Albireo'],
    [311.552,  33.970, 2.46, 'K', 'Gienah Cyg'],
    [297.692,  45.131, 2.87, 'B', 'Delta Cyg'],
    // AQUILA
    [297.695,   8.868, 0.77, 'A', 'Altair'],
    [296.565,  10.613, 2.72, 'K', 'Tarazed'],
    [298.828,   6.407, 3.71, 'G', 'Alshain'],
    // FOMALHAUT + CETUS
    [344.413, -29.621, 1.16, 'A', 'Fomalhaut'],
    [10.897,  -17.987, 2.04, 'G', 'Diphda'],
    [45.570,    4.090, 2.54, 'M', 'Menkar'],
    // ARIES
    [31.793,   23.462, 2.00, 'K', 'Hamal'],
    [28.660,   20.808, 2.64, 'A', 'Sheratan'],
    // CANOPUS
    [95.988,  -52.696,-0.74, 'F', 'Canopus'],
    // VELA / SOUTHERN
    [122.383, -47.337, 1.78, 'O', 'Gamma Vel'],
    [136.999, -43.433, 2.21, 'K', 'Suhail'],
    // CENTAURUS
    [190.379, -48.959, 2.20, 'A', 'Muhlifain'],
    // LUPUS
    [220.482, -47.388, 2.30, 'B', 'Alpha Lup'],
    // SCORPIUS more
    [238.456, -15.961, 2.56, 'B', 'Pi Sco'],
    // VELA
    [131.176, -54.709, 1.96, 'A', 'Delta Vel'],
  ];

  var LINES = [
    [0,4],[4,5],[5,6],[6,0],[2,4],[4,3],[3,2],[1,2],[1,7],[2,7],[5,8],[8,0],
    [9,12],[9,10],[10,11],[11,13],[9,13],
    [16,20],[17,19],[16,17],[18,20],[19,21],[18,9],
    [22,23],[22,24],[24,25],[24,26],[22,27],
    [27,28],[28,29],[29,30],[30,27],[23,27],
    [31,32],[32,33],[33,34],[34,35],[35,36],[36,37],
    [38,39],[39,40],[40,38],
    [42,41],[41,43],[43,44],[44,45],
    [46,47],[46,41],
    [51,52],[52,53],[53,48],[48,51],[48,49],[49,50],
    [58,59],[59,62],[62,55],[55,60],[60,61],[61,56],[56,57],
    [65,66],[66,68],[68,63],[63,67],[67,65],[64,67],[64,69],
    [70,71],[71,72],
    [73,74],[74,75],[75,76],[76,73],[73,77],
    [78,79],[79,80],
    [82,83],[83,84],[84,85],[85,82],
    [86,87],[87,88],[88,86],[87,89],
    [91,92],
    [93,94],[94,95],[95,93],
    [96,97],[97,98],[100,97],[99,97],
    [101,102],[101,103],
    [14,15],
  ];

  var SPECTRAL_COLOR = {
    'O':'#cce0ff','B':'#cce0ff','A':'#eef5ff',
    'F':'#fff8f0','G':'#ffe8a0','K':'#ffcc80','M':'#ff9966',
  };
  function spectralColor(sp) { return SPECTRAL_COLOR[sp] || '#eef5ff'; }

  var MW_PATH = [
    {az:30,alt:60},{az:55,alt:80},{az:90,alt:72},
    {az:130,alt:55},{az:175,alt:30},{az:195,alt:18},
  ];

  /* ── PLANET ORBITAL ELEMENTS (J2000.0, Meeus Table 31.a) ──
     L0°, L1°/cy, a AU, e, i°, Ω°, ω̃° (longitude of perihelion = Ω+ω)
  */
  var PLANETS = [
    {name:'Mercury',color:'#c8b49a',size:2.5, L0:252.2507,L1:149472.6741,a:0.38710,e:0.20563,i:7.005, Omega:48.331, omegaBar:77.456},
    {name:'Venus',  color:'#ffe88a',size:3.5, L0:181.9798,L1:58517.8156, a:0.72334,e:0.00677,i:3.395, Omega:76.680, omegaBar:131.564},
    {name:'Mars',   color:'#ff6a3d',size:3.0, L0:355.4333,L1:19140.2993, a:1.52371,e:0.09340,i:1.850, Omega:49.558, omegaBar:336.060},
    {name:'Jupiter',color:'#ffddaa',size:5.0, L0:34.3515, L1:3034.9056,  a:5.20260,e:0.04849,i:1.303, Omega:100.464,omegaBar:14.331},
    {name:'Saturn', color:'#ffe4a0',size:4.0, L0:50.0774, L1:1222.1138,  a:9.55491,e:0.05551,i:2.489, Omega:113.666,omegaBar:92.432},
  ];
  var EARTH_ORB = {L0:100.4646,L1:35999.3728,a:1.00000,e:0.01671,i:0,Omega:0,omegaBar:102.937};

  /* ── SEEDED PRNG (Park-Miller LCG) ── */
  var _seed = 42;
  function rng() {
    _seed = (_seed * 16807) % 2147483647;
    return (_seed - 1) / 2147483646;
  }

  /* Generate 600 background dim stars (ra/dec/mag) */
  var BG_STARS = [];
  (function () {
    _seed = 42;
    for (var i = 0; i < 600; i++) {
      BG_STARS.push({
        ra:  rng() * 360,
        dec: Math.asin(rng() * 2 - 1) * R2D,
        mag: 4.5 + rng() * 2.5,
      });
    }
  })();

  /* ── ASTRONOMICAL MATH ── */

  function julianDate(d) {
    var y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    var ut = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    if (m <= 2) { y--; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + day + ut/24 + B - 1524.5;
  }

  function gmst(jd) {
    var T = jd - 2451545.0;
    return (((280.46061837 + 360.98564736629 * T) % 360) + 360) % 360;
  }

  function lst(gmstDeg) {
    return (((gmstDeg + LON_DEG) % 360) + 360) % 360;
  }

  function toAltAz(raDeg, decDeg, lstDeg) {
    var RA  = raDeg  * D2R, dec = decDeg * D2R, HA = lstDeg * D2R - raDeg * D2R;
    var sinAlt = Math.sin(dec)*Math.sin(LAT_RAD) + Math.cos(dec)*Math.cos(LAT_RAD)*Math.cos(HA);
    var alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    var cosAlt = Math.cos(alt), az;
    if (Math.abs(cosAlt) < 1e-9) {
      az = 0;
    } else {
      var cosA = (Math.sin(dec) - Math.sin(alt)*Math.sin(LAT_RAD)) / (cosAlt*Math.cos(LAT_RAD));
      az = Math.acos(Math.max(-1, Math.min(1, cosA)));
      if (HA > 0) az = 2*Math.PI - az;
    }
    return { alt: alt*R2D, az: ((az*R2D)+360)%360 };
  }

  function project(azDeg, altDeg, W, H) {
    return { x: (azDeg/360)*W, y: H*(1 - altDeg/90) };
  }

  /* ── SUN ECLIPTIC LONGITUDE ── */
  function sunEclLon(jd) {
    var T  = (jd - 2451545.0) / 36525.0;
    var L0 = 280.46646 + 36000.76983 * T;
    var M  = (357.52911 + 35999.05029*T - 0.0001537*T*T) * D2R;
    var C  = (1.914602 - 0.004817*T)*Math.sin(M) + 0.019993*Math.sin(2*M) + 0.000289*Math.sin(3*M);
    return ((L0 + C) % 360 + 360) % 360;
  }

  /* ── MOON ECLIPTIC POSITION (Meeus Ch.47 simplified) ── */
  function moonEcliptic(jd) {
    var T  = (jd - 2451545.0) / 36525.0;
    var D  = (297.85036 + 445267.111480*T - 0.0019142*T*T) * D2R;
    var M  = (357.52772 + 35999.050340*T - 0.0001603*T*T) * D2R;
    var Mp = (134.96298 + 477198.867398*T + 0.0086972*T*T) * D2R;
    var F  = (93.27191  + 483202.017538*T - 0.0036825*T*T) * D2R;
    var L0 = 218.3164477 + 481267.88123421*T - 0.0015786*T*T + T*T*T/538841.0;
    var sl = 6288774*Math.sin(Mp)
           + 1274027*Math.sin(2*D-Mp) + 658314*Math.sin(2*D) + 213618*Math.sin(2*Mp)
           - 185116*Math.sin(M) - 114332*Math.sin(2*F) + 58793*Math.sin(2*D-2*Mp)
           + 57066*Math.sin(2*D-M-Mp) + 53322*Math.sin(2*D+Mp) + 45758*Math.sin(2*D-M)
           - 40923*Math.sin(M-Mp) - 34720*Math.sin(D) - 30383*Math.sin(M+Mp)
           + 15327*Math.sin(2*D-2*F) + 10980*Math.sin(Mp-2*F) + 10675*Math.sin(4*D-Mp)
           + 10034*Math.sin(3*Mp) - 7888*Math.sin(2*D+M-Mp) - 6766*Math.sin(2*D+M);
    var sb = 5128122*Math.sin(F) + 280602*Math.sin(Mp+F) + 277693*Math.sin(Mp-F)
           + 173237*Math.sin(2*D-F) + 55413*Math.sin(2*D-Mp+F) + 46271*Math.sin(2*D-Mp-F)
           + 32573*Math.sin(2*D+F) + 17198*Math.sin(2*Mp+F) + 9266*Math.sin(2*D+Mp-F);
    return {
      lon: ((L0 + sl/1000000) % 360 + 360) % 360,
      lat: sb / 1000000,
    };
  }

  /* ── ECLIPTIC → EQUATORIAL ── */
  function eclToEq(lonDeg, latDeg, jd) {
    var T   = (jd - 2451545.0) / 36525.0;
    var eps = (23.439291111 - 0.013004167*T) * D2R;
    var lon = lonDeg * D2R, lat = latDeg * D2R;
    var sinDec = Math.sin(lat)*Math.cos(eps) + Math.cos(lat)*Math.sin(eps)*Math.sin(lon);
    var dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
    var ra  = Math.atan2(Math.sin(lon)*Math.cos(eps) - Math.tan(lat)*Math.sin(eps), Math.cos(lon)) * R2D;
    return { ra: (ra%360+360)%360, dec: dec*R2D };
  }

  /* ── PLANET HELIOCENTRIC XYZ (ecliptic, AU) ── */
  function planetHelio(orb, T) {
    var L = ((orb.L0 + orb.L1*T) % 360 + 360) % 360;
    var M = ((L - orb.omegaBar) % 360 + 360) % 360 * D2R;
    var e = orb.e, E = M;
    for (var n = 0; n < 10; n++) E -= (E - e*Math.sin(E) - M) / (1 - e*Math.cos(E));
    var nu  = 2 * Math.atan2(Math.sqrt(1+e)*Math.sin(E/2), Math.sqrt(1-e)*Math.cos(E/2));
    var r   = orb.a * (1 - e*Math.cos(E));
    var u   = nu + (orb.omegaBar - orb.Omega) * D2R;
    var Om  = orb.Omega * D2R, ii = orb.i * D2R;
    return {
      x: r*(Math.cos(Om)*Math.cos(u) - Math.sin(Om)*Math.sin(u)*Math.cos(ii)),
      y: r*(Math.sin(Om)*Math.cos(u) + Math.cos(Om)*Math.sin(u)*Math.cos(ii)),
      z: r*Math.sin(u)*Math.sin(ii),
    };
  }

  /* ── CANVAS & STATE ── */
  var canvas, ctx, W, H;
  var positions    = [];   // named catalog stars
  var bgPositions  = [];   // 600 background stars
  var moonPos      = null; // {alt, az, x, y}
  var moonPhase    = 0;
  var planetPositions = [];
  var lastCompute  = 0;
  var COMPUTE_INT  = 60000;
  var shootingStar = null;
  var nextShootTime = 0;

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'starfield-bg';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;display:block';
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    lastCompute   = 0;
  }

  /* ── COMPUTE ALL POSITIONS ── */
  function computePositions() {
    var now  = new Date();
    var jd   = julianDate(now);
    var T    = (jd - 2451545.0) / 36525.0;
    var lstD = lst(gmst(jd));

    // Named catalog stars
    positions = CATALOG.map(function (s, i) {
      var pos = toAltAz(s[0], s[1], lstD);
      return {
        alt: pos.alt, az: pos.az,
        r:   Math.min(4, Math.max(0.5, (4.5 - s[2]) * 0.55)),
        color: spectralColor(s[3]),
        idx: i,
        x: 0, y: 0,
      };
    });

    // Background dim stars
    bgPositions = BG_STARS.map(function (s) {
      var pos = toAltAz(s.ra, s.dec, lstD);
      return {
        alt: pos.alt, az: pos.az,
        r:   Math.max(0.3, (7.5 - s.mag) * 0.2),
        mag: s.mag,
        x: 0, y: 0,
      };
    });

    // Moon
    var ml   = moonEcliptic(jd);
    var sl   = sunEclLon(jd);
    var meq  = eclToEq(ml.lon, ml.lat, jd);
    var maa  = toAltAz(meq.ra, meq.dec, lstD);
    moonPhase = ((ml.lon - sl) % 360 + 360) % 360 / 360;
    moonPos   = { alt: maa.alt, az: maa.az, x: 0, y: 0 };

    // Planets
    var eh = planetHelio(EARTH_ORB, T);
    planetPositions = PLANETS.map(function (pl) {
      var ph = planetHelio(pl, T);
      var dx = ph.x-eh.x, dy = ph.y-eh.y, dz = ph.z-eh.z;
      var dist = Math.sqrt(dx*dx+dy*dy+dz*dz);
      var glon = ((Math.atan2(dy,dx)*R2D)%360+360)%360;
      var glat = Math.asin(Math.max(-1,Math.min(1,dz/dist)))*R2D;
      var eq   = eclToEq(glon, glat, jd);
      var aa   = toAltAz(eq.ra, eq.dec, lstD);
      return { alt: aa.alt, az: aa.az, name: pl.name, color: pl.color, size: pl.size, x:0, y:0 };
    });

    reprojectAll();
    lastCompute = Date.now();
  }

  function reprojectAll() {
    var i, p, xy;
    for (i = 0; i < positions.length; i++) {
      p = positions[i]; xy = project(p.az, p.alt, W, H); p.x = xy.x; p.y = xy.y;
    }
    for (i = 0; i < bgPositions.length; i++) {
      p = bgPositions[i]; xy = project(p.az, p.alt, W, H); p.x = xy.x; p.y = xy.y;
    }
    if (moonPos) { xy = project(moonPos.az, moonPos.alt, W, H); moonPos.x = xy.x; moonPos.y = xy.y; }
    for (i = 0; i < planetPositions.length; i++) {
      p = planetPositions[i]; xy = project(p.az, p.alt, W, H); p.x = xy.x; p.y = xy.y;
    }
  }

  /* ── DRAW: background gradient ── */
  function drawBackground() {
    var g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.75);
    g.addColorStop(0, '#03060f');
    g.addColorStop(1, '#000204');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* ── DRAW: Milky Way glow ── */
  function drawMilkyWay() {
    var dpx = W/360, apy = H/90;
    for (var i = 0; i < MW_PATH.length; i++) {
      var wp = MW_PATH[i], xy = project(wp.az, wp.alt, W, H);
      var rx = 18*dpx, ry = 10*apy, rm = Math.max(rx, ry);
      ctx.save();
      ctx.translate(xy.x, xy.y);
      ctx.scale(rx/rm, ry/rm);
      var gr = ctx.createRadialGradient(0,0,0,0,0,rm);
      gr.addColorStop(0,   'rgba(160,140,220,0.025)');
      gr.addColorStop(0.5, 'rgba(150,120,200,0.012)');
      gr.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(0,0,rm,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
      ctx.restore();
    }
  }

  /* ── DRAW: 600 background dim stars ── */
  function drawBgStars(now) {
    for (var i = 0; i < bgPositions.length; i++) {
      var p = bgPositions[i];
      if (p.alt <= -1 || p.x < -2 || p.x > W+2) continue;
      var base   = Math.min(0.45, 0.08 + (7.0 - p.mag) * 0.1);
      var alpha  = base * (0.8 + 0.2 * Math.sin(now*0.0009 + i*2.9));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(200,210,255,' + alpha.toFixed(3) + ')';
      ctx.fill();
    }
  }

  /* ── DRAW: constellation lines ── */
  function drawLines() {
    ctx.lineWidth = 0.7;
    for (var l = 0; l < LINES.length; l++) {
      var pi = positions[LINES[l][0]], pj = positions[LINES[l][1]];
      if (!pi || !pj || pi.alt <= 0 || pj.alt <= 0) continue;
      for (var wx = -1; wx <= 1; wx++) {
        var xi = pi.x + wx*W, xj = pj.x + wx*W;
        var gr = ctx.createLinearGradient(xi, pi.y, xj, pj.y);
        gr.addColorStop(0, hexToRgba(pi.color, 0.15));
        gr.addColorStop(1, hexToRgba(pj.color, 0.15));
        ctx.beginPath(); ctx.moveTo(xi, pi.y); ctx.lineTo(xj, pj.y);
        ctx.strokeStyle = gr; ctx.stroke();
      }
    }
  }

  /* ── DRAW: catalog stars (bright, with glow) ── */
  function drawStars(now) {
    for (var i = 0; i < positions.length; i++) {
      var p = positions[i];
      if (p.alt <= -2) continue;
      var alpha = 0.75 + 0.25 * Math.sin(now*0.002 + i*2.3);
      for (var wx = -1; wx <= 1; wx++) {
        var sx = p.x + wx*W;
        if (sx < -p.r*4 || sx > W+p.r*4) continue;
        var gr = ctx.createRadialGradient(sx, p.y, 0, sx, p.y, p.r*2.5);
        gr.addColorStop(0,   hexToRgba(p.color, alpha));
        gr.addColorStop(0.4, hexToRgba(p.color, alpha*0.4));
        gr.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.beginPath(); ctx.arc(sx, p.y, p.r*2.5, 0, Math.PI*2);
        ctx.fillStyle = gr; ctx.fill();
      }
    }
  }

  /* ── DRAW: Moon with phase ── */
  function drawMoon() {
    if (!moonPos || moonPos.alt <= 0) return;
    var R  = 16;
    var mx = moonPos.x, my = moonPos.y;
    var ph = moonPhase;
    var k  = 4/3; // bezier half-ellipse approximation constant

    ctx.save();
    ctx.translate(mx, my);

    // Glow halo (stronger at full moon)
    var glowStr = Math.sin(ph * Math.PI);
    var halo = ctx.createRadialGradient(0,0,R*0.6,0,0,R*4.5);
    halo.addColorStop(0, 'rgba(255,245,200,' + (0.18*glowStr).toFixed(3) + ')');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(0,0,R*4.5,0,Math.PI*2); ctx.fillStyle=halo; ctx.fill();

    // Dark disc (shadow side)
    ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.fillStyle='#0c0c1e'; ctx.fill();

    // Lit portion with bezier terminator
    var effPhase = ph > 0.5 ? 1 - ph : ph;
    var ex = R * Math.cos(effPhase * 2 * Math.PI);

    ctx.save();
    if (ph > 0.5) ctx.scale(-1, 1); // mirror for waning
    ctx.beginPath();
    ctx.arc(0, 0, R, -Math.PI/2, Math.PI/2);          // right (or mirrored-left) arc
    ctx.bezierCurveTo(ex*k, R, ex*k, -R, 0, -R);      // terminator bezier back to top
    ctx.fillStyle = '#f0e2b4';
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Moon label
    ctx.save();
    ctx.font = '10px "Cinzel", serif';
    ctx.fillStyle = 'rgba(240,226,180,0.65)';
    ctx.textAlign = 'center';
    ctx.fillText('Moon', mx, my + R + 14);
    ctx.restore();
  }

  /* ── DRAW: naked-eye planets ── */
  function drawPlanets() {
    for (var i = 0; i < planetPositions.length; i++) {
      var p = planetPositions[i];
      if (p.alt <= 0) continue;
      var px = p.x, py = p.y, r = p.size;

      // Glow halo
      var grd = ctx.createRadialGradient(px, py, 0, px, py, r*4);
      grd.addColorStop(0,   hexToRgba(p.color, 0.85));
      grd.addColorStop(0.35,hexToRgba(p.color, 0.30));
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(px, py, r*4, 0, Math.PI*2); ctx.fillStyle=grd; ctx.fill();

      // Core disc
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI*2); ctx.fillStyle=p.color; ctx.fill();

      // Label
      ctx.save();
      ctx.font = '10px "Cinzel", serif';
      ctx.fillStyle = hexToRgba(p.color, 0.75);
      ctx.textAlign = 'center';
      ctx.fillText(p.name, px, py + r + 13);
      ctx.restore();
    }
  }

  /* ── DRAW: shooting stars ── */
  function scheduleNextShoot(now) {
    nextShootTime = now + 8000 + Math.random()*7000;
  }

  function spawnShootingStar(now) {
    var startAz = Math.random()*360, startAlt = 30+Math.random()*55;
    var xy = project(startAz, startAlt, W, H);
    var angle = Math.PI*0.3 + Math.random()*Math.PI*0.4;
    shootingStar = {
      x: xy.x, y: xy.y,
      dx: Math.cos(angle)*(250+Math.random()*350),
      dy: Math.sin(angle)*(250+Math.random()*350),
      length: 80+Math.random()*120,
      start: now, dur: 700+Math.random()*200,
    };
  }

  function drawShootingStar(now) {
    if (!shootingStar) return;
    var ss = shootingStar, elapsed = now - ss.start;
    if (elapsed >= ss.dur) { shootingStar = null; return; }
    var t = elapsed/ss.dur, fade = 1-t;
    var cx = ss.x + ss.dx*(elapsed/1000), cy = ss.y + ss.dy*(elapsed/1000);
    var angle = Math.atan2(ss.dy, ss.dx);
    var tailX = cx - Math.cos(angle)*ss.length*fade;
    var tailY = cy - Math.sin(angle)*ss.length*fade;
    var gr = ctx.createLinearGradient(tailX, tailY, cx, cy);
    gr.addColorStop(0,   'rgba(255,255,255,0)');
    gr.addColorStop(0.6, 'rgba(200,220,255,'+(fade*0.4).toFixed(3)+')');
    gr.addColorStop(1,   'rgba(255,255,255,'+(fade*0.9).toFixed(3)+')');
    ctx.save();
    ctx.lineWidth = 1.5; ctx.strokeStyle = gr;
    ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(cx, cy); ctx.stroke();
    var hg = ctx.createRadialGradient(cx,cy,0,cx,cy,3);
    hg.addColorStop(0,'rgba(255,255,255,'+(fade*0.95).toFixed(3)+')');
    hg.addColorStop(1,'rgba(200,220,255,0)');
    ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fillStyle=hg; ctx.fill();
    ctx.restore();
  }

  /* ── UTILITY ── */
  function hexToRgba(hex, a) {
    var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+a.toFixed(3)+')';
  }

  /* ── ANIMATION LOOP ── */
  var lastFrameTime = 0;
  var FRAME_INT = 1000/30;

  function frame(ts) {
    requestAnimationFrame(frame);
    if (ts - lastFrameTime < FRAME_INT) return;
    lastFrameTime = ts;
    var now = Date.now();
    if (now - lastCompute >= COMPUTE_INT || positions.length === 0) computePositions();
    if (now >= nextShootTime && !shootingStar) { spawnShootingStar(now); scheduleNextShoot(now); }
    drawBackground();
    drawMilkyWay();
    drawBgStars(now);
    drawLines();
    drawStars(now);
    drawMoon();
    drawPlanets();
    drawShootingStar(now);
  }

  /* ── INIT ── */
  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (!document.body || !window.HTMLCanvasElement) return;
      createCanvas();
      computePositions();
      scheduleNextShoot(Date.now());
      window.addEventListener('resize', function () { resize(); reprojectAll(); });
      requestAnimationFrame(frame);
    } catch (e) {
      if (window.console && console.warn) console.warn('[starfield] init failed:', e);
    }
  });

}());
