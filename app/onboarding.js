/* =============================================================
   MESA DE TRABALHO · onboarding
   Momento do projeto (define a fase de entrada), ferramenta
   recomendada, atalho de importação com IA e primeiros passos.
   ============================================================= */
window.MESA = window.MESA || {};

(function () {
  /* Em que momento o projeto está: define o foco inicial e a primeira ferramenta */
  MESA.STARTS = [
    { id: "ideia", lens: "entender", title: "Tenho uma ideia ou um território", desc: "Ainda não conversei com clientes de forma estruturada.", tool: "roteiro" },
    { id: "conversas", lens: "explorar", title: "Já conversei com potenciais clientes", desc: "Tenho anotações, percepções e algumas certezas.", tool: "csd" },
    { id: "hipoteses", lens: "experimentar", title: "Tenho hipóteses e quero testá-las", desc: "Sei o problema; preciso do menor teste possível.", tool: "mvp" },
    { id: "mvp", lens: "validar", title: "Já estou testando um MVP", desc: "Tenho resultados ou sinais para interpretar.", tool: "bml" },
    { id: "clientes", lens: "vender", title: "Já tenho os primeiros clientes", desc: "Quero vender de forma consistente e ganhar tração.", tool: "first" }
  ];

  /* Campos do assistente, agrupados por etapa (ids de MESA.CONTEXT_FIELDS) */
  MESA.WIZARD_STEPS = [
    { id: "cliente", short: "Cliente", title: "Cliente e problema", lead: "Quem sente a dor e como ela aparece hoje.", fields: ["persona", "problema", "jornada", "beachhead"] },
    { id: "solucao", short: "Solução", title: "Solução e negócio", lead: "Pode ser hipótese: escreva o que você acredita hoje.", fields: ["solucao", "proposta", "tipo", "modelo", "mercado"] },
    { id: "evidencias", short: "Evidências", title: "O que você já sabe", lead: "Evidências separam o que é fato do que é aposta.", fields: ["evidencias", "org"] }
  ];

  /* Ferramenta recomendada: a de partida da etapa atual ou a próxima ainda não usada */
  MESA.recommendTool = function (project, artifacts, workspaces) {
    var used = {};
    (artifacts || []).forEach(function (a) { if (a.tool_id) used[a.tool_id] = 1; });
    (workspaces || []).forEach(function (w) { used[w.tool_id] = 1; });
    var order = MESA.LENSES.map(function (l) { return l.id; }), start = order.indexOf(project.focus);
    if (start < 0) start = 0;
    for (var i = start; i < order.length; i++) {
      var lens = order[i], pref = MESA.STARTS.filter(function (s) { return s.lens === lens; })[0];
      if (pref && !used[pref.tool]) return pref.tool;
      var ids = (MESA.DESK_ORDER || MESA.TOOLS.map(function (t) { return t.id; })).filter(function (id) { var t = MESA.TOOLS.filter(function (x) { return x.id === id; })[0]; return t && t.lens === lens && !used[id]; });
      if (ids.length) return ids[0];
    }
    return null;
  };

  /* Atalho: organizar um texto existente (pitch, resumo) com a IA da pessoa */
  var IMPORT_FIELDS = [
    ["ideia", "Ideia"], ["problema", "Problema"], ["persona", "Cliente"], ["beachhead", "Segmento inicial"], ["jornada", "Como resolvem hoje"],
    ["solucao", "Solução"], ["proposta", "Proposta de valor"], ["modelo", "Receita"], ["mercado", "Mercado"], ["tipo", "Modelo de negócio"],
    ["evidencias", "Evidências"], ["hipotese", "Aposta mais arriscada"], ["org", "Contexto da organização"]
  ];
  var TIPO_ALIASES = { saas: /saas|software|assinatura|app/i, b2b_servico: /servi[cç]o\s*b2b|consultoria|ag[eê]ncia/i, b2c: /b2c|consumidor/i, marketplace: /marketplace|plataforma de dois lados/i, transacional: /e-?commerce|transacional|loja/i };

  MESA.importPrompt = function (text, kind) {
    return [
      "Organize o texto abaixo sobre um " + (kind === "inovacao" ? "projeto de inovação dentro de uma organização" : "projeto empreendedor") + " nos campos pedidos. Ele será usado como contexto de um projeto no método Zero to First.",
      "",
      "Regras:",
      "- Use apenas o que está no texto. Não invente dados, números ou clientes.",
      "- Se o texto não trouxer a informação, escreva exatamente: [não informado]",
      "- Seja direto: uma a três frases por campo, na linguagem do cliente quando possível.",
      "- Em \"Modelo de negócio\", responda só uma opção: SaaS, Serviço B2B, B2C, Marketplace, Transacional ou Outro.",
      "- Responda exatamente neste formato, um campo por linha, sem comentários antes ou depois:",
      "",
      IMPORT_FIELDS.filter(function (f) { return f[0] !== "org" || kind === "inovacao"; }).map(function (f) { return f[1] + ": ..."; }).join("\n"),
      "",
      "Texto:",
      '"""',
      (text || "").trim(),
      '"""'
    ].join("\n");
  };

  /* Lê a resposta colada e devolve { campo: valor } */
  MESA.parseImport = function (answer) {
    var out = {}, lines = String(answer || "").replace(/\r/g, "").split("\n"), cur = null;
    var norm = function (s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[*_#>`-]/g, "").trim(); };
    var labels = IMPORT_FIELDS.map(function (f) { return [f[0], norm(f[1])]; });
    lines.forEach(function (line) {
      var m = line.match(/^\s*(?:[-*•]\s*)?\**([^:*]{3,40})\**\s*:\s*(.*)$/), hit = null;
      if (m) { var key = norm(m[1]); labels.forEach(function (l) { if (key === l[1]) hit = l[0]; }); }
      if (hit) { cur = hit; out[cur] = m[2].replace(/^\*+\s*/, "").trim(); }
      else if (cur && line.trim()) out[cur] += (out[cur] ? "\n" : "") + line.trim();
    });
    Object.keys(out).forEach(function (k) { if (!out[k] || /^\[?n[aã]o informado\]?\.?$/i.test(out[k].trim())) delete out[k]; });
    if (out.tipo) { var t = null; Object.keys(TIPO_ALIASES).forEach(function (k) { if (!t && TIPO_ALIASES[k].test(out.tipo)) t = k; }); out.tipo = t || "outro"; }
    return out;
  };

  /* Primeiros passos na mesa: missões curtas com progresso */
  MESA.firstSteps = function (project, artifacts, board, radar, workspaces) {
    var ctx = project.context || {}, rec = MESA.recommendTool(project, artifacts, workspaces);
    var fields = MESA.CONTEXT_FIELDS.filter(function (f) { return !f.kind || f.kind === project.kind; });
    var filled = fields.filter(function (f) { return (ctx[f.id] || "").trim(); }).length, goal = Math.min(6, fields.length);
    var tools = (artifacts || []).filter(function (a) { return a.tool_id; }).length + (workspaces || []).length;
    var recTool = rec && MESA.TOOLS.filter(function (t) { return t.id === rec; })[0];
    return [
      { id: "contexto", label: "Complete o contexto do projeto", hint: filled + " de " + fields.length + " campos. Todas as ferramentas usam essas informações.", done: filled >= goal, href: "contexto" },
      { id: "ferramenta", label: recTool ? "Use sua primeira ferramenta: " + recTool.name : "Use sua primeira ferramenta", hint: "Cada ferramenta preenchida traz um objeto para a mesa.", done: tools > 0, href: rec ? "ferramenta/" + rec : "ferramentas" },
      { id: "hipotese", label: "Registre sua aposta mais arriscada no quadro", hint: "O que precisa ser verdade para o projeto dar certo?", done: (board || []).some(function (b) { return b.kind === "hipotese"; }), act: "add-item" },
      { id: "radar", label: "Rode o radar de sinais", hint: "Referências e movimentos do mercado ligados ao projeto.", done: (radar || []).length > 0, href: "radar" },
      { id: "tres", label: "Leve três objetos para a mesa", hint: "Três artefatos salvos já mostram o desenho do projeto.", done: (artifacts || []).filter(function (a) { return a.tool_id; }).length >= 3, href: "ferramentas" }
    ];
  };
})();
