/* =============================================================
   MESA DE TRABALHO · radar
   1. Próximos movimentos: sugestões a partir do estado do projeto.
   2. Curadoria: temas, métodos, armadilhas e provocações, cruzados
      com o contexto do projeto (palavras-chave, lente e tipo).
   3. Sinais da IA: a pessoa roda o prompt de radar e cola o
      resultado; cada item vira um sinal salvo no projeto.
   Edite a curadoria em MESA.RADAR_LIBRARY (sem dados inventados:
   temas e perguntas, não estatísticas).
   ============================================================= */
window.MESA = window.MESA || {};

MESA.RADAR_LIBRARY = [
  // Métodos
  { t: "Mom Test: elogio não é evidência", type: "método", lens: ["entender", "validar"], tags: ["entrevista", "cliente", "validação", "pesquisa"], body: "Pergunte sobre o que a pessoa fez da última vez, não sobre o que ela faria. Compromisso (tempo, dinheiro, reputação) vale mais que entusiasmo." },
  { t: "Forças do progresso (JTBD)", type: "método", lens: ["entender"], tags: ["cliente", "comportamento", "troca", "adoção"], body: "Mudança acontece quando o empurrão do problema e a atração da solução superam a ansiedade e o hábito. Qual dessas forças o seu projeto está ignorando?" },
  { t: "Smoke test antes de construir", type: "método", lens: ["experimentar"], tags: ["mvp", "demanda", "landing", "pré-venda"], body: "Uma página com proposta clara e um botão de compromisso mede interesse real antes de qualquer linha de código." },
  { t: "Concierge: faça à mão primeiro", type: "método", lens: ["experimentar"], tags: ["mvp", "serviço", "operação", "b2b"], body: "Entregar o resultado manualmente para poucos clientes ensina o que automatizar e o que ninguém valoriza." },
  { t: "Critério de parada definido antes", type: "método", lens: ["experimentar", "validar"], tags: ["experimento", "métrica", "decisão"], body: "Escreva o que te faria parar antes de olhar os dados. Depois do teste, todo resultado parece 'promissor'." },
  { t: "Beachhead: dominar um nicho pequeno", type: "método", lens: ["explorar"], tags: ["segmento", "nicho", "go-to-market", "cliente"], body: "Um segmento pequeno, com dor aguda e boca a boca, costuma ser melhor ponto de partida que um mercado grande e difuso." },
  { t: "Working Backwards", type: "método", lens: ["explorar"], tags: ["proposta de valor", "produto", "promessa"], body: "Escrever o anúncio antes de construir força clareza sobre a promessa e expõe o que ainda não tem evidência." },
  { t: "Disposição a pagar se testa, não se pergunta", type: "método", lens: ["validar", "avancar"], tags: ["preço", "receita", "pricing", "modelo"], body: "Ofereça preço real em pré-venda, piloto pago ou carta de intenção. 'Eu pagaria' em entrevista é opinião." },
  { t: "Unit economics cedo, mesmo que aproximado", type: "método", lens: ["avancar"], tags: ["modelo", "receita", "custo", "cac", "margem"], body: "Uma conta de guardanapo de CAC, ticket e margem mostra cedo se o modelo fecha ou se depende de escala que talvez não venha." },

  // Armadilhas
  { t: "Construir antes de entender", type: "armadilha", lens: ["entender", "experimentar"], tags: ["produto", "mvp", "tecnologia", "app", "plataforma"], body: "Construir ficou barato. Escolher o que construir continua caro. Se ainda não há evidência de dor, o próximo passo raramente é código." },
  { t: "Amostra de amigos", type: "armadilha", lens: ["entender", "validar"], tags: ["entrevista", "pesquisa", "validação"], body: "Conhecidos tendem a ser gentis. Busque pessoas do segmento que não te devem nada." },
  { t: "Métrica de vaidade", type: "armadilha", lens: ["validar"], tags: ["métrica", "crescimento", "marketing", "seguidores"], body: "Visitas, curtidas e cadastros sem uso dizem pouco. Prefira comportamentos que custam algo ao cliente." },
  { t: "Piloto eterno", type: "armadilha", lens: ["avancar", "validar"], tags: ["piloto", "corporativo", "inovação", "b2b"], body: "Pilotos sem critério de saída e sem dono depois do teste tendem a nunca virar decisão. Defina antes o que acontece se der certo." },
  { t: "Solução procurando problema", type: "armadilha", lens: ["entender", "explorar"], tags: ["tecnologia", "ia", "inteligência artificial", "inovação"], body: "Começar pela tecnologia é comum em projetos de inovação. Volte ao problema: quem sofre, quanto e o que já tenta fazer?" },

  // Tendências (temas para investigar, sem números)
  { t: "IA aplicada a operações de pequenos negócios", type: "tema", lens: ["entender", "explorar"], tags: ["ia", "inteligência artificial", "automação", "pme", "pequenos negócios", "saas", "operação"], body: "Ferramentas de IA reduziram o custo de automatizar tarefas administrativas. Que parte da dor do seu cliente é trabalho repetitivo que poderia ser automatizado?" },
  { t: "Agentes de IA e trabalho assistido", type: "tema", lens: ["explorar", "experimentar"], tags: ["ia", "agente", "automação", "produtividade", "software"], body: "Produtos estão saindo de 'ferramenta que o usuário opera' para 'agente que faz por ele'. Seu cliente quer controle ou quer o resultado pronto?" },
  { t: "Pagamentos instantâneos e Open Finance no Brasil", type: "tema", lens: ["explorar", "avancar"], tags: ["pagamento", "pix", "financeiro", "fintech", "cobrança", "crédito", "banco"], body: "Pix e Open Finance mudaram como empresas cobram e acessam dados financeiros. Isso facilita ou ameaça o modelo do seu projeto?" },
  { t: "Economia da longevidade", type: "tema", lens: ["entender"], tags: ["saúde", "idoso", "envelhecimento", "cuidado", "bem-estar", "família"], body: "O envelhecimento da população cria demandas novas em saúde, finanças, moradia e cuidado. Seu cliente ou seu mercado é afetado por isso?" },
  { t: "Vertical SaaS e software de nicho", type: "tema", lens: ["explorar"], tags: ["saas", "software", "nicho", "b2b", "gestão", "pme"], body: "Softwares feitos para um setor específico tendem a vencer genéricos quando entendem o fluxo do cliente a fundo. O quão específico é o seu fluxo?" },
  { t: "Comércio conversacional (WhatsApp)", type: "tema", lens: ["explorar", "experimentar"], tags: ["whatsapp", "venda", "atendimento", "varejo", "comunicação", "marketing"], body: "No Brasil, muita venda e atendimento acontecem em conversa. Um MVP via WhatsApp pode testar demanda sem app." },
  { t: "ESG e transição energética", type: "tema", lens: ["entender", "explorar"], tags: ["energia", "sustentabilidade", "esg", "clima", "carbono", "indústria"], body: "Metas de descarbonização e reporte criam novas obrigações e orçamentos nas empresas. Existe um comprador com prazo e verba para isso?" },
  { t: "Creator economy e comunidades", type: "tema", lens: ["explorar", "avancar"], tags: ["comunidade", "conteúdo", "creator", "educação", "audiência", "marketing"], body: "Audiência e comunidade viraram canal de distribuição. Quem já reúne o seu cliente e poderia ser parceiro?" },
  { t: "Educação baseada em aplicação", type: "tema", lens: ["explorar"], tags: ["educação", "aprendizagem", "curso", "treinamento", "edtech", "capacitação"], body: "Programas que geram entregável aplicado tendem a provar valor melhor que conteúdo. O seu projeto mede aplicação ou só consumo?" },
  { t: "Inovação aberta e corporate venturing", type: "tema", lens: ["avancar"], tags: ["corporativo", "inovação", "startup", "parceria", "b2b", "empresa"], body: "Grandes empresas buscam startups para resolver desafios específicos. Seu projeto poderia nascer de um desafio corporativo com patrocinador definido?" },
  { t: "Regulação como gatilho de demanda", type: "tema", lens: ["entender"], tags: ["regulação", "lei", "compliance", "lgpd", "saúde", "financeiro"], body: "Mudanças regulatórias criam prazos e obrigações, ou seja, urgência de compra. Há alguma regra nova afetando o seu cliente?" },

  // Provocações
  { t: "Quem já está pagando para resolver isso?", type: "pergunta", lens: ["entender", "validar"], tags: ["cliente", "preço", "concorrência", "problema"], body: "Dinheiro e tempo já gastos com alternativas são o melhor sinal de dor. Liste os 'concorrentes' improvisados: planilha, pessoa, gambiarra." },
  { t: "O que você faria com metade do prazo?", type: "pergunta", lens: ["experimentar"], tags: ["mvp", "experimento", "prazo"], body: "Cortar o prazo pela metade força o experimento a focar no aprendizado essencial." },
  { t: "Que evidência mudaria sua opinião?", type: "pergunta", lens: ["validar", "avancar"], tags: ["decisão", "hipótese", "viés"], body: "Se nenhuma evidência te faria desistir, você está defendendo uma ideia, não testando uma hipótese." },
  { t: "Quem decide e quem usa são a mesma pessoa?", type: "pergunta", lens: ["explorar"], tags: ["b2b", "venda", "cliente", "corporativo", "decisão"], body: "Em B2B e em projetos internos, o usuário raramente é quem aprova. Mapeie quem sente a dor, quem paga e quem pode vetar." },
  { t: "O que precisa ser verdade?", type: "pergunta", lens: ["avancar"], tags: ["estratégia", "decisão", "risco"], body: "Liste as condições que precisam ser verdade para o projeto dar certo e teste primeiro a menos provável." }
];

function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

/* Cruza a curadoria com o projeto e devolve os itens mais relevantes */
MESA.matchRadar = function (project, counts, limit) {
  var ctxText = norm(Object.keys(project.context || {}).map(function (k) { return project.context[k]; }).join(" ") + " " + project.name);
  if (project.kind === "inovacao") ctxText += " corporativo inovacao empresa b2b";
  var focus = project.focus;
  return MESA.RADAR_LIBRARY.map(function (item) {
    var score = 0, hits = [];
    item.tags.forEach(function (tag) {
      var re = new RegExp("(^|[^a-z0-9])" + norm(tag).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)");
      if (re.test(ctxText)) { score += 3; hits.push(tag); }
    });
    if (item.lens.indexOf(focus) !== -1) score += 2;
    // lentes ainda sem artefatos ganham peso (não linear: aponta lacunas)
    item.lens.forEach(function (l) { if (!counts[l]) score += 1; });
    return { item: item, score: score, hits: hits };
  }).sort(function (a, b) { return b.score - a.score; }).slice(0, limit || 6);
};

/* Sugestões de próximos movimentos a partir do estado do projeto */
MESA.nextMoves = function (project, artifacts, board, pedidos, workspaces) {
  var ctx = project.context || {};
  var moves = [];
  workspaces = workspaces || [];
  // Projeto sem nenhuma ferramenta usada: o primeiro passo é a ferramenta recomendada para o momento dele
  if (MESA.recommendTool && !artifacts.some(function (a) { return a.tool_id; }) && !workspaces.length) {
    var rec = MESA.recommendTool(project, artifacts, workspaces), rt = rec && MESA.TOOLS.filter(function (t) { return t.id === rec; })[0];
    if (rt) moves.push({ text: "Comece por " + rt.name + ": " + rt.desc.charAt(0).toLowerCase() + rt.desc.slice(1), action: { type: "tool", id: rt.id } });
  }
  // Fase 3 (Traction): segue a ordem pedagógica das sete ferramentas
  if (MESA.TRACTION) {
    var wsBy = {}; workspaces.forEach(function (w) { wsBy[w.tool_id] = w; });
    var inTraction = workspaces.length || ["vender", "repetir"].indexOf(project.focus) !== -1;
    var validated = artifacts.some(function (a) { return a.stage === "validar" || a.stage === "avancar"; }) || board.some(function (b) { return b.kind === "hipotese" && b.status === "validado"; });
    if (inTraction) {
      var cur = MESA.TRACTION.filter(function (t) { return !wsBy[t.id] || wsBy[t.id].status !== "concluido"; })[0];
      if (cur) moves.push(wsBy[cur.id]
        ? { text: "Continue " + cur.title.replace(" — ", ": ") + ".", action: { type: "tool", id: cur.id } }
        : { text: "Próximo passo da tração: " + cur.title.replace(" — ", ": ") + ".", action: { type: "tool", id: cur.id } });
      else moves.push({ text: "As sete ferramentas de tração estão concluídas. Mantenha a rotina de revisão e planeje o próximo ciclo.", action: { type: "tool", id: "review" } });
    } else if (validated && !ctx.tipo) {
      moves.push({ text: "Há evidências de validação. Defina o modelo de negócio e comece a Fase 3 por First Customers.", action: { type: "tool", id: "first" } });
    } else if (validated) {
      moves.push({ text: "Há evidências de validação: hora de conquistar os primeiros clientes (Fase 3).", action: { type: "tool", id: "first" } });
    }
  }
  var used = {}; artifacts.forEach(function (a) { if (a.tool_id) used[a.tool_id] = true; });
  var byKind = function (k, st) { return board.filter(function (b) { return b.kind === k && (!st || st.indexOf(b.status) !== -1); }); };

  if (!ctx.problema) moves.push({ text: "Escreva o problema na linguagem do cliente.", action: { type: "context" } });
  if (!ctx.persona) moves.push({ text: "Defina quem sente a dor: cliente ou persona.", action: { type: "context" } });
  if (!used.roteiro && !used.analisador) moves.push({ text: "Prepare entrevistas: comece pelo roteiro.", action: { type: "tool", id: "roteiro" } });
  if (used.roteiro && !used.analisador) moves.push({ text: "Fez entrevistas? Cole as notas no analisador.", action: { type: "tool", id: "analisador" } });
  if (!used.csd && (ctx.problema || artifacts.length >= 2)) moves.push({ text: "Organize o que você sabe e supõe na Matriz CSD.", action: { type: "tool", id: "csd" } });
  var hipAbertas = byKind("hipotese", ["aberto"]);
  if (hipAbertas.length && !byKind("experimento").length) moves.push({ text: "Você tem " + hipAbertas.length + " hipótese(s) aberta(s) sem experimento. Escolha um MVP.", action: { type: "tool", id: "mvp" } });
  var exps = byKind("experimento", ["aberto", "testando"]);
  if (exps.length && !used.criterios) moves.push({ text: "Defina critérios de saída antes de rodar o experimento.", action: { type: "tool", id: "criterios" } });
  if (byKind("experimento", ["testando"]).length && !used.bml) moves.push({ text: "Experimento em andamento: registre o que aprendeu.", action: { type: "tool", id: "bml" } });
  if (byKind("evidencia").length >= 3 && !used.csd2) moves.push({ text: "Com " + byKind("evidencia").length + " evidências, atualize a CSD.", action: { type: "tool", id: "csd2" } });
  if (byKind("hipotese", ["validado"]).length && !used.modelo) moves.push({ text: "Há hipóteses validadas: estruture o modelo de negócio.", action: { type: "tool", id: "modelo" } });
  if (artifacts.length >= 4 && !used.stress) moves.push({ text: "Teste a solidez do projeto com o stress test.", action: { type: "tool", id: "stress" } });
  if (artifacts.length >= 3 && !pedidos.length) moves.push({ text: "Quer uma segunda opinião? Peça feedback ao Miguel.", action: { type: "tab", id: "mentoria" } });
  if (!moves.length) moves.push({ text: "Rode o radar de sinais para trazer referências novas ao projeto.", action: { type: "tab", id: "radar" } });
  var seenMove = {};
  moves = moves.filter(function (m) { var k = m.action.type + ":" + (m.action.id || ""); if (seenMove[k]) return false; seenMove[k] = 1; return true; });
  return moves.slice(0, 3);
};

/* Divide a resposta colada do radar em sinais individuais */
MESA.parseSignals = function (text) {
  var out = [], cur = null;
  (text || "").split(/\r?\n/).forEach(function (line) {
    var m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/) || line.match(/^\s*#{2,4}\s+(.*)$/);
    if (m && /\S/.test(m[1]) && (/^\*\*/.test(m[1]) || /^#/.test(line.trim()) || !cur || cur.body)) {
      if (cur) out.push(cur);
      var raw = m[1].trim(); var title = raw, body = "";
      var b = raw.match(/^\*\*(.+?)\*\*[:\s.\-–—]*(.*)$/);
      if (b) { title = b[1]; body = b[2]; }
      cur = { title: title.replace(/[*#]/g, "").trim().slice(0, 280), body: body };
    } else if (cur && line.trim()) {
      cur.body = (cur.body ? cur.body + "\n" : "") + line.trim();
    }
  });
  if (cur) out.push(cur);
  if (!out.length && text.trim()) out.push({ title: "Sinais do radar", body: text.trim() });
  return out.filter(function (s) { return s.title; }).slice(0, 30);
};
