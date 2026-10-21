/* =============================================================
   MESA DE TRABALHO · a mesa
   Cada ferramenta é um objeto físico. Vazio, aparece só o contorno;
   com artefato salvo, o objeto ganha cor e vai para a mesa.
   ============================================================= */
window.MESA = window.MESA || {};

(function () {
  var K = "#1D1820", P = "#261729", O = "#E0592A", PE = "#F8D9C6", SA = "#DDE4D3", LI = "#E4DAEE", Y = "#F3D46B", W = "#FFFDF8", SD = "#ECE3D6";
  var s = function (d, fill, extra) { return '<path d="' + d + '" fill="' + (fill || "none") + '" stroke="' + K + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + "/>"; };
  var r = function (x, y, w, h, rx, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" fill="' + (fill || "none") + '" stroke="' + K + '" stroke-width="2.4"' + (extra || "") + "/>"; };
  var c = function (x, y, rad, fill, extra) { return '<circle cx="' + x + '" cy="' + y + '" r="' + rad + '" fill="' + (fill || "none") + '" stroke="' + K + '" stroke-width="2.4"' + (extra || "") + "/>"; };
  var ln = function (x1, y1, x2, y2, w, col, extra) { return '<path d="M' + x1 + " " + y1 + "L" + x2 + " " + y2 + '" stroke="' + (col || K) + '" stroke-width="' + (w || 2.4) + '" stroke-linecap="round"' + (extra || "") + "/>"; };
  var txt = function (x, y, w, n, gap, col) { var o = ""; for (var i = 0; i < n; i++) o += ln(x, y + i * gap, x + w * (i === n - 1 ? 0.6 : 1), y + i * gap, 2, col || K, ' opacity=".45"'); return o; };
  var svg = function (body) { return '<svg viewBox="0 0 120 100" aria-hidden="true">' + body + "</svg>"; };
  var postit = function (x, y, sz, fill, rot) { return '<g transform="rotate(' + (rot || 0) + " " + (x + sz / 2) + " " + (y + sz / 2) + ')">' + r(x, y, sz, sz, 1.5, fill) + ln(x + 5, y + sz * 0.38, x + sz - 6, y + sz * 0.38, 1.8, K, ' opacity=".4"') + ln(x + 5, y + sz * 0.6, x + sz * 0.6, y + sz * 0.6, 1.8, K, ' opacity=".4"') + "</g>"; };

  var ART = {
    // ENTENDER
    territorio: svg('<path d="M12 24L43 15L77 24L108 15V79L77 88L43 79L12 88Z" fill="' + W + '"/><path d="M12 24L43 15V79L12 88Z" fill="' + SA + '"/><path d="M77 24L108 15V79L77 88Z" fill="' + PE + '"/>' +
      s("M22 70C34 56 46 62 56 50S80 40 96 30", "none", ' stroke-dasharray="4 5"') + s("M12 24L43 15L77 24L108 15V79L77 88L43 79L12 88Z") + ln(43, 15, 43, 79, 2, K, ' opacity=".35"') + ln(77, 24, 77, 88, 2, K, ' opacity=".35"') +
      s("M96 18c-6 0-9 4-9 8 0 6 9 14 9 14s9-8 9-14c0-4-3-8-9-8z", O) + c(96, 26, 3, W)),
    mercado: svg(r(36, 8, 48, 84, 8, P) + r(43, 16, 34, 16, 3, SA) + '<text x="73" y="29" text-anchor="end" font-family="ui-monospace,monospace" font-size="10" font-weight="700" fill="' + K + '">4,2M</text>' +
      [0, 1, 2, 3].map(function (row) { return [0, 1, 2].map(function (col) { return r(43 + col * 12.5, 40 + row * 12.5, 9, 9, 2, row === 3 && col === 2 ? O : W, ' stroke-width="1.6"'); }).join(""); }).join("")),
    jtbd: svg(postit(22, 30, 46, LI, -8) + postit(40, 20, 46, PE, 6) + postit(30, 34, 50, Y, -2)),
    roteiro: svg(s("M20 84L30 48H90L100 84Z", O) + r(42, 56, 36, 22, 11, W) + [0, 1, 2, 3, 4, 5].map(function (i) { var a = i / 6 * Math.PI * 2; return c(60 + Math.cos(a) * 7, 67 + Math.sin(a) * 5.5, 1.8, K, ' stroke-width="0"'); }).join("") +
      s("M18 40C18 26 36 20 60 20S102 26 102 40L92 46C90 38 80 34 60 34S30 38 28 46Z", P) + '<path d="M106 30c6 8 6 18 0 26" stroke="' + O + '" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M112 24c9 12 9 26 0 38" stroke="' + O + '" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>'),
    analisador: svg(s("M26 58C26 30 41 16 60 16S94 30 94 58", "none", ' stroke-width="6" stroke="' + P + '"') + s("M26 58C26 30 41 16 60 16S94 30 94 58") +
      r(16, 52, 20, 32, 8, O) + r(84, 52, 20, 32, 8, O) + s("M46 74h28M50 82h20", "none", ' opacity=".5"') + '<path d="M44 66l4-6 4 10 4-14 4 12 4-8 4 6 4-4" stroke="' + K + '" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
    journey: svg(r(8, 30, 104, 44, 4, W) + s("M18 62C32 40 44 64 58 46S86 40 102 50", "none", ' stroke="' + O + '" stroke-width="3"') + c(18, 62, 5, SA) + c(46, 56, 5, PE) + c(70, 42, 5, LI) + c(102, 50, 5, Y) + txt(14, 38, 30, 1, 0) + txt(70, 64, 28, 1, 0)),
    // EXPLORAR
    beachhead: svg(c(52, 54, 38, W) + c(52, 54, 28, O) + c(52, 54, 18, W) + c(52, 54, 8, O) + ln(52, 54, 100, 14, 3) + s("M96 10l10 2-4 6-4 6z", P)),
    csd: svg(r(8, 12, 104, 78, 4, W) + ln(43, 18, 43, 84, 1.8, K, ' opacity=".35"') + ln(77, 18, 77, 84, 1.8, K, ' opacity=".35"') +
      postit(14, 22, 22, SA, -4) + postit(16, 52, 22, SA, 3) + postit(49, 20, 22, PE, 4) + postit(50, 50, 22, PE, -3) + postit(83, 28, 22, LI, -5) + postit(84, 58, 22, LI, 2)),
    problema: svg(r(10, 22, 78, 56, 3, W) + ln(10, 34, 88, 34, 2, O) + txt(18, 46, 60, 3, 9) + c(84, 52, 18, "rgba(221,228,211,.55)") + c(84, 52, 18, "none", ' stroke-width="4" stroke="' + P + '"') + ln(97, 65, 110, 80, 7, P)),
    importancia: svg(r(14, 10, 92, 82, 3, W) + '<path d="M14 30H106M14 50H106M14 70H106M34 10V92M54 10V92M74 10V92M94 10V92" stroke="' + K + '" stroke-width="1" opacity=".18"/>' +
      '<rect x="24" y="16" width="38" height="34" fill="' + PE + '"/>' + ln(24, 14, 24, 84) + ln(24, 84, 100, 84) + c(34, 26, 4.5, O) + c(48, 38, 3.5, K) + c(76, 30, 3.5, "#9C9099", ' stroke-width="0"') + c(86, 66, 3.5, "#9C9099", ' stroke-width="0"') + c(56, 70, 3.5, "#9C9099", ' stroke-width="0"')),
    resultados: svg(r(26, 12, 68, 84, 5, "#B98A5E") + r(32, 22, 56, 68, 2, W) + r(48, 6, 24, 12, 3, "#9AA0A6") +
      [0, 1, 2, 3].map(function (i) { return r(38, 32 + i * 14, 8, 8, 1.5, W, ' stroke-width="1.8"') + (i < 3 ? '<path d="M39 ' + (36 + i * 14) + 'l3 3 5-7" stroke="' + "#2F6B3A" + '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' : "") + ln(52, 36 + i * 14, 80, 36 + i * 14, 2, K, ' opacity=".45"'); }).join("")),
    working: svg('<g transform="rotate(-6 60 50)">' + r(14, 14, 92, 72, 2, W) + '<rect x="20" y="20" width="80" height="10" fill="' + K + '"/>' + '<text x="60" y="28.5" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="8.5" fill="' + W + '">LANÇAMENTO</text>' + r(20, 36, 34, 26, 1, LI, ' stroke-width="1.6"') + txt(60, 40, 38, 3, 8) + txt(20, 70, 80, 2, 8) + "</g>"),
    // EXPERIMENTAR
    mvp: svg([[20, 62, 44, O], [56, 62, 44, SA], [36, 40, 48, LI], [48, 18, 26, Y]].map(function (b) { var x = b[0], y = b[1], w = b[2]; var st = ""; for (var i = 0; i < Math.round(w / 13); i++) st += r(x + 5 + i * 12, y - 5, 8, 6, 1.5, b[3], ' stroke-width="1.8"'); return st + r(x, y, w, 22, 3, b[3]); }).join("")),
    criterios: svg(r(30, 8, 60, 8, 3, P) + r(30, 84, 60, 8, 3, P) + s("M38 16C38 38 56 44 56 50S38 62 38 84H82C82 62 64 56 64 50S82 38 82 16Z", "rgba(255,253,248,.7)") +
      s("M44 30H76C72 40 62 44 60 48C58 44 48 40 44 30Z", Y, ' stroke-width="0"') + s("M42 82C46 70 56 66 60 62C64 66 74 70 78 82Z", Y, ' stroke-width="0"') + ln(60, 50, 60, 66, 2, "#C9A227") + s("M38 16C38 38 56 44 56 50S38 62 38 84H82C82 62 64 56 64 50S82 38 82 16Z")),
    // VALIDAR
    bml: svg(s("M48 10H72M52 10V38L28 82C26 88 30 92 36 92H84C90 92 94 88 92 82L68 38V10", W) + s("M38 64H82L92 82C94 88 90 92 84 92H36C30 92 26 88 28 82Z", SA) +
      c(50, 78, 3.5, W, ' stroke-width="1.6"') + c(64, 72, 2.5, W, ' stroke-width="1.6"') + c(72, 82, 3, W, ' stroke-width="1.6"') + ln(56, 26, 64, 26, 1.8, K, ' opacity=".4"') + ln(56, 32, 62, 32, 1.8, K, ' opacity=".4"')),
    csd2: svg(postit(14, 26, 34, SA, -6) + postit(44, 18, 34, PE, 4) + postit(72, 30, 34, LI, -3) +
      '<path d="M22 46l6 6 12-14" stroke="#2F6B3A" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M80 44l18 18M98 44L80 62" stroke="#A1341A" stroke-width="3.4" stroke-linecap="round"/><path d="M52 40l6 6 12-14" stroke="#2F6B3A" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
    metricas: svg(r(12, 14, 96, 72, 8, P) + r(20, 22, 80, 56, 3, W) + [[28, 58, 12], [44, 46, 24], [60, 52, 18], [76, 34, 36]].map(function (b) { return r(b[0], b[1], 11, b[2], 1.5, b[0] === 76 ? O : PE, ' stroke-width="1.6"'); }).join("") + s("M26 50L44 40L62 44L90 28", "none", ' stroke="' + P + '" stroke-width="2"')),
    // AVANÇAR
    stress: svg(s("M60 22V86M40 90H80", "none", ' stroke-width="3"') + s("M20 34L100 26", "none", ' stroke-width="3"') + c(60, 22, 4, O) +
      ln(20, 34, 12, 60, 1.8) + ln(20, 34, 28, 60, 1.8) + s("M8 60H32C32 68 26 72 20 72S8 68 8 60Z", PE) + ln(100, 26, 92, 52, 1.8) + ln(100, 26, 108, 52, 1.8) + s("M88 52H112C112 60 106 64 100 64S88 60 88 52Z", SA)),
    modelo: svg('<rect x="34" y="18" width="78" height="64" fill="#3B4C7A" stroke="' + K + '" stroke-width="2.4"/>' + '<path d="M42 28H104M42 40H104M42 52H104M42 64H104M54 22V78M70 22V78M86 22V78" stroke="#FFFFFF" stroke-width="1" opacity=".45"/>' + r(46, 32, 20, 14, 1, "none", ' stroke="#FFFFFF" stroke-width="1.6"') + s("M76 46L96 46L96 66", "none", ' stroke="#FFFFFF" stroke-width="1.6"') +
      r(16, 14, 22, 72, 11, "#5A6C9E") + '<ellipse cx="27" cy="20" rx="11" ry="5" fill="#2E3B60" stroke="' + K + '" stroke-width="2.4"/>'),
    pitch: svg(s("M60 62V86M42 90H78", "none", ' stroke-width="3"') + s("M46 46C46 56 52 62 60 62S74 56 74 46") + r(48, 8, 24, 44, 12, P) + '<path d="M52 18H68M52 26H68M52 34H68M52 42H68" stroke="' + W + '" stroke-width="1.4" opacity=".55"/>' +
      '<path d="M86 22c5 5 5 13 0 18M93 16c9 9 9 21 0 30" stroke="' + O + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>')
  };

  // Ordem na mesa, por lente do método (a mesa não é uma trilha: os objetos podem chegar em qualquer ordem)
  MESA.DESK_ORDER = ["territorio", "mercado", "jtbd", "roteiro", "analisador", "journey", "beachhead", "csd", "problema", "importancia", "resultados", "working", "mvp", "criterios", "bml", "csd2", "metricas", "stress", "modelo", "pitch"];
  MESA.DESK_OBJECT = {
    territorio: "Mapa", mercado: "Calculadora", jtbd: "Post-its", roteiro: "Telefone", analisador: "Fones", journey: "Linha da jornada",
    beachhead: "Alvo", csd: "Matriz de post-its", problema: "Lupa", importancia: "Papel quadriculado", resultados: "Prancheta", working: "Jornal",
    mvp: "Blocos de montar", criterios: "Ampulheta", bml: "Frasco de teste", csd2: "Post-its revisados", metricas: "Tablet",
    stress: "Balança", modelo: "Planta baixa", pitch: "Microfone"
  };
  MESA.deskArt = function (id) { return ART[id] || ""; };

  // Objetos de apoio: caderno (contexto), notebook (radar), canecas (mentoria), luminária e planta (vida da mesa)

  // Cena: janela, planta grande, porta-lápis, cadeira, seta desenhada à mão
  MESA.sceneWindow = function () {
    return '<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD9EE"/><stop offset="1" stop-color="#E8F1F7"/></linearGradient></defs>' +
      '<rect width="300" height="200" fill="url(#sky)"/>' +
      '<g fill="#9DB9D3" opacity=".85"><rect x="20" y="70" width="34" height="130"/><rect x="60" y="40" width="26" height="160"/><rect x="92" y="90" width="40" height="110"/><rect x="190" y="56" width="30" height="144"/><rect x="226" y="100" width="44" height="100"/></g>' +
      '<g fill="#B9D0E3"><rect x="140" y="110" width="44" height="90"/><rect x="270" y="80" width="30" height="120"/></g>' +
      '<path d="M0 176c30-14 60-6 90-12s70-16 110-6 70 4 100-4V200H0Z" fill="#9CC487"/><path d="M0 188c40-8 80 0 130-6s100-10 170-2V200H0Z" fill="#7FA36B"/>' +
      '<rect x="0" y="0" width="300" height="200" fill="none" stroke="#FFFDF8" stroke-width="14"/><path d="M150 0V200M0 100H300" stroke="#FFFDF8" stroke-width="8"/></svg>';
  };
  MESA.scenePlant = function () {
    var leaf = function (d, f) { return '<path d="' + d + '" fill="' + f + '" stroke="' + K + '" stroke-width="2" stroke-linejoin="round"/>'; };
    return '<svg viewBox="0 0 140 200" aria-hidden="true">' +
      leaf("M70 150C40 130 18 96 22 58C52 70 70 110 70 150Z", "#4E7A3E") + leaf("M70 150C64 110 70 60 98 30C112 70 96 120 70 150Z", "#7FA36B") +
      leaf("M70 150C90 120 118 104 134 108C126 138 98 152 70 150Z", "#5E8C4A") + leaf("M70 150C50 140 20 140 6 150C24 168 52 166 70 150Z", "#8DB577") + leaf("M70 150C66 120 46 96 40 20C70 40 80 100 70 150Z", "#6B9A57") +
      '<path d="M44 150H96L90 196H50Z" fill="#FFFDF8" stroke="' + K + '" stroke-width="2.4" stroke-linejoin="round"/></svg>';
  };
  MESA.pencup = function () {
    return svg(ln(50, 50, 44, 14, 6, "#3B6FD8") + ln(60, 50, 62, 10, 6, K) + ln(70, 50, 78, 16, 6, Y) + ln(56, 50, 52, 20, 5, O) + s("M38 46H82L78 90H42Z", W) +
      c(52, 66, 1.8, K, ' stroke-width="0"') + c(68, 66, 1.8, K, ' stroke-width="0"') + s("M52 74c4 5 12 5 16 0", "none", ' stroke-width="2"'));
  };
  MESA.chair = function () {
    return '<svg viewBox="0 0 360 120" aria-hidden="true"><path d="M30 40C30 18 60 8 180 8S330 18 330 40V120H30Z" fill="' + Y + '" stroke="' + K + '" stroke-width="3"/>' +
      '<path d="M48 44C60 30 110 24 180 24S300 30 312 44" fill="none" stroke="#FFFDF8" stroke-width="5" stroke-linecap="round" opacity=".55"/>' +
      '<rect x="98" y="56" width="16" height="64" rx="8" fill="' + K + '"/><rect x="246" y="56" width="16" height="64" rx="8" fill="' + K + '"/></svg>';
  };
  MESA.arrow = function () {
    return '<svg class="arrow" viewBox="0 0 40 30" aria-hidden="true"><path d="M4 4C10 18 20 24 34 24M27 17l7 7-8 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  };
  MESA.bulb = function () {
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 6a10 10 0 0 0-6 18c2 2 2 4 2 6h8c0-2 0-4 2-6a10 10 0 0 0-6-18z" fill="#FFFDF8" stroke="' + K + '" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 34h8M20 2v-1M6 8l-2-2M34 8l2-2M3 20H1M37 20h2" stroke="' + K + '" stroke-width="2.2" stroke-linecap="round"/></svg>';
  };
  MESA.deskLaptop = function (on) {
    return svg(s("M18 70H102L110 84H10Z", "#C9C3CB") + r(24, 14, 72, 56, 4, P) + r(30, 20, 60, 44, 2, on ? W : "#3A2C3D") +
      (on ? r(36, 26, 48, 9, 4.5, W, ' stroke-width="1.6"') + c(42, 30.5, 2.5, "none", ' stroke-width="1.4"') + ln(44, 32.5, 46, 34.5, 1.4) + ln(38, 42, 80, 42, 2, O) + ln(38, 49, 74, 49, 1.8, K, ' opacity=".4"') + ln(38, 56, 78, 56, 1.8, K, ' opacity=".4"') : ""));
  };
  MESA.deskMugs = function (two, warm) {
    var mug = function (x, fill) { return s("M" + (x + 30) + " 52c8 0 10 12 0 14", "none", ' stroke-width="3"') + s("M" + x + " 44H" + (x + 30) + "V78C" + (x + 30) + " 84 " + (x + 25) + " 88 " + (x + 19) + " 88H" + (x + 11) + "C" + (x + 5) + " 88 " + x + " 84 " + x + " 78Z", fill) + '<ellipse cx="' + (x + 15) + '" cy="44" rx="15" ry="4" fill="#5B3A29" stroke="' + K + '" stroke-width="2.4"/>'; };
    var steam = function (x) { return '<path class="steam" d="M' + x + " 36c-4-6 4-10 0-16M" + (x + 8) + " 34c-4-6 4-10 0-16" + '" stroke="#9C9099" stroke-width="2" fill="none" stroke-linecap="round"/>'; };
    return svg(mug(14, O) + (warm ? steam(25) : "") + (two ? mug(66, SA) + (warm ? steam(77) : "") : ""));
  };
  MESA.deskLamp = function () {
    return '<svg viewBox="0 0 120 120" aria-hidden="true">' + s("M30 112H70", "none", ' stroke-width="5"') + s("M50 112L38 64L66 30", "none", ' stroke-width="5" stroke="' + P + '"') + c(38, 64, 4, O) +
      s("M60 18L96 30L82 56L50 40Z", O) + '<ellipse class="bulb" cx="90" cy="46" rx="7" ry="5" fill="' + Y + '" stroke="' + K + '" stroke-width="2"/></svg>';
  };
  MESA.deskPlant = function (stage) {
    var pot = s("M40 70H80L74 96H46Z", O) + r(36, 64, 48, 8, 2, "#C24A21");
    var soil = '<ellipse cx="60" cy="65" rx="20" ry="3" fill="#5B3A29"/>';
    var leaf = function (d, f) { return s(d, f || "#7FA36B"); };
    var g = "";
    if (stage >= 1) g += s("M60 64V50", "none", ' stroke="#4E7A3E" stroke-width="3"') + leaf("M60 54C52 52 48 46 50 42C56 42 60 48 60 54Z") + leaf("M60 52C66 48 72 46 74 48C72 54 66 56 60 52Z");
    if (stage >= 2) g += s("M60 50V30", "none", ' stroke="#4E7A3E" stroke-width="3"') + leaf("M60 40C48 40 40 32 40 24C50 24 58 30 60 40Z", "#8DB577") + leaf("M60 36C70 30 80 30 84 34C80 42 70 42 60 36Z", "#8DB577");
    if (stage >= 3) g += s("M60 30V16", "none", ' stroke="#4E7A3E" stroke-width="3"') + leaf("M60 24C54 20 52 12 56 8C62 12 62 18 60 24Z", "#9CC487") + c(60, 12, 6, Y) + c(60, 12, 2.5, O, ' stroke-width="0"') + c(44, 30, 4, PE) + c(80, 40, 4, PE);
    return '<svg viewBox="0 0 120 100" aria-hidden="true">' + g + soil + pot + "</svg>";
  };
})();
