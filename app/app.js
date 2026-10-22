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
  var state = { session: null, projects: [], p: null, artifacts: [], board: [], radar: [], pedidos: [], workspaces: [], toolFilter: "todas", boardFilter: "todas", tTab: {}, aiVar: {} };
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
  function route() {
    var parts = parse();
    if (!state.session) return renderAuth(/[?&]email=/.test(location.hash) ? "criar" : "entrar");
    if (parts[0] !== "p" || !parts[1]) return renderProjects();
    var id = parts[1], tab = parts[2] || "mesa", sub = parts[3];
    var ready = state.p && state.p.id === id ? Promise.resolve() : (($app.innerHTML = '<div class="loading">Carregando projeto…</div>'), loadProject(id));
    ready.then(function () { renderProject(tab, sub); }).catch(function (e) { fail(e); go("#/"); });
  }
  window.addEventListener("hashchange", function () { flushContext(); flushWorkspace(); route(); });

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
    { id: "ferramentas", name: "Jornada" },
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
    var views = { mesa: viewMesa, visao: viewVisao, ferramentas: viewFerramentas, ferramenta: function (m, id) { return TOOL[id] && TOOL[id].workspace ? viewTraction(m, id) : viewFerramenta(m, id); }, artefatos: viewArtefatos, artefato: viewArtefato, quadro: viewQuadro, radar: viewRadar, mentoria: viewMentoria, contexto: viewContexto };
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
    var plant = life === 0 ? 0 : life < 6 ? 1 : life < 16 ? 2 : 3;
    var dayAgo = Date.now() - 864e5;
    var warm = state.artifacts.concat(state.board).some(function (x) { return new Date(x.created_at).getTime() > dayAgo; });
    var seen = readSeen(), fresh = {};
    if (seen) done.forEach(function (id) { if (seen.indexOf(id) === -1) fresh[id] = true; });
    var move = MESA.nextMoves(p, state.artifacts, state.board, state.pedidos, state.workspaces)[0];
    var moveHref = move.action.type === "tool" ? "#/p/" + p.id + "/ferramenta/" + move.action.id : move.action.type === "tab" ? "#/p/" + p.id + "/" + move.action.id : "#/p/" + p.id + "/contexto";

    var wip = {}; state.workspaces.forEach(function (w) { if (!byTool[w.tool_id]) wip[w.tool_id] = true; });
    var zoneHtml = function (l) {
      var objs = MESA.DESK_ORDER.filter(function (id) { return TOOL[id] && TOOL[id].lens === l.id; }).map(function (id) {
        var t = TOOL[id], n = (byTool[id] || []).length;
        return '<button class="obj ' + (n ? "is-on" : wip[id] ? "is-wip" : "is-empty") + (fresh[id] ? " is-new" : "") + '" data-tool="' + id + '" style="--rot:' + tilt(id) + 'deg" title="' + esc(MESA.DESK_OBJECT[id] + " · " + t.name) + '">' +
          '<span class="art">' + MESA.deskArt(id) + '</span><span class="tag">' + esc(t.name) + "</span>" + (n > 1 ? '<span class="badge">' + n + "</span>" : "") + "</button>";
      }).join("");
      var n = MESA.DESK_ORDER.filter(function (id) { return TOOL[id] && TOOL[id].lens === l.id; }).length;
      return '<section class="zone' + (p.focus === l.id ? " is-focus" : "") + '" style="--n:' + n + '" aria-label="' + l.name + '"><h3 class="hand">' + l.name + MESA.arrow() + (p.focus === l.id ? " <em>foco agora</em>" : "") + '</h3><div class="objs">' + objs + "</div></section>";
    };
    var zones = MESA.PHASES.map(function (ph) {
      return '<div class="phase-band"><p class="phase-name"><span>' + ph.n + "</span>" + ph.name + " <small>" + ph.pt + '</small></p><div class="zones">' + ph.lenses.map(function (lid) { return zoneHtml(LENS[lid]); }).join("") + "</div></div>";
    }).join("");

    var notes = state.board.slice(0, 7).map(function (b) {
      return '<button class="pin" data-act="edit-item" data-id="' + b.id + '" style="--bg:' + BOARD_COLOR[b.kind] + ";--rot:" + tilt(b.id) + 'deg"><small>' + KINDS[b.kind] + '</small><span class="pt">' + esc(b.title) + "</span></button>";
    }).join("");

    var BOOKS = [["problema", "Problema"], ["persona", "Cliente"], ["mercado", "Mercado"], ["beachhead", "Segmento"], ["solucao", "Solução"], ["modelo", "Receita"]];
    var books = BOOKS.map(function (b, i) { return '<span class="book' + ((ctx[b[0]] || "").trim() ? " is-on" : "") + '" style="--i:' + i + '">' + b[1] + "</span>"; }).join("");
    var steps = MESA.PHASES.map(function (ph) {
      var ids = MESA.DESK_ORDER.filter(function (id) { return TOOL[id] && LENS[TOOL[id].lens].phase === ph.id; }), n = ids.filter(function (id) { return byTool[id]; }).length;
      var cur = LENS[p.focus] && LENS[p.focus].phase === ph.id;
      return '<li><button data-act="mesa-focus" data-lens="' + ph.lenses[0] + '"' + (cur ? ' aria-current="step"' : "") + ' title="' + esc(ph.goal) + '"><span class="dot' + (n ? " has" : "") + (n === ids.length ? " full" : "") + '">' + ph.n + "</span><b>" + ph.name + "</b><small>" + n + "/" + ids.length + "</small></button></li>";
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
            '<div class="life" aria-label="Vida da mesa"><span style="width:' + Math.round(Math.min(life, 31) / 31 * 100) + '%"></span></div>' +
            '<a class="btn btn-primary btn-sm" href="' + moveHref + '">' + esc(moveLabel) + " →</a></aside>" +
        "</div>" +
        '<div class="tabletop">' +
          '<div class="bands">' + zones + "</div>" +
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
        if (!list.length || t.workspace) return go("#/p/" + p.id + "/ferramenta/" + id);
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
    var moves = MESA.nextMoves(p, state.artifacts, state.board, state.pedidos, state.workspaces);
    var radar = MESA.matchRadar(p, c, 3);
    var lensBtn = function (l) {
      var n = c[l.id] || 0, meter = "";
      for (var i = 0; i < 4; i++) meter += "<i" + (i < Math.min(n, 4) ? ' class="on"' : "") + "></i>";
      return '<button class="lens' + (p.focus === l.id ? " is-focus" : "") + '" data-act="lens" data-lens="' + l.id + '"><b>' + l.name + '</b><span class="q">' + l.q + '</span><span class="small muted">' + n + " artefato" + (n === 1 ? "" : "s") + '</span><span class="meter">' + meter + "</span></button>";
    };
    var lenses = MESA.PHASES.map(function (ph) { return '<div class="lens-phase" style="--n:' + ph.lenses.length + '"><p class="label">Fase ' + ph.n + " · " + ph.name + '</p><div class="lens-col">' + ph.lenses.map(function (id) { return lensBtn(LENS[id]); }).join("") + "</div></div>"; }).join("");
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
  function viewFerramentas(main) {
    var p = state.p, cur = currentPhase();
    var strip = MESA.PHASES.map(function (ph) {
      var pr = phaseProgress(ph);
      return '<a class="pstrip-item' + (ph.id === cur ? " is-current" : "") + '" href="#fase-' + ph.id + '" data-act="scroll" data-target="fase-' + ph.id + '"><span class="pn">' + ph.n + '</span><span><b>' + ph.name + "</b><small>" + ph.pt + " · " + pr.done + "/" + pr.total + '</small></span><span class="pbar"><i style="width:' + Math.round(pr.done / pr.total * 100) + '%"></i></span>' + (ph.id === cur ? '<em>você está aqui</em>' : "") + "</a>";
    }).join('<span class="parrow" aria-hidden="true">→</span>');
    var sections = MESA.PHASES.map(function (ph, i) {
      var pr = phaseProgress(ph), prev = MESA.PHASES[i - 1], next = MESA.PHASES[i + 1], tools;
      if (ph.id === "traction") {
        var nextTodo = MESA.TRACTION.filter(function (t) { return toolState(t.id).k !== "done"; })[0];
        tools = '<ol class="tsteps">' + MESA.TRACTION.map(function (t) {
          var st = toolState(t.id);
          return '<li class="tstep is-' + st.k + (nextTodo && nextTodo.id === t.id ? " is-next" : "") + '"><a href="#/p/' + p.id + "/ferramenta/" + t.id + '"><span class="tn">' + t.n + '</span><span class="tb"><b>' + esc(t.name) + '</b><span>' + esc(t.question) + '</span></span><span class="tst">' + st.label + (nextTodo && nextTodo.id === t.id ? " · próxima" : "") + "</span></a></li>";
        }).join("") + "</ol>";
      } else {
        tools = ph.lenses.map(function (lid) {
          var ts = MESA.TOOLS.filter(function (t) { return t.lens === lid; });
          return '<div class="psub"><h4>' + LENS[lid].name + ' <span class="muted">· ' + esc(LENS[lid].q) + '</span></h4><div class="grid-cards">' + ts.map(function (t) {
            var st = toolState(t.id);
            return '<a class="tcard" href="#/p/' + p.id + "/ferramenta/" + t.id + '"><div class="row"><span class="chip ' + (st.k === "done" ? "pers" : "") + '">' + st.label + "</span></div><h3>" + esc(t.name) + "</h3><p>" + esc(t.desc) + '</p><span class="go">Abrir ferramenta →</span></a>';
          }).join("") + "</div></div>";
        }).join("");
      }
      return '<section class="panel phase" id="fase-' + ph.id + '"><div class="phase-head"><span class="pn big">' + ph.n + '</span><div><p class="label">Fase ' + ph.n + " · " + ph.pt + "</p><h2>" + ph.name + "</h2><p>" + esc(ph.goal) + '</p></div><div class="phase-prog"><b>' + pr.done + "/" + pr.total + '</b><span class="small muted">ferramentas ' + (ph.id === "traction" ? "concluídas" : "com artefato") + '</span><span class="pbar"><i style="width:' + Math.round(pr.done / pr.total * 100) + '%"></i></span></div></div>' +
        '<div class="phase-info"><div><h4>O que você vai aprender</h4><p>' + esc(ph.learn) + "</p></div><div><h4>Entregáveis</h4><ul>" + ph.deliverables.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul></div><div><h4>Pode avançar quando</h4><p>" + esc(ph.exit) + '</p><p class="small muted">' + (prev ? "Vem de: Fase " + prev.n + " · " + prev.name + ". " : "") + (next ? "Leva a: Fase " + next.n + " · " + next.name + "." : "Depois: novos ciclos de revisão e melhoria.") + "</p></div></div>" + tools + "</section>";
    }).join("");
    main.innerHTML = head("Jornada Zero to First", "Três fases oficiais, da descoberta do problema aos primeiros sinais de tração. Não é uma trilha rígida: volte a uma fase sempre que a evidência pedir.") +
      '<nav class="pstrip" aria-label="Fases">' + strip + "</nav>" + sections;
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
    var tab = state.tTab[toolId] || (isNew ? "guia" : "trabalho");
    var idx = MESA.TRACTION.indexOf(t), next = t.next && TOOL[t.next];
    var stepper = '<ol class="tmini" aria-label="Ferramentas da Fase 3">' + MESA.TRACTION.map(function (x) { var st = toolState(x.id); return '<li class="is-' + st.k + (x.id === toolId ? " is-cur" : "") + '"><a href="#/p/' + p.id + "/ferramenta/" + x.id + '" title="' + esc(x.n + ". " + x.name + " · " + st.label) + '"><span>' + x.n + "</span><b>" + esc(x.name) + "</b></a></li>"; }).join("") + "</ol>";
    var st = toolState(toolId);
    main.innerHTML = '<p class="small"><a href="#/p/' + p.id + '/ferramentas">← Jornada</a> <span class="muted">· Fase 3 · Traction · ferramenta ' + t.n + " de 7</span></p>" + stepper +
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
      body.innerHTML = '<details class="panel reuse-box"' + (isNew ? " open" : "") + '><summary><b>Reaproveitado das etapas anteriores</b> <span class="small muted">· edite na origem</span></summary>' + reuseHtml(true) + "</details>" +
        t.sections.map(function (s) {
          if (s.type === "panel") return '<div data-panel="' + s.fn + '">' + MESA.TRACTION_PANELS[s.fn](d, env()) + "</div>";
          n++;
          var inner = s.type === "fields" ? '<div class="fgrid">' + s.fields.map(fieldBlock).join("") + "</div>" : s.type === "list" ? listBlock(s) : s.type === "decisions" ? decisionsBlock(s) : s.type === "unit" ? unitBlock() :
            s.type === "model" ? '<div class="fgrid"><label class="field"><span>Modelo de negócio</span>' + inputHtml(MESA.CONTEXT_FIELDS.filter(function (f) { return f.id === "tipo"; })[0], (p.context || {}).tipo, 'data-ctxf="tipo"') + '<small>Salvo no contexto do projeto: vale para todas as ferramentas.</small></label></div>' : "";
          var title = s.type === "unit" ? "Cenários" : s.type === "model" ? "Modelo de negócio" : s.title;
          return '<section class="panel wsec" data-sec="' + (s.id || n) + '"><h2><span class="snum">' + n + "</span>" + esc(title) + "</h2>" + (s.help ? '<p class="small muted">' + esc(s.help) + "</p>" : "") + inner + "</section>";
        }).join("") + aiBlock() +
        '<div class="row" style="margin-top:16px"><span class="spacer"></span><button class="btn btn-accent" data-tab="resultado">Ver o resultado →</button></div>';
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
          '<p>Você chegou ao fim da Fase 3. A partir daqui, a tração vira ciclo: mantenha a rotina de revisão, volte a First Customers e Traction Channels quando o roadmap pedir, e reveja Discovery e Validation se a evidência mudar.</p><a class="btn btn-line" href="#/p/' + p.id + '/ferramentas">Ver a jornada</a>') + "</section></div>";
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
    function rerender() { var y = window.scrollY; render(); window.scrollTo(0, y); }
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
      if (ds.tab) { tab = state.tTab[toolId] = ds.tab; render(); window.scrollTo(0, main.querySelector(".ttabs").offsetTop - 70); }
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
      else if (b.hasAttribute("data-conclude")) { w.status = "concluido"; saveWorkspace(w); flushWorkspace().then(saveDeliverable).then(function () { track("traction_tool_done", { tool: toolId }); toast(MESA.DESK_OBJECT[toolId] + " na mesa. Ferramenta concluída."); rerender(); }); }
      else if (b.hasAttribute("data-reopen")) { w.status = "em_andamento"; saveWorkspace(w); rerender(); }
    });
    function saveDeliverable() {
      var content = MESA.tractionDeliverable(t, d, env()), art = state.artifacts.filter(function (a) { return a.tool_id === toolId; })[0];
      var q = art ? sb.from("artifacts").update({ content: content }).eq("id", art.id).select().single() : sb.from("artifacts").insert({ project_id: p.id, tool_id: toolId, stage: t.lens, title: t.name + " · entregável", content: content }).select().single();
      return q.then(function (r) { if (r.error) return fail(r.error); if (art) Object.assign(art, r.data); else state.artifacts.unshift(r.data); toast(art ? "Entregável atualizado na Mesa." : MESA.DESK_OBJECT[toolId] + " na mesa: entregável salvo."); });
    }
    render();
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
    main.innerHTML = head("Contexto do projeto", "Preencha uma vez: todas as ferramentas usam essas informações. Salva automaticamente.") +
      '<section class="panel"><div class="form">' +
        '<div class="row"><label class="field" style="flex:2;min-width:220px"><span>Nome do projeto</span><input class="input" id="pname" maxlength="120" value="' + esc(p.name) + '"></label>' +
        '<label class="field" style="flex:1;min-width:200px"><span>Tipo</span><select class="select" id="pkind"><option value="empreendedor"' + (p.kind === "empreendedor" ? " selected" : "") + '>Projeto empreendedor</option><option value="inovacao"' + (p.kind === "inovacao" ? " selected" : "") + ">Inovação em uma organização</option></select></label></div>" +
        fields.map(function (f) {
          if (f.options) return '<label class="field"><span>' + esc(f.label) + "</span><small>" + esc(f.hint) + '</small><select class="select" data-ctx="' + f.id + '">' + f.options.map(function (o) { return '<option value="' + o[0] + '"' + ((ctx[f.id] || "") === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>";
          return '<label class="field"><span>' + esc(f.label) + "</span><small>" + esc(f.hint) + "</small>" + (f.long ? '<textarea class="textarea" data-ctx="' + f.id + '" placeholder="' + esc(f.ph) + '">' + esc(ctx[f.id] || "") + "</textarea>" : '<input class="input" data-ctx="' + f.id + '" placeholder="' + esc(f.ph) + '" value="' + esc(ctx[f.id] || "") + '">') + "</label>";
        }).join("") +
      '</div></section><section class="panel"><h2>Zona de perigo</h2><p class="small muted" style="margin:6px 0 12px">Excluir o projeto apaga artefatos, quadro, radar e pedidos de mentoria.</p><button class="btn btn-line btn-danger" data-act="del-project">Excluir projeto</button></section>';
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
