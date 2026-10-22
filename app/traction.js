/* =============================================================
   MESA DE TRABALHO · Fase 3 — Traction
   Sete ferramentas com área de trabalho estruturada (salva em
   tool_workspaces), reaproveitamento das etapas anteriores,
   entregável em Markdown e prompts de apoio de IA.
   Nada aqui inventa benchmarks: números de exemplo são marcados
   como ilustrativos e metas são sugestões ajustáveis.
   ============================================================= */
window.MESA = window.MESA || {};

(function () {
  /* ---------------- utilidades ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(v) { if (v === "" || v == null) return null; var n = parseFloat(String(v).replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(n) ? n : null; }
  function brl(n) { return n == null || !isFinite(n) ? "—" : "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function pct(n) { return n == null || !isFinite(n) ? "—" : (n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"; }
  function dec(n, d) { return n == null || !isFinite(n) ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: d == null ? 1 : d }); }
  function rows(d, id) { return Array.isArray(d && d[id]) ? d[id] : []; }
  function filled(v) { return v != null && String(v).trim() !== ""; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function mdCell(v) { return String(v == null ? "" : v).replace(/\|/g, "/").replace(/\n+/g, " ").trim() || "—"; }
  function mdTable(cols, list) {
    if (!list.length) return "_Nada registrado ainda._\n";
    return "| " + cols.map(function (c) { return c.label; }).join(" | ") + " |\n| " + cols.map(function () { return "---"; }).join(" | ") + " |\n" +
      list.map(function (r) { return "| " + cols.map(function (c) { return mdCell(c.get ? c.get(r) : r[c.id]); }).join(" | ") + " |"; }).join("\n") + "\n";
  }
  MESA.util = { esc: esc, num: num, brl: brl, pct: pct, dec: dec, rows: rows, filled: filled, uid: uid, today: today };

  /* ---------------- opções compartilhadas ---------------- */
  var STATUS_CONTATO = ["Mapeado", "Abordado", "Respondeu", "Conversa", "Proposta", "Ganho", "Perdido", "Sem resposta"];
  var SINAL = ["Nenhum ainda", "Interesse declarado", "Intenção de compra", "Compromisso real"];
  var TIPO_DEC = ["Decisão", "Hipótese", "A validar"];
  var DECISAO_EXP = ["Em análise", "Continuar", "Ajustar", "Interromper"];
  var BULLSEYE = ["Marketing viral / indicação", "Relações públicas (imprensa)", "PR não convencional", "Anúncios em busca (SEM)", "Anúncios em redes e display", "Anúncios offline", "SEO", "Marketing de conteúdo", "E-mail marketing", "Engenharia como marketing (ferramentas gratuitas)", "Blogs e criadores do nicho", "Parcerias (business development)", "Vendas diretas / outbound", "Programas de afiliados", "Plataformas existentes (marketplaces, app stores)", "Feiras e eventos do setor", "Eventos próprios / offline", "Palestras", "Construção de comunidade"];

  function ctxOf(env) { return (env.p && env.p.context) || {}; }
  function wsd(env, id) { return (env.ws && env.ws[id]) || {}; }

  /* ---------------- resumos reaproveitados entre ferramentas ---------------- */
  function fcStats(d) {
    var c = rows(d, "contatos"), by = {}, sig = {};
    c.forEach(function (r) { by[r.status || "Mapeado"] = (by[r.status || "Mapeado"] || 0) + 1; sig[r.sinal || "Nenhum ainda"] = (sig[r.sinal || "Nenhum ainda"] || 0) + 1; });
    var abordados = c.filter(function (r) { return r.status && r.status !== "Mapeado"; }).length;
    var conversas = c.filter(function (r) { return ["Conversa", "Proposta", "Ganho"].indexOf(r.status) !== -1; }).length;
    var propostas = c.filter(function (r) { return ["Proposta", "Ganho"].indexOf(r.status) !== -1; }).length;
    var ganhos = by["Ganho"] || 0;
    var objs = rows(d, "objecoes").slice().sort(function (a, b) { return (num(b.vezes) || 0) - (num(a.vezes) || 0); });
    return { total: c.length, by: by, sig: sig, abordados: abordados, conversas: conversas, propostas: propostas, ganhos: ganhos, perdidos: by["Perdido"] || 0, objecoes: objs };
  }
  function chStats(d) {
    var e = rows(d, "experimentos"), t = { n: e.length, rodados: 0, leads: 0, clientes: 0, custo: 0, dec: {} };
    e.forEach(function (r) {
      if (filled(r.leads) || filled(r.clientes) || filled(r.custo)) t.rodados++;
      t.leads += num(r.leads) || 0; t.clientes += num(r.clientes) || 0; t.custo += num(r.custo) || 0;
      var k = r.decisao || "Em análise"; t.dec[k] = (t.dec[k] || 0) + 1;
    });
    return t;
  }
  function ice(r) { var i = num(r.i), c = num(r.c), e = num(r.e); return i != null && c != null && e != null ? (i + c + e) / 3 : null; }

  /* Funil: conversão entre etapas e gargalo sugerido */
  function funnel(d) {
    var f = rows(d, "funil").filter(function (r) { return filled(r.etapa); });
    var out = f.map(function (r, i) {
      var atual = num(r.atual), base = num(r.base), meta = num(r.meta), prev = i ? num(f[i - 1].atual) : null;
      return { etapa: r.etapa, metrica: r.metrica, atual: atual, base: base, meta: meta, conv: i && prev ? (atual == null ? null : atual / prev) : null, vsMeta: atual != null && meta ? atual / meta : null };
    });
    var gargalo = null;
    out.forEach(function (r, i) {
      if (!i) return;
      var score = r.vsMeta != null ? r.vsMeta : r.conv;
      if (score == null) return;
      if (!gargalo || score < gargalo.score) gargalo = { etapa: r.etapa, score: score, por: r.vsMeta != null ? "meta" : "conversão" };
    });
    return { rows: out, gargalo: gargalo };
  }

  /* Unit economics por cenário */
  var UE_VARS = [
    { id: "preco", label: "Preço por unidade (R$)", hint: "Valor cobrado por unidade econômica." },
    { id: "deducoes", label: "Impostos, taxas e descontos (%)", hint: "Percentual que sai da receita: impostos, meios de pagamento, comissões." },
    { id: "custo_var", label: "Custo variável por unidade (R$)", hint: "Custos que só existem porque houve a venda ou a entrega." },
    { id: "freq", label: "Unidades por cliente por mês", hint: "1 para assinatura mensal. Para compras eventuais, use a frequência média (ex.: 0,5)." },
    { id: "retencao", label: "Clientes que continuam no mês seguinte (%)", hint: "Só preencha com dados ou uma hipótese explícita. Sem isso, o LTV não é calculado." },
    { id: "gasto", label: "Investimento em aquisição no período (R$)", hint: "Mídia, ferramentas, comissões e, se quiser, o valor do tempo do time comercial." },
    { id: "novos", label: "Novos clientes no mesmo período", hint: "Clientes conquistados com esse investimento." }
  ];
  function ueCalc(s) {
    s = s || {};
    var preco = num(s.preco), ded = num(s.deducoes) || 0, cv = num(s.custo_var) || 0, freq = num(s.freq), ret = num(s.retencao), gasto = num(s.gasto), novos = num(s.novos);
    if (freq == null) freq = 1;
    var liq = preco == null ? null : preco * (1 - ded / 100);
    var mu = liq == null ? null : liq - cv;
    var mpct = liq ? mu / liq : null;
    var mmes = mu == null ? null : mu * freq;
    var cac = gasto != null && novos ? gasto / novos : null;
    var payback = cac != null && mmes > 0 ? cac / mmes : null;
    var vida = ret != null && ret < 100 && ret >= 0 ? 1 / (1 - ret / 100) : null;
    var ltv = vida != null && mmes != null ? mmes * vida : null;
    return { liq: liq, mu: mu, mpct: mpct, mmes: mmes, cac: cac, payback: payback, vida: vida, ltv: ltv, ltvcac: ltv != null && cac ? ltv / cac : null };
  }
  function ueSensitivity(base) {
    var b = ueCalc(base), metric = b.payback != null ? "payback" : "mmes";
    if (b[metric] == null) return null;
    var tests = [
      { label: "Preço 10% maior", ch: function (s) { s.preco = (num(s.preco) || 0) * 1.1; } },
      { label: "Custo variável 10% menor", ch: function (s) { s.custo_var = (num(s.custo_var) || 0) * 0.9; } },
      { label: "Conversão 10% maior (mais clientes com o mesmo investimento)", ch: function (s) { s.novos = (num(s.novos) || 0) * 1.1; } },
      { label: "Investimento em aquisição 10% menor", ch: function (s) { s.gasto = (num(s.gasto) || 0) * 0.9; } }
    ];
    var out = tests.map(function (t) { var s = Object.assign({}, base); t.ch(s); var r = ueCalc(s)[metric]; return { label: t.label, from: b[metric], to: r, delta: r == null ? 0 : Math.abs(r - b[metric]) }; })
      .filter(function (t) { return t.to != null; }).sort(function (a, c) { return c.delta - a.delta; });
    return { metric: metric, list: out };
  }

  /* ---------------- as sete ferramentas ---------------- */
  var T = [];

  /* 1. FIRST CUSTOMERS */
  T.push({
    id: "first", lens: "vender", n: 1, name: "First Customers", object: "Agenda de contatos", board: "evidencia",
    title: "First Customers — Conquiste seus primeiros clientes",
    desc: "Rede, lista priorizada, abordagens personalizadas e um tracker de conversas, objeções e resultados.",
    question: "Como consigo os primeiros clientes reais sem depender de uma máquina de marketing ou vendas que ainda não existe?",
    when: ["Você validou o problema e tem uma oferta inicial, mesmo que manual.", "Ainda não tem clientes pagantes, ou tem poucos e por acaso.", "Está tentado a “lançar e esperar” em vez de falar com compradores."],
    concepts: [
      ["Founder-led sales", "No começo, quem vende é quem fundou. É assim que se aprende o que o cliente valoriza, antes de contratar ou automatizar."],
      ["Fazer o que não escala", "Recrutar clientes um a um, com atenção quase artesanal, é o caminho normal para os primeiros (Paul Graham)."],
      ["Interesse, intenção e compromisso", "“Achei ótimo” é interesse. Pedir proposta, envolver o decisor ou marcar a próxima reunião é intenção. Pagar, assinar um piloto ou ceder tempo e dados é compromisso."],
      ["Pilotos pagos", "Um formato de entrada com prazo, escopo e critério de sucesso. Mesmo um valor simbólico separa curiosidade de compromisso."]
    ],
    steps: ["Revise o ICP, o segmento inicial e a proposta de valor (já trazidos das fases anteriores).", "Defina os segmentos e perfis que você vai abordar primeiro.", "Mapeie sua rede e quem pode apresentar você a potenciais clientes.", "Monte uma lista priorizada de potenciais clientes.", "Escreva mensagens personalizadas: pedido de introdução, abordagem direta e follow-up.", "Registre cada contato, resposta, conversa e reunião no tracker.", "Registre ofertas, propostas, objeções e resultados.", "Sintetize o que aprendeu e defina as próximas ações."],
    example: "**Exemplo ilustrativo · Caixa da Clínica (SaaS B2B para clínicas veterinárias)**\n\n- **Sprint de 2 semanas:** 30 clínicas mapeadas, 15 abordagens, 5 conversas, buscar 1 piloto pago.\n- **Rede:** ex-colega de faculdade que é veterinária (apresentou 3 clínicas); associação regional de clínicas.\n- **Abordagem direta:** “Oi, Ana. Vi que a Clínica Patas abriu a segunda unidade. Estou conversando com donas de clínica sobre cobrança de procedimentos esquecidos. Topa 20 minutos esta semana? Não é demonstração, quero entender como vocês fazem hoje.”\n- **Oferta inicial:** piloto pago de 60 dias por R$ 149/mês, com implantação feita por nós e critério de sucesso combinado.\n\n| Clínica | Status | Sinal | Próximo passo |\n| --- | --- | --- | --- |\n| Patas (Moema) | Proposta | Intenção de compra | Reunião com a sócia dia 12 |\n| Vet Center | Conversa | Interesse declarado | Enviar resumo e pedir dados do caixa |\n| Bicho Bom | Ganho | Compromisso real | Implantação na segunda |\n\n**Objeção mais frequente (4×):** “A recepção não vai usar mais um sistema.” **Aprendizado:** a dona compra, mas a recepção decide se funciona; incluir a recepcionista na conversa.",
    refs: ["Paul Graham, “Do Things That Don't Scale” (2013)", "Steve Blank, The Four Steps to the Epiphany (Customer Development)", "Rob Fitzpatrick, The Mom Test (2013)"],
    sections: [
      { type: "fields", title: "Sprint sugerido de duas semanas", help: "Referências para começar, não benchmarks. Ajuste ao seu ticket, ciclo de venda, mercado e tempo disponível.", fields: [
        { id: "meta_mapear", label: "Potenciais clientes mapeados", type: "number", def: 30 },
        { id: "meta_abordagens", label: "Abordagens personalizadas", type: "number", def: 15 },
        { id: "meta_conversas", label: "Conversas comerciais", type: "number", def: 5 },
        { id: "meta_vendas", label: "Vendas ou pilotos", type: "number", def: 1 },
        { id: "sprint_inicio", label: "Início", type: "date" },
        { id: "sprint_fim", label: "Fim", type: "date" }
      ] },
      { type: "panel", fn: "fcSprint" },
      { type: "fields", title: "Quem abordar primeiro", fields: [
        { id: "segmentos", label: "Segmentos e perfis prioritários", long: true, ph: "Ex.: donas de clínicas de bairro com 2 a 5 funcionários em SP; clínicas que abriram segunda unidade", prefill: function (env) { var c = ctxOf(env); return [c.beachhead, c.persona].filter(filled).join(" · "); } }
      ] },
      { type: "list", id: "rede", title: "Mapa de rede", help: "Quem você conhece que conhece seus compradores? Peça introduções específicas, não “se souber de alguém…”.", add: "Adicionar pessoa", columns: [
        { id: "pessoa", label: "Pessoa", ph: "Nome" },
        { id: "relacao", label: "Relação", type: "select", options: ["Amigo(a)", "Ex-colega", "Cliente anterior", "Mentor(a) / investidor(a)", "Comunidade", "Outro"] },
        { id: "apresenta", label: "Pode apresentar", ph: "Quem ou que tipo de cliente" },
        { id: "pedido", label: "Pedido de introdução", type: "select", options: ["Não pedido", "Pedido", "Apresentou", "Sem retorno"] }
      ] },
      { type: "list", id: "contatos", title: "Potenciais clientes e tracker de abordagens", help: "Uma linha por potencial cliente. Atualize o status e o sinal a cada interação: é daqui que saem o pipeline, as métricas e o follow-up.", add: "Adicionar potencial cliente", columns: [
        { id: "nome", label: "Pessoa / empresa", ph: "Ex.: Ana · Clínica Patas" },
        { id: "perfil", label: "Perfil / segmento", ph: "Ex.: dona, clínica com 2 unidades" },
        { id: "origem", label: "Origem", type: "select", options: ["Rede", "Indicação", "Abordagem direta", "Comunidade", "Evento", "Outro"] },
        { id: "prioridade", label: "Prioridade", type: "select", options: ["Alta", "Média", "Baixa"] },
        { id: "status", label: "Status", type: "select", options: STATUS_CONTATO },
        { id: "sinal", label: "Sinal", type: "select", options: SINAL },
        { id: "proximo", label: "Próximo passo", ph: "Ex.: reunião com a sócia" },
        { id: "followup", label: "Follow-up em", type: "date" },
        { id: "notas", label: "Notas da conversa", long: true, ph: "O que a pessoa disse, com as palavras dela" }
      ] },
      { type: "fields", title: "Mensagens de abordagem", help: "Personalize cada envio: cite algo específico da pessoa e peça uma conversa, não uma venda.", fields: [
        { id: "msg_intro", label: "Pedido de introdução (para sua rede)", long: true, ph: "Ex.: Você conhece donas de clínica que estejam abrindo unidade? Posso te mandar um texto curto para encaminhar." },
        { id: "msg_direta", label: "Abordagem direta", long: true },
        { id: "msg_followup", label: "Follow-up", long: true }
      ] },
      { type: "fields", title: "Oferta inicial", fields: [
        { id: "oferta", label: "O que você oferece", long: true, ph: "Escopo, entrega e resultado esperado", prefill: function (env) { var c = ctxOf(env); return [c.proposta || c.solucao].filter(filled).join(""); } },
        { id: "formato", label: "Formato de entrada", type: "select", options: ["Piloto pago", "Piloto gratuito com critério de sucesso", "Assinatura", "Projeto fechado", "Compra avulsa", "Outro"] },
        { id: "preco", label: "Preço e condições", ph: "Ex.: R$ 149/mês, 60 dias, cancelamento livre", prefill: function (env) { return ctxOf(env).modelo || ""; } }
      ] },
      { type: "list", id: "objecoes", title: "Objeções e aprendizados", add: "Adicionar objeção", columns: [
        { id: "objecao", label: "Objeção", ph: "Com as palavras do cliente" },
        { id: "vezes", label: "Vezes", type: "number" },
        { id: "resposta", label: "Resposta testada", ph: "O que você respondeu" },
        { id: "aprendizado", label: "O que isso ensina", ph: "Mudança na oferta, no alvo ou no discurso" }
      ] },
      { type: "fields", title: "Síntese e próximas ações", fields: [
        { id: "aprendizados", label: "O que aprendemos neste ciclo", long: true, ph: "Separe o que é evidência (fatos observados) do que ainda é hipótese." },
        { id: "proximas", label: "Próximas ações", long: true }
      ] }
    ],
    quality: ["As abordagens são personalizadas, não disparos em massa.", "Cada contato ativo tem próximo passo e data de follow-up.", "Você distingue interesse declarado, intenção de compra e compromisso real.", "As objeções estão registradas com as palavras do cliente e a frequência.", "A oferta tem preço e condições claros, mesmo que provisórios."],
    done: [
      { label: "Abordagens reais executadas (contatos além de “Mapeado”)", test: function (d) { return fcStats(d).abordados >= 1; } },
      { label: "Evidência registrada sobre o interesse (sinal ou resposta)", test: function (d) { return rows(d, "contatos").some(function (r) { return (r.sinal && r.sinal !== "Nenhum ainda") || ["Respondeu", "Conversa", "Proposta", "Ganho", "Perdido"].indexOf(r.status) !== -1; }); } },
      { label: "Objeções ou aprendizados registrados", test: function (d) { return rows(d, "objecoes").length > 0 || filled(d.aprendizados); } }
    ],
    doneNote: "Não é preciso ter vendido para concluir: o objetivo é ter abordado clientes reais e registrado o que aconteceu.",
    nextAction: "Envie hoje as cinco primeiras abordagens da lista priorizada e agende os follow-ups.",
    next: "gtm",
    reuse: function (env) { var c = ctxOf(env); return [ctxItem(c, "persona", "ICP / cliente"), ctxItem(c, "beachhead", "Segmento inicial"), ctxItem(c, "proposta", "Proposta de valor"), artItem(env, "beachhead"), artItem(env, "working"), artItem(env, "mvp")]; },
    ai: [
      { label: "Personalizar abordagens", task: "Para os potenciais clientes de prioridade alta, escreva uma abordagem direta e um pedido de introdução personalizados (até 80 palavras cada), pedindo uma conversa, não uma venda. Use apenas informações presentes nos dados; quando faltar algo, deixe [completar]." },
      { label: "Analisar objeções", task: "Agrupe as objeções e as notas das conversas em padrões. Para cada padrão: o que provavelmente está por trás, como responder na próxima conversa e o que testar na oferta. Separe o que é evidência do que é interpretação." },
      { label: "Priorizar a lista", task: "Sugira uma ordem de abordagem para os potenciais clientes, explicando o critério (acesso, dor provável, capacidade de pagar, velocidade de decisão). Aponte lacunas de informação." }
    ],
    deliver: function (d, env) {
      var s = fcStats(d);
      return "## Sprint\n" + mdTable([{ label: "Meta", id: "m" }, { label: "Planejado", id: "p" }, { label: "Realizado", id: "r" }], [
        { m: "Potenciais clientes mapeados", p: d.meta_mapear, r: s.total }, { m: "Abordagens", p: d.meta_abordagens, r: s.abordados },
        { m: "Conversas comerciais", p: d.meta_conversas, r: s.conversas }, { m: "Vendas / pilotos", p: d.meta_vendas, r: s.ganhos }]) +
        "\n**Sinais:** " + SINAL.map(function (k) { return k + ": " + (s.sig[k] || 0); }).join(" · ") + "\n";
    }
  });

  /* 2. GO-TO-MARKET */
  var GTM_ITEMS = [
    { id: "market", label: "1. Market", q: "Qual segmento será priorizado e por quê?", prefill: function (env) { return ctxOf(env).beachhead || ""; } },
    { id: "customer", label: "2. Customer", q: "Quem compra, quem usa e quem influencia a decisão? Como é o processo de compra?", prefill: function (env) { return ctxOf(env).persona || ""; } },
    { id: "positioning", label: "3. Positioning", q: "Por que o cliente escolheria esta solução em vez das alternativas que usa hoje?", prefill: function (env) { var c = ctxOf(env); return [c.proposta, c.jornada ? "Alternativa atual: " + c.jornada : ""].filter(filled).join(" · "); } },
    { id: "offer", label: "4. Offer", q: "O que será oferecido, por qual preço e com quais condições?", prefill: function (env) { var f = wsd(env, "first"); return [f.oferta, f.formato, f.preco].filter(filled).join(" · "); } },
    { id: "route", label: "5. Route to Market", q: "Como a oferta chega ao cliente: venda direta, parceiros, plataforma, distribuidor?" },
    { id: "motion", label: "6. Sales Motion", q: "Como será a venda?", options: ["Founder-led", "Consultiva", "Self-service", "Por parceiros", "Híbrida"] },
    { id: "channels", label: "7. Channels", q: "Quais canais serão priorizados inicialmente e por quê?", prefill: function (env) { var s = fcStats(wsd(env, "first")); var by = {}; rows(wsd(env, "first"), "contatos").forEach(function (r) { if (["Conversa", "Proposta", "Ganho"].indexOf(r.status) !== -1 && r.origem) by[r.origem] = (by[r.origem] || 0) + 1; }); var k = Object.keys(by); return k.length ? "Origem das conversas em First Customers: " + k.map(function (o) { return o + " (" + by[o] + ")"; }).join(", ") : (s.total ? "" : ""); } }
  ];
  T.push({
    id: "gtm", lens: "vender", n: 2, name: "Go-to-Market", object: "Bússola", board: "decisao",
    title: "Go-to-Market — Desenhe sua estratégia de entrada no mercado",
    desc: "Segmento, posicionamento, oferta, motion de vendas, canais e um plano de 30 a 90 dias com hipóteses e critérios.",
    question: "Considerando o que aprendi com os primeiros clientes, como entro no mercado, alcanço os compradores certos e transformo a oferta em um processo comercial intencional?",
    when: ["Você já fez abordagens reais e tem aprendizados de First Customers.", "As vendas acontecem, mas de forma oportunista e sem foco.", "Precisa decidir onde colocar tempo e dinheiro nos próximos 30 a 90 dias."],
    concepts: [
      ["ICP e beachhead", "Comece por um segmento estreito, em que você consiga dominar a conversa e gerar referências (Bill Aulet; Geoffrey Moore)."],
      ["Posicionamento", "Parta da alternativa que o cliente usa hoje, mostre o que só você faz e o valor que isso gera para quem mais se importa (April Dunford)."],
      ["Sales motion", "Founder-led, consultiva, self-service, parceiros ou híbrida. O ticket e a complexidade da compra pedem motions diferentes."],
      ["Decisão, hipótese, a validar", "Um GTM inicial mistura decisões tomadas e apostas. Marque cada bloco para saber o que precisa ser testado antes de investir mais."]
    ],
    steps: ["Revise os aprendizados de First Customers (abaixo, reaproveitados).", "Escolha o segmento prioritário e descreva quem compra, usa e influencia.", "Escreva o posicionamento a partir da alternativa atual do cliente.", "Defina oferta, preço e condições.", "Escolha rota até o mercado, motion de vendas e canais iniciais.", "Liste as iniciativas dos próximos 30 a 90 dias, com responsáveis.", "Defina indicadores e metas.", "Registre as hipóteses e os critérios para continuar, ajustar ou abandonar."],
    example: "**Exemplo ilustrativo · Caixa da Clínica**\n\n| Bloco | Escolha | Tipo |\n| --- | --- | --- |\n| Market | Clínicas veterinárias de bairro em SP, 2 a 5 funcionários | Decisão |\n| Customer | Compra: dona/sócia. Usa: recepção. Influencia: veterinário responsável | Decisão |\n| Positioning | Contra planilha + maquininha: registra o procedimento na hora e cobra no atendimento | Hipótese |\n| Offer | Assinatura R$ 149/mês, implantação feita por nós em 1 semana | Hipótese |\n| Sales motion | Founder-led, com demonstração na clínica | Decisão |\n| Channels | Indicação entre clínicas e associação regional; testar conteúdo no Instagram de gestão veterinária | A validar |\n\n**Plano de 30 dias:** 20 visitas a clínicas indicadas; parceria com a associação para uma palestra. **Indicador:** reuniões por semana (meta 5) e pilotos fechados (meta 3). **Hipótese crítica:** clínicas indicadas fecham 2× mais rápido. Continuar se ≥ 1 em 3 indicadas virar piloto em 30 dias.",
    refs: ["Bill Aulet, Disciplined Entrepreneurship (2013)", "Geoffrey Moore, Crossing the Chasm (1991)", "April Dunford, Obviously Awesome (2019)"],
    sections: [
      { type: "panel", fn: "fcLearnings" },
      { type: "decisions", id: "gtm", title: "Estratégia: decisões e hipóteses", help: "Para cada bloco, escreva a escolha, marque se é decisão, hipótese ou algo a validar e explique o porquê. Não é preciso precisão onde ainda faltam dados.", items: GTM_ITEMS },
      { type: "fields", title: "Recursos e capacidade", fields: [
        { id: "recursos", label: "Orçamento, horas por semana e pessoas envolvidas", long: true, ph: "Ex.: R$ 1.500/mês; fundador 20h/semana em vendas; sócia técnica na implantação" },
        { id: "riscos", label: "Riscos e condições para revisar a estratégia", long: true }
      ] },
      { type: "list", id: "plano", title: "8. Execution — iniciativas de 30 a 90 dias", add: "Adicionar iniciativa", columns: [
        { id: "iniciativa", label: "Iniciativa" }, { id: "resp", label: "Responsável" }, { id: "prazo", label: "Prazo", type: "select", options: ["30 dias", "60 dias", "90 dias"] }, { id: "indicador", label: "Indicador" }, { id: "status", label: "Status", type: "select", options: ["A fazer", "Em andamento", "Feito"] }
      ] },
      { type: "list", id: "medidas", title: "9. Measurement — indicadores e metas", add: "Adicionar indicador", columns: [
        { id: "indicador", label: "Indicador" }, { id: "base", label: "Linha de base" }, { id: "meta", label: "Meta" }, { id: "como", label: "Como medir" }
      ] },
      { type: "list", id: "hipoteses", title: "10. Learning — hipóteses a testar antes de investir mais", add: "Adicionar hipótese", columns: [
        { id: "hipotese", label: "Hipótese" }, { id: "teste", label: "Como testar" }, { id: "continuar", label: "Continuar se…" }, { id: "abandonar", label: "Ajustar ou abandonar se…" }
      ] }
    ],
    quality: ["Há um único segmento prioritário, não “todo mundo”.", "O posicionamento cita a alternativa que o cliente usa hoje.", "Oferta e preço estão declarados, mesmo como hipótese.", "Canais e motion são coerentes com o ticket e o processo de compra.", "Cada hipótese tem critério para continuar, ajustar ou abandonar."],
    done: [
      { label: "Pelo menos 5 dos 7 blocos de estratégia preenchidos", test: function (d) { var g = d.gtm || {}; return GTM_ITEMS.filter(function (i) { return g[i.id] && filled(g[i.id].texto); }).length >= 5; } },
      { label: "Ao menos uma iniciativa de execução", test: function (d) { return rows(d, "plano").some(function (r) { return filled(r.iniciativa); }); } },
      { label: "Ao menos um indicador com meta", test: function (d) { return rows(d, "medidas").some(function (r) { return filled(r.indicador) && filled(r.meta); }); } },
      { label: "Ao menos uma hipótese com critério de continuidade", test: function (d) { return rows(d, "hipoteses").some(function (r) { return filled(r.hipotese) && (filled(r.continuar) || filled(r.abandonar)); }); } }
    ],
    nextAction: "Coloque na agenda as iniciativas dos próximos 30 dias e combine com os responsáveis quando o plano será revisado.",
    next: "playbook",
    reuse: function (env) { var c = ctxOf(env); return [ctxItem(c, "beachhead", "Segmento inicial"), ctxItem(c, "persona", "ICP / cliente"), ctxItem(c, "proposta", "Proposta de valor"), ctxItem(c, "tipo", "Modelo de negócio"), wsItem(env, "first", "Aprendizados de First Customers", fcLine(wsd(env, "first"))), artItem(env, "modelo")]; },
    ai: [
      { label: "Criticar a estratégia", task: "Revise o GTM: aponte incoerências entre segmento, oferta, preço, motion e canais, considerando o modelo de negócio. Indique quais blocos são hipóteses frágeis e como testá-los barato." },
      { label: "Escrever o posicionamento", task: "Proponha 3 versões de posicionamento no formato: para [segmento] que [dor], [produto] é [categoria] que [diferencial], ao contrário de [alternativa atual]. Use apenas o que está nos dados." },
      { label: "Plano de 30 dias", task: "Transforme as decisões em um plano de 30 dias com até 6 iniciativas, responsáveis, indicador e o critério de revisão de cada uma." }
    ],
    deliver: function (d) {
      var g = d.gtm || {};
      return "## Estratégia\n" + mdTable([{ label: "Bloco", id: "b" }, { label: "Escolha", id: "t" }, { label: "Tipo", id: "k" }, { label: "Por quê", id: "w" }],
        GTM_ITEMS.map(function (i) { var v = g[i.id] || {}; return { b: i.label, t: v.texto, k: v.tipo, w: v.porque }; }));
    }
  });

  /* 3. SALES PLAYBOOK */
  T.push({
    id: "playbook", lens: "vender", n: 3, name: "Sales Playbook", object: "Fichário de vendas", board: "decisao",
    title: "Sales Playbook — Estruture seu processo comercial",
    desc: "Pipeline com critérios por etapa, qualificação, roteiro SPIN, mensagens, proposta, objeções e motivos de perda.",
    question: "Como transformar as primeiras vendas em um processo que possa ser executado, acompanhado e melhorado?",
    when: ["Você já teve conversas comerciais e algumas propostas.", "Cada venda acontece de um jeito diferente e depende da sua memória.", "Quer que outra pessoa consiga vender, ou que você venda com mais consistência."],
    concepts: [
      ["Pipeline com critérios", "Uma oportunidade só muda de etapa quando algo verificável acontece (ex.: “decisor participou da reunião”), não quando você sente que avançou."],
      ["Qualificação", "Poucas perguntas que separam quem tem dor, decisor, orçamento e momento de quem só está curioso (inspirado em BANT)."],
      ["SPIN Selling", "Perguntas de Situação, Problema, Implicação e Necessidade de solução levam o cliente a explicar o valor com as próprias palavras (Neil Rackham)."],
      ["Perdas também são dados", "Registrar por que uma venda não aconteceu mostra o que mudar na oferta, no alvo ou no processo."]
    ],
    steps: ["Revise ICP, oferta e motion do GTM (reaproveitados).", "Defina as etapas do pipeline.", "Estabeleça critérios de entrada e saída de cada etapa.", "Construa o roteiro comercial.", "Crie modelos de mensagem, proposta e follow-up.", "Defina como registrar objeções e perdas.", "Revise o processo com as oportunidades reais de First Customers."],
    example: "**Exemplo ilustrativo · Caixa da Clínica**\n\n| Etapa | Entra quando | Sai quando |\n| --- | --- | --- |\n| Contato | Clínica do ICP identificada | Respondeu e aceitou conversar |\n| Descoberta | Conversa marcada | Dor confirmada e decisor identificado |\n| Demonstração | Dona e recepção presentes | Pedido de proposta |\n| Proposta | Proposta enviada | Aceite ou motivo de perda |\n| Piloto | Contrato assinado | Critério de sucesso atingido em 60 dias |\n\n**SPIN · Implicação:** “Quando um procedimento não é cobrado, quanto isso representa no mês?”\n\n**Motivo de perda mais comum (ilustrativo):** sem decisor na conversa.",
    refs: ["Neil Rackham, SPIN Selling (1988)", "Rob Fitzpatrick, The Mom Test (2013)"],
    sections: [
      { type: "panel", fn: "pipelineNow" },
      { type: "list", id: "etapas", title: "Etapas do pipeline", help: "Critérios verificáveis tornam o pipeline confiável.", add: "Adicionar etapa", actions: [{ id: "defaultStages", label: "Usar etapas sugeridas" }], columns: [
        { id: "etapa", label: "Etapa" }, { id: "entrada", label: "Entra quando…" }, { id: "saida", label: "Sai quando…" }, { id: "registro", label: "O que registrar" }
      ] },
      { type: "list", id: "qualificacao", title: "Critérios de qualificação", add: "Adicionar critério", actions: [{ id: "defaultQualif", label: "Usar modelo (dor, decisor, orçamento, momento)" }], columns: [
        { id: "criterio", label: "Critério" }, { id: "pergunta", label: "Pergunta" }, { id: "positivo", label: "Sinal positivo" }, { id: "desqualifica", label: "Desqualifica se…" }
      ] },
      { type: "fields", title: "Roteiro de conversa (SPIN)", fields: [
        { id: "abertura", label: "Abertura e objetivo da conversa", long: true },
        { id: "situacao", label: "Situação: perguntas sobre o contexto atual", long: true },
        { id: "problema", label: "Problema: onde dói", long: true, prefill: function (env) { return ctxOf(env).problema || ""; } },
        { id: "implicacao", label: "Implicação: o custo de não resolver", long: true },
        { id: "necessidade", label: "Necessidade de solução: o valor nas palavras do cliente", long: true },
        { id: "valor", label: "Apresentação de valor", long: true, prefill: function (env) { var g = (wsd(env, "gtm").gtm || {}).positioning; return (g && g.texto) || ctxOf(env).proposta || ""; } },
        { id: "fechamento", label: "Fechamento: qual próximo passo pedir", long: true }
      ] },
      { type: "list", id: "mensagens", title: "Biblioteca de mensagens e follow-ups", add: "Adicionar mensagem", columns: [
        { id: "tipo", label: "Tipo", type: "select", options: ["Primeira abordagem", "Follow-up 1", "Follow-up 2", "Pós-reunião", "Envio de proposta", "Reativação"] }, { id: "canal", label: "Canal", ph: "WhatsApp, e-mail, LinkedIn" }, { id: "texto", label: "Texto", long: true }
      ] },
      { type: "fields", title: "Modelo de proposta", fields: [
        { id: "proposta", label: "Estrutura da proposta", long: true, ph: "Contexto e dor → resultado esperado → escopo → preço e condições → critério de sucesso → próximos passos", prefill: function (env) { var g = (wsd(env, "gtm").gtm || {}).offer; return (g && g.texto) || ""; } }
      ] },
      { type: "list", id: "objecoes", title: "Tratamento de objeções", add: "Adicionar objeção", actions: [{ id: "importObjections", label: "Importar de First Customers" }], columns: [
        { id: "objecao", label: "Objeção" }, { id: "resposta", label: "Como responder" }, { id: "prova", label: "Evidência ou prova" }
      ] },
      { type: "list", id: "perdas", title: "Registro de perdas", add: "Registrar perda", actions: [{ id: "importLosses", label: "Importar perdidos de First Customers" }], columns: [
        { id: "oportunidade", label: "Oportunidade" }, { id: "etapa", label: "Etapa em que parou" }, { id: "motivo", label: "Motivo", type: "select", options: ["Preço", "Timing", "Sem dor real", "Sem decisor", "Escolheu alternativa", "Sem resposta", "Outro"] }, { id: "aprendizado", label: "Aprendizado" }
      ] }
    ],
    quality: ["Cada etapa tem critério de entrada e saída verificável.", "A qualificação elimina curiosos cedo.", "O roteiro tem mais perguntas do que apresentação.", "Há mensagens prontas para os follow-ups mais comuns.", "Objeções e perdas viram mudanças no processo, não só registros."],
    done: [
      { label: "Pipeline com ao menos 3 etapas e critérios", test: function (d) { return rows(d, "etapas").filter(function (r) { return filled(r.etapa) && (filled(r.entrada) || filled(r.saida)); }).length >= 3; } },
      { label: "Roteiro com ao menos 3 partes preenchidas", test: function (d) { return ["abertura", "situacao", "problema", "implicacao", "necessidade", "valor", "fechamento"].filter(function (k) { return filled(d[k]); }).length >= 3; } },
      { label: "Ao menos 2 mensagens na biblioteca", test: function (d) { return rows(d, "mensagens").filter(function (r) { return filled(r.texto); }).length >= 2; } },
      { label: "Ao menos uma objeção com resposta", test: function (d) { return rows(d, "objecoes").some(function (r) { return filled(r.objecao) && filled(r.resposta); }); } }
    ],
    nextAction: "Use o roteiro nas próximas três conversas e anote, logo depois de cada uma, o que ajustar.",
    next: "channels",
    reuse: function (env) { var g = wsd(env, "gtm").gtm || {}; return [gtmItem(env, "customer", "Comprador e processo de compra"), gtmItem(env, "offer", "Oferta"), gtmItem(env, "motion", "Sales motion"), wsItem(env, "first", "Oportunidades de First Customers", fcLine(wsd(env, "first")))]; },
    ai: [
      { label: "Revisar o roteiro", task: "Revise o roteiro SPIN: sugira perguntas melhores para cada parte, evitando perguntas que induzem a resposta ou pedem opinião sobre o futuro (Mom Test)." },
      { label: "Responder objeções", task: "Para cada objeção registrada, proponha uma resposta honesta, uma pergunta para entender a objeção e que evidência ajudaria a superá-la." },
      { label: "Ler as perdas", task: "Analise os motivos de perda e o pipeline atual: onde as oportunidades travam e que mudança testar no processo ou na oferta." }
    ],
    deliver: function () { return ""; }
  });

  /* 4. TRACTION CHANNELS */
  T.push({
    id: "channels", lens: "repetir", n: 4, name: "Traction Channels", object: "Megafone", board: "experimento",
    title: "Traction Channels — Descubra seus canais de aquisição",
    desc: "Matriz de canais (Bullseye), backlog de experimentos priorizado por ICE, resultados e decisões.",
    question: "Quais canais têm maior potencial para alcançar e converter os clientes definidos na estratégia de GTM?",
    when: ["O GTM aponta canais, mas você ainda não sabe quais funcionam.", "A rede pessoal começa a se esgotar.", "Quer investir em aquisição sem apostar tudo em um único canal."],
    concepts: [
      ["Bullseye", "Liste muitos canais (anel externo), teste barato os mais promissores (anel do meio) e concentre esforço no que funcionar (centro) (Weinberg e Mares)."],
      ["Experimento de canal", "Hipótese, público, ação, prazo, orçamento e critério de sucesso definidos antes de rodar."],
      ["ICE", "Impacto, confiança e facilidade de 1 a 10 ajudam a ordenar o backlog. É uma régua de priorização, não uma previsão."],
      ["Testar ≠ escalar", "Um teste que funcionou com 5 clientes mostra potencial. Escala exige repetir o resultado com volume e custo sustentável."]
    ],
    steps: ["Revise ICP, canais do GTM e o processo comercial.", "Liste os canais potencialmente relevantes.", "Avalie adequação ao público, custo, esforço e potencial.", "Selecione os canais prioritários (anel do meio).", "Crie experimentos com hipótese, público, ação e prazo.", "Defina orçamento e critério de sucesso.", "Registre resultados e aprendizados.", "Decida: continuar, ajustar ou interromper cada teste."],
    example: "**Exemplo ilustrativo · Caixa da Clínica**\n\n| Experimento | Canal | Critério | Resultado | Decisão |\n| --- | --- | --- | --- | --- |\n| Palestra na associação regional | Palestras | ≥ 10 leads qualificados | 14 leads, 4 reuniões, 1 piloto · R$ 300 | Continuar |\n| Anúncio no Instagram para donas de clínica | Anúncios em redes | Custo por reunião ≤ R$ 150 | 2 reuniões · R$ 600 | Ajustar público |\n| Programa de indicação (1 mês grátis) | Indicação | ≥ 3 indicações em 30 dias | Em andamento | Em análise |\n\nResultados de um teste mostram potencial; ainda não provam que o canal escala.",
    refs: ["Gabriel Weinberg e Justin Mares, Traction (2015)", "Sean Ellis e Morgan Brown, Hacking Growth (2017)"],
    sections: [
      { type: "list", id: "canais", title: "Matriz de canais", help: "Avalie de 1 a 5. Comece pelo que o GTM já aponta.", add: "Adicionar canal", actions: [{ id: "importGtmChannels", label: "Importar canais do GTM" }, { id: "addBullseye", label: "Listar os 19 canais do Bullseye" }], columns: [
        { id: "canal", label: "Canal", list: BULLSEYE }, { id: "adequacao", label: "Adequação ao público (1–5)", type: "number" }, { id: "custo", label: "Custo", type: "select", options: ["Baixo", "Médio", "Alto"] }, { id: "esforco", label: "Esforço", type: "select", options: ["Baixo", "Médio", "Alto"] }, { id: "potencial", label: "Potencial (1–5)", type: "number" }, { id: "anel", label: "Anel", type: "select", options: ["Externo (ideia)", "Meio (testar)", "Centro (focar)", "Descartado"] }
      ] },
      { type: "panel", fn: "channelsRank" },
      { type: "list", id: "experimentos", title: "Backlog e resultados de experimentos", help: "Preencha a parte de cima antes de rodar e a de baixo depois. ICE é calculado automaticamente.", add: "Adicionar experimento", actions: [{ id: "sortIce", label: "Ordenar por ICE" }], columns: [
        { id: "hipotese", label: "Hipótese", long: true, ph: "Acreditamos que [público] via [canal] vai [resultado] porque [motivo]" },
        { id: "canal", label: "Canal", list: BULLSEYE }, { id: "publico", label: "Público" }, { id: "acao", label: "Ação" }, { id: "prazo", label: "Prazo", type: "date" }, { id: "orcamento", label: "Orçamento (R$)", type: "number" },
        { id: "metrica", label: "Métrica de sucesso" }, { id: "criterio", label: "Critério (meta)" },
        { id: "i", label: "Impacto (1–10)", type: "number" }, { id: "c", label: "Confiança (1–10)", type: "number" }, { id: "e", label: "Facilidade (1–10)", type: "number" }, { id: "_ice", label: "ICE", computed: function (r) { var v = ice(r); return v == null ? "—" : dec(v); } },
        { id: "status", label: "Status", type: "select", options: ["Backlog", "Rodando", "Concluído"] },
        { id: "leads", label: "Leads", type: "number" }, { id: "reunioes", label: "Conversas / reuniões", type: "number" }, { id: "clientes", label: "Clientes", type: "number" }, { id: "custo", label: "Custo real (R$)", type: "number" },
        { id: "decisao", label: "Decisão", type: "select", options: DECISAO_EXP }, { id: "aprendizado", label: "Aprendizado", long: true }
      ] }
    ],
    quality: ["Cada experimento tem critério de sucesso definido antes de rodar.", "O custo inclui tempo e dinheiro, de forma explícita.", "Poucos canais testados por vez, para conseguir aprender.", "A decisão de cada teste está registrada com o porquê.", "Resultados iniciais não são tratados como prova de escala."],
    done: [
      { label: "Ao menos 3 canais avaliados", test: function (d) { return rows(d, "canais").filter(function (r) { return filled(r.canal) && (filled(r.adequacao) || filled(r.potencial)); }).length >= 3; } },
      { label: "Ao menos um experimento com métrica e critério", test: function (d) { return rows(d, "experimentos").some(function (r) { return filled(r.hipotese) && filled(r.metrica) && filled(r.criterio); }); } },
      { label: "Resultados ou decisão registrados (ou teste preparado com prazo)", test: function (d) { return rows(d, "experimentos").some(function (r) { return (r.decisao && r.decisao !== "Em análise") || filled(r.prazo); }); } }
    ],
    nextAction: "Rode o experimento com maior ICE nesta semana, com o orçamento e o prazo definidos.",
    next: "metrics",
    reuse: function (env) { return [gtmItem(env, "channels", "Canais escolhidos no GTM"), gtmItem(env, "customer", "Comprador"), gtmItem(env, "motion", "Sales motion"), ctxItem(ctxOf(env), "persona", "ICP / cliente"), wsItem(env, "playbook", "Processo comercial", (rows(wsd(env, "playbook"), "etapas").map(function (r) { return r.etapa; }).filter(filled).join(" → ")))]; },
    ai: [
      { label: "Sugerir canais e testes", task: "Considerando o ICP, o modelo de negócio e o processo de compra, sugira 5 canais com potencial e, para os 3 melhores, um experimento barato com hipótese, ação, prazo, orçamento e critério de sucesso. Marque tudo como hipótese." },
      { label: "Ler os resultados", task: "Analise os resultados dos experimentos: o que é sinal, o que pode ser ruído (amostra pequena), qual decisão faz sentido para cada um e qual o próximo teste." }
    ],
    deliver: function (d) {
      var s = chStats(d);
      return "## Totais dos experimentos registrados\nExperimentos: " + s.n + " · com resultados: " + s.rodados + " · leads: " + s.leads + " · clientes: " + s.clientes + " · custo: " + brl(s.custo) + (s.clientes ? " · custo por cliente observado nos testes: " + brl(s.custo / s.clientes) : "") + "\n";
    }
  });

  /* 5. TRACTION METRICS */
  var FUNNELS = {
    saas: [["Visitantes ou leads", "Pessoas que chegaram"], ["Cadastros / trials", "Contas criadas"], ["Ativados", "Atingiram o primeiro valor"], ["Pagantes", "Assinaturas ativas"], ["Retidos no mês seguinte", "Continuam pagando"]],
    b2b_servico: [["Contatos qualificados", "Contatos do ICP"], ["Reuniões", "Conversas comerciais"], ["Propostas", "Propostas enviadas"], ["Clientes", "Contratos fechados"], ["Recompra / renovação", "Clientes que voltam"]],
    b2c: [["Visitas", "Pessoas que chegaram"], ["Interesse", "Cadastro, carrinho ou contato"], ["Compras", "Primeira compra"], ["Recompra", "Segunda compra em até 90 dias"]],
    marketplace: [["Ofertantes ativos", "Ofertam no período"], ["Demandantes ativos", "Buscam no período"], ["Transações", "Encontros que viraram transação"], ["Recorrência", "Quem transacionou de novo"]],
    transacional: [["Visitas", "Sessões no período"], ["Carrinhos / pedidos iniciados", ""], ["Pedidos pagos", ""], ["Recompra", "Clientes com 2+ pedidos"]],
    outro: [["Contatos", ""], ["Conversas", ""], ["Propostas", ""], ["Clientes", ""]]
  };
  T.push({
    id: "metrics", lens: "repetir", n: 5, name: "Traction Metrics", object: "Funil", board: "evidencia",
    title: "Traction Metrics — Meça seu funil e identifique gargalos",
    desc: "Funil adaptado ao modelo de negócio, dicionário de métricas, linha de base, metas e o gargalo da vez.",
    question: "Quais indicadores mostram se a estratégia de aquisição e vendas está funcionando, e onde devo concentrar meus esforços?",
    when: ["Você já tem algum volume de contatos, testes ou clientes.", "Não sabe se está melhorando de uma semana para outra.", "Tem muitos números, mas nenhum orienta uma decisão."],
    concepts: [
      ["Atividade × resultado", "Abordagens enviadas medem esforço; reuniões e clientes medem resultado. Acompanhe os dois, mas decida pelos resultados."],
      ["Funil e AARRR", "Aquisição, ativação, retenção, receita e indicação ajudam a organizar o funil quando fazem sentido para o modelo (Dave McClure)."],
      ["Antecedentes e finais", "Indicadores antecedentes (reuniões, ativação) mudam antes dos finais (receita, retenção) e permitem agir a tempo."],
      ["North Star e cohorts", "Use uma North Star só se ela representar o valor entregue. Cohorts pedem volume e histórico; sem isso, acompanhe casos individuais."]
    ],
    steps: ["Selecione o modelo de negócio.", "Identifique o principal resultado esperado.", "Defina as etapas do funil.", "Escolha o indicador e a fórmula de cada etapa.", "Registre a linha de base, quando houver.", "Defina metas iniciais e a frequência de revisão.", "Identifique o principal gargalo.", "Crie uma ação para melhorar o indicador prioritário."],
    example: "**Exemplo ilustrativo · Caixa da Clínica (B2B, venda founder-led)**\n\n| Etapa | Fórmula | Atual (mês) | Meta | Conversão |\n| --- | --- | --- | --- | --- |\n| Contatos qualificados | clínicas do ICP contatadas | 40 | 60 | — |\n| Reuniões | reuniões realizadas | 12 | 15 | 30% |\n| Propostas | propostas enviadas | 6 | 8 | 50% |\n| Clientes | pilotos assinados | 2 | 4 | 33% |\n\n**Gargalo:** propostas → clientes. **Ação:** levar a recepcionista para a demonstração e medir na próxima revisão.",
    refs: ["Dave McClure, “Startup Metrics for Pirates” (2007)", "Alistair Croll e Benjamin Yoskovitz, Lean Analytics (2013)", "Sean Ellis e Morgan Brown, Hacking Growth (2017)"],
    sections: [
      { type: "model" },
      { type: "fields", title: "Resultado principal", fields: [
        { id: "resultado", label: "Principal resultado esperado agora", ph: "Ex.: 4 clínicas pagantes por mês" },
        { id: "northstar", label: "North Star (opcional)", ph: "Só se representar o valor entregue ao cliente" }
      ] },
      { type: "panel", fn: "dataSoFar" },
      { type: "list", id: "funil", title: "Funil e dicionário de métricas", help: "Use números reais do período. Deixe em branco o que ainda não mede.", add: "Adicionar etapa", actions: [{ id: "suggestFunnel", label: "Sugerir funil para o modelo de negócio" }], columns: [
        { id: "etapa", label: "Etapa" }, { id: "metrica", label: "Indicador" }, { id: "formula", label: "Fórmula / definição" }, { id: "tipo", label: "Tipo", type: "select", options: ["Atividade", "Resultado"] }, { id: "base", label: "Linha de base", type: "number" }, { id: "atual", label: "Atual", type: "number" }, { id: "meta", label: "Meta", type: "number" }
      ] },
      { type: "panel", fn: "funnelViz" },
      { type: "fields", title: "Revisão e gargalo", fields: [
        { id: "frequencia", label: "Frequência de revisão", type: "select", options: ["Semanal", "Quinzenal", "Mensal"] },
        { id: "gargalo", label: "Gargalo prioritário", ph: "A etapa que mais limita o resultado agora" },
        { id: "acao", label: "Ação para melhorar o indicador", long: true },
        { id: "proxima_revisao", label: "Próxima revisão", type: "date" }
      ] }
    ],
    quality: ["As métricas combinam com o modelo de negócio (nada de métricas de SaaS forçadas).", "Cada indicador tem fórmula ou definição clara.", "Há indicadores de resultado, não só de atividade.", "O gargalo escolhido é sustentado pelos números.", "Existe uma única ação prioritária até a próxima revisão."],
    done: [
      { label: "Ao menos 3 etapas com indicador", test: function (d) { return rows(d, "funil").filter(function (r) { return filled(r.etapa) && filled(r.metrica); }).length >= 3; } },
      { label: "Números atuais ou linha de base registrados", test: function (d) { return rows(d, "funil").some(function (r) { return filled(r.atual) || filled(r.base); }); } },
      { label: "Gargalo e ação definidos", test: function (d) { return filled(d.gargalo) && filled(d.acao); } }
    ],
    nextAction: "Coloque a próxima revisão na agenda e execute a ação do gargalo antes dela.",
    next: "unit",
    reuse: function (env) { return [ctxItem(ctxOf(env), "tipo", "Modelo de negócio"), wsItem(env, "first", "First Customers", fcLine(wsd(env, "first"))), wsItem(env, "channels", "Resultados de canais", chLine(wsd(env, "channels"))), wsItem(env, "playbook", "Etapas do pipeline", rows(wsd(env, "playbook"), "etapas").map(function (r) { return r.etapa; }).filter(filled).join(" → "))]; },
    ai: [
      { label: "Revisar o painel", task: "Revise o funil e as métricas para este modelo de negócio: há métricas de vaidade, etapas faltando ou fórmulas ambíguas? Sugira ajustes e explique por quê." },
      { label: "Diagnosticar o gargalo", task: "Com os números do funil, aponte o gargalo mais provável, hipóteses de causa (marcadas como hipóteses) e um experimento para cada uma." }
    ],
    deliver: function (d) {
      var f = funnel(d);
      return "## Painel\n" + mdTable([{ label: "Etapa", id: "etapa" }, { label: "Indicador", id: "metrica" }, { label: "Linha de base", get: function (r) { return dec(r.base, 2); } }, { label: "Atual", get: function (r) { return dec(r.atual, 2); } }, { label: "Meta", get: function (r) { return dec(r.meta, 2); } }, { label: "Conversão da etapa anterior", get: function (r) { return pct(r.conv); } }], f.rows) +
        (f.gargalo ? "\n**Gargalo sugerido pelos números:** " + f.gargalo.etapa + " (menor " + (f.gargalo.por === "meta" ? "atingimento da meta" : "conversão") + ")\n" : "");
    }
  });

  /* 6. UNIT ECONOMICS */
  T.push({
    id: "unit", lens: "repetir", n: 6, name: "Unit Economics", object: "Cofrinho", board: "hipotese",
    title: "Unit Economics — Entenda a economia do seu negócio",
    desc: "Margem de contribuição, CAC, payback e LTV em três cenários, com premissas explícitas e análise de sensibilidade.",
    question: "Adquirir e atender clientes pode gerar uma operação economicamente sustentável?",
    when: ["Você tem preço definido e alguma ideia do custo de entregar.", "Vai começar a investir em aquisição.", "Quer saber quais números precisam melhorar antes de acelerar."],
    concepts: [
      ["Margem de contribuição", "Receita líquida da unidade menos os custos variáveis para entregá-la. Se for negativa, vender mais aumenta o prejuízo."],
      ["CAC observado × estimado", "CAC = investimento em aquisição ÷ novos clientes no mesmo período. Observado vem de dados reais; estimado é cenário. Deixe claro o que entra no cálculo."],
      ["Payback e LTV", "Payback = CAC ÷ margem mensal por cliente. LTV só faz sentido com dados ou hipóteses defensáveis de retenção; aqui ele é sempre um cenário (David Skok)."],
      ["Unit economics ≠ lucro ≠ caixa", "Unidades saudáveis não garantem lucro (custos fixos) nem caixa (prazos de pagamento)."]
    ],
    steps: ["Escolha a unidade econômica adequada.", "Registre preço e receita efetiva.", "Identifique custos variáveis.", "Calcule a margem de contribuição.", "Registre investimento e novos clientes, com a metodologia do CAC.", "Avalie o payback.", "Monte os cenários conservador, base e otimista.", "Veja quais variáveis mais afetam o resultado.", "Defina o próximo experimento econômico."],
    example: "**Exemplo ilustrativo · Caixa da Clínica (números de exemplo, não benchmarks)**\n\n| Cenário base | Valor |\n| --- | --- |\n| Preço | R$ 149/mês |\n| Impostos e taxas | 12% |\n| Custo variável (servidor, suporte) | R$ 25/mês |\n| Margem de contribuição | R$ 106/mês (81% da receita líquida) |\n| Investimento em aquisição no mês | R$ 900 (palestra + anúncios) |\n| Novos clientes no mês | 3 |\n| CAC observado | R$ 300 |\n| Payback | 2,8 meses |\n\nRetenção ainda sem dados: LTV não calculado. **Próximo experimento econômico:** testar plano anual com desconto para reduzir o risco de churn.",
    refs: ["David Skok, “SaaS Metrics 2.0” (For Entrepreneurs)", "Alistair Croll e Benjamin Yoskovitz, Lean Analytics (2013)"],
    sections: [
      { type: "fields", title: "Unidade econômica", fields: [
        { id: "unidade", label: "Unidade", type: "select", options: ["Cliente por mês (assinatura)", "Contrato / projeto", "Pedido / transação", "Cliente ao longo da vida"] },
        { id: "unidade_desc", label: "Descreva a unidade", ph: "Ex.: uma clínica pagando a assinatura mensal" }
      ] },
      { type: "unit" },
      { type: "panel", fn: "ueResult" },
      { type: "fields", title: "Premissas e metodologia", fields: [
        { id: "metodologia", label: "Como o CAC foi calculado", long: true, ph: "O que entra no investimento (mídia, comissões, tempo do time) e qual período foi usado" },
        { id: "premissas", label: "Premissas explícitas", long: true }
      ] },
      { type: "list", id: "riscos", title: "Riscos econômicos", add: "Adicionar risco", columns: [
        { id: "risco", label: "Risco" }, { id: "impacto", label: "Impacto", type: "select", options: ["Alto", "Médio", "Baixo"] }, { id: "validar", label: "Como validar a premissa" }
      ] },
      { type: "fields", title: "Próximo experimento econômico", fields: [{ id: "experimento", label: "Experimento", long: true, ph: "Ex.: testar preço 20% maior com os próximos 5 clientes" }] }
    ],
    quality: ["Cada número diz se é observado ou estimado.", "O CAC tem metodologia explícita (o que entra e qual período).", "O LTV só aparece com uma hipótese de retenção declarada.", "Os cenários conservador e otimista são plausíveis, não extremos.", "As premissas críticas têm um plano de validação."],
    done: [
      { label: "Preço e custo variável no cenário base", test: function (d) { var b = (d.ue || {}).b || {}; return filled(b.preco) && filled(b.custo_var); } },
      { label: "Investimento e novos clientes (CAC) com metodologia", test: function (d) { var b = (d.ue || {}).b || {}; return filled(b.gasto) && filled(b.novos) && filled(d.metodologia); } },
      { label: "Ao menos um risco e o próximo experimento", test: function (d) { return rows(d, "riscos").some(function (r) { return filled(r.risco); }) && filled(d.experimento); } }
    ],
    nextAction: "Colete o dado que mais falta (ex.: custo variável real ou retenção do primeiro mês) e atualize o cenário base.",
    next: "review",
    reuse: function (env) { return [ctxItem(ctxOf(env), "tipo", "Modelo de negócio"), gtmItem(env, "offer", "Oferta e preço (GTM)"), wsItem(env, "channels", "Investimento e clientes dos canais", chLine(wsd(env, "channels"))), wsItem(env, "metrics", "Funil", funnelLine(wsd(env, "metrics")))]; },
    ai: [
      { label: "Revisar premissas", task: "Revise as premissas de unit economics: quais parecem otimistas, o que falta no custo variável ou no CAC, e quais dados coletar primeiro. Não use benchmarks de mercado como se fossem dados do projeto." },
      { label: "Experimentos econômicos", task: "Sugira 3 experimentos para melhorar a variável mais sensível (preço, conversão, custo de aquisição ou retenção), com hipótese, como medir e critério de decisão." }
    ],
    deliver: function (d) {
      var ue = d.ue || {}, origem = d.ue_origem || {}, cs = { c: ueCalc(ue.c), b: ueCalc(ue.b), o: ueCalc(ue.o) };
      var input = mdTable([{ label: "Variável", id: "v" }, { label: "Conservador", id: "c" }, { label: "Base", id: "b" }, { label: "Otimista", id: "o" }, { label: "Origem", id: "g" }],
        UE_VARS.map(function (v) { return { v: v.label, c: (ue.c || {})[v.id], b: (ue.b || {})[v.id], o: (ue.o || {})[v.id], g: origem[v.id] || "Estimado" }; }));
      var out = mdTable([{ label: "Resultado", id: "v" }, { label: "Conservador", id: "c" }, { label: "Base", id: "b" }, { label: "Otimista", id: "o" }], [
        { v: "Margem de contribuição por unidade", c: brl(cs.c.mu), b: brl(cs.b.mu), o: brl(cs.o.mu) },
        { v: "Margem (%)", c: pct(cs.c.mpct), b: pct(cs.b.mpct), o: pct(cs.o.mpct) },
        { v: "CAC", c: brl(cs.c.cac), b: brl(cs.b.cac), o: brl(cs.o.cac) },
        { v: "Payback (meses)", c: dec(cs.c.payback), b: dec(cs.b.payback), o: dec(cs.o.payback) },
        { v: "LTV (cenário, exige retenção declarada)", c: brl(cs.c.ltv), b: brl(cs.b.ltv), o: brl(cs.o.ltv) }]);
      var sens = ueSensitivity(ue.b || {});
      return "## Premissas\n" + input + "\n## Resultados\n" + out + (sens && sens.list.length ? "\n## Sensibilidade (cenário base)\n" + sens.list.map(function (t) { return "- " + t.label + ": " + (sens.metric === "payback" ? "payback de " + dec(t.from) + " para " + dec(t.to) + " meses" : "margem mensal de " + brl(t.from) + " para " + brl(t.to)); }).join("\n") + "\n" : "");
    }
  });

  /* 7. ACTIVATION, RETENTION & TRACTION REVIEW */
  T.push({
    id: "review", lens: "repetir", n: 7, name: "Activation, Retention & Review", object: "Calendário de revisão", board: "decisao",
    title: "Activation, Retention & Traction Review — Melhore o valor entregue e planeje o próximo ciclo",
    desc: "Caminho até o primeiro valor, sinais de retenção, experimentos de melhoria, rotina de revisão e roadmap de 30 a 60 dias.",
    question: "Depois de conquistar clientes, eles percebem valor, continuam usando ou comprando e geram sinais de um negócio que pode crescer de forma sustentável?",
    when: ["Você já tem clientes usando ou comprando.", "Alguns clientes somem depois da primeira compra ou do primeiro mês.", "Quer uma rotina para decidir o que fazer no próximo ciclo."],
    concepts: [
      ["Ativação e time-to-value", "Ativação é o momento em que o cliente obtém o primeiro resultado valioso. Quanto mais rápido, maior a chance de ficar."],
      ["Aha moment", "Quando identificável, é a ação que separa quem fica de quem sai. Sem dados suficientes, trate como hipótese."],
      ["Retenção conforme o modelo", "Assinatura: continuar pagando. Transacional: recomprar. B2B: renovar e expandir. Converse com clientes ativos e inativos."],
      ["Revisão de tração", "Uma rotina curta, com números e decisões (continuar, ajustar, parar), transforma aprendizado em plano."]
    ],
    steps: ["Identifique o primeiro resultado valioso esperado pelo cliente.", "Mapeie o caminho até esse resultado.", "Identifique fricções e pontos de abandono.", "Examine evidências de uso, recompra ou retenção.", "Registre feedback e motivos de perda.", "Escolha a principal oportunidade de melhoria.", "Defina experimentos e indicadores.", "Revise canais, vendas, métricas e unit economics (consolidado abaixo).", "Consolide os aprendizados.", "Crie o plano dos próximos 30 a 60 dias."],
    example: "**Exemplo ilustrativo · Caixa da Clínica**\n\n- **Primeiro valor:** fechar o caixa do dia sem planilha. **Time-to-value atual:** 9 dias (implantação + primeiro fechamento).\n- **Fricção:** cadastro de procedimentos e preços leva 2 tardes da recepção.\n- **Clientes:** 3 ativos, 1 em risco (recepção trocou), 1 inativo (“voltamos para a planilha”).\n- **Experimento:** importar a tabela de preços por foto em vez de cadastro manual · indicador: dias até o primeiro fechamento · meta: ≤ 3 dias.\n- **Rotina:** revisão semanal às segundas, 30 minutos.\n- **Próximos 30 dias:** onboarding em 3 dias; manter palestras (canal que continua); pausar anúncios até reduzir o custo por reunião.",
    refs: ["Alistair Croll e Benjamin Yoskovitz, Lean Analytics (2013)", "Rob Fitzpatrick, The Mom Test (2013)", "Sean Ellis e Morgan Brown, Hacking Growth (2017)"],
    sections: [
      { type: "fields", title: "Primeiro valor", fields: [
        { id: "primeiro_valor", label: "Primeiro resultado valioso para o cliente", ph: "O que o cliente consegue e reconhece como valor", prefill: function (env) { return ctxOf(env).proposta || ""; } },
        { id: "aha", label: "Aha moment (se identificável)", ph: "Hipótese, se ainda não houver dados" },
        { id: "ttv", label: "Time-to-value atual", ph: "Ex.: 9 dias da assinatura ao primeiro fechamento" }
      ] },
      { type: "list", id: "caminho", title: "Caminho até o valor, fricções e abandonos", add: "Adicionar passo", columns: [
        { id: "passo", label: "Passo" }, { id: "quem", label: "Quem faz", type: "select", options: ["Cliente", "Nosso time", "Ambos"] }, { id: "friccao", label: "Fricção observada" }, { id: "abandono", label: "Há abandono aqui?", type: "select", options: ["Não sei", "Não", "Às vezes", "Sim, frequente"] }
      ] },
      { type: "list", id: "clientes", title: "Evidências de uso, recompra ou retenção", help: "Inclua clientes inativos e perdidos: eles ensinam mais.", add: "Adicionar cliente", columns: [
        { id: "cliente", label: "Cliente" }, { id: "situacao", label: "Situação", type: "select", options: ["Ativo", "Em risco", "Inativo / churn", "Recomprou", "Expandiu"] }, { id: "evidencia", label: "Evidência de uso" }, { id: "feedback", label: "Feedback ou motivo de perda", long: true }
      ] },
      { type: "fields", title: "Oportunidade de melhoria", fields: [{ id: "oportunidade", label: "Principal oportunidade agora", long: true }] },
      { type: "list", id: "experimentos", title: "Experimentos de ativação e retenção", add: "Adicionar experimento", columns: [
        { id: "hipotese", label: "Hipótese" }, { id: "mudanca", label: "Mudança" }, { id: "indicador", label: "Indicador" }, { id: "meta", label: "Meta" }, { id: "prazo", label: "Prazo", type: "date" }, { id: "resultado", label: "Resultado" }, { id: "decisao", label: "Decisão", type: "select", options: DECISAO_EXP }
      ] },
      { type: "panel", fn: "tractionReview" },
      { type: "fields", title: "Rotina de revisão", help: "Semanal é uma sugestão. Escolha o ritmo que combina com o seu ciclo de vendas e de uso.", fields: [
        { id: "frequencia", label: "Frequência", type: "select", options: ["Semanal", "Quinzenal", "Mensal"] },
        { id: "rotina", label: "Dia, duração e participantes", ph: "Ex.: segunda, 30 min, sócios" }
      ] },
      { type: "list", id: "revisoes", title: "Registro de revisões", add: "Registrar revisão", columns: [
        { id: "data", label: "Data", type: "date" }, { id: "numeros", label: "Números do período", long: true }, { id: "aprendizados", label: "Aprendizados", long: true }, { id: "decisoes", label: "Decisões (continuar, ajustar, parar)", long: true }
      ] },
      { type: "list", id: "roadmap", title: "Roadmap de tração: próximos 30 a 60 dias", add: "Adicionar iniciativa", columns: [
        { id: "iniciativa", label: "Iniciativa" }, { id: "porque", label: "Por quê (evidência)" }, { id: "indicador", label: "Indicador" }, { id: "prazo", label: "Prazo", type: "select", options: ["30 dias", "60 dias"] }, { id: "resp", label: "Responsável" }
      ] }
    ],
    quality: ["O primeiro valor está descrito do ponto de vista do cliente.", "Há evidências de clientes ativos e inativos, não só dos satisfeitos.", "Cada experimento tem indicador e meta.", "A rotina de revisão termina em decisões registradas.", "O roadmap se apoia em evidências das ferramentas anteriores."],
    done: [
      { label: "Primeiro resultado valioso definido", test: function (d) { return filled(d.primeiro_valor); } },
      { label: "Evidências de clientes registradas", test: function (d) { return rows(d, "clientes").some(function (r) { return filled(r.cliente) && filled(r.situacao); }); } },
      { label: "Ao menos um experimento com indicador", test: function (d) { return rows(d, "experimentos").some(function (r) { return filled(r.hipotese) && filled(r.indicador); }); } },
      { label: "Rotina definida e ao menos uma revisão registrada", test: function (d) { return filled(d.frequencia) && rows(d, "revisoes").some(function (r) { return filled(r.decisoes) || filled(r.aprendizados); }); } },
      { label: "Roadmap com ao menos uma iniciativa", test: function (d) { return rows(d, "roadmap").some(function (r) { return filled(r.iniciativa); }); } }
    ],
    nextAction: "Converse nesta semana com um cliente ativo e um inativo, e leve o que ouvir para a próxima revisão.",
    next: null,
    reuse: function (env) { return [wsItem(env, "first", "Primeiros clientes", fcLine(wsd(env, "first"))), gtmItem(env, "motion", "Sales motion"), wsItem(env, "channels", "Canais", chLine(wsd(env, "channels"))), wsItem(env, "metrics", "Funil e gargalo", funnelLine(wsd(env, "metrics"))), wsItem(env, "unit", "Unit economics (base)", ueLine(wsd(env, "unit")))]; },
    ai: [
      { label: "Ler a retenção", task: "Analise as evidências de clientes ativos, em risco e inativos: padrões de quem fica e de quem sai, hipóteses de aha moment e de causas de churn (marcadas como hipóteses) e o que perguntar nas próximas entrevistas." },
      { label: "Preparar a revisão", task: "Prepare a pauta da próxima revisão de tração com os números consolidados: o que melhorou, o que piorou, 3 decisões a tomar e o roadmap dos próximos 30 dias." }
    ],
    deliver: function (d, env) { return "## Visão consolidada\n" + reviewLines(env).map(function (l) { return "- **" + l[0] + ":** " + l[1]; }).join("\n") + "\n"; }
  });

  /* ---------------- reaproveitamento ---------------- */
  var CTX_LABEL = {};
  function ctxItem(c, id, label) {
    var v = c[id] || "";
    if (id === "tipo" && v) { var f = MESA.CONTEXT_FIELDS.filter(function (x) { return x.id === "tipo"; })[0]; (f.options || []).forEach(function (o) { if (o[0] === v) v = o[1]; }); }
    return { label: label, value: v, origin: "Contexto do projeto", href: "contexto" };
  }
  function artItem(env, toolId) {
    var a = (env.artifacts || []).filter(function (x) { return x.tool_id === toolId; })[0], t = MESA.TOOLS.filter(function (x) { return x.id === toolId; })[0];
    return { label: t ? t.name : toolId, value: a ? a.title + " (artefato salvo)" : "", origin: t ? t.name : "", href: a ? "artefato/" + a.id : "ferramenta/" + toolId };
  }
  function wsItem(env, toolId, label, value) { var t = MESA.TRACTION_BY[toolId]; return { label: label, value: value || "", origin: t ? t.name : "", href: "ferramenta/" + toolId }; }
  function gtmItem(env, key, label) { var v = (wsd(env, "gtm").gtm || {})[key] || {}; return { label: label, value: v.texto ? v.texto + (v.tipo ? " (" + v.tipo.toLowerCase() + ")" : "") : "", origin: "Go-to-Market", href: "ferramenta/gtm" }; }
  function fcLine(d) { var s = fcStats(d); if (!s.total) return ""; return s.total + " potenciais clientes · " + s.abordados + " abordados · " + s.conversas + " em conversa ou além · " + s.ganhos + " ganhos" + (s.objecoes[0] ? " · objeção mais frequente: “" + s.objecoes[0].objecao + "”" : ""); }
  function chLine(d) { var s = chStats(d); if (!s.n) return ""; return s.n + " experimentos · " + s.leads + " leads · " + s.clientes + " clientes · " + brl(s.custo) + " investidos" + (Object.keys(s.dec).length ? " · decisões: " + Object.keys(s.dec).map(function (k) { return k + " " + s.dec[k]; }).join(", ") : ""); }
  function funnelLine(d) { var f = funnel(d); if (!f.rows.length) return ""; return f.rows.map(function (r) { return r.etapa + (r.atual != null ? " " + dec(r.atual, 2) : ""); }).join(" → ") + (d.gargalo ? " · gargalo: " + d.gargalo : f.gargalo ? " · gargalo sugerido: " + f.gargalo.etapa : ""); }
  function ueLine(d) { var c = ueCalc((d.ue || {}).b); if (c.mu == null) return ""; return "margem " + brl(c.mu) + " por unidade (" + pct(c.mpct) + ")" + (c.cac != null ? " · CAC " + brl(c.cac) : "") + (c.payback != null ? " · payback " + dec(c.payback) + " meses" : ""); }
  function reviewLines(env) {
    return [["Primeiros clientes", fcLine(wsd(env, "first")) || "sem registros"], ["GTM", (function () { var g = wsd(env, "gtm").gtm || {}; return [g.market && g.market.texto, g.motion && g.motion.texto].filter(filled).join(" · ") || "não definido"; })()],
      ["Processo comercial", rows(wsd(env, "playbook"), "etapas").map(function (r) { return r.etapa; }).filter(filled).join(" → ") || "não definido"], ["Canais", chLine(wsd(env, "channels")) || "sem experimentos"],
      ["Funil", funnelLine(wsd(env, "metrics")) || "sem métricas"], ["Unit economics", ueLine(wsd(env, "unit")) || "sem cálculo"]];
  }

  /* ---------------- painéis calculados (HTML) ---------------- */
  function bar(label, val, goal) {
    var p = goal ? Math.min(100, Math.round(val / goal * 100)) : 0;
    return '<div class="kbar"><span class="kl">' + esc(label) + '</span><span class="kt"><i style="width:' + p + '%"></i></span><b>' + val + (goal ? " / " + goal : "") + "</b></div>";
  }
  MESA.TRACTION_PANELS = {
    fcSprint: function (d) {
      var s = fcStats(d), due = rows(d, "contatos").filter(function (r) { return r.followup && r.followup <= today() && ["Ganho", "Perdido"].indexOf(r.status) === -1; });
      return '<div class="tpanel"><h4>Progresso do sprint</h4>' + bar("Mapeados", s.total, num(d.meta_mapear)) + bar("Abordagens", s.abordados, num(d.meta_abordagens)) + bar("Conversas", s.conversas, num(d.meta_conversas)) + bar("Vendas / pilotos", s.ganhos, num(d.meta_vendas)) +
        '<p class="small muted">Calculado a partir do tracker abaixo. Sinais: ' + SINAL.slice(1).map(function (k) { return esc(k.toLowerCase()) + " " + (s.sig[k] || 0); }).join(" · ") + "</p>" +
        (due.length ? '<p class="small"><b>Follow-ups vencidos ou para hoje:</b> ' + due.map(function (r) { return esc(r.nome || "sem nome"); }).join(", ") + "</p>" : "") + "</div>";
    },
    fcLearnings: function (d, env) {
      var f = wsd(env, "first"), s = fcStats(f);
      if (!s.total && !filled(f.aprendizados)) return '<div class="tpanel muted-panel"><h4>Aprendizados de First Customers</h4><p class="small muted">Ainda não há registros em First Customers. O GTM fica mais sólido depois de abordar clientes reais. <a href="' + env.base + 'ferramenta/first">Abrir First Customers</a></p></div>';
      return '<div class="tpanel"><h4>Aprendizados de First Customers</h4><p class="small">' + esc(fcLine(f)) + "</p>" + (filled(f.aprendizados) ? '<p class="small"><b>Síntese:</b> ' + esc(f.aprendizados) + "</p>" : "") +
        (s.objecoes.length ? '<p class="small"><b>Objeções:</b> ' + s.objecoes.slice(0, 4).map(function (o) { return esc(o.objecao) + (o.vezes ? " (" + esc(o.vezes) + "×)" : ""); }).join(" · ") + "</p>" : "") + '<a class="small" href="' + env.base + 'ferramenta/first">Editar em First Customers →</a></div>';
    },
    pipelineNow: function (d, env) {
      var s = fcStats(wsd(env, "first"));
      if (!s.total) return '<div class="tpanel muted-panel"><h4>Oportunidades atuais</h4><p class="small muted">As oportunidades registradas em First Customers aparecem aqui por status. <a href="' + env.base + 'ferramenta/first">Abrir First Customers</a></p></div>';
      return '<div class="tpanel"><h4>Oportunidades atuais (de First Customers)</h4><div class="pipe">' + STATUS_CONTATO.map(function (k) { return '<span><b>' + (s.by[k] || 0) + "</b>" + esc(k) + "</span>"; }).join("") + '</div><a class="small" href="' + env.base + 'ferramenta/first">Atualizar no tracker →</a></div>';
    },
    channelsRank: function (d) {
      var c = rows(d, "canais").filter(function (r) { return filled(r.canal); }).map(function (r) { var cost = { Baixo: 3, "Médio": 2, Alto: 1 }; return { r: r, score: (num(r.adequacao) || 0) + (num(r.potencial) || 0) + (cost[r.custo] || 0) + (cost[r.esforco] || 0) }; })
        .filter(function (x) { return x.r.anel !== "Descartado"; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 5);
      if (!c.length) return "";
      return '<div class="tpanel"><h4>Canais mais promissores pela sua avaliação</h4><ol class="small">' + c.map(function (x) { return "<li>" + esc(x.r.canal) + ' <span class="muted">(' + [x.r.adequacao && "adequação " + x.r.adequacao, x.r.potencial && "potencial " + x.r.potencial, x.r.custo && "custo " + x.r.custo.toLowerCase()].filter(Boolean).map(esc).join(", ") + ")</span></li>"; }).join("") + '</ol><p class="small muted">Soma simples da sua avaliação (adequação + potencial + custo e esforço baixos). Use para escolher o anel do meio.</p></div>';
    },
    dataSoFar: function (d, env) {
      var fc = fcLine(wsd(env, "first")), ch = chLine(wsd(env, "channels"));
      if (!fc && !ch) return "";
      return '<div class="tpanel"><h4>Dados já registrados em outras ferramentas</h4>' + (fc ? '<p class="small"><b>First Customers:</b> ' + esc(fc) + "</p>" : "") + (ch ? '<p class="small"><b>Canais:</b> ' + esc(ch) + "</p>" : "") + '<p class="small muted">Use esses números como linha de base ou valor atual no funil.</p></div>';
    },
    funnelViz: function (d) {
      var f = funnel(d), max = 0;
      f.rows.forEach(function (r) { max = Math.max(max, r.atual || 0, r.meta || 0); });
      if (!f.rows.length) return "";
      return '<div class="tpanel"><h4>Painel de tração</h4><div class="fviz">' + f.rows.map(function (r) {
        var w = max ? Math.max(2, Math.round((r.atual || 0) / max * 100)) : 0, m = max && r.meta ? Math.round(r.meta / max * 100) : null;
        return '<div class="frow' + (f.gargalo && f.gargalo.etapa === r.etapa ? " is-gargalo" : "") + '"><span class="fl">' + esc(r.etapa) + '</span><span class="ft"><i style="width:' + w + '%"></i>' + (m != null ? '<em style="left:' + m + '%" title="Meta"></em>' : "") + '</span><span class="fn">' + dec(r.atual, 2) + (r.meta != null ? " / " + dec(r.meta, 2) : "") + '</span><span class="fc">' + (r.conv != null ? pct(r.conv) : "") + "</span></div>";
      }).join("") + "</div>" + (f.gargalo ? '<p class="small"><b>Gargalo sugerido pelos números:</b> ' + esc(f.gargalo.etapa) + " (menor " + (f.gargalo.por === "meta" ? "atingimento da meta" : "conversão") + "). Confirme com o contexto antes de agir.</p>" : '<p class="small muted">Preencha “Atual” e “Meta” para ver conversões e o gargalo.</p>') + "</div>";
    },
    ueResult: function (d) {
      var ue = d.ue || {}, cs = { c: ueCalc(ue.c), b: ueCalc(ue.b), o: ueCalc(ue.o) };
      var line = function (label, k, f) { return "<tr><th>" + label + "</th>" + ["c", "b", "o"].map(function (s) { return "<td>" + f(cs[s][k]) + "</td>"; }).join("") + "</tr>"; };
      var sens = ueSensitivity(ue.b || {}), warn = cs.b.mu != null && cs.b.mu <= 0 ? '<p class="small bad">A margem de contribuição do cenário base é zero ou negativa: cada venda aumenta o prejuízo.</p>' : "";
      return '<div class="tpanel"><h4>Resultados por cenário</h4><div class="table-scroll"><table class="ttable"><thead><tr><th></th><th>Conservador</th><th>Base</th><th>Otimista</th></tr></thead><tbody>' +
        line("Receita líquida por unidade", "liq", brl) + line("Margem de contribuição", "mu", brl) + line("Margem (%)", "mpct", pct) + line("Margem mensal por cliente", "mmes", brl) + line("CAC", "cac", brl) + line("Payback (meses)", "payback", dec) + line("Vida média (meses, cenário)", "vida", dec) + line("LTV (cenário)", "ltv", brl) + line("LTV ÷ CAC (cenário)", "ltvcac", dec) +
        "</tbody></table></div>" + warn + (sens && sens.list.length ? '<h4 style="margin-top:14px">Sensibilidade do cenário base</h4><ul class="small">' + sens.list.map(function (t, i) { return "<li" + (i === 0 ? ' class="hot"' : "") + ">" + esc(t.label) + ": " + (sens.metric === "payback" ? "payback de " + dec(t.from) + " para " + dec(t.to) + " meses" : "margem mensal de " + brl(t.from) + " para " + brl(t.to)) + (i === 0 ? " <b>· variável mais sensível</b>" : "") + "</li>"; }).join("") + "</ul>" : "") +
        '<p class="small muted">Cálculos a partir dos seus números. LTV só aparece com retenção declarada e é sempre um cenário.</p></div>';
    },
    tractionReview: function (d, env) {
      return '<div class="tpanel"><h4>Revisão consolidada das ferramentas anteriores</h4><dl class="rlist">' + reviewLines(env).map(function (l) { return "<dt>" + esc(l[0]) + "</dt><dd>" + esc(l[1]) + "</dd>"; }).join("") + '</dl><p class="small muted">Atualizado automaticamente. Para mudar um número, edite na ferramenta de origem.</p></div>';
    }
  };

  /* ---------------- ações das listas ---------------- */
  function push(d, id, list, key) { d[id] = rows(d, id).slice(); var have = {}; d[id].forEach(function (r) { have[(r[key] || "").toLowerCase()] = 1; }); var n = 0; list.forEach(function (r) { if (!have[(r[key] || "").toLowerCase()]) { r._id = uid(); d[id].push(r); n++; } }); return n; }
  MESA.TRACTION_ACTIONS = {
    defaultStages: function (d) { return push(d, "etapas", [
      { etapa: "Contato", entrada: "Potencial cliente do ICP identificado", saida: "Aceitou conversar", registro: "Origem e quem apresentou" },
      { etapa: "Descoberta", entrada: "Conversa marcada", saida: "Dor confirmada e decisor identificado", registro: "Dor nas palavras do cliente" },
      { etapa: "Demonstração / proposta de valor", entrada: "Decisor presente", saida: "Pedido de proposta", registro: "Critério de decisão do cliente" },
      { etapa: "Proposta", entrada: "Proposta enviada", saida: "Aceite ou motivo de perda", registro: "Valor, condições e objeções" },
      { etapa: "Fechamento / piloto", entrada: "Aceite", saida: "Contrato ou pagamento", registro: "Critério de sucesso combinado" }], "etapa") + " etapas sugeridas adicionadas. Ajuste ao seu processo."; },
    defaultQualif: function (d) { return push(d, "qualificacao", [
      { criterio: "Dor", pergunta: "Como vocês resolvem isso hoje e quanto custa?", positivo: "Descreve custo concreto", desqualifica: "Não reconhece o problema" },
      { criterio: "Decisor", pergunta: "Quem mais participa dessa decisão?", positivo: "Decisor na conversa ou próximo passo com ele", desqualifica: "Ninguém decide ou sem acesso" },
      { criterio: "Orçamento", pergunta: "Já investem algo para resolver isso?", positivo: "Há gasto ou verba", desqualifica: "Nenhuma disposição de pagar" },
      { criterio: "Momento", pergunta: "O que faria isso ser prioridade agora?", positivo: "Gatilho com data", desqualifica: "“Talvez no ano que vem”" }], "criterio") + " critérios adicionados."; },
    importObjections: function (d, env) { var src = rows(wsd(env, "first"), "objecoes"); if (!src.length) return "Não há objeções registradas em First Customers."; return push(d, "objecoes", src.map(function (o) { return { objecao: o.objecao, resposta: o.resposta || "", prova: o.aprendizado || "" }; }), "objecao") + " objeção(ões) importada(s) de First Customers."; },
    importLosses: function (d, env) { var src = rows(wsd(env, "first"), "contatos").filter(function (r) { return r.status === "Perdido"; }); if (!src.length) return "Não há oportunidades marcadas como perdidas em First Customers."; return push(d, "perdas", src.map(function (r) { return { oportunidade: r.nome, etapa: "", motivo: "", aprendizado: r.notas || "" }; }), "oportunidade") + " perda(s) importada(s)."; },
    importGtmChannels: function (d, env) { var g = ((wsd(env, "gtm").gtm || {}).channels || {}).texto; if (!filled(g)) return "Os canais ainda não foram definidos no Go-to-Market."; var parts = g.split(/[,;\n·]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 1 && x.length < 120; }); return push(d, "canais", parts.map(function (x) { return { canal: x, anel: "Meio (testar)" }; }), "canal") + " canal(is) importado(s) do GTM."; },
    addBullseye: function (d) { return push(d, "canais", BULLSEYE.map(function (x) { return { canal: x, anel: "Externo (ideia)" }; }), "canal") + " canais do Bullseye adicionados ao anel externo."; },
    sortIce: function (d) { d.experimentos = rows(d, "experimentos").slice().sort(function (a, b) { return (ice(b) || -1) - (ice(a) || -1); }); return "Experimentos ordenados por ICE."; },
    suggestFunnel: function (d, env) { var tipo = ctxOf(env).tipo || "outro", f = FUNNELS[tipo] || FUNNELS.outro; return push(d, "funil", f.map(function (x, i) { return { etapa: x[0], metrica: x[0], formula: x[1], tipo: i === 0 ? "Atividade" : "Resultado" }; }), "etapa") + " etapas sugeridas para o modelo " + (ctxItem(ctxOf(env), "tipo", "").value || "escolhido") + "."; },
    ueFromChannels: function (d, env) { var s = chStats(wsd(env, "channels")); if (!s.custo || !s.clientes) return "Os experimentos de canais ainda não têm custo real e clientes registrados."; d.ue = d.ue || {}; d.ue.b = Object.assign({}, d.ue.b, { gasto: s.custo, novos: s.clientes }); d.ue_origem = Object.assign({}, d.ue_origem, { gasto: "Observado", novos: "Observado" }); return "Cenário base atualizado com " + brl(s.custo) + " e " + s.clientes + " cliente(s) dos testes de canais."; },
    ueFromOffer: function (d, env) { var f = wsd(env, "first"), g = ((wsd(env, "gtm").gtm || {}).offer || {}).texto || "", txt = [g, f.preco].join(" "); var m = txt.match(/R\$\s*([\d.,]+)/); if (!m) return "Não encontrei um preço em R$ na oferta do GTM ou de First Customers."; d.ue = d.ue || {}; d.ue.b = Object.assign({}, d.ue.b, { preco: num(m[1]) }); return "Preço do cenário base preenchido com " + brl(num(m[1])) + " (da oferta registrada)."; },
    ueCopyBase: function (d) { var b = (d.ue || {}).b; if (!b) return "Preencha o cenário base primeiro."; d.ue.c = Object.assign({}, b, d.ue.c || {}); d.ue.o = Object.assign({}, b, d.ue.o || {}); return "Campos vazios dos cenários conservador e otimista preenchidos com o base. Ajuste-os."; }
  };

  /* ---------------- conclusão, entregável e prompt ---------------- */
  MESA.tractionChecks = function (tool, d, env) { return tool.done.map(function (c) { return { label: c.label, ok: !!c.test(d || {}, env) }; }); };

  MESA.tractionDeliverable = function (tool, d, env) {
    d = d || {};
    var out = ["# " + tool.title, "", "Projeto: " + env.p.name + " · Zero to First · Fase 3, Traction · ferramenta " + tool.n + " de 7", ""];
    var extra = tool.deliver ? tool.deliver(d, env) : ""; if (extra) out.push(extra);
    tool.sections.forEach(function (sec) {
      if (sec.type === "fields") {
        var f = sec.fields.filter(function (x) { return filled(d[x.id]); });
        if (!f.length) return;
        out.push("## " + sec.title); f.forEach(function (x) { var v = String(d[x.id]); out.push("**" + x.label + ":** " + (v.indexOf("\n") !== -1 ? "\n" + v : v)); }); out.push("");
      } else if (sec.type === "list") {
        var list = rows(d, sec.id); if (!list.length) return;
        out.push("## " + sec.title); out.push(mdTable(sec.columns.map(function (c) { return c.computed ? { label: c.label, get: c.computed } : { label: c.label, id: c.id }; }), list));
      } else if (sec.type === "model") {
        if (filled(ctxOf(env).tipo)) out.push("**Modelo de negócio:** " + ctxItem(ctxOf(env), "tipo", "").value + "\n");
      }
    });
    var q = (tool.quality || []).filter(function (x, i) { return (d._q || {})[i]; });
    if (q.length) out.push("## Critérios de qualidade atendidos\n" + q.map(function (x) { return "- " + x; }).join("\n") + "\n");
    if (filled(d._acao)) out.push("## Próxima ação\n" + d._acao + (d._acao_data ? " (até " + d._acao_data.split("-").reverse().join("/") + ")" : "") + "\n");
    return out.join("\n");
  };

  MESA.tractionPrompt = function (tool, d, env, variant) {
    var c = ctxOf(env), lines = ["# " + tool.name + " · apoio de IA", "", "## Seu papel",
      "Você é copiloto de um(a) empreendedor(a) que usa o método Zero to First, na Fase 3 (Traction): transformar o que foi aprendido em Discovery e Validation em um processo inicial de aquisição, conversão e retenção. Seu papel é apoiar análise, síntese e geração de alternativas, sem substituir evidências reais de clientes.", "", "## Contexto do projeto", "- Projeto: " + env.p.name];
    MESA.CONTEXT_FIELDS.forEach(function (f) { if (filled(c[f.id])) lines.push("- " + f.label + ": " + (f.id === "tipo" ? ctxItem(c, "tipo", "").value : c[f.id])); });
    var reuse = (tool.reuse ? tool.reuse(env) : []).filter(function (r) { return filled(r.value); });
    if (reuse.length) { lines.push("", "## Decisões e dados das etapas anteriores"); reuse.forEach(function (r) { lines.push("- " + r.label + ": " + r.value); }); }
    lines.push("", "## O que já foi preenchido nesta ferramenta", MESA.tractionDeliverable(tool, d, env).split("\n").slice(3).join("\n").trim() || "(nada ainda)");
    lines.push("", "## Tarefa", (variant || tool.ai[0]).task, "", "## Regras",
      "- Responda em português do Brasil, de forma direta e prática.",
      "- Separe fatos registrados, hipóteses e recomendações. Marque suposições com [hipótese] e números estimados com [estimativa].",
      "- Não invente dados, benchmarks, empresas ou fontes. Se faltar informação, diga qual e como coletá-la.",
      "- Considere o modelo de negócio e o estágio da startup. Não prometa resultados, product-market fit ou escala.",
      "- Termine com as 3 próximas ações concretas.");
    return lines.join("\n");
  };

  /* Registro: as ferramentas de Traction entram no catálogo geral */
  MESA.TRACTION = T;
  MESA.TRACTION_BY = {}; T.forEach(function (t) { MESA.TRACTION_BY[t.id] = t; t.workspace = true; });
  MESA.UE_VARS = UE_VARS;
  MESA.ueCalc = ueCalc;
  MESA.TRACTION_SIGNALS = { fcStats: fcStats, chStats: chStats };
  if (MESA.TOOLS) T.forEach(function (t) { if (!MESA.TOOLS.some(function (x) { return x.id === t.id; })) MESA.TOOLS.push(t); });
})();
