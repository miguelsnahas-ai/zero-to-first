/* =============================================================
   MESA DE TRABALHO · aplicação
   SPA estática (GitHub Pages) + Supabase (login e dados).
   ============================================================= */
(function () {
  "use strict";

  /* ---------------- CONFIGURAÇÃO ---------------- */
  var CONFIG = {
    supabaseUrl: "https://urdgezmqopcvxtaupdgz.supabase.co",
    // Chave pública (anon). Os dados são protegidos por RLS: cada pessoa só acessa os próprios.
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZGdlem1xb3Bjdnh0YXVwZGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDUzMDUsImV4cCI6MjA5NzEyMTMwNX0.Lwb1lgEWG2lkbvsuHfeEVHeVnOBV3aaosAv8oLQ4h3E",
    // Link de agendamento da mentoria (Google Agenda). Vazio = o pedido fica registrado e Miguel responde por e-mail.
    mentoriaUrl: "https://calendar.app.google/6Qih7Yp9AqVi8UQE8",
    contato: "miguelsnahas@gmail.com",
    // Acesso pago: com true, só entra quem tem compra registrada na tabela entitlements (ver README).
    // Deixe false enquanto o link de pagamento não estiver ativo no toolkit.
    requirePurchase: false,
    checkoutUrl: "../toolkit/#oferta"
  };

  var sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  var $app = document.getElementById("app");
  var state = { generations: [], genFor: null, session: null, projects: [], p: null, artifacts: [], board: [], radar: [], pedidos: [], workspaces: [], toolFilter: "todas", boardFilter: "todas", tTab: {}, aiVar: {} };
  var LENS = {}; MESA.LENSES.forEach(function (l) { LENS[l.id] = l; });
  var TOOL = {}; MESA.TOOLS.forEach(function (t) { TOOL[t.id] = t; });

  /* ---------------- utilidades ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function md(s) { return window.DOMPurify.sanitize(window.marked.parse(s || "", { breaks: true })); }
  function ast() { return '<svg class="ast" aria-hidden="true" viewBox="0 0 20 20"><path d="M10 1.5v17M2.64 5.75l14.72 8.5M2.64 14.25l14.72-8.5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg>'; }
  function fmtDate(d) { try { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); } catch (e) { return ""; } }
  function toast(text) { var t = document.getElementById("toast"); t.textContent = text; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2600); }
  function track(event, props) { try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event: event }, props || {})); } catch (e) {} }
  function fail(err) { console.error(err); toast("Algo deu errado: " + (err && err.message ? err.message : "tente de novo")); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } finally { ta.remove(); } return Promise.resolve();
  }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function counts() { var c = {}; state.artifacts.forEach(function (a) { if (a.stage) c[a.stage] = (c[a.stage] || 0) + 1; }); return c; }

  /* ---------------- modal ---------------- */
  function modal(html, onMount, opts) {
    var wrap = document.createElement("div"); wrap.className = "modal"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true");
    wrap.innerHTML = '<div class="modal-box">' + html + "</div>";
    function close() { wrap.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    wrap.addEventListener("click", function (e) { if ((e.target === wrap && !(opts && opts.sticky)) || e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    var first = wrap.querySelector("input, textarea, select, button"); if (first) first.focus();
    if (onMount) onMount(wrap, close);
    return close;
  }

  /* ---------------- dados ---------------- */
  function loadProjects() {
    return sb.from("projects").select("*").order("updated_at", { ascending: false }).then(function (r) { if (r.error) throw r.error; state.projects = r.data; });
  }
  function loadProject(id) {
    return Promise.all([
      sb.from("projects").select("*").eq("id", id).maybeSingle(),
      sb.from("artifacts").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      sb.from("board_items").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      sb.from("radar_items").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      sb.from("mentoria_pedidos").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      sb.from("tool_workspaces").select("*").eq("project_id", id)
    ]).then(function (rs) {
      rs.forEach(function (r) { if (r.error) throw r.error; });
      if (!rs[0].data) throw new Error("Projeto não encontrado.");
      state.p = rs[0].data; state.artifacts = rs[1].data; state.board = rs[2].data; state.radar = rs[3].data; state.pedidos = rs[4].data; state.workspaces = rs[5].data || [];
    });
  }
  // Contexto: salva 700ms depois da última digitação, ou na hora ao trocar de tela
  var ctxTimer = null;
  function flushContext() {
    if (!ctxTimer || !state.p) return; clearTimeout(ctxTimer); ctxTimer = null;
    sb.from("projects").update({ context: state.p.context }).eq("id", state.p.id).then(function (r) { if (r.error) fail(r.error); });
  }
  function saveContext() { clearTimeout(ctxTimer); ctxTimer = setTimeout(function () { ctxTimer = 1; flushContext(); }, 700); }
  window.addEventListener("beforeunload", flushContext);

  /* ---------------- roteamento ---------------- */
  function parse() {
    var h = location.hash.replace(/^#\/?/, "").split("?")[0];
    var parts = h.split("/").filter(Boolean);
    return parts;
  }
  var RECOVERY = /type=recovery/.test(location.hash);
  function route() {
    var parts = parse();
    if (RECOVERY) return state.session ? renderNewPassword() : ($app.innerHTML = '<div class="loading">Validando o link…</div>');
    if (!state.session) return renderAuth(/[?&](email|pago)=/.test(location.hash) ? "criar" : "entrar");
    if (CONFIG.requirePurchase && state.entitled !== true) return checkAccess();
    if (parts[0] !== "p" || !parts[1]) return renderProjects();
    var id = parts[1], tab = parts[2] || "mesa", sub = parts[3];
    var ready = state.p && state.p.id === id ? Promise.resolve() : (($app.innerHTML = '<div class="loading">Carregando projeto…</div>'), loadProject(id));
    ready.then(function () { renderProject(tab, sub); }).catch(function (e) { fail(e); go("#/"); });
  }
  window.addEventListener("hashchange", function () { flushContext(); flushWorkspace(); route(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !document.querySelector(".modal") && document.body.classList.contains("sheet-open")) closeSheet(); });

  /* ---------------- topo ---------------- */
  function topbar(crumb) {
    return '<header class="topbar"><a class="brand" href="#/">Mesa de Trabalho' + ast() + '</a>' +
      '<nav class="crumb" aria-label="Você está em">' + (crumb || "") + "</nav><span class=\"spacer\"></span>" +
      '<a class="btn btn-ghost btn-sm" href="https://miguelsnahas-ai.github.io/" title="Site do Miguel">Site</a>' +
      '<button class="btn btn-ghost btn-sm" data-act="logout">Sair</button></header>';
  }

  /* ================= ACESSO ================= */
  /* Confere se a pessoa tem compra registrada (só quando CONFIG.requirePurchase = true) */
  function checkAccess() {
    $app.innerHTML = '<div class="loading">Conferindo seu acesso…</div>';
    sb.from("entitlements").select("id").limit(1).then(function (r) {
      if (!r.error && r.data && r.data.length) { state.entitled = true; return route(); }
      state.entitled = false; renderPaywall();
    });
  }
  function renderPaywall() {
    var email = (state.session && state.session.user && state.session.user.email) || "";
    $app.innerHTML = '<div class="gate"><div class="gate-card"><a class="brand" href="../toolkit/">Mesa de Trabalho' + ast() + '</a>' +
      '<h1>Falta liberar o seu acesso</h1><p>Não encontramos uma compra da Mesa de Trabalho para <b>' + esc(email) + '</b>. Se você já pagou com outro e-mail, escreva para a gente.</p>' +
      '<div class="row"><a class="btn btn-accent" href="' + esc(CONFIG.checkoutUrl) + '">Comprar acesso</a><button class="btn btn-line" data-gate="again">Já paguei, conferir de novo</button></div>' +
      '<p class="small muted">Dúvidas: <a href="mailto:' + CONFIG.contato + '">' + CONFIG.contato + '</a> · <button class="linkbtn" data-act="logout">Sair</button></p></div></div>';
    $app.querySelector("[data-gate=again]").onclick = function () { state.entitled = null; checkAccess(); };
  }
  /* Nova senha, depois do link de recuperação enviado por e-mail */
  function renderNewPassword() {
    $app.innerHTML = '<div class="gate"><div class="gate-card"><a class="brand" href="../toolkit/">Mesa de Trabalho' + ast() + '</a><h1>Crie uma nova senha</h1>' +
      '<form class="form" id="np-form" novalidate><label class="field"><span>Nova senha</span><input class="input" name="senha" type="password" autocomplete="new-password" minlength="8" required></label>' +
      '<div class="msg" id="np-msg" hidden></div><button class="btn btn-primary" type="submit">Salvar e entrar</button></form></div></div>';
    var f = document.getElementById("np-form"), msg = document.getElementById("np-msg");
    f.onsubmit = function (e) {
      e.preventDefault(); var pw = f.senha.value;
      if (pw.length < 8) { msg.textContent = "A senha precisa ter pelo menos 8 caracteres."; msg.className = "msg err"; msg.hidden = false; return; }
      f.querySelector("button").disabled = true;
      sb.auth.updateUser({ password: pw }).then(function (r) {
        f.querySelector("button").disabled = false;
        if (r.error) { msg.textContent = r.error.message; msg.className = "msg err"; msg.hidden = false; return; }
        RECOVERY = false; track("password_reset_done"); history.replaceState(null, "", location.pathname + "#/"); toast("Senha atualizada."); route();
      });
    };
  }

  /* ================= AUTH ================= */
  function renderAuth(mode) {
    mode = mode || "entrar";
    var qs = new URLSearchParams((location.hash.split("?")[1]) || location.search.slice(1));
    var email = qs.get("email") || "";
    $app.innerHTML =
      '<div class="auth"><section class="auth-side">' +
        '<a class="brand" href="../toolkit/">Mesa de Trabalho' + ast() + '</a>' +
        '<div><h1>Seu projeto, <em>uma decisão</em> por vez.</h1>' +
        '<p>Crie projetos, use as ferramentas do método Zero to First com a sua IA preferida e acompanhe hipóteses, experimentos e evidências num só lugar.</p></div>' +
        '<ul><li>Ferramentas que montam o prompt com o contexto do projeto</li><li>Um próximo passo claro, do primeiro cliente à tração</li><li>Radar de sinais e próximos movimentos</li><li>Mentoria com o Miguel quando precisar</li></ul>' +
      '</section><main class="auth-main"><div class="auth-card">' +
        '<div class="tabs" role="tablist"><button role="tab" data-mode="entrar" aria-selected="' + (mode === "entrar") + '">Entrar</button><button role="tab" data-mode="criar" aria-selected="' + (mode === "criar") + '">Criar conta</button></div>' +
        '<form class="form" id="auth-form" novalidate>' +
          (/[?&]pago=1/.test(location.hash) ? '<p class="msg ok">Pagamento confirmado. ' + (mode === "criar" ? "Crie sua conta com o mesmo e-mail usado na compra." : "Entre com o e-mail usado na compra.") + "</p>" : "") +
          '<h2>' + (mode === "entrar" ? "Bem-vindo de volta" : (CONFIG.requirePurchase ? "Crie sua conta" : "Crie sua conta gratuita")) + '</h2>' +
          '<label class="field"><span>E-mail</span><input class="input" name="email" type="email" autocomplete="email" required value="' + esc(email) + '"></label>' +
          '<label class="field"><span>Senha</span><input class="input" name="senha" type="password" autocomplete="' + (mode === "entrar" ? "current-password" : "new-password") + '" minlength="8" required>' + (mode === "criar" ? "<small>Mínimo de 8 caracteres.</small>" : "") + '</label>' +
          '<div class="msg" id="auth-msg" hidden></div>' +
          '<button class="btn btn-primary" type="submit">' + (mode === "entrar" ? "Entrar" : "Criar conta e entrar") + '</button>' +
          (mode === "entrar" ? '<p class="small muted"><button type="button" class="linkbtn" data-forgot>Esqueci minha senha</button></p>' :
            '<p class="small muted">Ao criar a conta, você concorda com os <a href="../termos.html">termos de uso</a> e a <a href="../privacidade.html">política de privacidade</a>.</p>') +
        "</form></div></main></div>";
    $app.querySelectorAll("[data-mode]").forEach(function (b) { b.onclick = function () { renderAuth(b.dataset.mode); }; });
    var form = document.getElementById("auth-form"), msg = document.getElementById("auth-msg");
    function say(t, cls) { msg.textContent = t; msg.className = "msg " + cls; msg.hidden = false; }
    var forgot = $app.querySelector("[data-forgot]");
    if (forgot) forgot.onclick = function () {
      var em = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { form.email.focus(); return say("Digite o seu e-mail acima e clique de novo em Esqueci minha senha.", "err"); }
      forgot.disabled = true;
      sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }).then(function (r) {
        forgot.disabled = false;
        if (r.error) return say(/rate|seconds/i.test(r.error.message) ? "Aguarde um pouco antes de pedir outro link." : r.error.message, "err");
        track("password_reset_requested"); say("Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha.", "ok");
      });
    };
    form.onsubmit = function (e) {
      e.preventDefault();
      var em = form.email.value.trim(), pw = form.senha.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return say("Informe um e-mail válido.", "err");
      if (pw.length < 8) return say("A senha precisa ter pelo menos 8 caracteres.", "err");
      var btn = form.querySelector("button[type=submit]"); btn.disabled = true;
      var p = mode === "entrar" ? sb.auth.signInWithPassword({ email: em, password: pw }) : sb.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: location.origin + location.pathname } });
      p.then(function (r) {
        btn.disabled = false;
        if (r.error) {
          var m = r.error.message || "";
          if (/Invalid login/i.test(m)) return say("E-mail ou senha incorretos.", "err");
          if (/already registered/i.test(m)) return say("Esse e-mail já tem conta. Use a aba Entrar.", "err");
          if (/Email not confirmed/i.test(m)) return say("Sua conta ainda não foi confirmada. Procure o link de confirmação no seu e-mail ou escreva para " + CONFIG.contato + ".", "err");
          return say(m, "err");
        }
        if (mode === "criar" && !r.data.session) return say("Conta criada. Confirme pelo link enviado ao seu e-mail para entrar.", "ok");
        track(mode === "entrar" ? "app_login" : "app_signup");
      });
    };
  }

  /* ================= PROJETOS ================= */
  function renderProjects() {
    $app.innerHTML = topbar("<strong>Projetos</strong>") + '<div class="page"><div class="loading">Carregando…</div></div>';
    loadProjects().then(function () {
      var cards = state.projects.map(function (p) {
        return '<a class="pcard" href="#/p/' + p.id + '"><div class="row"><span class="chip ' + (p.kind === "inovacao" ? "plum" : "pers") + '">' + (p.kind === "inovacao" ? "Inovação" : "Empreendedor") + '</span><span class="chip">Foco: ' + esc(LENS[p.focus].name) + "</span></div>" +
          "<h3>" + esc(p.name) + "</h3><p class=\"small muted\">" + esc((p.context && p.context.ideia) || "Sem descrição ainda") + '</p><span class="small muted" style="margin-top:auto">Atualizado em ' + fmtDate(p.updated_at) + "</span></a>";
      }).join("");
      $app.querySelector(".page").innerHTML =
        '<div class="page-head"><div><p class="label">Mesa de Trabalho</p><h1>Seus projetos</h1></div><button class="btn btn-primary" data-act="new-project">+ Novo projeto</button></div>' +
        (state.projects.length ? '<div class="grid-cards">' + cards + "</div>" :
          '<div class="empty first-project"><span class="wel-arts">' + ["roteiro", "csd", "mvp", "first"].map(MESA.deskArt).join("") + '</span><h2>Monte a mesa do seu primeiro projeto</h2><p>Um negócio que você quer tirar do papel ou um projeto de inovação na sua organização. Em poucos minutos, o assistente reúne o contexto e indica por onde começar.</p><button class="btn btn-accent" data-act="new-project">Criar meu primeiro projeto</button></div>');
    }).catch(fail);
  }

  /* ---------- Novo projeto: assistente em etapas ---------- */
  function newProjectModal() {
    var wz = { name: "", kind: "empreendedor", start: "", ctx: {}, hipotese: "" }, step = 0;
    var FIELD = {}; MESA.CONTEXT_FIELDS.forEach(function (f) { FIELD[f.id] = f; });
    var STEPS = [{ title: "Começo" }]; /* começo rápido: o resto da base é preenchido dentro de cada objetivo */
    function fieldHtml(id) {
      var f = FIELD[id]; if (!f || (f.kind && f.kind !== wz.kind)) return "";
      var v = wz.ctx[id] || "", a = 'data-w="' + id + '" placeholder="' + esc(f.ph || "") + '"';
      var input = f.options ? '<select class="select" data-w="' + id + '">' + f.options.map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>"
        : f.long ? '<textarea class="textarea" ' + a + ">" + esc(v) + "</textarea>" : '<input class="input" ' + a + ' value="' + esc(v) + '">';
      return '<label class="field"><span>' + esc(f.label) + "</span><small>" + esc(f.hint || "") + "</small>" + input + "</label>";
    }
    function filledCount() { return MESA.CONTEXT_FIELDS.filter(function (f) { return (!f.kind || f.kind === wz.kind) && (wz.ctx[f.id] || "").trim(); }).length; }
    function totalFields() { return MESA.CONTEXT_FIELDS.filter(function (f) { return !f.kind || f.kind === wz.kind; }).length; }
    function body() {
      var s = STEPS[step];
      if (step === 0) return '<h2>Novo projeto</h2><p class="muted">Só o essencial para começar. O resto da base do negócio você completa quando precisar, dentro de cada objetivo.</p>' +
        '<label class="field"><span>Nome do projeto</span><input class="input" data-wn="name" maxlength="120" placeholder="Ex.: Caixa da Clínica" value="' + esc(wz.name) + '"></label>' +
        '<div class="field"><span>Tipo</span><div class="seg wseg" role="radiogroup" aria-label="Tipo de projeto"><button type="button" role="radio" data-kind="empreendedor" aria-checked="' + (wz.kind === "empreendedor") + '">Projeto empreendedor</button><button type="button" role="radio" data-kind="inovacao" aria-checked="' + (wz.kind === "inovacao") + '">Inovação em uma organização</button></div></div>' +
        fieldHtml("ideia") +
        '<details class="wimport"' + (wz.importOpen ? " open" : "") + '><summary><b>Atalho:</b> já tem um texto sobre o projeto? Pitch, resumo ou one-pager.</summary>' +
          '<p class="small muted">Cole o texto, use o prompt na sua IA e cole a resposta: o assistente preenche os campos para você revisar. A IA não roda dentro da Mesa.</p>' +
          '<textarea class="textarea" id="wz-src" placeholder="Cole aqui o texto sobre o projeto">' + esc(wz.src || "") + '</textarea>' +
          '<div class="row"><button type="button" class="btn btn-line btn-sm" data-wact="prompt">Copiar prompt</button><a class="btn btn-ghost btn-sm" id="wz-claude" target="_blank" rel="noopener">Abrir no Claude</a><a class="btn btn-ghost btn-sm" id="wz-gpt" target="_blank" rel="noopener">Abrir no ChatGPT</a></div>' +
          '<textarea class="textarea" id="wz-ans" placeholder="Cole aqui a resposta da IA"></textarea>' +
          '<div class="row"><span class="spacer"></span><button type="button" class="btn btn-accent btn-sm" data-wact="import">Preencher com a resposta</button></div></details>';
      if (step === 1) return '<h2>Em que momento o projeto está?</h2><p class="muted">Define por onde a mesa começa. Não é uma trilha: você pode visitar qualquer etapa depois.</p><div class="starts">' +
        MESA.STARTS.map(function (st) { var t = TOOL[st.tool]; return '<button type="button" class="start' + (wz.start === st.id ? " is-on" : "") + '" data-start="' + st.id + '"><span class="start-art">' + MESA.deskArt(st.tool) + "</span><span><b>" + esc(st.title) + "</b><small>" + esc(st.desc) + '</small><em>Fase ' + MESA.PHASES.filter(function (p) { return p.lenses.indexOf(st.lens) !== -1; })[0].n + " · começa por " + esc(t.name) + "</em></span></button>"; }).join("") + "</div>";
      if (s.fields) return "<h2>" + esc(s.title) + '</h2><p class="muted">' + esc(s.lead) + "</p>" + s.fields.map(fieldHtml).join("") +
        (s.id === "evidencias" ? '<label class="field"><span>Sua aposta mais arriscada</span><small>O que precisa ser verdade para o projeto dar certo e ainda não foi provado? Entra na base do negócio.</small><input class="input" data-wh="1" placeholder="Ex.: donas de clínica pagariam R$ 99/mês para não esquecer cobranças" value="' + esc(wz.hipotese) + '"></label>' : "");
      var st = MESA.STARTS.filter(function (x) { return x.id === wz.start; })[0] || MESA.STARTS[0], rec = TOOL[st.tool], n = filledCount(), tot = totalFields();
      return '<h2>Sua mesa está pronta</h2><div class="wdone"><div class="wmeter"><b>' + n + "/" + tot + '</b><span>campos de contexto</span><span class="pbar"><i style="width:' + Math.round(n / tot * 100) + '%"></i></span>' +
        (n < 6 ? '<small class="muted">Dá para completar depois na base do negócio. Os prompts ficam mais precisos com pelo menos 6 campos.</small>' : '<small class="muted">Ótimo ponto de partida.</small>') + "</div>" +
        '<div class="wrec"><span class="start-art">' + MESA.deskArt(rec.id) + '</span><div><p class="label">Primeiro objetivo sugerido</p><b>' + esc(rec.name) + "</b><p>" + esc(rec.desc) + "</p></div></div>" +
        (wz.hipotese ? '<p class="small">Sua aposta mais arriscada entra na base do negócio: <b>“' + esc(wz.hipotese) + '”</b></p>' : "") + "</div>";
    }
    function nav() {
      var last = step === STEPS.length - 1;
      return '<div class="wnav">' + (step ? '<button type="button" class="btn btn-ghost" data-wact="back">Voltar</button>' : '<button type="button" class="btn btn-ghost" data-close>Cancelar</button>') + '<span class="spacer"></span>' +
        (step >= 1 && !last ? '<button type="button" class="btn btn-ghost" data-wact="create">Criar agora e completar depois</button>' : "") +
        (last ? '<button type="button" class="btn btn-accent" data-wact="create">Criar e abrir a Mesa</button>' : '<button type="button" class="btn btn-primary" data-wact="next">' + (step === 0 ? "Continuar" : "Próximo") + "</button>") + "</div>";
    }
    modal('<div class="wizard"><ol class="wsteps"' + (STEPS.length < 2 ? " hidden" : "") + '>' + STEPS.map(function (s, i) { return "<li data-i=\"" + i + "\">" + esc(s.short || s.title) + "</li>"; }).join("") + '</ol><div class="wbody"></div><div class="wfoot"></div></div>', function (box, close) {
      box.classList.add("wide");
      var b = box.querySelector(".wbody"), foot = box.querySelector(".wfoot");
      function collect() {
        box.querySelectorAll("[data-w]").forEach(function (el) { var v = el.value.trim(); if (v) wz.ctx[el.dataset.w] = v; else delete wz.ctx[el.dataset.w]; });
        var n = box.querySelector("[data-wn]"); if (n) wz.name = n.value.trim();
        var h = box.querySelector("[data-wh]"); if (h) wz.hipotese = h.value.trim();
        var src = box.querySelector("#wz-src"); if (src) wz.src = src.value;
      }
      function promptLinks() {
        var src = box.querySelector("#wz-src"); if (!src) return;
        var upd = function () { var q = encodeURIComponent(MESA.importPrompt(src.value, wz.kind)); box.querySelector("#wz-claude").href = "https://claude.ai/new?q=" + q; box.querySelector("#wz-gpt").href = "https://chatgpt.com/?q=" + q; };
        src.oninput = upd; upd();
      }
      function render() {
        b.innerHTML = body(); foot.innerHTML = nav();
        box.querySelectorAll(".wsteps li").forEach(function (li, i) { li.className = i === step ? "is-cur" : i < step ? "is-done" : ""; });
        promptLinks(); var first = b.querySelector("input, textarea, select"); if (first && step !== 1) first.focus();
        box.scrollTop = 0;
      }
      function create(btn) {
        collect();
        if (!wz.name) { step = 0; render(); toast("Dê um nome ao projeto."); return box.querySelector("[data-wn]").focus(); }
        var st = MESA.STARTS.filter(function (x) { return x.id === wz.start; })[0];
        btn.disabled = true;
        if (wz.hipotese && !String(wz.ctx.hipoteses || "").trim()) wz.ctx.hipoteses = wz.hipotese;
        sb.from("projects").insert({ name: wz.name, kind: wz.kind, focus: st ? st.lens : "entender", context: wz.ctx }).select().single().then(function (r) {
          if (r.error) { btn.disabled = false; return fail(r.error); }
          var pid = r.data.id;
          track("project_created", { kind: wz.kind, start: wz.start || "nao_informado", context_fields: filledCount(), imported: !!wz.imported });
          var after = Promise.resolve({});
          return after.then(function (r2) {
            if (r2 && r2.error) fail(r2.error);
            try { sessionStorage.setItem("mesa-novo-" + pid, "1"); } catch (e) {}
            close(); state.p = null; go("#/p/" + pid);
          });
        });
      }
      box.addEventListener("click", function (e) {
        var t = e.target.closest("button"); if (!t) return;
        if (t.dataset.kind) { collect(); wz.kind = t.dataset.kind; render(); }
        else if (t.dataset.start) { wz.start = t.dataset.start; box.querySelectorAll(".start").forEach(function (x) { x.classList.toggle("is-on", x === t); }); }
        else if (t.dataset.wact === "next") { collect(); if (step === 0 && !wz.name) { toast("Dê um nome ao projeto."); return box.querySelector("[data-wn]").focus(); } if (step === 1 && !wz.start) return toast("Escolha o momento do projeto."); step++; render(); }
        else if (t.dataset.wact === "back") { collect(); step--; render(); }
        else if (t.dataset.wact === "create") create(t);
        else if (t.dataset.wact === "prompt") { var src = box.querySelector("#wz-src").value.trim(); if (!src) return toast("Cole o texto do projeto primeiro."); copy(MESA.importPrompt(src, wz.kind)).then(function () { toast("Prompt copiado. Cole na sua IA."); }); }
        else if (t.dataset.wact === "import") {
          var got = MESA.parseImport(box.querySelector("#wz-ans").value), keys = Object.keys(got);
          if (!keys.length) return toast("Não encontrei campos na resposta. Confira se ela veio no formato “Campo: valor”.");
          collect(); if (got.hipotese) { wz.hipotese = wz.hipotese || got.hipotese; delete got.hipotese; }
          Object.keys(got).forEach(function (k) { if (FIELD[k] && !wz.ctx[k]) wz.ctx[k] = got[k]; });
          wz.imported = true; wz.importOpen = false; render(); toast(keys.length + " campo(s) preenchido(s). Eles vão para a base do negócio."); track("project_context_imported", { n: keys.length });
        }
      });
      box.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); var nx = box.querySelector('[data-wact="next"]') || box.querySelector('[data-wact="create"]'); if (nx) nx.click(); } });
      render();
    }, { sticky: true });
  }



  /* ================= PROJETO ================= */
  /* Uma tela principal: a Mesa. Cada bloqueio abre o seu objetivo. O resto fica no menu ··· */
  /* Tela única: a Mesa fica sempre ao fundo e todo o resto abre num painel por cima dela */
  var SHEET_TITLE = { desbloquear: "Objetivo", ferramenta: "Objetivo", artefatos: "Artefatos", artefato: "Artefato", radar: "Radar de sinais", mentoria: "Falar com o Miguel", contexto: "Base do negócio" };
  function scroller(el) { var b = el && el.closest && el.closest(".sheet-body"); return b || null; }
  function getScroll(el) { var b = scroller(el); return b ? b.scrollTop : window.scrollY; }
  function setScroll(el, y) { var b = scroller(el); if (b) b.scrollTop = y; else window.scrollTo(0, y); }
  function closeSheet() { location.hash = "#/p/" + state.p.id + "/mesa"; }
  function renderProject(tab, sub) {
    var p = state.p, base = "#/p/" + p.id + "/";
    if (tab === "visao" || tab === "ferramentas" || !tab) { history.replaceState(null, "", base + "mesa"); tab = "mesa"; }
    var fresh = state.shellFor !== p.id || !document.getElementById("main");
    if (fresh) {
      var menu = '<div class="more"><button class="more-btn" aria-haspopup="true" aria-expanded="false" aria-label="Mais opções" data-more>···</button><div class="more-pop" role="menu" hidden>' +
        '<a role="menuitem" href="' + base + 'contexto">Base do negócio</a>' +
        '<a role="menuitem" href="' + base + 'artefatos">Artefatos</a>' +
        '<a role="menuitem" href="' + base + 'radar">Radar de sinais</a>' +
        '<a role="menuitem" href="' + base + 'mentoria">Falar com o Miguel</a>' +
        '<hr><a role="menuitem" href="#/">Trocar de projeto</a><a role="menuitem" href="https://miguelsnahas-ai.github.io/">Site do Miguel</a><button role="menuitem" data-act="logout">Sair</button></div></div>';
      $app.innerHTML = '<header class="topbar proj-top"><a class="brand" href="#/" title="Seus projetos">Mesa de Trabalho' + ast() + '</a><a class="pname" href="' + base + 'mesa" title="' + esc(p.name) + '">' + esc(p.name) + '</a><span class="spacer"></span>' + menu + "</header>" +
        '<main class="main solo" id="main"></main>' +
        '<div class="sheet" id="sheet" hidden><div class="sheet-backdrop" data-sheet-close></div><section class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><header class="sheet-head"><p id="sheet-title"></p><button class="sheet-x" data-sheet-close aria-label="Fechar">×</button></header><div class="sheet-body" id="sheet-body"></div></section></div>';
      state.shellFor = p.id; state.mesaDirty = true;
      var btn = $app.querySelector("[data-more]"), pop = $app.querySelector(".more-pop");
      var closeMenu = function () { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); document.removeEventListener("click", outside); };
      var outside = function (e) { if (!e.target.closest(".more")) closeMenu(); };
      btn.onclick = function () { var open = pop.hidden; pop.hidden = !open; btn.setAttribute("aria-expanded", String(open)); if (open) setTimeout(function () { document.addEventListener("click", outside); }); };
      pop.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
      $app.querySelectorAll("[data-sheet-close]").forEach(function (el) { el.onclick = closeSheet; });
    }
    var main = document.getElementById("main"), sheet = document.getElementById("sheet"), body = document.getElementById("sheet-body");
    if (tab === "mesa") {
      var y = window.scrollY;
      sheet.hidden = true; document.body.classList.remove("sheet-open"); body.innerHTML = "";
      viewMesa(main); state.mesaDirty = false;
      if (!fresh) window.scrollTo(0, y); else window.scrollTo(0, 0);
      return;
    }
    if (state.mesaDirty) { viewMesa(main); state.mesaDirty = false; }
    var views = { desbloquear: viewObjetivo, ferramenta: function (m, id) { if (TOOL[id] && TOOL[id].workspace) return viewTraction(m, id); setObjective(TOOL[id] ? id : null); viewObjetivo(m); }, artefatos: viewArtefatos, artefato: viewArtefato, radar: viewRadar, mentoria: viewMentoria, contexto: viewContexto };
    if (!views[tab]) { history.replaceState(null, "", base + "mesa"); return renderProject("mesa"); }
    document.getElementById("sheet-title").textContent = tab === "ferramenta" && TOOL[sub] && TOOL[sub].workspace ? "Tração · área de trabalho" : (SHEET_TITLE[tab] || "");
    sheet.hidden = false; document.body.classList.add("sheet-open");
    body.innerHTML = "";
    var inner = document.createElement("div"); inner.className = "sheet-inner"; body.appendChild(inner);
    views[tab](inner, sub);
    if (!document.getElementById("main")) return; /* uma view pode ter redirecionado para a Mesa */
    if (sheet.hidden) return;
    body.scrollTop = 0;
    var x = sheet.querySelector(".sheet-x"); if (x && !sheet.contains(document.activeElement)) x.focus({ preventScroll: true });
  }


  function head(title, desc, actions) {
    return '<div class="main-head"><div><h1>' + title + "</h1>" + (desc ? "<p>" + desc + "</p>" : "") + "</div>" + (actions ? '<div class="row">' + actions + "</div>" : "") + "</div>";
  }
  function moveButton(m) {
    var a = m.action, href = a.type === "tool" ? "#/p/" + state.p.id + "/ferramenta/" + a.id : a.type === "tab" ? "#/p/" + state.p.id + "/" + a.id : "#/p/" + state.p.id + "/contexto";
    var label = a.type === "tool" ? "Abrir " + TOOL[a.id].name : a.type === "tab" ? "Ir para " + a.id : "Preencher contexto";
    return '<a class="btn btn-accent btn-sm" href="' + href + '">' + esc(label) + " →</a>";
  }

  /* ---------- Mesa ---------- */
  function seenKey() { return "mesa-vista-" + state.p.id; }
  function readSeen() { try { return JSON.parse(localStorage.getItem(seenKey()) || "null"); } catch (e) { return null; } }
  function writeSeen(ids) { try { localStorage.setItem(seenKey(), JSON.stringify(ids)); } catch (e) {} }

  function viewMesa(main) {
    var p = state.p, ctx = p.context || {}, byTool = {};
    state.artifacts.forEach(function (a) { if (a.tool_id) (byTool[a.tool_id] = byTool[a.tool_id] || []).push(a); });
    var wip = {}; state.workspaces.forEach(function (w) { if (!byTool[w.tool_id]) wip[w.tool_id] = w.status === "concluido" ? "done" : "wip"; });
    var isDone = function (id) { return !!byTool[id] || wip[id] === "done"; };
    var done = MESA.DESK_ORDER.filter(isDone);
    var seen = readSeen(), fresh = {};
    if (seen) done.forEach(function (id) { if (seen.indexOf(id) === -1) fresh[id] = true; });
    var move = MESA.nextMoves(p, state.artifacts, state.board, state.pedidos, state.workspaces)[0];
    var moveHref = move.action.type === "tool" ? "#/p/" + p.id + "/ferramenta/" + move.action.id : move.action.type === "tab" ? "#/p/" + p.id + "/" + move.action.id : "#/p/" + p.id + "/contexto";
    var moveLabel = move.action.type === "tool" ? TOOL[move.action.id].name : move.action.type === "tab" ? ({ radar: "Rodar o radar", mentoria: "Pedir mentoria" }[move.action.id] || "Abrir") : "Completar a base";
    var rec = move.action.type === "tool" ? move.action.id : null; /* uma única recomendação: o próximo passo */
    var fcWs = state.workspaces.filter(function (w) { return w.tool_id === "first"; })[0];
    var paying = fcWs && MESA.TRACTION_SIGNALS ? MESA.TRACTION_SIGNALS.fcStats(fcWs.data || {}).ganhos : 0;
    var base = MESA.baseFilledCount(p), total = MESA.DESK_ORDER.length, cur = currentPhase();
    var pct = function (a, b) { return b ? Math.round(a / b * 100) : 0; };

    var tile = function (id) {
      var t = TOOL[id], n = (byTool[id] || []).length, st = isDone(id) ? "is-on" : wip[id] ? "is-wip" : "is-empty";
      var sub = n ? (n > 1 ? n + " artefatos" : "Concluído") : wip[id] === "done" ? "Concluído" : wip[id] ? "Em andamento" : id === rec ? "Comece aqui" : t.workspace ? "Área de trabalho" : "Disponível";
      return '<button class="obj ' + st + (fresh[id] ? " is-new" : "") + (id === rec && st === "is-empty" ? " is-reco" : "") + '" data-tool="' + id + '" title="' + esc(t.name + (t.blocker ? ": " + t.blocker : "")) + '">' +
        '<span class="art ico">' + MESA.deskArt(id) + '</span><span class="tag"><b>“' + esc(t.blocker || t.name) + '”</b><small>' + esc(t.name) + " · " + sub + "</small></span>" + (st === "is-on" ? '<span class="tick" aria-label="concluído">✓</span>' : "") + "</button>";
    };
    var phases = MESA.PHASES.map(function (ph) {
      var ids = MESA.DESK_ORDER.filter(function (id) { return TOOL[id] && LENS[TOOL[id].lens].phase === ph.id; }), n = ids.filter(isDone).length;
      return '<section class="pboard' + (ph.id === cur ? " is-cur" : "") + '" aria-label="Fase ' + ph.n + ": " + ph.name + '"><header><span class="pn">' + ph.n + '</span><div><h2>' + ph.name + ' <span class="muted">· ' + ph.pt + "</span></h2><p>" + esc(ph.goal) + '</p></div><div class="pscore"><b>' + n + "/" + ids.length + '</b><span class="xp"><i style="width:' + pct(n, ids.length) + '%"></i></span></div></header>' +
        ph.lenses.map(function (lid) {
          var ls = ids.filter(function (id) { return TOOL[id].lens === lid; });
          return '<div class="drow' + (p.focus === lid ? " is-focus" : "") + '"><p class="lname">' + LENS[lid].name + (p.focus === lid ? " <em>foco</em>" : "") + '</p><div class="objs">' + ls.map(tile).join("") + (lid === "entender" ? '<a class="obj ' + (state.radar.length ? "is-on" : "is-empty") + '" href="#/p/' + p.id + '/radar"><span class="art ico">' + MESA.deskArt("mercado") + '</span><span class="tag"><b>“Quero saber o que está mudando no meu mercado”</b><small>Radar de sinais · ' + (state.radar.length ? state.radar.length + " sinais" : "Disponível") + "</small></span></a>" : "") + "</div></div>";
        }).join("") + "</section>";
    }).join("");

    main.innerHTML =
      '<div class="mhead"><div><p class="label">Mesa de trabalho</p><h1>' + esc(p.name) + '</h1></div>' +
        '<div class="kpis">' +
          '<a class="kpi kpi-main" href="#/p/' + p.id + '/ferramenta/first" title="Registrados em First Customers"><b>' + paying + '</b><span>cliente' + (paying === 1 ? "" : "s") + " pagante" + (paying === 1 ? "" : "s") + "</span></a>" +
          '<div class="kpi"><b>' + done.length + '<small>/' + total + '</small></b><span>objetivos</span></div>' +
          '<a class="kpi" href="#/p/' + p.id + '/contexto"><b>' + base.filled + '<small>/' + base.total + '</small></b><span>base do negócio</span></a>' +
        "</div></div>" +
      '<section class="nextbar"><span class="ico mi">' + (move.action.type === "tool" ? MESA.deskArt(move.action.id) : "") + '</span><div><p class="label">Próximo passo</p><b>' + esc(move.text) + '</b></div><a class="btn btn-accent" href="' + moveHref + '">' + esc(moveLabel) + " →</a></section>" +
      '<div class="boards"><div class="bq"><h2>O que está travando você?</h2><p class="muted">Ou escolha outro bloqueio e leve um prompt pronto para a sua IA, com a base do seu negócio.</p></div>' + phases + "</div>" +
      '<p class="mfoot">Quer um olhar de fora? <a href="#/p/' + p.id + '/mentoria">' + (state.pedidos.length ? "Ver o pedido de mentoria" : "Falar com o Miguel") + " →</a></p>";
    main.querySelectorAll("button.obj").forEach(function (el) {
      el.onclick = function () { if (TOOL[el.dataset.tool]) go("#/p/" + p.id + "/ferramenta/" + el.dataset.tool); };
    });
    writeSeen(done);
  }

  function setFocus(lens) {
    state.p.focus = lens;
    sb.from("projects").update({ focus: lens }).eq("id", state.p.id).then(function (r) { if (r.error) fail(r.error); });
  }

  /* ---------- Ferramentas ---------- */
  /* ---------- Jornada: as três fases ---------- */
  function wsFor(id) { return state.workspaces.filter(function (w) { return w.tool_id === id; })[0]; }
  function toolState(id) {
    var t = TOOL[id], n = state.artifacts.filter(function (a) { return a.tool_id === id; }).length, w = wsFor(id);
    if (t.workspace) return w && w.status === "concluido" ? { k: "done", label: "Concluída" } : w ? { k: "wip", label: "Em andamento" } : { k: "todo", label: "Não iniciada" };
    return n ? { k: "done", label: n + " artefato" + (n > 1 ? "s" : "") } : { k: "todo", label: "Sem artefato" };
  }
  function phaseTools(ph) { return MESA.TOOLS.filter(function (t) { return LENS[t.lens] && LENS[t.lens].phase === ph.id; }); }
  function phaseProgress(ph) { var ts = phaseTools(ph), d = ts.filter(function (t) { return toolState(t.id).k === "done"; }).length; return { done: d, total: ts.length }; }
  function currentPhase() { var l = LENS[state.p.focus]; return (l && l.phase) || "discovery"; }
  /* Base do negócio: quatro campos essenciais e o resto em "Mais detalhes" */
  function baseInput(f, val, attr) {
    if (f.options) return '<select class="select" ' + attr + ">" + f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + ((val || "") === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
    if (f.long) return '<textarea class="textarea" rows="2" ' + attr + ' placeholder="' + esc(f.ph || "") + '">' + esc(val || "") + "</textarea>";
    return '<input class="input" ' + attr + ' placeholder="' + esc(f.ph || "") + '" value="' + esc(val || "") + '">';
  }
  function baseFieldsHtml(p, dataAttr) {
    var ctx = p.context || {}, fields = MESA.contextFields(p);
    var one = function (f) { return '<label class="field' + (f.long ? " wide" : "") + '"><span>' + esc(f.label) + "</span><small>" + esc(f.hint || "") + "</small>" + baseInput(f, ctx[f.id], dataAttr + '="' + f.id + '"') + "</label>"; };
    var ess = fields.filter(function (f) { return MESA.BASE_ESSENTIALS.indexOf(f.id) !== -1; }), rest = fields.filter(function (f) { return MESA.BASE_ESSENTIALS.indexOf(f.id) === -1; });
    var restFilled = rest.filter(function (f) { return String(ctx[f.id] || "").trim(); }).length;
    return '<div class="bgrid">' + ess.map(one).join("") + "</div>" +
      '<details class="bmore"' + (restFilled ? " open" : "") + '><summary>Mais detalhes <span class="muted">· preço, mercado, evidências, links' + (restFilled ? " · " + restFilled + " preenchido" + (restFilled > 1 ? "s" : "") : "") + '</span></summary><div class="bgrid">' + rest.map(one).join("") + "</div></details>";
  }

  /* ---------- Desbloquear: base do negócio → bloqueio → prompt pronto ---------- */
  function hashParam(name) { var q = (location.hash.split("?")[1]) || ""; return new URLSearchParams(q).get(name); }
  function setObjective(id) {
    var h = "#/p/" + state.p.id + "/desbloquear" + (id ? "?objetivo=" + id : "");
    if (location.hash !== h) history.replaceState(null, "", h);
  }
  function loadGenerations() {
    var pid = state.p.id;
    if (state.genFor === pid) return Promise.resolve();
    return sb.from("tool_generations").select("id, objective, inputs, prompt, created_at").eq("project_id", pid).order("created_at", { ascending: false }).limit(30).then(function (r) {
      state.genFor = pid; state.generations = r.error ? [] : (r.data || []); state.genOff = !!r.error;
      if (r.error) console.warn("Histórico indisponível:", r.error.message);
    });
  }
  function downloadMd(name, text) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function viewObjetivo(main) {
    var p = state.p, ctx = p.context = p.context || {};
    var objId = hashParam("objetivo"), t = objId && TOOL[objId] && !TOOL[objId].workspace ? TOOL[objId] : null;
    if (!t) return closeSheet();
    state.dInputs = state.dInputs || {};
    var baseFields = MESA.contextFields(p), cnt = MESA.baseFilledCount(p);

    function fieldInput(f, val, attr) {
      if (f.options) return '<select class="select" ' + attr + ">" + f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + ((val || "") === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>";
      if (f.long) return '<textarea class="textarea" ' + attr + ' placeholder="' + esc(f.ph || "") + '">' + esc(val || "") + "</textarea>";
      return '<input class="input" ' + attr + ' placeholder="' + esc(f.ph || "") + '" value="' + esc(val || "") + '">';
    }
    var step3 = "";
    if (t) {
      var inputs = state.dInputs[t.id] = state.dInputs[t.id] || MESA.initialInputs(t, p);
      var mine = state.artifacts.filter(function (a) { return a.tool_id === t.id; });
      step3 = '<p class="small back"><a href="#/p/' + p.id + '/mesa">← Mesa</a></p>' +
        '<header class="ohead"><p class="label">Fase ' + MESA.PHASES.filter(function (x) { return x.id === LENS[t.lens].phase; })[0].n + ' · ' + LENS[t.lens].name + ' · ' + esc(t.name) + '</p><h1>“' + esc(t.blocker) + '”</h1><p class="muted">' + esc(t.desc) + '</p>' +
        '<a class="obase' + (cnt.filled < 4 ? ' is-low' : '') + '" href="#/p/' + p.id + '/contexto"><span>Base do negócio</span><b>' + cnt.filled + ' de ' + cnt.total + ' campos</b><em>' + (cnt.filled < 4 ? 'Complete para um prompt mais preciso' : 'Usada neste prompt') + ' · Editar</em></a></header>' +
        '<section class="d3" id="d-prompt"><div class="tool">' +
        '<section class="panel"><div class="form">' + (function () {
          var miss = baseFields.filter(function (f) { return MESA.BASE_ESSENTIALS.indexOf(f.id) !== -1 && !String(ctx[f.id] || "").trim() && !(t.fields || []).some(function (x) { return x.fromBase === f.id; }); });
          return miss.length ? '<div class="bfill"><p class="label">Para um prompt mais preciso <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· vai para a base do negócio</span></p>' + miss.map(function (f) { return '<label class="field"><span>' + esc(f.label) + "</span><small>" + esc(f.hint || "") + "</small>" + fieldInput(f, "", 'data-base="' + f.id + '"') + "</label>"; }).join("") + "</div>" : "";
        })() + ((t.fields || []).length ? '<p class="label">Detalhes deste objetivo <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· opcionais</span></p>' : "") +
          (t.fields || []).map(function (f) {
            var base = f.fromBase ? baseFields.filter(function (b) { return b.id === f.fromBase; })[0] : null, ff = base ? Object.assign({}, base, f, { options: base.options, ph: f.ph || base.ph }) : f;
            return '<label class="field"><span>' + esc(ff.label) + "</span>" + (base ? "<small>Vem da base. Se mudar aqui, vale só para este prompt.</small>" : "") + fieldInput(ff, inputs[f.id], 'data-in="' + f.id + '"') + "</label>";
          }).join("") +
          '<details class="dmat"><summary>Embasamento: ' + t.materials.length + " referências usadas no prompt</summary><ul>" + t.materials.map(function (k) { var m = MESA.MATERIALS[k]; return "<li><b>" + (m.url ? '<a href="' + esc(m.url) + '" target="_blank" rel="noopener">' + esc(m.name) + "</a>" : esc(m.name)) + "</b><small>" + esc(m.label) + " · " + esc(m.desc) + "</small></li>"; }).join("") + "</ul></details>" +
        '</div></section><section class="prompt" aria-label="Prompt pronto"><div class="prompt-head"><span class="label">Prompt pronto</span><span class="spacer"></span>' +
          '<button class="btn btn-accent btn-sm" data-d="copy">Copiar</button><button class="btn btn-line btn-sm" data-d="md">.md</button>' +
          '<a class="btn btn-line btn-sm" data-ai="claude" target="_blank" rel="noopener">Claude</a><a class="btn btn-line btn-sm" data-ai="chatgpt" target="_blank" rel="noopener">ChatGPT</a></div>' +
          '<p class="dmeta">Funciona no Claude, ChatGPT e Gemini · <span id="d-chars"></span> caracteres</p><div class="pwrap" id="d-pwrap"><pre id="prompt"></pre><button class="pmore" type="button" data-d="expand">Ver o prompt completo</button></div><div id="d-mentor"></div>' +
          '<div class="paste" id="d-paste"><p class="paste-step" id="d-step" hidden>Copiou? Agora cole na sua IA e traga a resposta para cá.</p><label class="label" for="answer">Resposta da IA</label><textarea class="textarea" id="answer" placeholder="Cole aqui a resposta. Ela vira um artefato do projeto e conclui o objetivo no painel."></textarea>' +
          '<div class="row"><input class="input" id="atitle" style="flex:1;min-width:180px" value="' + esc(t.name) + '" aria-label="Título do artefato"><button class="btn btn-accent" data-d="save">Salvar artefato</button></div></div>' +
        "</section></div></section>" +
        (mine.length ? '<section class="panel"><h2>Artefatos salvos</h2><div class="list" style="margin-top:12px">' + mine.map(artifactRow).join("") + "</div></section>" : "");
    }
    var hist = '<section class="panel" id="d-hist"><div class="panel-head"><h2>Prompts gerados para este objetivo</h2></div><div id="d-hist-list" class="list" style="margin-top:12px"><p class="small muted">Carregando…</p></div></section>';

    main.innerHTML = step3 + hist;

    /* histórico */
    function histRender() {
      var box = document.getElementById("d-hist-list"); if (!box) return;
      if (state.genOff) { box.innerHTML = '<p class="small muted">O histórico não está disponível agora.</p>'; return; }
      var gens = state.generations.filter(function (g) { return g.objective === t.id; });
      box.innerHTML = gens.length ? gens.map(function (g) {
        var x = TOOL[g.objective];
        return '<div class="item dgen"><span style="flex:1;min-width:0"><span class="t">' + esc(x ? x.name : g.objective) + '</span><br><span class="meta">' + fmtDate(g.created_at) + " · " + g.prompt.length + ' caracteres</span></span><button class="btn btn-ghost btn-sm" data-g="ver" data-id="' + g.id + '">Ver</button><button class="btn btn-ghost btn-sm" data-g="copy" data-id="' + g.id + '">Copiar</button><button class="btn btn-ghost btn-sm" data-g="md" data-id="' + g.id + '">.md</button><button class="btn btn-ghost btn-sm btn-danger" data-g="del" data-id="' + g.id + '">Apagar</button></div>';
      }).join("") : '<p class="small muted">Os prompts que você copiar ou baixar ficam aqui, para usar de novo.</p>';
      box.querySelectorAll("[data-g]").forEach(function (b) {
        b.onclick = function () {
          var g = state.generations.filter(function (x) { return x.id === b.dataset.id; })[0]; if (!g) return;
          var x = TOOL[g.objective] || { id: g.objective, name: g.objective };
          if (b.dataset.g === "ver") modal('<h2>' + esc(x.name) + '</h2><p class="small muted">' + fmtDate(g.created_at) + '</p><pre class="dview">' + esc(g.prompt) + '</pre><div class="row"><span class="spacer"></span><button class="btn btn-ghost" data-close>Fechar</button></div>');
          else if (b.dataset.g === "copy") copy(g.prompt).then(function () { toast("Prompt copiado. Cole na sua IA."); track("prompt_copied", { tool: x.id, from: "historico" }); });
          else if (b.dataset.g === "md") { downloadMd(MESA.mdFilename(x, p), g.prompt); track("prompt_downloaded", { tool: x.id, from: "historico" }); }
          else if (b.dataset.g === "del") { if (!confirm("Apagar este prompt do histórico?")) return; sb.from("tool_generations").delete().eq("id", g.id).then(function (r) { if (r.error) return fail(r.error); state.generations = state.generations.filter(function (y) { return y.id !== g.id; }); histRender(); toast("Prompt apagado do histórico."); }); }
        };
      });
    }
    loadGenerations().then(histRender);

    /* prompt */
    var pre = document.getElementById("prompt"), inputsNow = state.dInputs[t.id];
    function refresh() {
      var text = MESA.composePrompt(t, p, inputsNow); pre.textContent = text;
      document.getElementById("d-chars").textContent = text.length.toLocaleString("pt-BR");
      var q = encodeURIComponent(text);
      main.querySelector("[data-ai=claude]").href = "https://claude.ai/new?q=" + q;
      main.querySelector("[data-ai=chatgpt]").href = "https://chatgpt.com/?q=" + q;
    }
    function record() {
      var text = pre.textContent; if (state.genOff || state.lastGen === text) return; state.lastGen = text;
      var inp = {}; Object.keys(inputsNow).forEach(function (k) { if (String(inputsNow[k] || "").trim()) inp[k] = inputsNow[k]; });
      sb.from("tool_generations").insert({ project_id: p.id, objective: t.id, inputs: inp, prompt: text }).select("id, objective, inputs, prompt, created_at").single().then(function (r) {
        if (r.error) { console.warn(r.error.message); state.lastGen = null; return; }
        state.generations.unshift(r.data); histRender();
      });
    }
    var awaiting = false;
    function awaitAnswer() {
      awaiting = true; var w = document.getElementById("d-pwrap"); if (w) w.classList.add("is-short");
      var st = document.getElementById("d-step"); if (st) st.hidden = false;
    }
    function bringAnswer() {
      var a = document.getElementById("answer"); if (!a || !awaiting || a.value.trim()) return;
      a.scrollIntoView({ behavior: "smooth", block: "center" }); a.focus({ preventScroll: true });
    }
    function onReturn() { if (document.visibilityState === "visible") setTimeout(bringAnswer, 150); }
    document.addEventListener("visibilitychange", onReturn); window.addEventListener("focus", onReturn);
    var onHash = function () { setTimeout(function () { if (!document.getElementById("answer")) { document.removeEventListener("visibilitychange", onReturn); window.removeEventListener("focus", onReturn); window.removeEventListener("hashchange", onHash); } }); };
    window.addEventListener("hashchange", onHash);
    main.querySelector("[data-d=expand]").onclick = function () { document.getElementById("d-pwrap").classList.remove("is-short"); };
    function mentorCard() {
      try { if (sessionStorage.getItem("mesa-mentor-card")) return; sessionStorage.setItem("mesa-mentor-card", "1"); } catch (e) {}
      document.getElementById("d-mentor").innerHTML = '<div class="dmentor"><b>Quer um olhar de fora sobre a resposta?</b><span>Leve o artefato para uma conversa com o Miguel.</span><a class="btn btn-accent btn-sm" href="#/p/' + p.id + '/mentoria">Pedir mentoria</a></div>';
    }
    main.querySelectorAll("[data-in]").forEach(function (el) { el.oninput = el.onchange = function () { inputsNow[el.dataset.in] = el.value; refresh(); }; });
    main.querySelectorAll("[data-base]").forEach(function (el) { el.oninput = el.onchange = function () { ctx[el.dataset.base] = el.value; saveContext(); refresh(); }; });
    refresh();
    main.querySelector("[data-d=copy]").onclick = function () { copy(pre.textContent).then(function () { toast("Prompt copiado. Cole na sua IA."); track("prompt_copied", { tool: t.id }); record(); mentorCard(); awaitAnswer(); bringAnswer(); }); };
    main.querySelector("[data-d=md]").onclick = function () { downloadMd(MESA.mdFilename(t, p), pre.textContent); track("prompt_downloaded", { tool: t.id }); record(); awaitAnswer(); };
    main.querySelectorAll("[data-ai]").forEach(function (a) { a.addEventListener("click", function () { track("prompt_opened", { tool: t.id, ai: a.dataset.ai }); record(); awaitAnswer(); }); });
    main.querySelector("[data-d=save]").onclick = function (e) {
      var content = document.getElementById("answer").value.trim(), title = document.getElementById("atitle").value.trim() || t.name;
      if (!content) { toast("Cole a resposta da IA antes de salvar."); return document.getElementById("answer").focus(); }
      e.target.disabled = true;
      sb.from("artifacts").insert({ project_id: p.id, tool_id: t.id, stage: t.lens, title: title, content: content }).select().single().then(function (r) {
        e.target.disabled = false; if (r.error) return fail(r.error);
        state.artifacts.unshift(r.data); track("artifact_saved", { tool: t.id });
        toast("Artefato salvo. " + t.name + " concluído no painel.");
        go("#/p/" + p.id + "/mesa");
      });
    };
  }

  /* ---------- Ferramentas de Traction: área de trabalho estruturada ---------- */
  var wsTimer = null, wsPending = null;
  function wsEnv() {
    var map = {}; state.workspaces.forEach(function (w) { map[w.tool_id] = w.data || {}; });
    return { p: state.p, artifacts: state.artifacts, ws: map, base: "#/p/" + state.p.id + "/" };
  }
  function setSaveState(text, cls) { var el = document.getElementById("ws-save"); if (el) { el.textContent = text; el.className = "ws-save " + (cls || ""); } }
  function flushWorkspace() {
    if (!wsPending) return Promise.resolve();
    var job = wsPending; wsPending = null; clearTimeout(wsTimer);
    setSaveState("Salvando…");
    return sb.from("tool_workspaces").upsert({ project_id: job.project_id, tool_id: job.tool_id, data: job.w.data, status: job.w.status || "em_andamento" }, { onConflict: "project_id,tool_id" }).select().single().then(function (r) {
      if (r.error) { setSaveState("Não foi possível salvar. Tente de novo.", "err"); wsPending = wsPending || job; return fail(r.error); }
      job.w.id = r.data.id; job.w.status = r.data.status; job.w.updated_at = r.data.updated_at;
      setSaveState("Salvo às " + new Date(r.data.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), "ok");
    });
  }
  function saveWorkspace(w) {
    if (state.workspaces.indexOf(w) === -1) { state.workspaces.push(w); track("traction_tool_started", { tool: w.tool_id }); }
    wsPending = { project_id: state.p.id, tool_id: w.tool_id, w: w };
    setSaveState("Alterações não salvas…"); clearTimeout(wsTimer); wsTimer = setTimeout(flushWorkspace, 800);
  }
  window.addEventListener("beforeunload", function () { if (wsPending) flushWorkspace(); });
  function inputHtml(f, val, attrs) {
    var a = attrs + ' aria-label="' + esc(f.label) + '"';
    if (f.options || f.type === "select") return '<select class="select" ' + a + ">" + ['<option value=""></option>'].concat((f.options || []).map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (val === v ? " selected" : "") + ">" + esc(l) + "</option>"; })).join("") + "</select>";
    if (f.long) return '<textarea class="textarea" ' + a + ' placeholder="' + esc(f.ph || "") + '">' + esc(val || "") + "</textarea>";
    var type = f.type === "date" ? "date" : "text", extra = f.type === "number" ? ' inputmode="decimal"' : "";
    return '<input class="input" type="' + type + '"' + extra + (f.list ? ' list="dl-' + f.id + '"' : "") + " " + a + ' placeholder="' + esc(f.ph || "") + '" value="' + esc(val == null ? "" : val) + '">';
  }
  function viewTraction(main, toolId) {
    var t = TOOL[toolId], p = state.p, w = wsFor(toolId), isNew = !w;
    if (!LENS[p.focus] || LENS[p.focus].phase !== "traction") setFocus(t.lens);
    if (!w) { w = { tool_id: toolId, status: "em_andamento", data: {} }; (t.sections || []).forEach(function (s) { (s.fields || []).forEach(function (f) { if (f.def != null) w.data[f.id] = f.def; }); }); }
    var d = w.data, env = function () { var e = wsEnv(); e.ws[toolId] = d; return e; };
    var tab = state.tTab[toolId] || "trabalho"; /* começa na área de trabalho; o guia fica numa aba */
    var idx = MESA.TRACTION.indexOf(t), next = t.next && TOOL[t.next];
    var stepper = '<ol class="tmini" aria-label="Ferramentas da Fase 3">' + MESA.TRACTION.map(function (x) { var st = toolState(x.id); return '<li class="is-' + st.k + (x.id === toolId ? " is-cur" : "") + '"><a href="#/p/' + p.id + "/ferramenta/" + x.id + '" title="' + esc(x.n + ". " + x.name + " · " + st.label) + '"><span>' + x.n + "</span><b>" + esc(x.name) + "</b></a></li>"; }).join("") + "</ol>";
    var st = toolState(toolId);
    main.innerHTML = '<p class="small"><a href="#/p/' + p.id + '/mesa">← Mesa</a> <span class="muted">· Fase 3 · Traction · ferramenta ' + t.n + " de 7</span></p>" + stepper +
      '<div class="thead"><div><h1>' + esc(t.title) + '</h1><p class="tq"><span class="label">Pergunta central</span>' + esc(t.question) + '</p></div><div class="tstatus"><span class="chip" id="ws-status"></span><span class="ws-save" id="ws-save">' + (isNew ? "Nada salvo ainda" : "Salvo") + "</span></div></div>" +
      '<div class="ttabs" role="tablist">' + [["guia", "Guia"], ["trabalho", "Área de trabalho"], ["resultado", "Resultado"]].map(function (x) { return '<button role="tab" data-tab="' + x[0] + '" aria-selected="' + (tab === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>" +
      '<div id="tbody"></div>';
    var body = document.getElementById("tbody");
    function reuseHtml(compact) {
      var items = t.reuse ? t.reuse(env()) : [];
      return '<div class="reuse' + (compact ? " compact" : "") + '">' + items.map(function (it) {
        return '<div class="ritem' + (MESA.util.filled(it.value) ? "" : " is-empty") + '"><span class="label">' + esc(it.label) + "</span><p>" + (MESA.util.filled(it.value) ? esc(it.value) : '<span class="muted">Ainda não preenchido.</span>') + '</p><a class="small" href="' + env().base + it.href + '">' + (MESA.util.filled(it.value) ? "Editar na origem" : "Preencher") + " · " + esc(it.origin) + " →</a></div>";
      }).join("") + "</div>";
    }
    function renderGuide() {
      body.innerHTML = '<div class="tguide"><section class="panel"><h2>Quando usar</h2><ul class="ticks">' + t.when.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section>" +
        '<section class="panel"><h2>O que você precisa</h2><p class="small muted">Informações das etapas anteriores que esta ferramenta reaproveita. Você não precisa digitar de novo.</p>' + reuseHtml(false) + "</section>" +
        '<section class="panel wide"><h2>Contexto essencial</h2><div class="concepts">' + t.concepts.map(function (c) { return "<div><b>" + esc(c[0]) + "</b><p>" + esc(c[1]) + "</p></div>"; }).join("") + "</div></section>" +
        '<section class="panel"><h2>Método passo a passo</h2><ol class="msteps-list">' + t.steps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></section>" +
        '<section class="panel"><h2>Exemplo preenchido</h2><details class="example"><summary>Ver o exemplo</summary><div class="md small">' + md(t.example) + "</div></details>" +
        '<h2 style="margin-top:20px">Referências</h2><ul class="small refs">' + t.refs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></section></div>" +
        '<div class="row" style="margin-top:16px"><span class="spacer"></span><button class="btn btn-accent" data-tab="trabalho">Começar na área de trabalho →</button></div>';
    }
    function fieldBlock(f) {
      var e = env(), sug = f.prefill ? f.prefill(e) : "", val = d[f.id];
      return '<label class="field' + (f.long ? " span2" : "") + '"><span>' + esc(f.label) + "</span>" + (f.hint ? "<small>" + esc(f.hint) + "</small>" : "") + inputHtml(f, val, 'data-f="' + f.id + '"') +
        (MESA.util.filled(sug) && sug !== val ? '<span class="suggest">Das etapas anteriores: “' + esc(sug.length > 160 ? sug.slice(0, 160) + "…" : sug) + '” <button type="button" class="btn btn-ghost btn-sm" data-use="' + f.id + '">Usar</button></span>' : "") + "</label>";
    }
    function listBlock(s) {
      var list = MESA.util.rows(d, s.id);
      var dls = s.columns.filter(function (c) { return c.list; }).map(function (c) { return '<datalist id="dl-' + c.id + '">' + c.list.map(function (x) { return '<option value="' + esc(x) + '">'; }).join("") + "</datalist>"; }).join("");
      return dls + (list.length ? '<div class="lrows">' + list.map(function (r, i) {
        return '<div class="lrow"><span class="lnum">' + (i + 1) + "</span>" + s.columns.map(function (c) {
          if (c.computed) return '<div class="field"><span>' + esc(c.label) + '</span><output data-comp="' + s.id + ":" + i + ":" + c.id + '">' + esc(c.computed(r)) + "</output></div>";
          return '<label class="field' + (c.long ? " span2" : "") + '"><span>' + esc(c.label) + "</span>" + inputHtml(c, r[c.id], 'data-l="' + s.id + '" data-r="' + i + '" data-c="' + c.id + '"') + "</label>";
        }).join("") + '<button type="button" class="ldel" data-del="' + s.id + '" data-r="' + i + '" title="Remover" aria-label="Remover linha ' + (i + 1) + '">×</button></div>';
      }).join("") + "</div>" : '<p class="small muted empty-row">Nada registrado ainda.</p>') +
        '<div class="row"><button type="button" class="btn btn-line btn-sm" data-add="' + s.id + '">+ ' + esc(s.add || "Adicionar") + "</button>" + (s.actions || []).map(function (a) { return '<button type="button" class="btn btn-ghost btn-sm" data-action="' + a.id + '">' + esc(a.label) + "</button>"; }).join("") + "</div>";
    }
    function decisionsBlock(s) {
      var g = d[s.id] = d[s.id] || {};
      return '<div class="decs">' + s.items.map(function (it) {
        var v = g[it.id] || {}, e = env(), sug = it.prefill ? it.prefill(e) : "";
        var main = it.options ? inputHtml({ label: it.label, options: it.options }, v.texto, 'data-dec="' + s.id + '" data-item="' + it.id + '" data-k="texto"') : inputHtml({ label: it.label, long: true, ph: "Sua escolha" }, v.texto, 'data-dec="' + s.id + '" data-item="' + it.id + '" data-k="texto"');
        return '<div class="dec"><div class="dec-q"><b>' + esc(it.label) + "</b><span>" + esc(it.q) + "</span></div>" + main +
          (MESA.util.filled(sug) && sug !== v.texto ? '<span class="suggest">Das etapas anteriores: “' + esc(sug.length > 160 ? sug.slice(0, 160) + "…" : sug) + '” <button type="button" class="btn btn-ghost btn-sm" data-use-dec="' + s.id + ":" + it.id + '">Usar</button></span>' : "") +
          '<div class="dec-meta"><div class="seg" role="radiogroup" aria-label="Tipo">' + ["Decisão", "Hipótese", "A validar"].map(function (k) { return '<button type="button" role="radio" aria-checked="' + (v.tipo === k) + '" data-dec-tipo="' + s.id + ":" + it.id + '" data-v="' + k + '">' + k + "</button>"; }).join("") + "</div>" +
          inputHtml({ label: "Por quê", ph: "Por quê? Em que evidência se apoia?" }, v.porque, 'data-dec="' + s.id + '" data-item="' + it.id + '" data-k="porque"') + "</div></div>";
      }).join("") + "</div>";
    }
    function unitBlock() {
      var ue = d.ue = d.ue || {}, origem = d.ue_origem = d.ue_origem || {};
      return '<div class="table-scroll"><table class="ttable ue"><thead><tr><th>Variável</th><th>Conservador</th><th>Base</th><th>Otimista</th><th>Origem</th></tr></thead><tbody>' + MESA.UE_VARS.map(function (v) {
        return "<tr><th>" + esc(v.label) + "<small>" + esc(v.hint) + "</small></th>" + ["c", "b", "o"].map(function (sc) { return '<td><input class="input" inputmode="decimal" data-ue="' + sc + '" data-v="' + v.id + '" aria-label="' + esc(v.label + " · " + { c: "conservador", b: "base", o: "otimista" }[sc]) + '" value="' + esc((ue[sc] || {})[v.id] == null ? "" : ue[sc][v.id]) + '"></td>'; }).join("") +
          '<td><select class="select" data-uo="' + v.id + '" aria-label="Origem de ' + esc(v.label) + '"><option' + (origem[v.id] !== "Observado" ? " selected" : "") + ">Estimado</option><option" + (origem[v.id] === "Observado" ? " selected" : "") + ">Observado</option></select></td></tr>";
      }).join("") + '</tbody></table></div><div class="row"><button type="button" class="btn btn-ghost btn-sm" data-action="ueFromOffer">Usar o preço da oferta</button><button type="button" class="btn btn-ghost btn-sm" data-action="ueFromChannels">Usar investimento e clientes dos canais</button><button type="button" class="btn btn-ghost btn-sm" data-action="ueCopyBase">Copiar base para os outros cenários</button></div>';
    }
    function aiBlock() {
      var vi = state.aiVar[toolId] || 0, v = t.ai[vi] || t.ai[0], prompt = MESA.tractionPrompt(t, d, env(), v), q = encodeURIComponent(prompt);
      return '<section class="panel ai"><div class="panel-head"><div><h2>Apoio de IA</h2><p class="small muted">A IA não roda dentro da Mesa: monte o prompt com os dados desta ferramenta e das anteriores, use no Claude ou no ChatGPT e trate a resposta como sugestão a testar.</p></div></div>' +
        '<div class="filters">' + t.ai.map(function (a, i) { return '<button data-ai-v="' + i + '" aria-pressed="' + (i === vi) + '">' + esc(a.label) + "</button>"; }).join("") + "</div>" +
        '<details><summary class="small">Ver o prompt</summary><pre class="aipre">' + esc(prompt) + "</pre></details>" +
        '<div class="row" style="margin-top:10px"><button class="btn btn-accent btn-sm" data-copy-ai>Copiar prompt</button><a class="btn btn-line btn-sm" target="_blank" rel="noopener" href="https://claude.ai/new?q=' + q + '">Abrir no Claude</a><a class="btn btn-line btn-sm" target="_blank" rel="noopener" href="https://chatgpt.com/?q=' + q + '">Abrir no ChatGPT</a></div>' +
        '<details style="margin-top:12px"><summary class="small">Guardar a resposta da IA como nota do projeto</summary><textarea class="textarea" id="ai-answer" placeholder="Cole aqui a resposta"></textarea><div class="row" style="margin-top:8px"><span class="spacer"></span><button class="btn btn-primary btn-sm" data-save-ai>Salvar nota</button></div></details></section>';
    }
    function renderWork() {
      var n = 0;
      var secFilled = function (s) {
        if (s.type === "fields") return s.fields.some(function (f) { return MESA.util.filled(d[f.id]); });
        if (s.type === "list") return MESA.util.rows(d, s.id).length > 0;
        if (s.type === "decisions") return Object.keys(d[s.id] || {}).some(function (k) { return MESA.util.filled((d[s.id][k] || {}).texto); });
        if (s.type === "unit") return Object.keys(d.ue || {}).length > 0;
        if (s.type === "model") return !!(p.context || {}).tipo;
        return false;
      };
      body.innerHTML = '<details class="panel reuse-box"><summary><b>Reaproveitado das etapas anteriores</b> <span class="small muted">· edite na origem</span></summary>' + reuseHtml(true) + "</details>" +
        t.sections.map(function (s) {
          if (s.type === "panel") return '<div data-panel="' + s.fn + '">' + MESA.TRACTION_PANELS[s.fn](d, env()) + "</div>";
          n++;
          var inner = s.type === "fields" ? '<div class="fgrid">' + s.fields.map(fieldBlock).join("") + "</div>" : s.type === "list" ? listBlock(s) : s.type === "decisions" ? decisionsBlock(s) : s.type === "unit" ? unitBlock() :
            s.type === "model" ? '<div class="fgrid"><label class="field"><span>Modelo de negócio</span>' + inputHtml(MESA.CONTEXT_FIELDS.filter(function (f) { return f.id === "tipo"; })[0], (p.context || {}).tipo, 'data-ctxf="tipo"') + '<small>Salvo no contexto do projeto: vale para todas as ferramentas.</small></label></div>' : "";
          var title = s.type === "unit" ? "Cenários" : s.type === "model" ? "Modelo de negócio" : s.title;
          var mem = (state.tOpen || {})[toolId + ":" + n], open = mem != null ? mem : (n <= 2 || secFilled(s));
          return '<details class="panel wsec" data-sec="' + (s.id || n) + '" data-n="' + n + '"' + (open ? " open" : "") + '><summary><h2><span class="snum">' + n + "</span>" + esc(title) + '</h2><span class="wsec-st">' + (secFilled(s) ? "preenchida" : "") + "</span></summary>" + (s.help ? '<p class="small muted">' + esc(s.help) + "</p>" : "") + inner + "</details>";
        }).join("") + aiBlock() +
        '<div class="row" style="margin-top:16px"><span class="spacer"></span><button class="btn btn-accent" data-tab="resultado">Ver o resultado →</button></div>';
      body.querySelectorAll("details.wsec").forEach(function (el) { el.addEventListener("toggle", function () { state.tOpen = state.tOpen || {}; state.tOpen[toolId + ":" + el.dataset.n] = el.open; }); });
    }
    function renderResult() {
      var e = env(), deliverable = MESA.tractionDeliverable(t, d, e), checks = MESA.tractionChecks(t, d, e), all = checks.every(function (c) { return c.ok; });
      var art = state.artifacts.filter(function (a) { return a.tool_id === toolId; })[0];
      body.innerHTML = '<div class="tresult"><section class="panel wide"><div class="panel-head"><div><h2>Resultado gerado</h2><p class="small muted">Montado a partir da área de trabalho. ' + (art ? "Última versão salva na Mesa em " + fmtDate(art.updated_at || art.created_at) + "." : "Ainda não salvo na Mesa.") + '</p></div><div class="row"><button class="btn btn-line btn-sm" data-copy-md>Copiar</button><button class="btn btn-line btn-sm" data-download>Baixar .md</button><button class="btn btn-accent btn-sm" data-save-art>' + (art ? "Atualizar na Mesa" : "Salvar na Mesa") + '</button></div></div><div class="md deliverable">' + md(deliverable) + "</div></section>" +
        '<section class="panel"><h2>Critérios de qualidade</h2><p class="small muted">Marque o que o resultado já atende.</p><div class="qlist">' + t.quality.map(function (q, i) { return '<label class="check"><input type="checkbox" data-q="' + i + '"' + ((d._q || {})[i] ? " checked" : "") + "><span>" + esc(q) + "</span></label>"; }).join("") + "</div></section>" +
        '<section class="panel"><h2>Critério de conclusão</h2><ul class="checks">' + checks.map(function (c) { return '<li class="' + (c.ok ? "ok" : "") + '">' + (c.ok ? "✓" : "○") + " " + esc(c.label) + "</li>"; }).join("") + "</ul>" + (t.doneNote ? '<p class="small muted">' + esc(t.doneNote) + "</p>" : "") +
          (w.status === "concluido" ? '<p class="small"><b>Concluída.</b> O entregável está na Mesa.</p><button class="btn btn-ghost btn-sm" data-reopen>Reabrir</button>' : '<button class="btn btn-primary" data-conclude' + (all ? "" : " disabled") + ">Marcar como concluída</button>" + (all ? "" : '<p class="small muted">Complete os itens acima na área de trabalho para concluir.</p>')) + "</section>" +
        '<section class="panel"><h2>Próxima ação</h2><p class="small muted">Sugestão: ' + esc(t.nextAction) + '</p><div class="fgrid"><label class="field span2"><span>Minha próxima ação, fora da ferramenta</span><input class="input" data-f="_acao" value="' + esc(d._acao || "") + '"></label><label class="field"><span>Até quando</span><input class="input" type="date" data-f="_acao_data" value="' + esc(d._acao_data || "") + '"></label></div></section>' +
        '<section class="panel next-step"><h2>Próxima etapa</h2>' + (next ? '<p><b>' + next.n + ". " + esc(next.name) + "</b> · " + esc(next.question) + '</p><p class="small muted">Vai reaproveitar o que você registrou aqui.</p><a class="btn btn-accent" href="#/p/' + p.id + "/ferramenta/" + next.id + '">Ir para ' + esc(next.name) + " →</a>" :
          '<p>Você chegou ao fim da Fase 3. A partir daqui, a tração vira ciclo: mantenha a rotina de revisão, volte a First Customers e Traction Channels quando o roadmap pedir, e reveja Discovery e Validation se a evidência mudar.</p><a class="btn btn-line" href="#/p/' + p.id + '/mesa">Voltar para a Mesa</a>') + "</section></div>";
    }
    function updateStatus() {
      var s2 = toolState(toolId), el = document.getElementById("ws-status"); if (!el) return;
      el.textContent = s2.label; el.className = "chip " + (s2.k === "done" ? "ok" : s2.k === "wip" ? "pers" : "");
      main.querySelectorAll(".tmini li").forEach(function (li, i) { var x = MESA.TRACTION[i], k = toolState(x.id).k; li.className = "is-" + k + (x.id === toolId ? " is-cur" : ""); });
    }
    function render() {
      updateStatus();
      main.querySelectorAll("[role=tab]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === tab); });
      if (tab === "guia") renderGuide(); else if (tab === "trabalho") renderWork(); else renderResult();
    }
    function refreshPanels() {
      var e = env();
      body.querySelectorAll("[data-panel]").forEach(function (el) { el.innerHTML = MESA.TRACTION_PANELS[el.dataset.panel](d, e); });
      body.querySelectorAll("[data-comp]").forEach(function (el) { var k = el.dataset.comp.split(":"), s = t.sections.filter(function (x) { return x.id === k[0]; })[0], c = s.columns.filter(function (x) { return x.id === k[2]; })[0]; el.textContent = c.computed(MESA.util.rows(d, k[0])[+k[1]] || {}); });
    }
    function changed() { saveWorkspace(w); refreshPanels(); updateStatus(); }
    function rerender() { var y = getScroll(main); render(); setScroll(main, y); }
    function onInput(e) {
      var el = e.target, ds = el.dataset;
      if (ds.f) { d[ds.f] = el.value; changed(); }
      else if (ds.l) { var list = d[ds.l] = MESA.util.rows(d, ds.l); list[+ds.r][ds.c] = el.value; changed(); }
      else if (ds.dec) { var g = d[ds.dec] = d[ds.dec] || {}; g[ds.item] = g[ds.item] || {}; g[ds.item][ds.k] = el.value; changed(); }
      else if (ds.ue) { d.ue = d.ue || {}; d.ue[ds.ue] = d.ue[ds.ue] || {}; d.ue[ds.ue][ds.v] = el.value; changed(); }
      else if (ds.uo) { d.ue_origem = d.ue_origem || {}; d.ue_origem[ds.uo] = el.value; changed(); }
      else if (ds.q != null && el.type === "checkbox") { d._q = d._q || {}; d._q[ds.q] = el.checked; saveWorkspace(w); }
      else if (ds.ctxf) { p.context = p.context || {}; p.context[ds.ctxf] = el.value; saveContext(); refreshPanels(); }
    }
    main.addEventListener("input", onInput);
    main.addEventListener("change", function (e) { if (e.target.tagName === "SELECT" || e.target.type === "checkbox" || e.target.type === "date") onInput(e); });
    main.addEventListener("click", function (e) {
      var b = e.target.closest("button, [data-tab]"); if (!b) return;
      var ds = b.dataset;
      if (ds.tab) { tab = state.tTab[toolId] = ds.tab; render(); setScroll(main, main.querySelector(".ttabs").offsetTop - 70); }
      else if (ds.add) { d[ds.add] = MESA.util.rows(d, ds.add).concat([{ _id: MESA.util.uid() }]); saveWorkspace(w); rerender(); var rs = body.querySelectorAll('[data-l="' + ds.add + '"]'); if (rs.length) { var last = body.querySelector('[data-l="' + ds.add + '"][data-r="' + (d[ds.add].length - 1) + '"]'); if (last) last.focus(); } }
      else if (ds.del) { var row = MESA.util.rows(d, ds.del)[+ds.r] || {}; if (Object.keys(row).some(function (k) { return k !== "_id" && MESA.util.filled(row[k]); }) && !confirm("Remover esta linha?")) return; d[ds.del].splice(+ds.r, 1); saveWorkspace(w); rerender(); }
      else if (ds.action) { var msg = MESA.TRACTION_ACTIONS[ds.action](d, env()); saveWorkspace(w); rerender(); toast(msg); }
      else if (ds.use) { var f = null; t.sections.forEach(function (s) { (s.fields || []).forEach(function (x) { if (x.id === ds.use) f = x; }); }); d[ds.use] = f.prefill(env()); saveWorkspace(w); rerender(); }
      else if (ds.useDec) { var k = ds.useDec.split(":"), s = t.sections.filter(function (x) { return x.id === k[0]; })[0], it = s.items.filter(function (x) { return x.id === k[1]; })[0]; d[k[0]] = d[k[0]] || {}; d[k[0]][k[1]] = Object.assign({}, d[k[0]][k[1]], { texto: it.prefill(env()) }); saveWorkspace(w); rerender(); }
      else if (ds.decTipo) { var kk = ds.decTipo.split(":"); d[kk[0]] = d[kk[0]] || {}; d[kk[0]][kk[1]] = Object.assign({}, d[kk[0]][kk[1]], { tipo: ds.v }); saveWorkspace(w); b.parentNode.querySelectorAll("[role=radio]").forEach(function (x) { x.setAttribute("aria-checked", x === b); }); }
      else if (ds.aiV != null) { state.aiVar[toolId] = +ds.aiV; rerender(); }
      else if (b.hasAttribute("data-copy-ai")) { copy(MESA.tractionPrompt(t, d, env(), t.ai[state.aiVar[toolId] || 0])).then(function () { toast("Prompt copiado. Cole na sua IA."); track("traction_prompt_copied", { tool: toolId }); }); }
      else if (b.hasAttribute("data-save-ai")) { var txt = document.getElementById("ai-answer").value.trim(); if (!txt) return toast("Cole a resposta antes de salvar."); b.disabled = true; sb.from("artifacts").insert({ project_id: p.id, stage: t.lens, title: ("IA · " + t.name + " · " + (t.ai[state.aiVar[toolId] || 0].label)).slice(0, 200), content: txt }).select().single().then(function (r) { b.disabled = false; if (r.error) return fail(r.error); state.artifacts.unshift(r.data); toast("Nota salva em Artefatos."); document.getElementById("ai-answer").value = ""; }); }
      else if (b.hasAttribute("data-copy-md")) { copy(MESA.tractionDeliverable(t, d, env())).then(function () { toast("Entregável copiado em Markdown."); }); }
      else if (b.hasAttribute("data-download")) { var blob = new Blob([MESA.tractionDeliverable(t, d, env())], { type: "text/markdown" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = (p.name + " - " + t.name).replace(/[^\wÀ-ú -]+/g, "").trim() + ".md"; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(a.href); }, 1500); track("traction_deliverable_downloaded", { tool: toolId }); }
      else if (b.hasAttribute("data-save-art")) { b.disabled = true; saveDeliverable().then(function () { b.disabled = false; rerender(); }); }
      else if (b.hasAttribute("data-conclude")) { w.status = "concluido"; saveWorkspace(w); flushWorkspace().then(saveDeliverable).then(function () { track("traction_tool_done", { tool: toolId }); toast(TOOL[toolId].name + " concluída no painel."); rerender(); }); }
      else if (b.hasAttribute("data-reopen")) { w.status = "em_andamento"; saveWorkspace(w); rerender(); }
    });
    function saveDeliverable() {
      var content = MESA.tractionDeliverable(t, d, env()), art = state.artifacts.filter(function (a) { return a.tool_id === toolId; })[0];
      var q = art ? sb.from("artifacts").update({ content: content }).eq("id", art.id).select().single() : sb.from("artifacts").insert({ project_id: p.id, tool_id: toolId, stage: t.lens, title: t.name + " · entregável", content: content }).select().single();
      return q.then(function (r) { if (r.error) return fail(r.error); if (art) Object.assign(art, r.data); else state.artifacts.unshift(r.data); toast(art ? "Entregável atualizado." : "Entregável salvo no projeto."); });
    }
    render();
  }

  /* ---------- Artefatos ---------- */
  function artifactRow(a) {
    return '<a class="item" href="#/p/' + state.p.id + "/artefato/" + a.id + '"><span class="chip">' + (a.stage ? LENS[a.stage].name : "Nota") + '</span><span style="flex:1;min-width:0"><span class="t">' + esc(a.title) + '</span><br><span class="meta">' + (a.tool_id && TOOL[a.tool_id] ? esc(TOOL[a.tool_id].name) + " · " : "") + fmtDate(a.created_at) + "</span></span>→</a>";
  }
  function viewArtefatos(main) {
    var p = state.p;
    main.innerHTML = head("Artefatos", "Tudo o que o projeto produziu: respostas das ferramentas e notas suas.", '<button class="btn btn-line" data-act="new-note">+ Nota</button><a class="btn btn-primary" href="#/p/' + p.id + '/mesa">Abrir a Mesa</a>') +
      (state.artifacts.length ? MESA.LENSES.concat([{ id: null, name: "Notas" }]).map(function (l) {
        var items = state.artifacts.filter(function (a) { return (a.stage || null) === l.id; });
        return items.length ? '<section class="panel"><h2>' + l.name + '</h2><div class="list" style="margin-top:12px">' + items.map(artifactRow).join("") + "</div></section>" : "";
      }).join("") : '<div class="empty"><p>Nenhum artefato ainda.</p><a class="btn btn-accent" href="#/p/' + p.id + '/mesa">Escolher um objetivo na Mesa</a></div>');
    main.querySelector("[data-act=new-note]").onclick = function () {
      sb.from("artifacts").insert({ project_id: p.id, title: "Nova nota", content: "" }).select().single().then(function (r) {
        if (r.error) return fail(r.error); state.artifacts.unshift(r.data); go("#/p/" + p.id + "/artefato/" + r.data.id + "?editar");
      });
    };
  }
  function viewArtefato(main, id) {
    var a = state.artifacts.filter(function (x) { return x.id === id; })[0]; if (!a) return go("#/p/" + state.p.id + "/artefatos");
    var editing = /editar/.test(location.hash) || !a.content;
    var t = a.tool_id && TOOL[a.tool_id];
    main.innerHTML = '<p class="small"><a href="#/p/' + state.p.id + '/artefatos">← Artefatos</a></p>' +
      head(esc(a.title), (t ? esc(t.name) + " · " : "") + (a.stage ? LENS[a.stage].name + " · " : "") + fmtDate(a.created_at),
        '<button class="btn btn-line btn-sm" data-act="edit">' + (editing ? "Visualizar" : "Editar") + '</button><button class="btn btn-ghost btn-sm btn-danger" data-act="del">Excluir</button>') +
      '<section class="panel">' + (editing ?
        '<div class="form"><label class="field"><span>Título</span><input class="input" id="et" value="' + esc(a.title) + '"></label><label class="field"><span>Conteúdo (aceita Markdown)</span><textarea class="textarea tall" id="ec" style="min-height:420px">' + esc(a.content) + '</textarea></label><div class="row"><span class="spacer"></span><button class="btn btn-primary" data-act="save">Salvar</button></div></div>'
        : '<div class="md">' + md(a.content) + "</div>") + "</section>" +
      (t ? '<p class="small muted" style="margin-top:14px">Quer refazer? <a href="#/p/' + state.p.id + "/ferramenta/" + t.id + '">Abrir ' + esc(t.name) + "</a></p>" : "");
    main.querySelector("[data-act=edit]").onclick = function () { go("#/p/" + state.p.id + "/artefato/" + a.id + (editing ? "" : "?editar")); };
    main.querySelector("[data-act=del]").onclick = function () {
      if (!confirm("Excluir este artefato?")) return;
      sb.from("artifacts").delete().eq("id", a.id).then(function (r) { if (r.error) return fail(r.error); state.artifacts = state.artifacts.filter(function (x) { return x.id !== a.id; }); toast("Artefato excluído."); go("#/p/" + state.p.id + "/artefatos"); });
    };
    var save = main.querySelector("[data-act=save]");
    if (save) save.onclick = function () {
      var title = document.getElementById("et").value.trim() || "Sem título", content = document.getElementById("ec").value;
      sb.from("artifacts").update({ title: title, content: content }).eq("id", a.id).then(function (r) { if (r.error) return fail(r.error); a.title = title; a.content = content; toast("Salvo."); go("#/p/" + state.p.id + "/artefato/" + a.id); });
    };
  }



  /* ---------- Radar ---------- */
  function viewRadar(main) {
    var p = state.p, c = counts();
    var moves = MESA.nextMoves(p, state.artifacts, state.board, state.pedidos, state.workspaces);
    var cur = MESA.matchRadar(p, c, 8);
    var saved = state.radar.slice().sort(function (a, b) { return (b.pinned - a.pinned) || (new Date(b.created_at) - new Date(a.created_at)); });
    main.innerHTML = head("Radar", "Sinais, temas e referências que se relacionam com o projeto. Quanto mais contexto e artefatos, mais preciso o radar fica.") +
      '<section class="panel"><div class="panel-head"><h2>Próximos movimentos</h2></div><div class="moves">' + moves.map(function (m) { return '<div class="move"><p>' + esc(m.text) + "</p>" + moveButton(m) + "</div>"; }).join("") + "</div></section>" +
      '<section class="panel"><div class="panel-head"><div><h2>Varredura com IA</h2><p class="small muted">Gere um prompt de radar com o contexto do projeto, rode na sua IA e cole a resposta: cada sinal vira um item salvo.</p></div><div class="row"><button class="btn btn-accent btn-sm" data-act="radar-copy">Copiar prompt</button><a class="btn btn-line btn-sm" id="radar-claude" target="_blank" rel="noopener">Abrir no Claude</a><a class="btn btn-line btn-sm" id="radar-gpt" target="_blank" rel="noopener">Abrir no ChatGPT</a></div></div>' +
        '<textarea class="textarea" id="radar-paste" placeholder="Cole aqui a resposta da IA com os sinais"></textarea><div class="row" style="margin-top:10px"><span class="spacer"></span><button class="btn btn-primary btn-sm" data-act="radar-save">Salvar sinais</button></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Sinais salvos</h2><span class="small muted">' + saved.length + " sinal(is)</span></div>" +
        (saved.length ? '<div class="signals">' + saved.map(function (s) {
          return '<article class="signal' + (s.pinned ? " pinned" : "") + '"><div class="row"><span class="chip ' + (s.source === "ia" ? "plum" : "") + '">' + (s.source === "ia" ? "IA" : s.source === "curadoria" ? "Curadoria" : "Manual") + "</span>" + (s.pinned ? '<span class="chip pers">Fixado</span>' : "") + "</div><h4>" + esc(s.title) + "</h4>" + (s.body ? '<div class="md small">' + md(s.body) + "</div>" : "") +
            '<div class="row"><button class="btn btn-ghost btn-sm" data-act="pin" data-id="' + s.id + '">' + (s.pinned ? "Desafixar" : "Fixar") + '</button><button class="btn btn-ghost btn-sm btn-danger" data-act="sig-del" data-id="' + s.id + '">Remover</button></div></article>';
        }).join("") + "</div>" : '<p class="muted">Nenhum sinal salvo ainda. Rode a varredura com IA ou salve itens da curadoria.</p>') + "</section>" +
      '<section class="panel"><div class="panel-head"><div><h2>Da curadoria</h2><p class="small muted">Temas, métodos, armadilhas e perguntas selecionados para o momento do projeto.</p></div></div><div class="signals">' +
        cur.map(function (r, i) {
          return '<article class="signal"><span class="chip">' + esc(r.item.type) + "</span><h4>" + esc(r.item.t) + "</h4><p>" + esc(r.item.body) + "</p>" + (r.hits.length ? '<span class="hits">Relaciona com: ' + esc(r.hits.join(", ")) + "</span>" : "") + '<div class="row"><button class="btn btn-ghost btn-sm" data-act="cur-save" data-i="' + i + '">Salvar no projeto</button></div></article>';
        }).join("") + "</div></section>";
    var prompt = MESA.buildRadarPrompt(p), q = encodeURIComponent(prompt);
    document.getElementById("radar-claude").href = "https://claude.ai/new?q=" + q;
    document.getElementById("radar-gpt").href = "https://chatgpt.com/?q=" + q;
    main.querySelector("[data-act=radar-copy]").onclick = function () { copy(prompt).then(function () { toast("Prompt de radar copiado."); track("radar_prompt_copied"); }); };
    main.querySelector("[data-act=radar-save]").onclick = function (e) {
      var sigs = MESA.parseSignals(document.getElementById("radar-paste").value);
      if (!sigs.length) return toast("Cole a resposta da IA primeiro.");
      e.target.disabled = true;
      sb.from("radar_items").insert(sigs.map(function (s) { return { project_id: p.id, title: s.title, body: s.body, source: "ia" }; })).select().then(function (r) {
        e.target.disabled = false; if (r.error) return fail(r.error);
        state.radar = r.data.concat(state.radar); track("radar_signals_saved", { n: r.data.length }); toast(r.data.length + " sinal(is) salvo(s)."); route();
      });
    };
    main.querySelectorAll("[data-act=cur-save]").forEach(function (b) {
      b.onclick = function () {
        var it = cur[+b.dataset.i].item;
        sb.from("radar_items").insert({ project_id: p.id, title: it.t, body: it.body, source: "curadoria" }).select().single().then(function (r) { if (r.error) return fail(r.error); state.radar.unshift(r.data); toast("Salvo no radar do projeto."); route(); });
      };
    });
  }

  /* ---------- Mentoria ---------- */
  function viewMentoria(main) {
    var p = state.p, email = state.session.user.email;
    main.innerHTML = head("Mentoria com o Miguel", "Quer um olhar de fora? Escolha o tema e os artefatos que ele deve ver antes da conversa.") +
      '<div class="cols-2"><section class="panel"><form class="form" id="mf">' +
        '<label class="field"><span>Tema</span><select class="select" name="tema"><option>Entender o problema e o cliente</option><option>Hipóteses e experimentos</option><option>Leitura de evidências</option><option>Modelo de negócio e preço</option><option>Pitch e decisão</option><option>Primeiros clientes e vendas</option><option>Go-to-market e canais</option><option>Métricas e unit economics</option><option>Ativação e retenção</option><option>Projeto de inovação na organização</option><option>Outro</option></select></label>' +
        '<label class="field"><span>Em que você quer ajuda?</span><textarea class="textarea" name="mensagem" required maxlength="4000" placeholder="Contexto rápido, a decisão travada e o que você já tentou"></textarea></label>' +
        '<fieldset class="field" style="border:0;padding:0;margin:0"><span>Artefatos para compartilhar</span><small>O Miguel só verá os que você marcar.</small>' +
          (state.artifacts.length ? '<div class="list" style="margin-top:6px;max-height:220px;overflow:auto">' + state.artifacts.map(function (a) { return '<label class="item" style="cursor:pointer"><input type="checkbox" name="art" value="' + a.id + '"><span class="t" style="font-weight:500">' + esc(a.title) + "</span></label>"; }).join("") + "</div>" : '<p class="small muted">Nenhum artefato ainda.</p>') + "</fieldset>" +
        '<label class="field"><span>Contato para resposta</span><input class="input" name="contato" value="' + esc(email) + '"></label>' +
        '<button class="btn btn-accent">Enviar pedido de mentoria</button></form></section>' +
      '<section class="panel"><h2>Como funciona</h2><ol class="list" style="margin-top:12px"><li class="item">1. Você envia o pedido com o tema e os artefatos.</li><li class="item">2. O Miguel lê o material antes da conversa.</li><li class="item">3. ' + (CONFIG.mentoriaUrl ? "Você agenda o horário direto na agenda dele." : "Ele responde por e-mail para combinar o horário.") + "</li></ol>" +
        (state.pedidos.length ? '<h2 style="margin-top:22px">Seus pedidos</h2><div class="list" style="margin-top:10px">' + state.pedidos.map(function (x) { return '<div class="item"><span class="chip">' + esc(x.status) + '</span><span style="flex:1"><span class="t">' + esc(x.tema) + '</span><br><span class="meta">' + fmtDate(x.created_at) + "</span></span></div>"; }).join("") + "</div>" : "") + "</section></div>";
    main.querySelector("#mf").onsubmit = function (e) {
      e.preventDefault(); var f = e.target, msg = f.mensagem.value.trim(); if (!msg) return f.mensagem.focus();
      var ids = Array.prototype.map.call(f.querySelectorAll("[name=art]:checked"), function (c) { return c.value; });
      var btn = f.querySelector("button"); btn.disabled = true;
      sb.from("mentoria_pedidos").insert({ project_id: p.id, tema: f.tema.value, mensagem: msg, artifact_ids: ids, contato: f.contato.value.trim() || email }).select().single().then(function (r) {
        btn.disabled = false; if (r.error) return fail(r.error);
        state.pedidos.unshift(r.data); track("mentoria_requested", { tema: f.tema.value });
        if (CONFIG.mentoriaUrl) {
          modal('<h2>Pedido enviado</h2><p>Agora escolha um horário na agenda do Miguel.</p><div class="row" style="margin-top:18px"><span class="spacer"></span><button class="btn btn-ghost" data-close>Depois</button><a class="btn btn-accent" target="_blank" rel="noopener" href="' + esc(CONFIG.mentoriaUrl) + '">Agendar horário</a></div>');
        } else toast("Pedido enviado. O Miguel responde por e-mail.");
        route();
      });
    };
  }

  /* ---------- Contexto ---------- */
  function viewContexto(main) {
    var p = state.p, ctx = p.context = p.context || {};
    var fields = MESA.CONTEXT_FIELDS.filter(function (f) { return !f.kind || f.kind === p.kind; });
    main.innerHTML = head("Projeto e base do negócio", "Preencha uma vez: todos os prompts usam essas informações. Salva automaticamente.") +
      '<section class="panel"><div class="form">' +
        '<div class="row"><label class="field" style="flex:2;min-width:220px"><span>Nome do projeto</span><input class="input" id="pname" maxlength="120" value="' + esc(p.name) + '"></label>' +
        '<label class="field" style="flex:1;min-width:200px"><span>Tipo</span><select class="select" id="pkind"><option value="empreendedor"' + (p.kind === "empreendedor" ? " selected" : "") + '>Projeto empreendedor</option><option value="inovacao"' + (p.kind === "inovacao" ? " selected" : "") + ">Inovação em uma organização</option></select></label></div>" +
        baseFieldsHtml(p, "data-ctx") +
      '</div></section><section class="panel"><h2>Zona de perigo</h2><p class="small muted" style="margin:6px 0 12px">Excluir o projeto apaga artefatos, prompts, radar e pedidos de mentoria.</p><button class="btn btn-line btn-danger" data-act="del-project">Excluir projeto</button></section>';
    main.querySelectorAll("[data-ctx]").forEach(function (el) { el.oninput = el.onchange = function () { ctx[el.dataset.ctx] = el.value; saveContext(); }; });
    var saveMeta = debounce(function () {
      var name = document.getElementById("pname").value.trim(); if (!name) return;
      p.name = name; p.kind = document.getElementById("pkind").value;
      sb.from("projects").update({ name: p.name, kind: p.kind }).eq("id", p.id).then(function (r) { if (r.error) fail(r.error); });
    }, 600);
    document.getElementById("pname").oninput = saveMeta;
    document.getElementById("pkind").onchange = function () { saveMeta(); setTimeout(route, 700); };
    main.querySelector("[data-act=del-project]").onclick = function () {
      if (prompt('Para confirmar, digite o nome do projeto: "' + p.name + '"') !== p.name) return toast("Exclusão cancelada.");
      sb.from("projects").delete().eq("id", p.id).then(function (r) { if (r.error) return fail(r.error); state.p = null; toast("Projeto excluído."); go("#/"); });
    };
  }

  /* ---------------- ações globais ---------------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el) return;
    var act = el.dataset.act;
    if (act === "logout") { sb.auth.signOut().then(function () { state = Object.assign(state, { p: null, projects: [] }); go("#/"); }); }
    else if (act === "scroll") { e.preventDefault(); var tg = document.getElementById(el.dataset.target); if (tg) tg.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else if (act === "new-project") newProjectModal();
    else if (act === "tfilter") { state.toolFilter = el.dataset.f; route(); }
    else if (act === "lens") { setFocus(el.dataset.lens); state.toolFilter = el.dataset.lens; go("#/p/" + state.p.id + "/mesa"); }
    else if (act === "pin" || act === "sig-del") {
      var s = state.radar.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!s) return;
      if (act === "pin") sb.from("radar_items").update({ pinned: !s.pinned }).eq("id", s.id).then(function (r) { if (r.error) return fail(r.error); s.pinned = !s.pinned; route(); });
      if (act === "sig-del") sb.from("radar_items").delete().eq("id", s.id).then(function (r) { if (r.error) return fail(r.error); state.radar = state.radar.filter(function (x) { return x.id !== s.id; }); route(); });
    }
  });

  /* ---------------- início ---------------- */
  sb.auth.onAuthStateChange(function (event, session) {
    var had = !!state.session; state.session = session;
    if (event === "PASSWORD_RECOVERY") { RECOVERY = true; return renderNewPassword(); }
    if (event === "SIGNED_OUT") { state.p = null; state.entitled = null; route(); }
    else if (!had && session) route();
  });
  sb.auth.getSession().then(function (r) { state.session = r.data.session; route(); });
})();
