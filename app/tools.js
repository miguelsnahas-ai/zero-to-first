/* =============================================================
   MESA DE TRABALHO · catálogo de ferramentas
   Cada ferramenta monta um prompt com o contexto do projeto.
   A pessoa usa o prompt no Claude, ChatGPT ou Gemini e cola a
   resposta de volta, que vira um artefato do projeto.
   ============================================================= */
window.MESA = window.MESA || {};

MESA.LENSES = [
  { id: "entender", phase: "discovery", name: "Entender", q: "Qual problema real existe aqui?" },
  { id: "explorar", phase: "discovery", name: "Explorar", q: "Que hipóteses valem ser testadas?" },
  { id: "experimentar", phase: "validation", name: "Experimentar", q: "Qual o menor teste que ensina algo?" },
  { id: "validar", phase: "validation", name: "Validar", q: "O que a evidência está dizendo?" },
  { id: "avancar", phase: "validation", name: "Avançar", q: "Seguir, ajustar ou parar?" },
  { id: "vender", phase: "traction", name: "Vender", q: "Quem compra, e como chegamos até essa pessoa?" },
  { id: "repetir", phase: "traction", name: "Repetir", q: "O que já pode virar um processo?" }
];

/* As três fases oficiais do Zero to First. As lentes acima são as subetapas de cada fase. */
MESA.PHASES = [
  {
    id: "discovery", n: 1, name: "Discovery", pt: "Descoberta",
    goal: "Entender o problema, o cliente, o contexto de uso e a oportunidade de negócio.",
    learn: "Quem é o cliente, qual problema merece ser resolvido e por que a oportunidade vale a investigação.",
    deliverables: ["Território e avaliação de mercado", "Jobs, jornada e entrevistas analisadas", "Segmento inicial (beachhead)", "Matriz CSD e problem statement"],
    exit: "Você consegue descrever cliente, problema e segmento inicial com evidências de entrevistas, não só opinião.",
    lenses: ["entender", "explorar"]
  },
  {
    id: "validation", n: 2, name: "Validation", pt: "Validação",
    goal: "Testar as hipóteses críticas sobre problema, solução e demanda, e decidir o que construir.",
    learn: "Quais hipóteses se sustentam, qual solução mínima entrega valor e como aprender com o uso real.",
    deliverables: ["Promessa (working backwards) e MVP escolhido", "Experimentos com critérios de saída", "Registro de experimentos e CSD atualizada", "Modelo de negócio e decisão (stress test, pitch)"],
    exit: "Hipóteses críticas testadas, uma solução inicial definida e uma decisão explícita de seguir, ajustar ou parar.",
    lenses: ["experimentar", "validar", "avancar"]
  },
  {
    id: "traction", n: 3, name: "Traction", pt: "Tração",
    goal: "Transformar o que foi aprendido em um processo inicial de aquisição, conversão e retenção de clientes.",
    learn: "Como conquistar os primeiros clientes e o que, na aquisição e na entrega de valor, pode se tornar repetível.",
    deliverables: ["Tracker de primeiros clientes", "Plano de GTM de 30 a 90 dias", "Sales playbook", "Experimentos de canais", "Painel de tração", "Unit economics em cenários", "Rotina de revisão e roadmap de tração"],
    exit: "Um processo comercial registrado, métricas confiáveis e uma rotina de revisão que orienta o próximo ciclo. Tração não é escala: é encontrar o que se repete.",
    lenses: ["vender", "repetir"]
  }
];

/* Base do negócio: o contexto do projeto, preenchido uma vez e usado por todas as ferramentas */
MESA.CONTEXT_FIELDS = [
  { id: "ideia", label: "Startup / ideia", hint: "Em uma frase: qual é a ideia ou onde ela atua?", ph: "Ex.: gestão financeira para clínicas veterinárias" },
  { id: "problema", label: "Problema", hint: "A dor que você acredita existir, na linguagem do cliente.", ph: "Ex.: clínicas perdem receita por não cobrar procedimentos e não enxergam o caixa do mês", long: true },
  { id: "persona", label: "Cliente / persona", hint: "Quem sente a dor. Detalhes concretos.", ph: "Ex.: dona de clínica com 2 a 5 funcionários", long: true },
  { id: "solucao", label: "Solução", hint: "Não precisa estar pronta.", ph: "Ex.: app que registra procedimento e cobra no atendimento", long: true },
  { id: "proposta", label: "Proposta de valor", hint: "Em uma frase: o resultado que o cliente obtém e por que é melhor que a alternativa atual.", ph: "Ex.: a clínica para de perder cobrança e fecha o caixa em 5 minutos, sem planilha", long: true },
  { id: "mercado", label: "Mercado / setor", hint: "Setor amplo em que a ideia se encaixa.", ph: "Ex.: saúde animal, SaaS vertical" },
  { id: "beachhead", label: "Segmento inicial (beachhead)", hint: "O nicho por onde começar.", ph: "Ex.: clínicas de bairro em São Paulo capital" },
  { id: "jornada", label: "Como resolvem hoje", hint: "Alternativas atuais, mesmo que ruins.", ph: "Ex.: planilha, WhatsApp e maquininha; fecha o caixa à mão", long: true },
  { id: "modelo", label: "Modelo de receita", hint: "Quem paga, como e por quê (hipótese).", ph: "Ex.: assinatura mensal por clínica" },
  { id: "preco", label: "Preço", hint: "Atual ou pretendido, com a unidade de cobrança.", ph: "Ex.: R$ 149 por clínica por mês" },
  { id: "tipo", label: "Tipo de negócio", hint: "Ajuda as ferramentas a sugerir funil, métricas e unidade econômica adequados.", options: [["", "Escolha…"], ["saas", "SaaS / software por assinatura"], ["b2b_servico", "Serviço B2B"], ["b2c", "Produto ou serviço B2C"], ["marketplace", "Marketplace"], ["transacional", "E-commerce / transacional"], ["outro", "Outro"]] },
  { id: "evidencias", label: "Estágio e evidências", hint: "Em que estágio está e o que já foi feito: entrevistas, números, testes, clientes.", ph: "Ex.: ideia validada com 6 entrevistas; 4 citaram perda de cobrança; nenhum cliente pagante", long: true },
  { id: "hipoteses", label: "Hipóteses principais", hint: "O que precisa ser verdade para o negócio funcionar. Uma por linha.", ph: "Ex.: donas de clínica pagariam R$ 99/mês para não esquecer cobranças", long: true },
  { id: "refs", label: "Site e links", hint: "Site, perfis, materiais ou concorrentes que ajudam a entender o negócio.", ph: "Ex.: www.caixadaclinica.com.br" },
  { id: "extra", label: "Outras informações", hint: "Qualquer contexto que ajude: restrições, time, prazo, recursos.", ph: "Ex.: dois sócios, 20 h por semana cada; sem investimento externo", long: true },
  { id: "org", label: "Contexto da organização", hint: "Para projetos de inovação em empresas: área, patrocinador, restrições.", ph: "Ex.: área de novos negócios; patrocínio da diretoria comercial; piloto de 90 dias", long: true, kind: "inovacao" }
];

/* Os quatro campos que aparecem primeiro; os demais ficam em "Mais detalhes" */
MESA.BASE_ESSENTIALS = ["ideia", "persona", "problema", "solucao"];

/* Curadoria que embasa os prompts. Só fontes públicas; url apenas quando o endereço é conhecido. */
MESA.MATERIALS = {
  pgIdeas: { name: "How to Get Startup Ideas (Paul Graham)", label: "Essencial · Ensaio", desc: "Boas ideias nascem de problemas que o próprio fundador e um grupo pequeno sentem com intensidade.", url: "https://paulgraham.com/startupideas.html", stage: "Entender" },
  painkiller: { name: "Painkiller vs. Vitamin", label: "Conceito", desc: "Separa dores urgentes, pelas quais se paga, de melhorias desejáveis que ficam para depois.", stage: "Entender" },
  tam: { name: "TAM, SAM e SOM", label: "Conceito", desc: "Mercado total, endereçável e alcançável, estimados de cima para baixo e de baixo para cima.", stage: "Entender" },
  whyNow: { name: "Why Now (Mike Maples Jr., Pattern Breakers)", label: "Livro", desc: "Que mudança tecnológica, regulatória ou de comportamento torna a oportunidade possível agora.", stage: "Entender" },
  jtbd: { name: "Know Your Customers' Jobs to Be Done (Clayton Christensen, HBR)", label: "Essencial · Artigo", desc: "Clientes contratam produtos para fazer um progresso em uma circunstância específica.", url: "https://hbr.org/2016/09/know-your-customers-jobs-to-be-done", stage: "Entender" },
  luck: { name: "Competing Against Luck (Clayton Christensen)", label: "Livro", desc: "As forças que empurram e seguram a troca de solução: empurrão, atração, ansiedade e hábito.", stage: "Entender" },
  momTest: { name: "The Mom Test (Rob Fitzpatrick)", label: "Essencial · Livro", desc: "Perguntas sobre o passado e o comportamento real, não sobre opiniões e o futuro.", url: "https://www.momtestbook.com/", stage: "Entender" },
  ost: { name: "Opportunity Solution Tree (Teresa Torres, Continuous Discovery Habits)", label: "Artigo", desc: "Liga o resultado desejado às oportunidades, às soluções e aos experimentos.", url: "https://www.producttalk.org/opportunity-solution-tree/", stage: "Explorar" },
  journey: { name: "Journey Mapping 101 (Nielsen Norman Group)", label: "Artigo", desc: "Mapa das etapas, ações, pensamentos e emoções do cliente para alcançar um objetivo.", url: "https://www.nngroup.com/articles/journey-mapping-101/", stage: "Entender" },
  aulet: { name: "Disciplined Entrepreneurship (Bill Aulet)", label: "Essencial · Livro", desc: "Segmentação de mercado, escolha do beachhead e perfil do usuário final em passos práticos.", url: "https://disciplinedentrepreneurship.com/", stage: "Explorar" },
  chasm: { name: "Crossing the Chasm (Geoffrey Moore)", label: "Livro", desc: "Conquistar um nicho de forma dominante antes de expandir para o mercado maior.", stage: "Explorar" },
  csd: { name: "Matriz CSD (certezas, suposições e dúvidas)", label: "Ferramenta", desc: "Separa o que se sabe do que se supõe e do que ainda é dúvida, para decidir o que investigar.", stage: "Explorar" },
  odi: { name: "Outcome-Driven Innovation (Anthony Ulwick)", label: "Método", desc: "Resultados desejados priorizados por importância e satisfação para achar oportunidades mal atendidas.", stage: "Explorar" },
  vpc: { name: "Value Proposition Canvas (Strategyzer)", label: "Ferramenta", desc: "Encaixe entre tarefas, dores e ganhos do cliente e o que a solução oferece.", url: "https://www.strategyzer.com/library/the-value-proposition-canvas", stage: "Explorar" },
  workingBackwards: { name: "Working Backwards (Colin Bryar e Bill Carr)", label: "Livro", desc: "Começar pelo comunicado à imprensa e pelo FAQ do cliente antes de construir.", stage: "Experimentar" },
  testingIdeas: { name: "Testing Business Ideas (David Bland e Alexander Osterwalder)", label: "Essencial · Livro", desc: "Biblioteca de experimentos para testar desejabilidade, viabilidade e praticabilidade.", stage: "Experimentar" },
  rightIt: { name: "The Right It (Alberto Savoia)", label: "Livro", desc: "Pretotipagem: dados próprios antes de construir, com hipóteses mensuráveis.", stage: "Experimentar" },
  leanStartup: { name: "The Lean Startup (Eric Ries)", label: "Essencial · Livro", desc: "Ciclo construir, medir e aprender; MVP; métricas acionáveis contra métricas de vaidade.", url: "https://theleanstartup.com/", stage: "Experimentar" },
  kniberg: { name: "Making Sense of MVP (Henrik Kniberg)", label: "Artigo", desc: "O menor produto que gera aprendizado real, entregue em versões utilizáveis.", url: "https://blog.crisp.se/2016/01/25/henrikkniberg/making-sense-of-mvp", stage: "Experimentar" },
  aarrr: { name: "Startup Metrics for Pirates, AARRR (Dave McClure)", label: "Conceito", desc: "Aquisição, ativação, retenção, receita e indicação como funil de métricas.", stage: "Validar" },
  northStar: { name: "North Star Metric", label: "Conceito", desc: "Uma métrica que representa o valor entregue ao cliente e orienta as decisões do time.", stage: "Validar" },
  premortem: { name: "Performing a Project Premortem (Gary Klein, HBR)", label: "Artigo", desc: "Imaginar que o projeto já falhou e listar os motivos, para reduzir riscos antes de agir.", url: "https://hbr.org/2007/09/performing-a-project-premortem", stage: "Avançar" },
  bmc: { name: "Business Model Canvas (Strategyzer)", label: "Essencial · Ferramenta", desc: "Os nove blocos que descrevem como um negócio cria, entrega e captura valor.", url: "https://www.strategyzer.com/library/the-business-model-canvas", stage: "Avançar" },
  bmNavigator: { name: "Business Model Navigator (Gassmann, Frankenberger e Csik)", label: "Livro", desc: "55 padrões de modelo de negócio para combinar e adaptar.", url: "https://businessmodelnavigator.com/", stage: "Avançar" },
  monetizing: { name: "Monetizing Innovation (Madhavan Ramanujam)", label: "Essencial · Livro", desc: "Desenhar o produto em volta do preço: disposição a pagar, segmentos e pacotes.", stage: "Avançar" },
  valuePricing: { name: "Precificação baseada em valor", label: "Conceito", desc: "Preço entre o piso do custo e o teto do valor percebido, referenciado pelas alternativas.", stage: "Avançar" },
  offers: { name: "$100M Offers (Alex Hormozi)", label: "Livro", desc: "Equação de valor: resultado sonhado, probabilidade percebida, tempo e esforço.", stage: "Avançar" },
  dunford: { name: "Obviously Awesome (April Dunford)", label: "Livro", desc: "Posicionamento a partir das alternativas competitivas e dos atributos únicos.", stage: "Avançar" },
  pgDontScale: { name: "Do Things That Don't Scale (Paul Graham)", label: "Ensaio", desc: "Conquistar os primeiros clientes um a um, com atenção quase artesanal.", url: "https://paulgraham.com/ds.html", stage: "Vender" },
  sequoiaPlan: { name: "Writing a Business Plan (Sequoia Capital)", label: "Artigo", desc: "Estrutura clássica de narrativa: propósito, problema, solução, por que agora, mercado, time.", url: "https://www.sequoiacap.com/article/writing-a-business-plan/", stage: "Avançar" },
  kawasaki: { name: "The 10/20/30 Rule of PowerPoint (Guy Kawasaki)", label: "Artigo", desc: "Dez slides, vinte minutos e fonte de no mínimo trinta pontos.", url: "https://guykawasaki.com/the_102030_rule/", stage: "Avançar" },
  storyBrand: { name: "Building a StoryBrand (Donald Miller)", label: "Livro", desc: "Mensagem clara com o cliente como herói e a marca como guia.", stage: "Experimentar" }
};

/* Ferramentas de prompt. Cada uma: bloqueio na voz do founder, campos próprios (opcionais, alguns vindos da base),
   papel, tarefa em passos, formato, regras e materiais. As de Traction (traction.js) têm área de trabalho própria. */
MESA.TOOLS = [
  /* ---------------- ENTENDER ---------------- */
  {
    id: "territorio", lens: "entender", name: "Território de oportunidade", board: "pergunta",
    blocker: "Não sei se essa ideia vale a pena",
    desc: "Mapeia oportunidades dentro de um território e avalia se a ideia merece investigação.",
    fields: [{ id: "ativos", label: "O que você traz", ph: "Experiências, acessos, conhecimentos ou ativos que podem dar vantagem", long: true }],
    role: "Você é um(a) investidor(a) early stage e estrategista de novos negócios, com a régua de avaliação de ideias de Paul Graham e o olhar de dor urgente contra melhoria desejável.",
    steps: [
      "Reescreva a ideia em uma frase no formato: para [cliente], que sofre com [dor], a solução faz [resultado].",
      "Mapeie de 8 a 12 oportunidades dentro deste território (inclusive a ideia atual) com: quem sofre, sinal de dor, frequência, por que agora e vantagem do time.",
      "Classifique cada oportunidade como dor urgente ou melhoria desejável e justifique em uma linha.",
      "Avalie a ideia atual em 6 critérios de 1 a 5: intensidade da dor, frequência, disposição a pagar, acesso ao cliente, por que agora e vantagem do time. Mostre o raciocínio de cada nota.",
      "Escolha as 3 oportunidades mais promissoras e diga o que mataria cada uma.",
      "Liste as 5 perguntas que precisam ser respondidas com clientes reais antes de seguir."
    ],
    format: "Resumo de 4 linhas no topo com o veredito (seguir, ajustar ou descartar). Tabela de oportunidades: Oportunidade | Quem sofre | Sinal de dor | Frequência | Por que agora | Vantagem | Dor ou melhoria. Tabela do scorecard: Critério | Nota | Por quê | Evidência a buscar. Top 3 em lista. Perguntas numeradas.",
    rules: ["Não dê nota alta sem evidência no contexto; sem evidência, marque [suposição].", "O veredito precisa citar o critério mais fraco."],
    materials: ["pgIdeas", "painkiller", "whyNow", "jtbd", "momTest"]
  },
  {
    id: "mercado", lens: "entender", name: "Avaliação de mercado", board: "hipotese",
    blocker: "Não conheço meu mercado",
    desc: "Tamanho do mercado (TAM, SAM, SOM), tendências e por que agora.",
    fields: [{ id: "geo", label: "Região de atuação", ph: "Ex.: Brasil, começando por São Paulo" }, { id: "preco", label: "Preço", fromBase: "preco" }],
    role: "Você é um(a) analista de mercado de venture capital, rigoroso(a) com premissas e transparente com estimativas.",
    steps: [
      "Defina o mercado em uma frase, separando o setor amplo do problema específico que a ideia resolve.",
      "Estime o TAM, o SAM e o SOM de cima para baixo (dados de setor) e de baixo para cima (número de clientes x preço x frequência). Mostre as contas e as premissas.",
      "Compare as duas estimativas e explique a diferença.",
      "Liste de 4 a 6 tendências ou mudanças que explicam por que agora (tecnologia, regulação, comportamento, custo).",
      "Avalie a intensidade competitiva e as barreiras de entrada em poucas linhas.",
      "Diga quais 5 dados validariam ou derrubariam as estimativas e onde buscá-los."
    ],
    format: "Resumo de 5 linhas. Tabela: Camada | Definição | Conta | Premissas | Valor. Tabela de tendências: Mudança | Evidência | Impacto no projeto. Lista dos dados a buscar com a fonte sugerida.",
    rules: ["Todo número estimado leva [estimativa] e a conta explícita.", "Use a moeda local e cite a fonte de qualquer dado de mercado; se não souber, diga que precisa ser verificado."],
    materials: ["tam", "whyNow", "aulet", "chasm", "pgIdeas"]
  },
  {
    id: "concorrentes", lens: "entender", name: "Benchmarks e concorrentes", board: "pergunta",
    blocker: "Não sei quem são meus concorrentes",
    desc: "Alternativas diretas, indiretas e substitutas, e onde há espaço.",
    fields: [{ id: "conhecidos", label: "Concorrentes que você já conhece", ph: "Nomes, sites ou tipos de solução", long: true }],
    role: "Você é um(a) estrategista de posicionamento, com a abordagem de April Dunford: a referência do cliente são as alternativas que ele usa hoje.",
    steps: [
      "Liste as alternativas em três grupos: concorrentes diretos, soluções indiretas e o jeito que o cliente resolve hoje (planilha, serviço manual, não fazer nada).",
      "Para cada alternativa: para quem serve, o que entrega bem, onde falha para o segmento inicial e modelo de preço quando conhecido.",
      "Indique 3 benchmarks de outros setores ou países que resolveram um problema parecido e o que se aprende com eles.",
      "Mapeie os atributos que o cliente mais valoriza e onde cada alternativa se posiciona.",
      "Aponte de 2 a 3 espaços de diferenciação defensáveis para este projeto.",
      "Diga quais concorrentes ou dados precisam ser verificados e como."
    ],
    format: "Resumo de 4 linhas. Tabela: Alternativa | Tipo | Para quem | Faz bem | Falha em | Preço. Tabela de benchmarks: Referência | O que fez | Lição para o projeto. Lista dos espaços de diferenciação.",
    rules: ["Não invente empresas: quando não tiver certeza de que uma empresa existe, marque [verificar].", "Inclua sempre a alternativa \"não fazer nada\"."],
    materials: ["dunford", "jtbd", "luck", "chasm", "painkiller"]
  },
  {
    id: "roteiro", lens: "entender", name: "Roteiro de entrevista", board: "pergunta",
    blocker: "Não sei o que perguntar ao cliente",
    desc: "Perguntas que coletam evidência, não opinião (Mom Test).",
    fields: [{ id: "objetivo", label: "Objetivo desta rodada", ph: "Ex.: entender como fecham o caixa e quanto perdem por cobrança esquecida" }, { id: "persona", label: "Quem será entrevistado", fromBase: "persona" }],
    role: "Você é um(a) especialista em descoberta de clientes que segue rigorosamente The Mom Test e Customer Development.",
    steps: [
      "Defina 3 aprendizados que esta rodada precisa produzir e o critério para considerá-los respondidos.",
      "Descreva o perfil exato de quem entrevistar e de quem evitar, com 3 perguntas de triagem.",
      "Escreva o roteiro em blocos (abertura, contexto, última vez que o problema aconteceu, como resolve hoje, custo do problema, encerramento), com 12 a 18 perguntas sobre fatos passados.",
      "Para cada pergunta, inclua um aprofundamento (\"me conte mais\", \"o que aconteceu depois\").",
      "Liste 6 perguntas a evitar e por que enviesam a resposta.",
      "Monte o modelo de registro para preencher logo depois de cada entrevista."
    ],
    format: "Resumo de 3 linhas. Aprendizados em lista. Triagem em lista. Roteiro em blocos numerados com aprofundamentos. Tabela: Pergunta a evitar | Por quê | Alternativa. Modelo de registro em tabela.",
    rules: ["Nenhuma pergunta sobre o futuro ou hipotética (\"você usaria\", \"você pagaria\").", "Não apresente a solução antes do bloco final."],
    materials: ["momTest", "jtbd", "journey", "ost", "pgDontScale"]
  },
  {
    id: "analisador", lens: "entender", name: "Analisador de entrevistas", board: "evidencia",
    blocker: "Fiz entrevistas e não sei o que concluir",
    desc: "Separa evidência de elogio e mostra padrões entre as entrevistas.",
    fields: [{ id: "transcricao", label: "Transcrições ou anotações (separe as entrevistas com ---)", ph: "Entrevista 1...\n---\nEntrevista 2...", long: true }, { id: "hipoteses", label: "Hipóteses a checar (uma por linha)", fromBase: "hipoteses", long: true }],
    role: "Você é um(a) pesquisador(a) de clientes que separa fatos de opiniões e não se deixa levar por elogios.",
    steps: [
      "Para cada entrevista, extraia: perfil, situação, como resolve hoje, dores com frequência e custo, frases literais relevantes e sinais de compromisso.",
      "Classifique cada trecho como fato do passado, opinião, elogio ou pedido de funcionalidade.",
      "Encontre padrões entre as entrevistas e diga em quantas cada padrão aparece.",
      "Confronte cada hipótese listada com as evidências: confirma, enfraquece ou não há dados.",
      "Aponte surpresas e contradições.",
      "Recomende o que mudar no próximo roteiro e quem entrevistar a seguir."
    ],
    format: "Resumo de 5 linhas. Uma tabela por entrevista: Tema | Fato | Frase literal | Classificação. Tabela de padrões: Padrão | Ocorrências | Evidência. Tabela de hipóteses: Hipótese | Situação | Evidência. Recomendações em lista.",
    rules: ["Cite as frases do entrevistado entre aspas, sem parafrasear.", "Elogio e interesse declarado não contam como evidência de demanda."],
    materials: ["momTest", "jtbd", "csd", "ost"]
  },
  {
    id: "jtbd", lens: "entender", name: "Jobs to Be Done", board: "hipotese",
    blocker: "Não sei exatamente quem é meu cliente",
    desc: "Que progresso o cliente está tentando fazer, o que o impede e quem é o cliente ideal.",
    fields: [{ id: "persona", label: "Quem você acredita que é o cliente", fromBase: "persona", long: true }],
    role: "Você é um(a) especialista em segmentação e Jobs to Be Done, na linha de Christensen e Bill Aulet.",
    steps: [
      "Descreva o ICP com critérios observáveis (para B2B: setor, tamanho, momento, cargo do comprador; para B2C: situação de vida, comportamento, canal).",
      "Escreva o job principal no formato: quando [situação], quero [progresso], para [resultado].",
      "Liste jobs funcionais, emocionais e sociais.",
      "Mapeie as 4 forças do progresso: empurrão, atração, ansiedade e hábito.",
      "Diferencie usuário, comprador e influenciador, quando existirem.",
      "Crie critérios de qualificação (quem é e quem não é cliente agora) e 5 lugares onde encontrar essas pessoas."
    ],
    format: "Resumo de 4 linhas. Ficha do ICP em tabela. Job principal em destaque. Tabela das 4 forças. Tabela: Papel | Quem é | O que valoriza. Critérios em duas listas (é cliente / não é cliente agora).",
    rules: ["Evite personas genéricas (\"pessoas que querem economizar tempo\"): cada critério precisa ser verificável.", "Marque o que vem do contexto e o que é [suposição]."],
    materials: ["jtbd", "luck", "aulet", "chasm", "vpc"]
  },
  {
    id: "journey", lens: "entender", name: "Journey Map", board: "hipotese",
    blocker: "Não sei onde exatamente a dor acontece",
    desc: "Etapas, ações, emoções e pontos de dor na jornada do cliente.",
    fields: [{ id: "jornada", label: "Como resolvem hoje", fromBase: "jornada", long: true }],
    role: "Você é um(a) pesquisador(a) de experiência do cliente, com a abordagem de mapeamento de jornada do Nielsen Norman Group.",
    steps: [
      "Defina o cenário e o objetivo do cliente na jornada.",
      "Divida a jornada atual (sem a solução) em 5 a 8 etapas.",
      "Para cada etapa: ações, pensamentos, emoções, ferramentas usadas e pontos de dor.",
      "Marque os momentos da verdade e onde a dor é mais intensa ou frequente.",
      "Aponte onde a solução entra e o que muda em cada etapa.",
      "Liste o que precisa ser confirmado com observação ou entrevista."
    ],
    format: "Resumo de 3 linhas. Tabela: Etapa | Ações | Pensamentos | Emoção | Ferramentas | Dor. Lista dos momentos da verdade. Tabela: Etapa | Antes | Com a solução. Lista do que confirmar.",
    rules: ["A jornada descreve o que o cliente faz hoje, não o que ele faria com a solução.", "Marque com [suposição] as etapas sem evidência."],
    materials: ["journey", "jtbd", "momTest", "ost"]
  },

  /* ---------------- EXPLORAR ---------------- */
  {
    id: "beachhead", lens: "explorar", name: "Beachhead Market", board: "decisao",
    blocker: "Não sei por qual segmento começar",
    desc: "Compara segmentos e escolhe o primeiro mercado.",
    fields: [{ id: "segmentos", label: "Segmentos que você está considerando", ph: "Um por linha", long: true }],
    role: "Você é um(a) estrategista de go-to-market que aplica a segmentação de Bill Aulet e o conceito de beachhead de Geoffrey Moore.",
    steps: [
      "Liste de 5 a 8 segmentos possíveis, incluindo os informados.",
      "Avalie cada um de 1 a 5 em: dor, poder de compra, acesso, tamanho suficiente, concorrência, boca a boca entre clientes e encaixe com o time.",
      "Recomende o beachhead e o segundo segmento, explicando o raciocínio.",
      "Estime quantos clientes existem no beachhead, de baixo para cima.",
      "Descreva como dominar esse segmento em 6 a 12 meses.",
      "Liste os testes para confirmar a escolha antes de investir."
    ],
    format: "Resumo de 4 linhas. Tabela de segmentos com as notas e o total. Recomendação em destaque. Conta do tamanho do beachhead. Plano de domínio em lista. Testes no formato: Acreditamos que… Saberemos que estamos certos quando…",
    rules: ["O beachhead precisa ser estreito o bastante para ser dominado; rejeite \"PMEs\" ou \"jovens\" como segmento.", "Mostre a conta do tamanho com [estimativa]."],
    materials: ["aulet", "chasm", "tam", "pgDontScale"]
  },
  {
    id: "csd", lens: "explorar", name: "Matriz CSD", board: "hipotese",
    blocker: "Misturo o que sei com o que acho",
    desc: "Certezas, suposições e dúvidas, com o que investigar primeiro.",
    fields: [{ id: "evidencias", label: "Estágio e evidências", fromBase: "evidencias", long: true }],
    role: "Você é um(a) facilitador(a) de descoberta que organiza o conhecimento do projeto com a Matriz CSD.",
    steps: [
      "Classifique o que está no contexto em certezas (com evidência), suposições (acreditamos, sem prova) e dúvidas (não sabemos).",
      "Questione cada certeza: qual evidência a sustenta? Rebaixe a suposição o que não tiver evidência.",
      "Transforme as suposições em hipóteses testáveis.",
      "Priorize suposições e dúvidas por risco (impacto se estiver errado) e incerteza.",
      "Para as 3 mais arriscadas, proponha a forma mais barata de investigar.",
      "Indique quando atualizar a matriz."
    ],
    format: "Resumo de 3 linhas. Tabela: Item | Tipo (C, S ou D) | Evidência | Risco | Incerteza. Hipóteses no formato: Acreditamos que… porque… Plano de investigação em tabela: Item | Método | Prazo | Critério.",
    rules: ["Certeza sem evidência citada vira suposição.", "Não invente evidências que não estão no contexto."],
    materials: ["csd", "testingIdeas", "momTest", "leanStartup"]
  },
  {
    id: "problema", lens: "explorar", name: "Problem Statement", board: "decisao",
    blocker: "Não consigo explicar o problema com clareza",
    desc: "Qual problema, de quem, em que contexto e com qual custo.",
    fields: [{ id: "problema", label: "Problema", fromBase: "problema", long: true }],
    role: "Você é um(a) especialista em enquadramento de problemas, com Jobs to Be Done e Opportunity Solution Tree.",
    steps: [
      "Escreva 3 versões do problema no formato: [cliente] precisa [progresso] quando [situação], mas [obstáculo], o que causa [consequência].",
      "Avalie cada versão em especificidade, evidência e ausência de solução embutida.",
      "Recomende a melhor versão e reescreva-a de forma final.",
      "Quantifique o custo do problema para o cliente, com as contas.",
      "Liste as causas prováveis do problema, separando evidência de suposição.",
      "Defina como saber se o problema foi resolvido."
    ],
    format: "Resumo de 3 linhas. As 3 versões numeradas. Tabela: Versão | Especificidade | Evidência | Solução embutida? Problem statement final em destaque. Conta do custo. Causas em lista. Critério de resolução.",
    rules: ["O problem statement não pode citar a solução.", "Custo do problema com [estimativa] quando não vier do contexto."],
    materials: ["jtbd", "ost", "painkiller", "momTest"]
  },
  {
    id: "importancia", lens: "explorar", name: "Importância × satisfação", board: "hipotese",
    blocker: "Não sei qual dor atacar primeiro",
    desc: "Resultados desejados mal atendidos, priorizados para virar oportunidade.",
    fields: [{ id: "evidencias", label: "Estágio e evidências", fromBase: "evidencias", long: true }],
    role: "Você é um(a) especialista em Outcome-Driven Innovation, na linha de Anthony Ulwick.",
    steps: [
      "Liste de 10 a 15 resultados desejados no formato: minimizar/aumentar [métrica] ao [fazer o job].",
      "Estime importância e satisfação atual de 1 a 10 para cada um, dizendo de onde vem a estimativa.",
      "Calcule a oportunidade: importância + máx(importância − satisfação, 0).",
      "Classifique em mal atendidos, bem atendidos e superatendidos.",
      "Escolha os 3 resultados prioritários e o que a solução precisa fazer por eles.",
      "Desenhe uma pesquisa curta para validar as notas com clientes."
    ],
    format: "Resumo de 3 linhas. Tabela: Resultado | Importância | Satisfação | Oportunidade | Classificação, ordenada pela oportunidade. Prioridades em lista. Pesquisa com perguntas e escala.",
    rules: ["Notas sem dado de cliente são [estimativa] e precisam de validação.", "Mostre a conta da oportunidade em cada linha."],
    materials: ["odi", "jtbd", "ost", "vpc"]
  },
  {
    id: "resultados", lens: "explorar", name: "Resultados desejados", board: "decisao",
    blocker: "Não sei qual resultado a solução precisa entregar primeiro",
    desc: "O que atacar primeiro: os resultados que o cliente quer, priorizados.",
    fields: [{ id: "solucao", label: "Solução", fromBase: "solucao", long: true }, { id: "proposta", label: "Proposta de valor", fromBase: "proposta", long: true }],
    role: "Você é um(a) estrategista de produto que trabalha com Jobs to Be Done, Outcome-Driven Innovation e Opportunity Solution Tree.",
    steps: [
      "Escreva de 10 a 15 resultados desejados pelo cliente no formato: minimizar/aumentar [métrica] ao [atividade].",
      "Agrupe os resultados por etapa do job e marque quais vêm do contexto e quais são [suposição].",
      "Priorize cada resultado por impacto no cliente e viabilidade de entrega, de 1 a 5, explicando as notas.",
      "Escolha o primeiro resultado a atacar e explique por que ele vem antes dos outros.",
      "Diga o que a solução precisa fazer para entregar esse resultado e o que ela não precisa fazer agora.",
      "Defina como medir se o resultado foi entregue, com critério de sucesso."
    ],
    format: "Resumo de 3 linhas. Tabela: Resultado desejado | Etapa do job | Impacto | Viabilidade | Prioridade. O primeiro resultado em destaque, com a justificativa. Duas listas: a solução precisa / não precisa agora. Critério no formato: Acreditamos que… Saberemos que estamos certos quando…",
    rules: ["Resultado desejado descreve o progresso do cliente, não uma funcionalidade.", "Notas sem dado de cliente são [estimativa]."],
    materials: ["odi", "jtbd", "ost", "vpc"]
  },

  /* ---------------- EXPERIMENTAR ---------------- */
  {
    id: "working", lens: "experimentar", name: "Working Backwards", board: "hipotese",
    blocker: "Não sei qual promessa fazer ao cliente",
    desc: "Comunicado à imprensa e FAQ antes de construir.",
    fields: [{ id: "solucao", label: "Solução", fromBase: "solucao", long: true }],
    role: "Você é um(a) líder de produto treinado(a) no método Working Backwards da Amazon.",
    steps: [
      "Escreva o comunicado à imprensa de lançamento (até 1 página): título, subtítulo, problema, solução, citação do cliente, como começar.",
      "Escreva o FAQ externo com 8 a 10 perguntas que um cliente faria.",
      "Escreva o FAQ interno com 8 a 10 perguntas difíceis (custo, riscos, por que agora, por que nós).",
      "Identifique a promessa central e as 3 hipóteses que precisam ser verdade para ela se cumprir.",
      "Aponte o que no comunicado ainda é vago ou exagerado.",
      "Proponha o menor teste para validar a promessa."
    ],
    format: "Resumo de 3 linhas. Comunicado em texto corrido. FAQ externo e FAQ interno em pares pergunta e resposta. Promessa e hipóteses em destaque. Lista do que está vago. Teste proposto.",
    rules: ["Escreva para o cliente, sem jargão interno.", "Não prometa resultados que o contexto não sustenta; marque [hipótese]."],
    materials: ["workingBackwards", "vpc", "testingIdeas", "rightIt"]
  },
  {
    id: "mvp", lens: "experimentar", name: "Seleção de MVP", board: "experimento",
    blocker: "Não sei o que construir primeiro",
    desc: "Concierge, Wizard of Oz, Smoke test, Single feature ou Piecemeal: o menor teste que gera aprendizado.",
    fields: [{ id: "hipotese", label: "Hipótese mais arriscada", fromBase: "hipoteses", ph: "Ex.: donas de clínica pagariam R$ 99/mês para não esquecer cobranças", long: true }, { id: "recursos", label: "Tempo e recursos disponíveis", ph: "Ex.: 3 semanas, 2 pessoas, R$ 2 mil" }],
    role: "Você é um(a) especialista em experimentação enxuta, com Lean Startup, Testing Business Ideas e a visão de MVP de Henrik Kniberg.",
    steps: [
      "Reescreva a hipótese mais arriscada de forma testável e diga por que ela é a mais arriscada.",
      "Compare 4 tipos de MVP (concierge, Mágico de Oz, smoke test, funcionalidade única, montagem de peças prontas) para esta hipótese: custo, tempo, força da evidência e riscos.",
      "Recomende um e detalhe o escopo: o que entra, o que fica de fora e o que é feito manualmente.",
      "Defina a métrica principal e o critério de sucesso antes de rodar.",
      "Monte o plano de 2 a 4 semanas com tarefas e responsáveis.",
      "Liste os riscos de aprendizado falso (amostra, viés) e como evitá-los."
    ],
    format: "Resumo de 4 linhas. Tabela: Tipo de MVP | Como seria aqui | Custo | Tempo | Força da evidência | Riscos. Escopo em duas listas (entra / fica de fora). Critério no formato: Acreditamos que… Saberemos que estamos certos quando… Plano em tabela por semana.",
    rules: ["O MVP testa uma hipótese, não é a primeira versão do produto completo.", "O critério de sucesso precisa ter número e prazo."],
    materials: ["leanStartup", "testingIdeas", "kniberg", "rightIt", "pgDontScale"]
  },
  {
    id: "landing", lens: "experimentar", name: "Landing page de teste", board: "experimento",
    blocker: "Preciso de uma página para testar a demanda",
    desc: "Texto, estrutura e métrica de uma página para medir interesse real.",
    fields: [{ id: "proposta", label: "Proposta de valor", fromBase: "proposta", long: true }, { id: "acao", label: "Ação que você quer medir", ph: "Ex.: pré-cadastro, lista de espera, compra antecipada, agendar demonstração" }],
    role: "Você é um(a) especialista em conversão e em smoke tests, com a mensagem clara do StoryBrand e a lógica de pretotipagem de Alberto Savoia.",
    steps: [
      "Defina a hipótese do teste e a ação que conta como sinal (quanto mais compromisso, melhor: pagamento > agendamento > e-mail).",
      "Escreva 3 opções de título e subtítulo e recomende uma.",
      "Escreva a página completa por seções: problema, promessa, como funciona em 3 passos, prova ou credibilidade, oferta, objeções e chamada para ação.",
      "Defina a métrica, o tráfego necessário e o critério de sucesso, com as contas.",
      "Sugira como levar tráfego qualificado barato para a página.",
      "Diga o que fazer com quem converter (contato humano, entrevista, pré-venda)."
    ],
    format: "Resumo de 4 linhas. Títulos em lista. Página em seções com o texto final. Tabela: Métrica | Meta | Conta. Plano de tráfego em lista. Próximos passos com os convertidos.",
    rules: ["Não prometa na página algo que o projeto não consiga entregar; seja transparente se for lista de espera.", "Critério de sucesso com número, definido antes de rodar."],
    materials: ["rightIt", "testingIdeas", "storyBrand", "leanStartup", "vpc"]
  },
  {
    id: "criterios", lens: "experimentar", name: "Critérios de saída", board: "experimento",
    blocker: "Não sei quando parar ou continuar um teste",
    desc: "O que conta como sinal, definido antes de testar.",
    fields: [{ id: "experimento", label: "Experimento planejado", ph: "O que, com quem, por quanto tempo", long: true }],
    role: "Você é um(a) especialista em experimentação que define critérios antes de olhar os dados.",
    steps: [
      "Reescreva o experimento: hipótese, público, ação, duração e amostra.",
      "Defina a métrica principal e 1 a 2 métricas de apoio, com a fórmula de cada uma.",
      "Estabeleça três faixas: continuar, ajustar e parar, com os números e o raciocínio por trás.",
      "Verifique se a amostra é suficiente para decidir e o que fazer se não for.",
      "Liste os sinais qualitativos que também contam.",
      "Defina quando e quem decide."
    ],
    format: "Resumo de 3 linhas. Ficha do experimento em tabela. Tabela: Métrica | Fórmula | Continuar | Ajustar | Parar. Lista de sinais qualitativos. Data e responsável pela decisão.",
    rules: ["Critérios em número, não em adjetivo (\"bom engajamento\" não serve).", "Explique de onde vêm os limites; sem referência, marque [estimativa]."],
    materials: ["rightIt", "leanStartup", "testingIdeas", "kniberg"]
  },

  /* ---------------- VALIDAR ---------------- */
  {
    id: "bml", lens: "validar", name: "Registro de experimento", board: "evidencia",
    blocker: "Rodei um teste e não sei o que ele me diz",
    desc: "Construir, medir e aprender: o que o teste ensinou e a decisão.",
    fields: [{ id: "experimento", label: "Experimento realizado", ph: "O que foi feito, com quem, por quanto tempo", long: true }, { id: "resultados", label: "Resultados observados", ph: "Números, comportamentos, falas", long: true }],
    role: "Você é um(a) analista de experimentos que lê resultados com honestidade estatística e prática.",
    steps: [
      "Resuma o experimento e a hipótese testada.",
      "Compare os resultados com o critério definido antes (ou reconstrua o critério, sinalizando isso).",
      "Separe sinal de ruído: tamanho da amostra, vieses, o que pode ter distorcido o resultado.",
      "Diga o que foi aprendido em até 5 pontos, com a evidência de cada um.",
      "Recomende a decisão: perseverar, ajustar ou pivotar, e por quê.",
      "Proponha o próximo experimento."
    ],
    format: "Resumo de 4 linhas com a decisão. Tabela: Métrica | Critério | Resultado | Leitura. Lista de vieses. Aprendizados numerados. Próximo experimento no formato: Acreditamos que… Saberemos que estamos certos quando…",
    rules: ["Não declare validação com amostra pequena sem dizer o limite da conclusão.", "Separe o que os dados mostram do que você interpreta."],
    materials: ["leanStartup", "testingIdeas", "rightIt", "aarrr"]
  },
  {
    id: "csd2", lens: "validar", name: "CSD atualizada", board: "evidencia",
    blocker: "Aprendi coisas novas e preciso reorganizar o que sei",
    desc: "O que virou certeza, o que caiu e o que investigar agora.",
    fields: [{ id: "novas", label: "Novas evidências", ph: "O que você aprendeu desde a última CSD", long: true }, { id: "evidencias", label: "Estágio e evidências", fromBase: "evidencias", long: true }],
    role: "Você é um(a) facilitador(a) de descoberta que mantém a Matriz CSD viva ao longo do projeto.",
    steps: [
      "Reconstrua a matriz anterior a partir do contexto.",
      "Para cada nova evidência, diga qual item ela afeta e como.",
      "Mova itens entre certezas, suposições e dúvidas, justificando cada movimento.",
      "Liste as hipóteses que caíram e o que isso muda no projeto.",
      "Atualize a priorização por risco e incerteza.",
      "Defina as próximas 3 investigações."
    ],
    format: "Resumo de 4 linhas. Tabela de movimentos: Item | Antes | Depois | Evidência. Matriz atualizada em tabela. Hipóteses que caíram em lista. Próximas investigações em tabela.",
    rules: ["Todo movimento cita a evidência que o justifica.", "Não transforme suposição em certeza com base em uma única conversa sem dizer isso."],
    materials: ["csd", "testingIdeas", "leanStartup", "momTest"]
  },
  {
    id: "metricas", lens: "validar", name: "Métricas iniciais", board: "experimento",
    blocker: "Não sei o que medir",
    desc: "Ativação, retenção e conversão: o painel mínimo e onde está o gargalo.",
    fields: [{ id: "tipo", label: "Tipo de negócio", fromBase: "tipo" }, { id: "numeros", label: "Números que você já tem", ph: "Visitas, cadastros, clientes, receita, cancelamentos…", long: true }],
    role: "Você é um(a) especialista em métricas de startups, com o funil AARRR de Dave McClure e o cuidado contra métricas de vaidade do Lean Startup.",
    steps: [
      "Desenhe o funil adequado ao tipo de negócio (não force métricas de SaaS em outros modelos).",
      "Para cada etapa, defina o indicador, a fórmula e se é atividade ou resultado.",
      "Com os números informados, calcule as conversões entre etapas.",
      "Identifique o gargalo mais provável e as hipóteses de causa.",
      "Proponha uma North Star Metric, se fizer sentido, e explique por quê.",
      "Defina metas iniciais e a rotina de revisão."
    ],
    format: "Resumo de 4 linhas. Tabela: Etapa | Indicador | Fórmula | Tipo | Atual | Meta | Conversão. Gargalo e hipóteses em lista. North Star em destaque. Rotina de revisão em lista.",
    rules: ["Aponte e descarte métricas de vaidade.", "Metas sem histórico são [estimativa] e devem ser revistas após 4 semanas."],
    materials: ["aarrr", "northStar", "leanStartup", "testingIdeas"]
  },

  /* ---------------- AVANÇAR ---------------- */
  {
    id: "precificacao", lens: "avancar", name: "Precificação e WTP", board: "hipotese",
    blocker: "Não sei quanto cobrar",
    desc: "Modelo de receita, âncoras de preço, disposição a pagar e pacotes.",
    fields: [
      { id: "modelo", label: "Modelo de receita atual", fromBase: "modelo" },
      { id: "preco", label: "Preço atual", fromBase: "preco" },
      { id: "valor", label: "Valor percebido pelo cliente", ph: "Quanto o problema custa ou quanto a solução gera para ele", long: true },
      { id: "custos", label: "Custos para entregar", ph: "Custos por cliente ou por venda", long: true },
      { id: "alternativa", label: "Quanto o cliente paga hoje pela alternativa", ph: "Ex.: R$ 80/mês em planilha e contador" }
    ],
    role: "Você é um(a) especialista em precificação com a abordagem de Monetizing Innovation, de Madhavan Ramanujam.",
    steps: [
      "Compare 2 a 3 modelos de receita possíveis para este negócio.",
      "Escolha a métrica de valor (pelo que o cliente paga: por usuário, por uso, por resultado, por unidade) e justifique.",
      "Calcule três âncoras com as contas: custo para entregar (piso), alternativas (referência) e valor gerado (teto).",
      "Estime a disposição a pagar por segmento, separando evidência de suposição.",
      "Monte pacotes bom, melhor e ótimo, com garantias e bônus seguindo a lógica de oferta.",
      "Escreva um roteiro de conversa sobre disposição a pagar sem perguntar \"quanto você pagaria?\" e 2 a 3 experimentos de preço com critério de sucesso."
    ],
    format: "Resumo de 5 linhas. Tabela: Modelo | Como funcionaria aqui | Prós | Contras | Recomendação. Âncoras com as contas. Tabela de pacotes: Pacote | Para quem | O que inclui | Preço | Garantia ou bônus. 8 a 12 perguntas numeradas. Experimentos no formato: Acreditamos que… Saberemos que estamos certos quando…",
    rules: ["Use a moeda local e mostre as contas.", "Marque [estimativa] em todo número que não vier do contexto.", "Não recomende preço abaixo do custo sem justificar."],
    materials: ["monetizing", "valuePricing", "offers", "vpc", "testingIdeas"]
  },
  {
    id: "oferta", lens: "avancar", name: "Oferta", board: "hipotese",
    blocker: "Não sei montar uma oferta que o cliente compre",
    desc: "Promessa, entregáveis, garantia, bônus e condições de uma oferta irrecusável.",
    fields: [{ id: "solucao", label: "O que você entrega", fromBase: "solucao", long: true }, { id: "preco", label: "Preço", fromBase: "preco" }],
    role: "Você é um(a) especialista em construção de ofertas, com a equação de valor de Alex Hormozi e o foco no resultado do cliente.",
    steps: [
      "Defina o resultado sonhado do cliente e o principal obstáculo até ele.",
      "Liste todos os problemas que o cliente enfrenta para chegar ao resultado e transforme cada um em uma solução da oferta.",
      "Avalie a oferta na equação de valor: resultado, probabilidade percebida de sucesso, tempo até o resultado e esforço.",
      "Monte a oferta: nome, promessa, entregáveis, formato, garantia, bônus, escassez ou urgência honestas e preço.",
      "Antecipe as 6 principais objeções e como a oferta responde a cada uma.",
      "Proponha como testar a oferta com 5 a 10 clientes reais."
    ],
    format: "Resumo de 4 linhas. Tabela: Problema do cliente | Solução na oferta. Avaliação na equação de valor em tabela. Ficha da oferta. Tabela: Objeção | Resposta. Plano de teste em lista.",
    rules: ["Nada de escassez ou urgência falsa.", "A garantia precisa ser cumprível pelo projeto."],
    materials: ["offers", "monetizing", "vpc", "pgDontScale", "dunford"]
  },
  {
    id: "modelo", lens: "avancar", name: "Modelo de negócio", board: "hipotese",
    blocker: "Não sei como o negócio vai ganhar dinheiro",
    desc: "Canvas, padrões de modelo e riscos de viabilidade.",
    fields: [{ id: "modelo", label: "Modelo de receita", fromBase: "modelo" }, { id: "tipo", label: "Tipo de negócio", fromBase: "tipo" }],
    role: "Você é um(a) estrategista de modelos de negócio que usa o Business Model Canvas e os padrões do Business Model Navigator.",
    steps: [
      "Preencha os 9 blocos do Business Model Canvas para o modelo atual.",
      "Sugira 2 a 3 padrões de modelo de negócio alternativos aplicáveis e como ficariam aqui.",
      "Compare o modelo atual e as alternativas em receita, custo de aquisição, recorrência e complexidade.",
      "Faça a conta da economia unitária simplificada (receita por cliente, custo para servir, custo para adquirir), com premissas.",
      "Liste os riscos de viabilidade e as hipóteses mais frágeis.",
      "Proponha 3 testes para validar o modelo."
    ],
    format: "Resumo de 4 linhas. Canvas em tabela (Bloco | Conteúdo | Evidência ou suposição). Tabela de alternativas. Contas da economia unitária. Riscos em lista. Testes no formato: Acreditamos que… Saberemos que estamos certos quando…",
    rules: ["Marque cada bloco como evidência ou [suposição].", "Contas em moeda local, com [estimativa] quando necessário."],
    materials: ["bmc", "bmNavigator", "monetizing", "vpc"]
  },
  {
    id: "stress", lens: "avancar", name: "Stress test", board: "decisao",
    blocker: "Não sei se o projeto se sustenta",
    desc: "Pré-mortem, advogado do diabo e decisão de seguir, ajustar ou parar.",
    fields: [{ id: "hipoteses", label: "Hipóteses principais", fromBase: "hipoteses", long: true }],
    role: "Você é um(a) investidor(a) cético(a) e advogado(a) do diabo, usando o pré-mortem de Gary Klein.",
    steps: [
      "Imagine que o projeto falhou daqui a 12 meses e liste de 8 a 10 motivos plausíveis.",
      "Avalie cada motivo por probabilidade e impacto.",
      "Para os 3 maiores riscos, diga que evidência hoje os reduz ou os agrava.",
      "Teste a coerência entre cliente, problema, solução, modelo de receita e canal.",
      "Recomende: seguir, ajustar ou parar, com o raciocínio.",
      "Liste as condições que mudariam a recomendação."
    ],
    format: "Resumo de 4 linhas com a recomendação. Tabela: Motivo da falha | Probabilidade | Impacto | Evidência atual | Mitigação. Lista das incoerências. Recomendação em destaque. Condições em lista.",
    rules: ["Seja duro com o projeto, mas use apenas o contexto e a lógica; não invente fatos.", "A recomendação precisa citar os riscos que a justificam."],
    materials: ["premortem", "leanStartup", "pgIdeas", "bmc"]
  },
  {
    id: "pitch", lens: "avancar", name: "Pitch para decisão", board: "decisao",
    blocker: "Vou apresentar para investidores ou patrocinadores",
    desc: "Uma página para patrocinador, sócio ou investidor decidir o próximo passo.",
    fields: [{ id: "pedido", label: "O que você vai pedir", ph: "Ex.: 60 dias e R$ 20 mil para um piloto com 10 clínicas" }, { id: "publico", label: "Para quem vai apresentar", ph: "Ex.: investidores-anjo, comitê de inovação, sócio" }],
    role: "Você é um(a) especialista em comunicação para decisão, com a estrutura de narrativa da Sequoia e a clareza da regra 10/20/30 de Guy Kawasaki.",
    steps: [
      "Defina a decisão que o público precisa tomar e a mensagem central em uma frase.",
      "Escreva o documento de uma página: problema, evidência reunida até aqui, o que ainda é incerto, o pedido e o que será entregue em troca, com prazo.",
      "Aponte as lacunas de evidência que o público vai perceber e como tratá-las com honestidade.",
      "Antecipe as 8 perguntas mais difíceis e as respostas.",
      "Se houver apresentação, sugira um roteiro curto de até 10 slides a partir da página.",
      "Escreva a versão falada de 2 minutos."
    ],
    format: "Resumo de 3 linhas. Decisão e mensagem central em destaque. Documento de uma página em seções. Lacunas em lista. Tabela: Pergunta | Resposta. Roteiro de slides em lista (opcional). Pitch de 2 minutos em texto corrido.",
    rules: ["Não infle números: use só os do contexto e marque projeções como [estimativa].", "O pedido precisa dizer o que será alcançado com ele e em quanto tempo."],
    materials: ["sequoiaPlan", "kawasaki", "tam", "whyNow", "bmc"]
  }
];

/* ---------------- montagem dos prompts (funções puras) ---------------- */
MESA.contextFields = function (project) {
  return MESA.CONTEXT_FIELDS.filter(function (f) { return !f.kind || f.kind === (project && project.kind); });
};
MESA.baseFilledCount = function (project) {
  var ctx = (project && project.context) || {};
  var fields = MESA.contextFields(project);
  return { filled: fields.filter(function (f) { return String(ctx[f.id] || "").trim(); }).length, total: fields.length };
};
/* Campos próprios começam com o valor da base (fromBase) */
MESA.initialInputs = function (tool, project) {
  var ctx = (project && project.context) || {}, out = {};
  (tool.fields || []).forEach(function (f) { if (f.fromBase && ctx[f.fromBase]) out[f.id] = String(ctx[f.fromBase]); });
  return out;
};
/* Junta base e campos próprios: campo próprio vazio não apaga o valor da base */
MESA.mergeValues = function (base, inputs) {
  var out = {}; Object.keys(base || {}).forEach(function (k) { out[k] = base[k]; });
  Object.keys(inputs || {}).forEach(function (k) { if (String(inputs[k] || "").trim()) out[k] = inputs[k]; });
  return out;
};
function tipoLabel(v) { var f = MESA.CONTEXT_FIELDS.filter(function (x) { return x.id === "tipo"; })[0]; var o = (f.options || []).filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : v; }
/* Bloco de contexto: só campos preenchidos, sem repetir, base primeiro e depois os campos próprios */
MESA.contextBlock = function (tool, project, inputs) {
  var ctx = (project && project.context) || {}, lines = [], seen = {};
  var add = function (id, label, value) {
    var v = String(value == null ? "" : value).trim(); if (!v || seen[id]) return; seen[id] = 1;
    if (id === "tipo") v = tipoLabel(v);
    if (id === "transcricao" && v.indexOf("---") !== -1) {
      lines.push("- **" + label + "**:"); v.split(/\n?\s*---+\s*\n?/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x, i) { lines.push("  - Entrevista " + (i + 1) + ":\n    " + x.replace(/\n/g, "\n    ")); }); return;
    }
    lines.push("- **" + label + "**: " + (v.indexOf("\n") !== -1 ? "\n  " + v.replace(/\n/g, "\n  ") : v));
  };
  if (project && project.name) add("_nome", "Projeto", project.name);
  var merged = MESA.mergeValues(ctx, {});
  (tool.fields || []).forEach(function (f) { if (f.fromBase && String((inputs || {})[f.id] || "").trim()) merged[f.fromBase] = inputs[f.id]; });
  MESA.contextFields(project).forEach(function (f) { add(f.id, f.label, merged[f.id]); });
  (tool.fields || []).forEach(function (f) { if (!f.fromBase) add(f.id, f.label, (inputs || {})[f.id]); });
  if (lines.length <= (project && project.name ? 1 : 0)) lines.push("_(o contexto ainda não foi preenchido: antes de qualquer análise, faça as perguntas necessárias para entender o negócio)_");
  return lines.join("\n");
};
MESA.materialsBlock = function (keys) {
  return (keys || []).map(function (k) {
    var m = MESA.MATERIALS[k]; if (!m) return "";
    return "- **" + m.name + "**" + (m.url ? ": " + m.url : "") + "\n  " + m.desc + " _(" + m.label + " · Etapa: " + m.stage + ")_";
  }).filter(Boolean).join("\n");
};
MESA.BASE_RULES = [
  "Responda em português do Brasil, em Markdown, direto ao ponto.",
  "Seja específico para este caso: nada de conselhos genéricos que serviriam para qualquer negócio.",
  "Se o contexto estiver incompleto, liste primeiro as suposições que você fez e as perguntas que mudariam a resposta.",
  "Separe fatos do contexto de suposições suas. Marque números estimados com **[estimativa]**."
];
MESA.composePrompt = function (tool, project, inputs) {
  var kind = project && project.kind === "inovacao" ? "um projeto de inovação dentro de uma organização" : "um projeto empreendedor";
  return [
    "# " + tool.name, "",
    "## Seu papel",
    tool.role + " Você está apoiando " + kind + " que usa o método Zero to First: do zero ao primeiro cliente pagante, uma decisão por vez.", "",
    "## Contexto (informado pelo founder)",
    MESA.contextBlock(tool, project, inputs), "",
    "## Embasamento",
    "Use estes frameworks como base da análise. Ao aplicar um deles, diga qual está usando. Não invente dados nem fontes: quando algo for estimativa, marque **[estimativa]**; quando faltar informação, diga o que falta e como o founder pode obtê-la.",
    MESA.materialsBlock(tool.materials), "",
    "## Sua tarefa",
    tool.steps.map(function (s, i) { return (i + 1) + ". " + s; }).join("\n"), "",
    "## Formato da resposta",
    tool.format, "",
    "## Regras",
    MESA.BASE_RULES.concat(tool.rules || []).map(function (r) { return "- " + r; }).join("\n")
  ].join("\n");
};
MESA.buildPrompt = MESA.composePrompt;

/* Nome do arquivo .md: <objetivo>-<projeto>, sem acento, até 40 caracteres no trecho do projeto */
MESA.slugify = function (s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "");
};
MESA.mdFilename = function (tool, project) { return tool.id + "-" + (MESA.slugify(project && project.name) || "projeto") + ".md"; };

/* Prompt do radar: busca sinais externos relacionados ao projeto */
MESA.RADAR_PROMPT = {
  task: "Faça uma varredura de sinais relacionados a este projeto que possam gerar insights: startups e negócios comparáveis (no Brasil e fora), movimentos de grandes empresas, tendências, mudanças regulatórias, comportamentos emergentes de clientes e analogias de outros setores. Priorize o que pode mudar uma decisão do projeto.",
  format: "Uma lista de 8 a 12 sinais. Cada sinal em um item separado, começando com '- **Título curto**', seguido de 2 a 3 frases: o que é, por que importa para este projeto e que pergunta ou teste ele sugere. Quando citar empresas, números ou datas, indique a fonte; se não tiver certeza, marque [verificar]."
};
MESA.buildRadarPrompt = function (project) {
  return MESA.composePrompt({ name: "Radar de sinais", role: "Você é um(a) analista de tendências e inteligência de mercado.", fields: [], materials: ["whyNow", "tam", "pgIdeas"], steps: [MESA.RADAR_PROMPT.task], format: MESA.RADAR_PROMPT.format, rules: [] }, project, {});
};
