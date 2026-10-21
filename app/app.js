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
    // Link de agendamento da mentoria (Calendly). Vazio = o pedido fica registrado e Miguel responde por e-mail.
    mentoriaUrl: "",
    contato: "miguelsnahas@gmail.com"
  };

  var sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  var $app = document.getElementById("app");
  var state = { session: null, projects: [], p: null, artifacts: [], board: [], radar: [], pedidos: [], toolFilter: "todas", boardFilter: "todas" };
  var LENS = {}; MESA.LENSES.forEach(function (l) { LENS[l.id] = l; });
  var TOOL = {}; MESA.TOOLS.forEach(function (t) { TOOL[t.id] = t; });
  var KINDS = { hipotese: "Hipótese", experimento: "Experimento", evidencia: "Evidência", decisao: "Decisão", pergunta: "Pergunta" };
  var STATUS = { aberto: "Aberto", testando: "Testando", validado: "Validado", refutado: "Refutado", feito: "Feito" };

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
  function modal(html, onMount) {
    var wrap = document.createElement("div"); wrap.className = "modal"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true");
    wrap.innerHTML = '<div class="modal-box">' + html + "</div>";
    function close() { wrap.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    wrap.addEventListener("click", function (e) { if (e.target === wrap || e.target.closest("[data-close]")) close(); });
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
      sb.from("mentoria_pedidos").select("*").eq("project_id", id).order("created_at", { ascending: false })
    ]).then(function (rs) {
      rs.forEach(function (r) { if (r.error) throw r.error; });
      if (!rs[0].data) throw new Error("Projeto não encontrado.");
      state.p = rs[0].data; state.artifacts = rs[1].data; state.board = rs[2].data; state.radar = rs[3].data; state.pedidos = rs[4].data;
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
  function route() {
    var parts = parse();
    if (!state.session) return renderAuth(/[?&]email=/.test(location.hash) ? "criar" : "entrar");
    if (parts[0] !== "p" || !parts[1]) return renderProjects();
    var id = parts[1], tab = parts[2] || "mesa", sub = parts[3];
    var ready = state.p && state.p.id === id ? Promise.resolve() : (($app.innerHTML = '<div class="loading">Carregando projeto…</div>'), loadProject(id));
    ready.then(function () { renderProject(tab, sub); }).catch(function (e) { fail(e); go("#/"); });
  }
  window.addEventListener("hashchange", function () { flushContext(); route(); });

  /* ---------------- topo ---------------- */
  function topbar(crumb) {
    return '<header class="topbar"><a class="brand" href="#/">Mesa de Trabalho' + ast() + '</a>' +
      '<nav class="crumb" aria-label="Você está em">' + (crumb || "") + "</nav><span class=\"spacer\"></span>" +
      '<a class="btn btn-ghost btn-sm" href="https://miguelsnahas-ai.github.io/" title="Site do Miguel">Site</a>' +
      '<button class="btn btn-ghost btn-sm" data-act="logout">Sair</button></header>';
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
        '<ul><li>Ferramentas que montam o prompt com o contexto do projeto</li><li>Quadro de hipóteses, experimentos e decisões</li><li>Radar de sinais e próximos movimentos</li><li>Mentoria com o Miguel quando precisar</li></ul>' +
      '</section><main class="auth-main"><div class="auth-card">' +
        '<div class="tabs" role="tablist"><button role="tab" data-mode="entrar" aria-selected="' + (mode === "entrar") + '">Entrar</button><button role="tab" data-mode="criar" aria-selected="' + (mode === "criar") + '">Criar conta</button></div>' +
        '<form class="form" id="auth-form" novalidate>' +
          '<h2>' + (mode === "entrar" ? "Bem-vindo de volta" : "Crie sua conta gratuita") + '</h2>' +
          '<label class="field"><span>E-mail</span><input class="input" name="email" type="email" autocomplete="email" required value="' + esc(email) + '"></label>' +
          '<label class="field"><span>Senha</span><input class="input" name="senha" type="password" autocomplete="' + (mode === "entrar" ? "current-password" : "new-password") + '" minlength="8" required>' + (mode === "criar" ? "<small>Mínimo de 8 caracteres.</small>" : "") + '</label>' +
          '<div class="msg" id="auth-msg" hidden></div>' +
          '<button class="btn btn-primary" type="submit">' + (mode === "entrar" ? "Entrar" : "Criar conta e entrar") + '</button>' +
          (mode === "entrar" ? '<p class="small muted">Esqueceu a senha? Escreva para <a href="mailto:' + CONFIG.contato + '?subject=Senha%20da%20Mesa%20de%20Trabalho">' + CONFIG.contato + "</a>.</p>" :
            '<p class="small muted">Ao criar a conta, você concorda com os <a href="../termos.html">termos de uso</a> e a <a href="../privacidade.html">política de privacidade</a>.</p>') +
        "</form></div></main></div>";
    $app.querySelectorAll("[data-mode]").forEach(function (b) { b.onclick = function () { renderAuth(b.dataset.mode); }; });
    var form = document.getElementById("auth-form"), msg = document.getElementById("auth-msg");
    function say(t, cls) { msg.textContent = t; msg.className = "msg " + cls; msg.hidden = false; }
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
          if (/Email not confirmed/i.test(m)) return say("Sua conta ainda não foi confirmada. Escreva para " + CONFIG.contato + ".", "err");
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
          '<div class="empty"><h2>Comece pelo seu primeiro projeto</h2><p>Um negócio que você quer tirar do papel ou um projeto de inovação na sua organização.</p><button class="btn btn-accent" data-act="new-project">Criar projeto</button></div>');
    }).catch(fail);
  }

  function newProjectModal() {
    modal('<h2>Novo projeto</h2><form class="form" id="np">' +
      '<label class="field"><span>Nome do projeto</span><input class="input" name="name" required maxlength="120" placeholder="Ex.: Caixa da Clínica"></label>' +
      '<fieldset class="field" style="border:0;padding:0;margin:0"><span>Tipo</span><div class="row">' +
      '<label class="chip" style="cursor:pointer"><input type="radio" name="kind" value="empreendedor" checked> Projeto empreendedor</label>' +
      '<label class="chip" style="cursor:pointer"><input type="radio" name="kind" value="inovacao"> Inovação em uma organização</label></div></fieldset>' +
      '<label class="field"><span>Em uma frase, qual é a ideia?</span><input class="input" name="ideia" maxlength="300" placeholder="Opcional, dá para preencher depois"></label>' +
      '<div class="row"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary">Criar</button></div></form>',
      function (box, close) {
        box.querySelector("#np").onsubmit = function (e) {
          e.preventDefault(); var f = e.target; var name = f.name.value.trim(); if (!name) return f.name.focus();
          var ctx = {}; if (f.ideia.value.trim()) ctx.ideia = f.ideia.value.trim();
          sb.from("projects").insert({ name: name, kind: f.kind.value, context: ctx }).select().single().then(function (r) {
            if (r.error) return fail(r.error);
            close(); track("project_created", { kind: f.kind.value }); state.p = null; go("#/p/" + r.data.id);
          });
        };
      });
  }

  /* ================= PROJETO ================= */
  var TABS = [
    { id: "mesa", name: "Mesa" },
    { id: "visao", name: "Visão geral" },
    { id: "ferramentas", name: "Ferramentas" },
    { id: "artefatos", name: "Artefatos" },
    { id: "quadro", name: "Quadro" },
    { id: "radar", name: "Radar" },
    { id: "mentoria", name: "Mentoria" },
    { id: "contexto", name: "Contexto" }
  ];
  function renderProject(tab, sub) {
    var p = state.p;
    var cnt = { artefatos: state.artifacts.length, quadro: state.board.length, radar: state.radar.length };
    var activeTab = tab === "ferramenta" ? "ferramentas" : tab === "artefato" ? "artefatos" : tab;
    var side = '<nav class="side" aria-label="Seções do projeto">' + TABS.map(function (t) {
      return '<a href="#/p/' + p.id + "/" + t.id + '"' + (t.id === activeTab ? ' aria-current="page"' : "") + ">" + t.name + (cnt[t.id] ? '<span class="count">' + cnt[t.id] + "</span>" : "") + "</a>";
    }).join("") + '<div class="sep"></div><div class="side-cta"><b>Precisa de um olhar de fora?</b><span class="muted">Peça feedback do Miguel sobre o projeto.</span><a class="btn btn-accent btn-sm" href="#/p/' + p.id + '/mentoria">Pedir mentoria</a></div></nav>';
    $app.innerHTML = topbar('<a href="#/">Projetos</a><span>/</span><strong>' + esc(p.name) + "</strong>") +
      '<div class="proj">' + side + '<main class="main" id="main"></main></div>';
    var main = document.getElementById("main");
    var views = { mesa: viewMesa, visao: viewVisao, ferramentas: viewFerramentas, ferramenta: viewFerramenta, artefatos: viewArtefatos, artefato: viewArtefato, quadro: viewQuadro, radar: viewRadar, mentoria: viewMentoria, contexto: viewContexto };
    (views[tab] || viewMesa)(main, sub);
    window.scrollTo(0, 0);
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
  var BOARD_COLOR = { hipotese: "#F3D46B", experimento: "#F8D9C6", evidencia: "#DDE4D3", decisao: "#E4DAEE", pergunta: "#FFFDF8" };
  function tilt(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997; return (h % 11) - 5; }
  function seenKey() { return "mesa-vista-" + state.p.id; }
  function readSeen() { try { return JSON.parse(localStorage.getItem(seenKey()) || "null"); } catch (e) { return null; } }
  function writeSeen(ids) { try { localStorage.setItem(seenKey(), JSON.stringify(ids)); } catch (e) {} }
  function viewMesa(main) {
    var p = state.p, ctx = p.context || {}, byTool = {};
    state.artifacts.forEach(function (a) { if (a.tool_id) (byTool[a.tool_id] = byTool[a.tool_id] || []).push(a); });
    var done = MESA.DESK_ORDER.filter(function (id) { return byTool[id]; });
    var ctxFilled = MESA.CONTEXT_FIELDS.filter(function (f) { return (ctx[f.id] || "").trim(); }).length;
    var life = done.length + (ctxFilled >= 3 ? 1 : 0) + (state.radar.length ? 1 : 0) + (state.board.length ? 1 : 0) + (state.pedidos.length ? 1 : 0);
    var plant = life === 0 ? 0 : life < 5 ? 1 : life < 12 ? 2 : 3;
    var dayAgo = Date.now() - 864e5;
    var warm = state.artifacts.concat(state.board).some(function (x) { return new Date(x.created_at).getTime() > dayAgo; });
    var seen = readSeen(), fresh = {};
    if (seen) done.forEach(function (id) { if (seen.indexOf(id) === -1) fresh[id] = true; });
    var move = MESA.nextMoves(p, state.artifacts, state.board, state.pedidos)[0];
    var moveHref = move.action.type === "tool" ? "#/p/" + p.id + "/ferramenta/" + move.action.id : move.action.type === "tab" ? "#/p/" + p.id + "/" + move.action.id : "#/p/" + p.id + "/contexto";

    var zones = MESA.LENSES.map(function (l) {
      var objs = MESA.DESK_ORDER.filter(function (id) { return TOOL[id] && TOOL[id].lens === l.id; }).map(function (id) {
        var t = TOOL[id], n = (byTool[id] || []).length;
        return '<button class="obj ' + (n ? "is-on" : "is-empty") + (fresh[id] ? " is-new" : "") + '" data-tool="' + id + '" style="--rot:' + tilt(id) + 'deg" title="' + esc(MESA.DESK_OBJECT[id] + " · " + t.name) + '">' +
          '<span class="art">' + MESA.deskArt(id) + '</span><span class="tag">' + esc(t.name) + "</span>" + (n > 1 ? '<span class="badge">' + n + "</span>" : "") + "</button>";
      }).join("");
      var n = MESA.DESK_ORDER.filter(function (id) { return TOOL[id] && TOOL[id].lens === l.id; }).length;
      return '<section class="zone' + (p.focus === l.id ? " is-focus" : "") + '" style="--n:' + n + '" aria-label="' + l.name + '"><h3 class="hand">' + l.name + MESA.arrow() + (p.focus === l.id ? " <em>foco agora</em>" : "") + '</h3><div class="objs">' + objs + "</div></section>";
    }).join("");

    var notes = state.board.slice(0, 7).map(function (b) {
      return '<button class="pin" data-act="edit-item" data-id="' + b.id + '" style="--bg:' + BOARD_COLOR[b.kind] + ";--rot:" + tilt(b.id) + 'deg"><small>' + KINDS[b.kind] + '</small><span class="pt">' + esc(b.title) + "</span></button>";
    }).join("");

    var BOOKS = [["problema", "Problema"], ["persona", "Cliente"], ["mercado", "Mercado"], ["beachhead", "Segmento"], ["solucao", "Solução"], ["modelo", "Receita"]];
    var books = BOOKS.map(function (b, i) { return '<span class="book' + ((ctx[b[0]] || "").trim() ? " is-on" : "") + '" style="--i:' + i + '">' + b[1] + "</span>"; }).join("");
    var stageDone = {}; done.forEach(function (id) { var l = TOOL[id].lens; stageDone[l] = (stageDone[l] || 0) + 1; });
    var steps = MESA.LENSES.map(function (l, i) {
      var total = MESA.DESK_ORDER.filter(function (id) { return TOOL[id].lens === l.id; }).length, n = stageDone[l.id] || 0;
      return '<li><button data-act="mesa-focus" data-lens="' + l.id + '"' + (p.focus === l.id ? ' aria-current="step"' : "") + ' title="' + esc(l.q) + '"><span class="dot' + (n ? " has" : "") + (n === total ? " full" : "") + '">' + (i + 1) + "</span><b>" + l.name + "</b><small>" + n + "/" + total + "</small></button></li>";
    }).join("");
    var moveIcon = move.action.type === "tool" ? MESA.deskArt(move.action.id) : MESA.bulb();
    var moveLabel = move.action.type === "tool" ? TOOL[move.action.id].name : move.action.type === "tab" ? ({ radar: "Rodar o radar", mentoria: "Pedir mentoria", quadro: "Abrir o quadro" }[move.action.id] || "Abrir") : "Preencher o contexto";

    main.innerHTML =
      '<div class="desk-head"><div><p class="label">Mesa de trabalho</p><h1>' + esc(p.name) + '</h1></div>' +
        '<ol class="msteps" aria-label="Etapas do método">' + steps + "</ol></div>" +
      '<div class="scene' + (state.artifacts.length ? " is-lit" : "") + '">' +
        '<div class="wall">' +
          '<div class="window">' + MESA.sceneWindow() + "</div>" +
          '<div class="wall-plant">' + MESA.scenePlant() + "</div>" +
          '<div class="wall-mid"><p class="hand slogan">Uma decisão por vez.</p>' +
          '<div class="mural" aria-label="Quadro do projeto">' + notes + '<button class="pin pin-add" data-act="add-item">+ Hipótese</button><a class="mural-link" href="#/p/' + p.id + '/quadro">Abrir quadro →</a></div></div>' +
          '<aside class="next-card"><a class="nc-head" href="' + moveHref + '">Próximo passo <span aria-hidden="true">→</span></a>' +
            '<div class="nc-box"><span class="nc-icon">' + moveIcon + "</span><b>" + esc(move.text) + "</b></div>" +
            '<p class="small muted">' + (done.length ? done.length + " de " + MESA.DESK_ORDER.length + " objetos na mesa." : "A mesa começa vazia. Cada atividade preenchida traz um objeto.") + '</p>' +
            '<div class="life" aria-label="Vida da mesa"><span style="width:' + Math.round(Math.min(life, 24) / 24 * 100) + '%"></span></div>' +
            '<a class="btn btn-primary btn-sm" href="' + moveHref + '">' + esc(moveLabel) + " →</a></aside>" +
        "</div>" +
        '<div class="tabletop">' +
          '<div class="zones">' + zones + "</div>" +
          '<div class="front">' +
            '<span class="prop lamp">' + MESA.deskLamp() + "</span>" +
            '<a class="stack" href="#/p/' + p.id + '/contexto" title="Contexto do projeto"><span class="books">' + books + '</span><span class="cup">' + MESA.pencup() + "</span></a>" +
            '<a class="notebook' + (ctxFilled ? " is-on" : "") + '" href="#/p/' + p.id + '/contexto"><span class="spiral"></span><span class="page"><small>Caderno do projeto</small><b>' + esc(ctx.ideia || "Escreva aqui a ideia") + "</b>" + (ctx.problema ? "<span>" + esc(ctx.problema) + "</span>" : "<span>" + (ctxFilled ? "" : "Contexto: problema, cliente, segmento…") + "</span>") + "</span></a>" +
            '<a class="prop' + (state.radar.length ? " is-on" : " is-empty") + '" href="#/p/' + p.id + '/radar" title="Radar: buscar sinais">' + MESA.deskLaptop(state.radar.length > 0) + '<span class="tag">Radar' + (state.radar.length ? " · " + state.radar.length : "") + "</span></a>" +
            '<a class="prop" href="#/p/' + p.id + '/mentoria" title="Mentoria com o Miguel">' + MESA.deskMugs(state.pedidos.length > 0, warm) + '<span class="tag">' + (state.pedidos.length ? "Mentoria pedida" : "Chamar o Miguel") + "</span></a>" +
            '<span class="prop plant">' + MESA.deskPlant(plant) + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="chair">' + MESA.chair() + "</div>" +
      "</div>";
    main.querySelectorAll("[data-act=mesa-focus]").forEach(function (b) { b.onclick = function () { setFocus(b.dataset.lens); viewMesa(main); }; });

    main.querySelectorAll(".obj").forEach(function (el) {
      el.onclick = function () {
        var id = el.dataset.tool, t = TOOL[id], list = byTool[id] || [];
        if (!list.length) return go("#/p/" + p.id + "/ferramenta/" + id);
        if (list.length === 1) return go("#/p/" + p.id + "/artefato/" + list[0].id);
        modal('<div class="obj-modal"><span class="art">' + MESA.deskArt(id) + "</span><div><p class=\"label\">" + esc(MESA.DESK_OBJECT[id]) + "</p><h2>" + esc(t.name) + "</h2></div></div>" +
          '<div class="list" data-close style="margin:16px 0">' + list.map(artifactRow).join("") + "</div>" +
          '<div class="row"><span class="spacer"></span><button class="btn btn-ghost" data-close>Fechar</button><a class="btn btn-accent" href="#/p/' + p.id + "/ferramenta/" + id + '" data-close>Usar de novo</a></div>');
      };
    });
    writeSeen(done);
  }

  /* ---------- Visão geral ---------- */
  function viewVisao(main) {
    var p = state.p, c = counts();
    var moves = MESA.nextMoves(p, state.artifacts, state.board, state.pedidos);
    var radar = MESA.matchRadar(p, c, 3);
    var lenses = MESA.LENSES.map(function (l) {
      var n = c[l.id] || 0, meter = "";
      for (var i = 0; i < 4; i++) meter += "<i" + (i < Math.min(n, 4) ? ' class="on"' : "") + "></i>";
      return '<button class="lens' + (p.focus === l.id ? " is-focus" : "") + '" data-act="lens" data-lens="' + l.id + '"><b>' + l.name + '</b><span class="q">' + l.q + '</span><span class="small muted">' + n + " artefato" + (n === 1 ? "" : "s") + '</span><span class="meter">' + meter + "</span></button>";
    }).join("");
    var recent = state.artifacts.slice(0, 4).map(artifactRow).join("");
    var b = state.board;
    var stat = function (k, st) { return b.filter(function (x) { return x.kind === k && (!st || x.status === st); }).length; };
    main.innerHTML = head(esc(p.name), esc((p.context && p.context.ideia) || "Descreva a ideia no contexto do projeto."),
        '<label class="row small"><span class="muted">Foco agora</span><select class="select" data-act="focus" style="width:auto">' + MESA.LENSES.map(function (l) { return '<option value="' + l.id + '"' + (p.focus === l.id ? " selected" : "") + ">" + l.name + "</option>"; }).join("") + "</select></label>") +
      '<section class="panel"><div class="panel-head"><h2>Próximos movimentos</h2><span class="small muted">Sugestões a partir do estado do projeto</span></div><div class="moves">' +
        moves.map(function (m) { return '<div class="move"><p>' + esc(m.text) + "</p>" + moveButton(m) + "</div>"; }).join("") + "</div></section>" +
      '<section class="panel"><div class="panel-head"><h2>Mapa do método</h2><span class="small muted">Não é uma trilha: entre na lente que o projeto pede agora.</span></div><div class="lenses">' + lenses + "</div></section>" +
      '<div class="cols-2"><section class="panel"><div class="panel-head"><h2>Quadro</h2><a class="small" href="#/p/' + p.id + '/quadro">Abrir quadro</a></div>' +
        '<div class="row"><span class="chip k-hipotese">' + stat("hipotese") + ' hipóteses</span><span class="chip k-experimento">' + stat("experimento") + ' experimentos</span><span class="chip k-evidencia">' + stat("evidencia") + ' evidências</span><span class="chip k-decisao">' + stat("decisao") + " decisões</span></div>" +
        '<p class="small muted" style="margin-top:12px">' + stat("hipotese", "validado") + " validada(s) · " + stat("hipotese", "refutado") + " refutada(s) · " + stat("experimento", "testando") + " experimento(s) em andamento</p></section>" +
      '<section class="panel"><div class="panel-head"><h2>No radar</h2><a class="small" href="#/p/' + p.id + '/radar">Abrir radar</a></div><div class="list">' +
        radar.map(function (r) { return '<div class="item"><span class="chip">' + esc(r.item.type) + '</span><span class="t">' + esc(r.item.t) + "</span></div>"; }).join("") + "</div></section></div>" +
      '<section class="panel"><div class="panel-head"><h2>Artefatos recentes</h2><a class="small" href="#/p/' + p.id + '/ferramentas">+ Usar uma ferramenta</a></div>' +
        (recent ? '<div class="list">' + recent + "</div>" : '<p class="muted">Nenhum artefato ainda. Escolha uma ferramenta para começar.</p>') + "</section>";
    main.querySelector("[data-act=focus]").onchange = function (e) { setFocus(e.target.value); };
  }
  function setFocus(lens) {
    state.p.focus = lens;
    sb.from("projects").update({ focus: lens }).eq("id", state.p.id).then(function (r) { if (r.error) fail(r.error); });
  }

  /* ---------- Ferramentas ---------- */
  function viewFerramentas(main) {
    var p = state.p, f = state.toolFilter;
    var used = {}; state.artifacts.forEach(function (a) { if (a.tool_id) used[a.tool_id] = (used[a.tool_id] || 0) + 1; });
    var filters = [{ id: "todas", name: "Todas" }].concat(MESA.LENSES).map(function (l) { return '<button data-act="tfilter" data-f="' + l.id + '" aria-pressed="' + (f === l.id) + '">' + l.name + "</button>"; }).join("");
    var tools = MESA.TOOLS.filter(function (t) { return f === "todas" || t.lens === f; });
    main.innerHTML = head("Ferramentas", "Cada ferramenta monta um prompt com o contexto do projeto. Use na sua IA preferida e cole a resposta: ela vira um artefato.") +
      '<div class="filters">' + filters + '</div><div class="grid-cards">' + tools.map(function (t) {
        return '<a class="tcard" href="#/p/' + p.id + "/ferramenta/" + t.id + '"><div class="row"><span class="chip">' + LENS[t.lens].name + "</span>" + (used[t.id] ? '<span class="chip pers">' + used[t.id] + " artefato" + (used[t.id] > 1 ? "s" : "") + "</span>" : "") + "</div><h3>" + esc(t.name) + "</h3><p>" + esc(t.desc) + '</p><span class="go">Abrir ferramenta →</span></a>';
      }).join("") + "</div>";
  }

  /* ---------- Ferramenta ---------- */
  function viewFerramenta(main, toolId) {
    var t = TOOL[toolId]; if (!t) return go("#/p/" + state.p.id + "/ferramentas");
    var p = state.p, ctx = p.context = p.context || {}, extra = {};
    var fields = (t.uses || []).map(function (fid) { return MESA.CONTEXT_FIELDS.filter(function (x) { return x.id === fid; })[0]; })
      .filter(function (f) { return f && (!f.kind || f.kind === p.kind); });
    function fieldHtml(f, val, isExtra) {
      var input = f.long ? '<textarea class="textarea" data-' + (isExtra ? "extra" : "ctx") + '="' + f.id + '" placeholder="' + esc(f.ph || "") + '">' + esc(val || "") + "</textarea>"
        : '<input class="input" data-' + (isExtra ? "extra" : "ctx") + '="' + f.id + '" placeholder="' + esc(f.ph || "") + '" value="' + esc(val || "") + '">';
      return '<label class="field"><span>' + esc(f.label) + (f.required ? ' <b style="color:var(--pers-ink)">*</b>' : "") + "</span>" + (f.hint ? "<small>" + esc(f.hint) + "</small>" : "") + input + "</label>";
    }
    main.innerHTML = '<p class="small"><a href="#/p/' + p.id + '/ferramentas">← Ferramentas</a></p>' +
      head(esc(t.name), esc(t.desc), '<span class="chip">' + LENS[t.lens].name + "</span>") +
      '<div class="tool"><section class="panel"><div class="form">' +
        (t.extra || []).map(function (f) { return fieldHtml(f, "", true); }).join("") +
        (fields.length ? '<p class="label" style="margin-top:6px">Contexto do projeto <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· salvo e reaproveitado em todas as ferramentas</span></p>' : "") +
        fields.map(function (f) { return fieldHtml(f, ctx[f.id], false); }).join("") +
      '</div></section><section class="prompt" aria-label="Prompt gerado"><div class="prompt-head"><span class="label">Prompt gerado</span><span class="spacer"></span>' +
        '<button class="btn btn-accent btn-sm" data-act="copy">Copiar</button>' +
        '<a class="btn btn-line btn-sm" data-ai="claude" target="_blank" rel="noopener">Abrir no Claude</a>' +
        '<a class="btn btn-line btn-sm" data-ai="chatgpt" target="_blank" rel="noopener">Abrir no ChatGPT</a></div>' +
        '<div class="steps"><span><b>1</b> Preencha o que puder</span><span><b>2</b> Copie ou abra na IA</span><span><b>3</b> Cole a resposta abaixo</span></div>' +
        '<pre id="prompt"></pre>' +
        '<div class="paste"><label class="label" for="answer">Resposta da IA</label><textarea class="textarea" id="answer" placeholder="Cole aqui a resposta. Ela vira um artefato do projeto."></textarea>' +
        '<div class="row"><input class="input" id="atitle" style="flex:1;min-width:180px" value="' + esc(t.name) + '"><button class="btn btn-accent" data-act="save-artifact">Salvar artefato</button></div></div>' +
      "</section></div>";
    var pre = document.getElementById("prompt");
    function refresh() {
      var text = MESA.buildPrompt(t, p, extra); pre.textContent = text;
      var q = encodeURIComponent(text);
      main.querySelector("[data-ai=claude]").href = "https://claude.ai/new?q=" + q;
      main.querySelector("[data-ai=chatgpt]").href = "https://chatgpt.com/?q=" + q;
    }
    main.querySelectorAll("[data-ctx]").forEach(function (el) { el.oninput = function () { ctx[el.dataset.ctx] = el.value; refresh(); saveContext(); }; });
    main.querySelectorAll("[data-extra]").forEach(function (el) { el.oninput = function () { extra[el.dataset.extra] = el.value; refresh(); }; });
    refresh();
    main.querySelector("[data-act=copy]").onclick = function () { copy(pre.textContent).then(function () { toast("Prompt copiado. Cole na sua IA."); track("prompt_copied", { tool: t.id }); }); };
    main.querySelectorAll("[data-ai]").forEach(function (a) { a.addEventListener("click", function () { track("prompt_opened", { tool: t.id, ai: a.dataset.ai }); }); });
    main.querySelector("[data-act=save-artifact]").onclick = function (e) {
      var content = document.getElementById("answer").value.trim(), title = document.getElementById("atitle").value.trim() || t.name;
      if (!content) { toast("Cole a resposta da IA antes de salvar."); return document.getElementById("answer").focus(); }
      e.target.disabled = true;
      sb.from("artifacts").insert({ project_id: p.id, tool_id: t.id, stage: t.lens, title: title, content: content }).select().single().then(function (r) {
        e.target.disabled = false; if (r.error) return fail(r.error);
        state.artifacts.unshift(r.data); track("artifact_saved", { tool: t.id });
        toast(MESA.DESK_OBJECT[t.id] ? MESA.DESK_OBJECT[t.id] + " na mesa. Clique nele para ver o artefato." : "Artefato salvo.");
        go("#/p/" + p.id + "/mesa");
      });
    };
  }

  /* ---------- Artefatos ---------- */
  function artifactRow(a) {
    return '<a class="item" href="#/p/' + state.p.id + "/artefato/" + a.id + '"><span class="chip">' + (a.stage ? LENS[a.stage].name : "Nota") + '</span><span style="flex:1;min-width:0"><span class="t">' + esc(a.title) + '</span><br><span class="meta">' + (a.tool_id && TOOL[a.tool_id] ? esc(TOOL[a.tool_id].name) + " · " : "") + fmtDate(a.created_at) + "</span></span>→</a>";
  }
  function viewArtefatos(main) {
    var p = state.p;
    main.innerHTML = head("Artefatos", "Tudo o que o projeto produziu: respostas das ferramentas e notas suas.", '<button class="btn btn-line" data-act="new-note">+ Nota</button><a class="btn btn-primary" href="#/p/' + p.id + '/ferramentas">Usar ferramenta</a>') +
      (state.artifacts.length ? MESA.LENSES.concat([{ id: null, name: "Notas" }]).map(function (l) {
        var items = state.artifacts.filter(function (a) { return (a.stage || null) === l.id; });
        return items.length ? '<section class="panel"><h2>' + l.name + '</h2><div class="list" style="margin-top:12px">' + items.map(artifactRow).join("") + "</div></section>" : "";
      }).join("") : '<div class="empty"><p>Nenhum artefato ainda.</p><a class="btn btn-accent" href="#/p/' + p.id + '/ferramentas">Escolher uma ferramenta</a></div>');
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
        '<button class="btn btn-line btn-sm" data-act="edit">' + (editing ? "Visualizar" : "Editar") + '</button><button class="btn btn-line btn-sm" data-act="to-board">+ Quadro</button><button class="btn btn-ghost btn-sm btn-danger" data-act="del">Excluir</button>') +
      '<section class="panel">' + (editing ?
        '<div class="form"><label class="field"><span>Título</span><input class="input" id="et" value="' + esc(a.title) + '"></label><label class="field"><span>Conteúdo (aceita Markdown)</span><textarea class="textarea tall" id="ec" style="min-height:420px">' + esc(a.content) + '</textarea></label><div class="row"><span class="spacer"></span><button class="btn btn-primary" data-act="save">Salvar</button></div></div>'
        : '<div class="md">' + md(a.content) + "</div>") + "</section>" +
      (t ? '<p class="small muted" style="margin-top:14px">Quer refazer? <a href="#/p/' + state.p.id + "/ferramenta/" + t.id + '">Abrir ' + esc(t.name) + "</a></p>" : "");
    main.querySelector("[data-act=edit]").onclick = function () { go("#/p/" + state.p.id + "/artefato/" + a.id + (editing ? "" : "?editar")); };
    main.querySelector("[data-act=to-board]").onclick = function () { boardModal(null, { kind: (t && t.board) || "hipotese", body: "Origem: " + a.title }); };
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

  /* ---------- Quadro ---------- */
  function viewQuadro(main) {
    var f = state.boardFilter;
    var items = state.board.filter(function (b) { return f === "todas" || b.kind === f; });
    var cols = [["aberto", "Aberto"], ["testando", "Testando"], ["validado", "Validado"], ["refutado|feito", "Refutado / feito"]];
    main.innerHTML = head("Quadro", "Hipóteses, experimentos, evidências, decisões e perguntas do projeto. Mova pelo status conforme aprende.", '<button class="btn btn-primary" data-act="add-item">+ Item</button>') +
      '<div class="filters">' + [["todas", "Todos"]].concat(Object.keys(KINDS).map(function (k) { return [k, KINDS[k]]; })).map(function (k) { return '<button data-act="bfilter" data-f="' + k[0] + '" aria-pressed="' + (f === k[0]) + '">' + k[1] + "</button>"; }).join("") + "</div>" +
      '<div class="board">' + cols.map(function (c) {
        var st = c[0].split("|"), list = items.filter(function (b) { return st.indexOf(b.status) !== -1; });
        return '<div class="bcol"><h3>' + c[1] + "<span>" + list.length + "</span></h3>" + list.map(function (b) {
          return '<button class="bitem" data-act="edit-item" data-id="' + b.id + '"><span class="chip k-' + b.kind + '">' + KINDS[b.kind] + '</span><span class="t">' + esc(b.title) + "</span>" + (b.status === "refutado" ? '<span class="small" style="color:var(--bad)">Refutado</span>' : b.status === "feito" ? '<span class="small muted">Feito</span>' : "") + "</button>";
        }).join("") + "</div>";
      }).join("") + "</div>";
  }
  function boardModal(item, preset) {
    var b = item || Object.assign({ kind: "hipotese", status: "aberto", title: "", body: "" }, preset || {});
    modal("<h2>" + (item ? "Editar item" : "Novo item") + '</h2><form class="form" id="bf">' +
      '<div class="row"><label class="field" style="flex:1"><span>Tipo</span><select class="select" name="kind">' + Object.keys(KINDS).map(function (k) { return '<option value="' + k + '"' + (b.kind === k ? " selected" : "") + ">" + KINDS[k] + "</option>"; }).join("") + "</select></label>" +
      '<label class="field" style="flex:1"><span>Status</span><select class="select" name="status">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (b.status === k ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") + "</select></label></div>" +
      '<label class="field"><span>Título</span><input class="input" name="title" required maxlength="300" value="' + esc(b.title) + '" placeholder="Ex.: Donas de clínica pagariam R$ 99/mês para não esquecer cobranças"></label>' +
      '<label class="field"><span>Detalhes</span><textarea class="textarea" name="body" placeholder="Como saber se é verdade, o que foi observado, próximos passos…">' + esc(b.body) + "</textarea></label>" +
      '<div class="row">' + (item ? '<button type="button" class="btn btn-ghost btn-danger" data-act="del-item">Excluir</button>' : "") + '<span class="spacer"></span><button type="button" class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary">Salvar</button></div></form>',
      function (box, close) {
        var form = box.querySelector("#bf");
        form.onsubmit = function (e) {
          e.preventDefault(); var title = form.title.value.trim(); if (!title) return form.title.focus();
          var data = { kind: form.kind.value, status: form.status.value, title: title, body: form.body.value };
          var q = item ? sb.from("board_items").update(data).eq("id", item.id).select().single() : sb.from("board_items").insert(Object.assign({ project_id: state.p.id }, data)).select().single();
          q.then(function (r) {
            if (r.error) return fail(r.error);
            if (item) Object.assign(item, r.data); else { state.board.unshift(r.data); track("board_item_created", { kind: data.kind }); }
            close(); toast("Quadro atualizado."); if (/\/quadro/.test(location.hash)) route(); else renderProject(parse()[2], parse()[3]);
          });
        };
        var del = box.querySelector("[data-act=del-item]");
        if (del) del.onclick = function () {
          if (!confirm("Excluir este item?")) return;
          sb.from("board_items").delete().eq("id", item.id).then(function (r) { if (r.error) return fail(r.error); state.board = state.board.filter(function (x) { return x.id !== item.id; }); close(); route(); });
        };
      });
  }

  /* ---------- Radar ---------- */
  function viewRadar(main) {
    var p = state.p, c = counts();
    var moves = MESA.nextMoves(p, state.artifacts, state.board, state.pedidos);
    var cur = MESA.matchRadar(p, c, 8);
    var saved = state.radar.slice().sort(function (a, b) { return (b.pinned - a.pinned) || (new Date(b.created_at) - new Date(a.created_at)); });
    main.innerHTML = head("Radar", "Sinais, temas e referências que se relacionam com o projeto. Quanto mais contexto e artefatos, mais preciso o radar fica.") +
      '<section class="panel"><div class="panel-head"><h2>Próximos movimentos</h2></div><div class="moves">' + moves.map(function (m) { return '<div class="move"><p>' + esc(m.text) + "</p>" + moveButton(m) + "</div>"; }).join("") + "</div></section>" +
      '<section class="panel"><div class="panel-head"><div><h2>Varredura com IA</h2><p class="small muted">Gere um prompt de radar com o contexto do projeto, rode na sua IA e cole a resposta: cada sinal vira um item salvo.</p></div><div class="row"><button class="btn btn-accent btn-sm" data-act="radar-copy">Copiar prompt</button><a class="btn btn-line btn-sm" id="radar-claude" target="_blank" rel="noopener">Abrir no Claude</a><a class="btn btn-line btn-sm" id="radar-gpt" target="_blank" rel="noopener">Abrir no ChatGPT</a></div></div>' +
        '<textarea class="textarea" id="radar-paste" placeholder="Cole aqui a resposta da IA com os sinais"></textarea><div class="row" style="margin-top:10px"><span class="spacer"></span><button class="btn btn-primary btn-sm" data-act="radar-save">Salvar sinais</button></div></section>' +
      '<section class="panel"><div class="panel-head"><h2>Sinais salvos</h2><span class="small muted">' + saved.length + " sinal(is)</span></div>" +
        (saved.length ? '<div class="signals">' + saved.map(function (s) {
          return '<article class="signal' + (s.pinned ? " pinned" : "") + '"><div class="row"><span class="chip ' + (s.source === "ia" ? "plum" : "") + '">' + (s.source === "ia" ? "IA" : s.source === "curadoria" ? "Curadoria" : "Manual") + "</span>" + (s.pinned ? '<span class="chip pers">Fixado</span>' : "") + "</div><h4>" + esc(s.title) + "</h4>" + (s.body ? '<div class="md small">' + md(s.body) + "</div>" : "") +
            '<div class="row"><button class="btn btn-ghost btn-sm" data-act="pin" data-id="' + s.id + '">' + (s.pinned ? "Desafixar" : "Fixar") + '</button><button class="btn btn-ghost btn-sm" data-act="sig-q" data-id="' + s.id + '">+ Pergunta</button><button class="btn btn-ghost btn-sm btn-danger" data-act="sig-del" data-id="' + s.id + '">Remover</button></div></article>';
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
        '<label class="field"><span>Tema</span><select class="select" name="tema"><option>Entender o problema e o cliente</option><option>Hipóteses e experimentos</option><option>Leitura de evidências</option><option>Modelo de negócio e preço</option><option>Pitch e decisão</option><option>Projeto de inovação na organização</option><option>Outro</option></select></label>' +
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
    main.innerHTML = head("Contexto do projeto", "Preencha uma vez: todas as ferramentas usam essas informações. Salva automaticamente.") +
      '<section class="panel"><div class="form">' +
        '<div class="row"><label class="field" style="flex:2;min-width:220px"><span>Nome do projeto</span><input class="input" id="pname" maxlength="120" value="' + esc(p.name) + '"></label>' +
        '<label class="field" style="flex:1;min-width:200px"><span>Tipo</span><select class="select" id="pkind"><option value="empreendedor"' + (p.kind === "empreendedor" ? " selected" : "") + '>Projeto empreendedor</option><option value="inovacao"' + (p.kind === "inovacao" ? " selected" : "") + ">Inovação em uma organização</option></select></label></div>" +
        fields.map(function (f) {
          return '<label class="field"><span>' + esc(f.label) + "</span><small>" + esc(f.hint) + "</small>" + (f.long ? '<textarea class="textarea" data-ctx="' + f.id + '" placeholder="' + esc(f.ph) + '">' + esc(ctx[f.id] || "") + "</textarea>" : '<input class="input" data-ctx="' + f.id + '" placeholder="' + esc(f.ph) + '" value="' + esc(ctx[f.id] || "") + '">') + "</label>";
        }).join("") +
      '</div></section><section class="panel"><h2>Zona de perigo</h2><p class="small muted" style="margin:6px 0 12px">Excluir o projeto apaga artefatos, quadro, radar e pedidos de mentoria.</p><button class="btn btn-line btn-danger" data-act="del-project">Excluir projeto</button></section>';
    main.querySelectorAll("[data-ctx]").forEach(function (el) { el.oninput = function () { ctx[el.dataset.ctx] = el.value; saveContext(); }; });
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
    else if (act === "new-project") newProjectModal();
    else if (act === "tfilter") { state.toolFilter = el.dataset.f; route(); }
    else if (act === "bfilter") { state.boardFilter = el.dataset.f; route(); }
    else if (act === "lens") { setFocus(el.dataset.lens); state.toolFilter = el.dataset.lens; go("#/p/" + state.p.id + "/ferramentas"); }
    else if (act === "add-item") boardModal(null);
    else if (act === "edit-item") boardModal(state.board.filter(function (b) { return b.id === el.dataset.id; })[0]);
    else if (act === "pin" || act === "sig-del" || act === "sig-q") {
      var s = state.radar.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!s) return;
      if (act === "pin") sb.from("radar_items").update({ pinned: !s.pinned }).eq("id", s.id).then(function (r) { if (r.error) return fail(r.error); s.pinned = !s.pinned; route(); });
      if (act === "sig-del") sb.from("radar_items").delete().eq("id", s.id).then(function (r) { if (r.error) return fail(r.error); state.radar = state.radar.filter(function (x) { return x.id !== s.id; }); route(); });
      if (act === "sig-q") boardModal(null, { kind: "pergunta", title: s.title, body: s.body });
    }
  });

  /* ---------------- início ---------------- */
  sb.auth.onAuthStateChange(function (event, session) {
    var had = !!state.session; state.session = session;
    if (event === "SIGNED_OUT") { state.p = null; route(); }
    else if (!had && session) route();
  });
  sb.auth.getSession().then(function (r) { state.session = r.data.session; route(); });
})();
