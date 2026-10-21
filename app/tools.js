/* =============================================================
   MESA DE TRABALHO · catálogo de ferramentas
   Cada ferramenta monta um prompt com o contexto do projeto.
   A pessoa usa o prompt no Claude, ChatGPT ou Gemini e cola a
   resposta de volta, que vira um artefato do projeto.
   ============================================================= */
window.MESA = window.MESA || {};

MESA.LENSES = [
  { id: "entender", name: "Entender", q: "Qual problema real existe aqui?" },
  { id: "explorar", name: "Explorar", q: "Que hipóteses valem ser testadas?" },
  { id: "experimentar", name: "Experimentar", q: "Qual o menor teste que ensina algo?" },
  { id: "validar", name: "Validar", q: "O que a evidência está dizendo?" },
  { id: "avancar", name: "Avançar", q: "Seguir, ajustar ou parar?" }
];

/* Campos de contexto: preenchidos uma vez, usados por todas as ferramentas */
MESA.CONTEXT_FIELDS = [
  { id: "ideia", label: "Território / ideia", hint: "Em uma frase: qual é a ideia ou onde ela atua?", ph: "Ex.: gestão financeira para clínicas veterinárias" },
  { id: "problema", label: "Problema", hint: "A dor que você acredita existir, na linguagem do cliente.", ph: "Ex.: clínicas perdem receita por não cobrar procedimentos e não enxergam o caixa do mês", long: true },
  { id: "mercado", label: "Mercado / setor", hint: "Setor amplo em que a ideia se encaixa.", ph: "Ex.: saúde animal, SaaS vertical" },
  { id: "persona", label: "Cliente / persona", hint: "Quem sente a dor. Detalhes concretos.", ph: "Ex.: dona de clínica com 2 a 5 funcionários", long: true },
  { id: "beachhead", label: "Segmento inicial (beachhead)", hint: "O nicho por onde começar.", ph: "Ex.: clínicas de bairro em São Paulo capital" },
  { id: "jornada", label: "Como resolvem hoje", hint: "Alternativas atuais, mesmo que ruins.", ph: "Ex.: planilha, WhatsApp e maquininha; fecha o caixa à mão", long: true },
  { id: "solucao", label: "Hipótese de solução", hint: "Não precisa estar pronta.", ph: "Ex.: app que registra procedimento e cobra no atendimento", long: true },
  { id: "modelo", label: "Como gera valor / receita", hint: "Quem paga, quanto e por quê (hipótese).", ph: "Ex.: assinatura mensal por clínica" },
  { id: "evidencias", label: "O que já sabemos", hint: "Entrevistas, números, testes já feitos.", ph: "Ex.: 6 entrevistas; 4 citaram perda de cobrança", long: true },
  { id: "org", label: "Contexto da organização", hint: "Para projetos de inovação em empresas: área, patrocinador, restrições.", ph: "Ex.: área de novos negócios; patrocínio da diretoria comercial; piloto de 90 dias", long: true, kind: "inovacao" }
];

MESA.TOOLS = [
  /* ---------------- ENTENDER ---------------- */
  {
    id: "territorio", lens: "entender", name: "Território de oportunidade",
    desc: "Mapeia oportunidades dentro de um território antes de escolher uma ideia.",
    uses: ["ideia", "mercado", "persona"],
    extra: [{ id: "ativos", label: "O que você traz", ph: "Experiências, acessos, conhecimentos ou ativos que podem dar vantagem", long: true }],
    task: "Mapeie de 8 a 12 oportunidades dentro deste território. Para cada uma, diga quem sofre, qual sinal de dor existe, por que isso importa agora e que vantagem este time teria. Depois, escolha as 3 mais promissoras e justifique.",
    format: "1. Tabela: oportunidade | quem sofre | sinal de dor | por que agora | vantagem do time.\n2. Top 3, com justificativa curta.\n3. Para cada uma do top 3: as 3 perguntas que precisam ser respondidas com clientes reais.",
    board: "pergunta"
  },
  {
    id: "mercado", lens: "entender", name: "Avaliação de mercado",
    desc: "Scorecard da oportunidade: dor, poder de compra, acesso, crescimento e concorrência.",
    uses: ["ideia", "problema", "mercado", "persona", "beachhead"],
    task: "Avalie a oportunidade com um scorecard de 1 a 5 em: intensidade da dor, poder de compra, facilidade de acesso ao cliente, crescimento do mercado, intensidade competitiva e encaixe com o time. Faça uma estimativa de mercado top-down e bottom-up, deixando claro o que é estimativa.",
    format: "1. Scorecard em tabela: critério | nota | justificativa | evidência a buscar.\n2. Estimativa TAM/SAM/SOM com premissas explícitas, marcada como [estimativa].\n3. Veredito: o que sustenta e o que enfraquece a oportunidade.\n4. As 5 evidências mais importantes para confirmar o scorecard.",
    board: "hipotese"
  },
  {
    id: "jtbd", lens: "entender", name: "Jobs to Be Done",
    desc: "Que progresso o cliente está tentando fazer e o que o impede.",
    uses: ["problema", "persona", "jornada"],
    task: "Descreva o job principal que este cliente está tentando realizar, os jobs funcionais, emocionais e sociais relacionados, e as forças do progresso: o que empurra para mudar, o que atrai para algo novo, as ansiedades e os hábitos que seguram.",
    format: "1. Job principal em uma frase ('Quando..., quero..., para...').\n2. Jobs funcionais, emocionais e sociais.\n3. Quadro das 4 forças: empurrão, atração, ansiedade, hábito.\n4. 8 a 12 resultados desejados, no formato 'minimizar/aumentar ... ao ...'.\n5. O que precisa ser confirmado em entrevista.",
    board: "hipotese"
  },
  {
    id: "roteiro", lens: "entender", name: "Roteiro de entrevista",
    desc: "Perguntas que coletam evidência, não opinião (princípios do Mom Test).",
    uses: ["problema", "persona", "beachhead", "jornada"],
    extra: [{ id: "objetivo", label: "Objetivo desta rodada", ph: "Ex.: entender como fecham o caixa e quanto perdem por cobrança esquecida" }],
    task: "Monte um roteiro de entrevista de 30 a 40 minutos seguindo os princípios do Mom Test: perguntar sobre comportamentos passados e concretos, nunca sobre a ideia ou sobre o futuro, e buscar compromissos reais.",
    format: "1. Abertura (2 min).\n2. Perguntas principais, agrupadas por tema, com o porquê de cada uma.\n3. Perguntas de aprofundamento ('me conta a última vez que...').\n4. Perguntas a evitar, com o motivo.\n5. Como encerrar pedindo um compromisso (indicação, piloto, pré-venda).\n6. Modelo de registro para preencher depois de cada entrevista.",
    board: "pergunta"
  },
  {
    id: "analisador", lens: "entender", name: "Analisador de entrevistas",
    desc: "Separa evidência real de elogio educado nas suas anotações ou transcrições.",
    uses: ["problema", "persona", "solucao"],
    extra: [{ id: "transcricao", label: "Anotações ou transcrição", ph: "Cole aqui as notas de uma ou mais entrevistas", long: true, required: true }],
    task: "Analise as entrevistas abaixo com o rigor do Mom Test. Separe fatos sobre comportamento passado, opiniões, elogios e hipóteses do entrevistador. Identifique dores com intensidade, gastos atuais e sinais de compromisso.",
    format: "1. Fatos (com citação literal quando houver).\n2. Opiniões e elogios (o que NÃO conta como evidência).\n3. Dores, com intensidade de 1 a 5 e frequência.\n4. Sinais de compromisso ou ausência deles.\n5. O que isso confirma, enfraquece ou muda nas hipóteses atuais.\n6. Próximas perguntas para a próxima entrevista.",
    board: "evidencia"
  },
  {
    id: "journey", lens: "entender", name: "Journey Map",
    desc: "Onde exatamente a dor acontece na jornada do cliente.",
    uses: ["problema", "persona", "jornada"],
    task: "Mapeie a jornada atual do cliente ao lidar com este problema, do gatilho ao resultado, mostrando ações, pensamentos, emoções e pontos de dor.",
    format: "Tabela por etapa: etapa | o que faz | o que pensa | emoção | dor (1 a 5) | oportunidade. Depois, os 3 momentos críticos e por que importam.",
    board: "hipotese"
  },

  /* ---------------- EXPLORAR ---------------- */
  {
    id: "beachhead", lens: "explorar", name: "Beachhead Market",
    desc: "Por qual segmento começar.",
    uses: ["ideia", "problema", "mercado", "persona"],
    task: "Segmente o mercado em 5 a 8 segmentos possíveis e avalie cada um por intensidade da dor, capacidade de pagar, acesso, tamanho suficiente, referência para outros segmentos e concorrência. Recomende um beachhead.",
    format: "1. Tabela comparativa dos segmentos.\n2. Beachhead recomendado e por quê.\n3. Perfil de cliente ideal (ICP) com critérios objetivos.\n4. O que faria você trocar de segmento.",
    board: "decisao"
  },
  {
    id: "csd", lens: "explorar", name: "Matriz CSD",
    desc: "O que você sabe, supõe e ainda não sabe.",
    uses: ["ideia", "problema", "persona", "solucao", "modelo", "evidencias"],
    task: "Organize o conhecimento do projeto em certezas (com evidência), suposições (acreditamos, sem prova) e dúvidas (não sabemos). Priorize as suposições pelo risco que representam e transforme as mais críticas em hipóteses testáveis.",
    format: "1. Três listas: Certezas | Suposições | Dúvidas.\n2. Suposições priorizadas por risco × impacto.\n3. As 3 suposições mais arriscadas reescritas como hipóteses: 'Acreditamos que [segmento] vai [comportamento] porque [motivo]. Saberemos que é verdade se [sinal].'",
    board: "hipotese"
  },
  {
    id: "problema", lens: "explorar", name: "Problem Statement",
    desc: "Qual problema, de quem, em que contexto.",
    uses: ["problema", "persona", "beachhead", "jornada", "evidencias"],
    task: "Escreva 3 versões de problem statement, critique cada uma e recomende a mais forte.",
    format: "1. Três versões no formato: 'Para [quem], que [contexto], o problema é [dor], porque [causa]. Hoje resolvem com [alternativa], que falha em [ponto].'\n2. Crítica de cada versão (clareza, especificidade, evidência).\n3. Versão recomendada.\n4. O que ainda falta provar.",
    board: "decisao"
  },
  {
    id: "importancia", lens: "explorar", name: "Importância × satisfação",
    desc: "Quais resultados estão mal atendidos: onde está a oportunidade.",
    uses: ["problema", "persona", "jornada", "evidencias"],
    task: "Liste de 10 a 15 resultados desejados pelo cliente e estime importância e satisfação atual (1 a 10), calculando a oportunidade como importância + max(importância − satisfação, 0). Deixe claro que as notas são estimativas até serem medidas com clientes.",
    format: "1. Tabela: resultado desejado | importância | satisfação | oportunidade | [estimativa].\n2. Os 3 resultados mais mal atendidos.\n3. Pesquisa curta (5 a 8 perguntas) para medir essas notas com clientes reais.",
    board: "hipotese"
  },
  {
    id: "resultados", lens: "explorar", name: "Resultados desejados",
    desc: "O que atacar primeiro.",
    uses: ["problema", "persona", "solucao"],
    task: "Escreva resultados desejados no formato 'Minimizar/Aumentar [métrica] ao [atividade]' e priorize por impacto no cliente e viabilidade de entrega.",
    format: "1. Lista de resultados desejados.\n2. Priorização em tabela: resultado | impacto | viabilidade | prioridade.\n3. O primeiro resultado a atacar e o motivo.",
    board: "decisao"
  },
  {
    id: "working", lens: "explorar", name: "Working Backwards",
    desc: "Que promessa vale a pena fazer: press release e FAQ.",
    uses: ["problema", "persona", "beachhead", "solucao"],
    task: "Escreva um press release de lançamento como se a solução já existisse e funcionasse, seguido de um FAQ com as perguntas difíceis de clientes e de quem decide internamente.",
    format: "1. Título e subtítulo.\n2. Press release (até 300 palavras): problema, solução, como funciona, citação de um cliente fictício marcado como [ilustrativo].\n3. FAQ externo (5 perguntas).\n4. FAQ interno (5 perguntas difíceis: viabilidade, custo, riscos).\n5. Que promessa do texto ainda não tem evidência.",
    board: "hipotese"
  },

  /* ---------------- EXPERIMENTAR ---------------- */
  {
    id: "mvp", lens: "experimentar", name: "Seleção de MVP",
    desc: "Concierge, Wizard of Oz, Smoke test, Single feature ou Piecemeal?",
    uses: ["problema", "persona", "beachhead", "solucao", "modelo", "evidencias"],
    extra: [{ id: "hipotese", label: "Hipótese mais arriscada", ph: "Ex.: donas de clínica pagariam R$ 99/mês para não esquecer cobranças", required: true }],
    task: "Para a hipótese informada, compare os tipos de MVP (Concierge, Wizard of Oz, Smoke test, Single feature, Piecemeal) quanto a custo, tempo, qualidade do sinal e risco. Recomende um e desenhe o experimento.",
    format: "1. Tabela comparativa dos tipos de MVP para esta hipótese.\n2. MVP recomendado e por quê.\n3. Desenho do experimento: o que construir (o mínimo), quem participa, quanto tempo, o que medir.\n4. Custo e prazo estimados [estimativa].",
    board: "experimento"
  },
  {
    id: "criterios", lens: "experimentar", name: "Critérios de saída",
    desc: "O que conta como sinal, definido antes de testar.",
    uses: ["solucao", "evidencias"],
    extra: [{ id: "experimento", label: "Experimento planejado", ph: "Descreva o teste: o que, com quem, por quanto tempo", long: true, required: true }],
    task: "Defina, antes do teste, a métrica principal, o tamanho mínimo de amostra, o prazo e as linhas de decisão: seguir, ajustar ou parar. Aponte vieses que podem distorcer o resultado.",
    format: "1. Métrica principal e como medir.\n2. Linhas de decisão: Seguir se..., Ajustar se..., Parar se...\n3. Amostra mínima e prazo.\n4. Vieses e como evitá-los.\n5. Métricas secundárias (no máximo 3).",
    board: "experimento"
  },

  /* ---------------- VALIDAR ---------------- */
  {
    id: "bml", lens: "validar", name: "Registro de experimento",
    desc: "Build, Measure, Learn: o que o teste ensinou.",
    uses: ["solucao", "evidencias"],
    extra: [
      { id: "experimento", label: "Experimento realizado", ph: "O que foi feito, com quem, por quanto tempo", long: true, required: true },
      { id: "resultados", label: "Resultados observados", ph: "Números, comportamentos, falas", long: true, required: true }
    ],
    task: "Registre o experimento de forma estruturada, compare os resultados com os critérios definidos (ou com o que seria razoável esperar, se não houver critérios) e tire aprendizados honestos.",
    format: "1. Hipótese testada.\n2. O que foi feito.\n3. Resultados (dados e observações).\n4. Leitura: confirma, refuta ou é inconclusivo, e por quê.\n5. Aprendizados.\n6. Decisão recomendada e próximo experimento.",
    board: "evidencia"
  },
  {
    id: "csd2", lens: "validar", name: "CSD atualizada",
    desc: "O que virou certeza, o que caiu.",
    uses: ["ideia", "problema", "persona", "solucao", "modelo", "evidencias"],
    extra: [{ id: "novas", label: "Novas evidências", ph: "O que você aprendeu desde a última CSD", long: true, required: true }],
    task: "Atualize a matriz CSD com as novas evidências: mova itens entre certezas, suposições e dúvidas, explicando cada movimento, e aponte as novas suposições críticas.",
    format: "1. Matriz atualizada: Certezas | Suposições | Dúvidas.\n2. Movimentos: item | de → para | evidência.\n3. O que caiu (refutado).\n4. Nova suposição mais arriscada.",
    board: "evidencia"
  },
  {
    id: "metricas", lens: "validar", name: "Métricas iniciais",
    desc: "Ativação, retenção e conversão: o painel mínimo.",
    uses: ["solucao", "modelo", "beachhead"],
    task: "Defina um painel mínimo de métricas para esta fase: ativação, retenção e conversão, com definição precisa, forma simples de medir (sem ferramentas caras) e referência inicial do que seria um bom sinal, marcada como estimativa.",
    format: "Tabela: métrica | definição | como medir | frequência | bom sinal [estimativa]. Depois: a métrica norte para os próximos 30 dias e por quê.",
    board: "experimento"
  },

  /* ---------------- AVANÇAR ---------------- */
  {
    id: "stress", lens: "avancar", name: "Stress test",
    desc: "Seguir, ajustar ou abandonar: o advogado do diabo.",
    uses: ["ideia", "problema", "persona", "beachhead", "solucao", "modelo", "evidencias", "org"],
    task: "Faça o papel de advogado do diabo. Aponte as fraquezas mais sérias do projeto, os riscos (mercado, produto, time, financeiro, regulatório) e o que precisaria ser verdade para dar certo. Termine com um parecer: seguir, ajustar ou abandonar.",
    format: "1. As 5 objeções mais fortes.\n2. Riscos por categoria, com probabilidade e impacto.\n3. 'Para dar certo, precisa ser verdade que...' (lista).\n4. Parecer: seguir, ajustar ou abandonar, com justificativa.\n5. Próximos 3 movimentos.",
    board: "decisao"
  },
  {
    id: "modelo", lens: "avancar", name: "Modelo de negócio",
    desc: "Cadeia de valor, receita e pricing.",
    uses: ["problema", "persona", "beachhead", "solucao", "modelo", "evidencias"],
    task: "Estruture o modelo de negócio inicial: proposta de valor, cadeia de valor, fontes de receita, hipóteses de preço, custos principais e unit economics simples. Marque todos os números como estimativas e diga como validá-los.",
    format: "1. Proposta de valor em uma frase.\n2. Cadeia de valor (quem entrega o quê).\n3. Receita e pricing (2 ou 3 opções de preço para testar).\n4. Custos principais.\n5. Unit economics simples [estimativa]: CAC, ticket, margem, payback.\n6. Hipóteses do modelo a validar primeiro.",
    board: "hipotese"
  },
  {
    id: "pitch", lens: "avancar", name: "Pitch para decisão",
    desc: "Uma página para patrocinador, sócio ou investidor decidir o próximo passo.",
    uses: ["ideia", "problema", "persona", "beachhead", "solucao", "modelo", "evidencias", "org"],
    extra: [{ id: "pedido", label: "O que você vai pedir", ph: "Ex.: 60 dias e R$ 20 mil para um piloto com 10 clínicas" }],
    task: "Escreva um documento de uma página para apoiar uma decisão: o problema, a evidência reunida até aqui, o que ainda é incerto, o pedido e o que será entregue em troca.",
    format: "1. Título.\n2. Problema e oportunidade (3 linhas).\n3. Evidências até aqui (fatos, não opiniões).\n4. O que ainda é incerto.\n5. O pedido e o plano (marcos e critérios de saída).\n6. Riscos e como serão mitigados.",
    board: "decisao"
  }
];

/* Prompt do radar: busca sinais externos relacionados ao projeto */
MESA.RADAR_PROMPT = {
  task: "Faça uma varredura de sinais relacionados a este projeto que possam gerar insights: startups e negócios comparáveis (no Brasil e fora), movimentos de grandes empresas, tendências, mudanças regulatórias, comportamentos emergentes de clientes e analogias de outros setores. Priorize o que pode mudar uma decisão do projeto.",
  format: "Uma lista de 8 a 12 sinais. Cada sinal em um item separado, começando com '- **Título curto**', seguido de 2 a 3 frases: o que é, por que importa para este projeto e que pergunta ou teste ele sugere. Quando citar empresas, números ou datas, indique a fonte; se não tiver certeza, marque [verificar]."
};

/* Monta o prompt de uma ferramenta */
MESA.buildPrompt = function (tool, project, extraValues) {
  var ctx = project.context || {};
  var kindLabel = project.kind === "inovacao" ? "projeto de inovação em uma organização" : "projeto empreendedor";
  var lines = [];
  lines.push("# " + tool.name);
  lines.push("");
  lines.push("## Seu papel");
  lines.push("Você é um(a) estrategista de inovação e empreendedorismo, com experiência em descoberta de clientes, experimentação e construção de novos negócios. Você está apoiando um " + kindLabel + " que usa o método Zero to First: avançar da ideia às primeiras evidências de valor, uma decisão por vez.");
  lines.push("");
  lines.push("## Contexto do projeto");
  lines.push("- Projeto: " + project.name);
  var filled = 0;
  (tool.uses || []).forEach(function (fid) {
    var f = MESA.CONTEXT_FIELDS.filter(function (x) { return x.id === fid; })[0];
    if (!f) return;
    var v = (ctx[fid] || "").trim();
    if (v) { lines.push("- " + f.label + ": " + v); filled++; }
  });
  (tool.extra || []).forEach(function (f) {
    var v = (extraValues && extraValues[f.id] || "").trim();
    if (v) { lines.push("- " + f.label + ": " + v); filled++; }
  });
  if (!filled) lines.push("- (o contexto ainda não foi preenchido: faça perguntas antes de responder)");
  lines.push("");
  lines.push("## Tarefa");
  lines.push(tool.task);
  lines.push("");
  lines.push("## Formato da resposta");
  lines.push(tool.format);
  lines.push("");
  lines.push("## Regras");
  lines.push("- Responda em português do Brasil, de forma direta.");
  lines.push("- Separe fatos de suposições. Marque suposições com [suposição] e números estimados com [estimativa].");
  lines.push("- Não invente dados, empresas ou fontes. Se não souber, diga.");
  lines.push("- Se faltar informação essencial, faça até 3 perguntas antes de responder.");
  return lines.join("\n");
};

MESA.buildRadarPrompt = function (project) {
  var tool = { name: "Radar de sinais", uses: MESA.CONTEXT_FIELDS.map(function (f) { return f.id; }), task: MESA.RADAR_PROMPT.task, format: MESA.RADAR_PROMPT.format };
  return MESA.buildPrompt(tool, project, {});
};
