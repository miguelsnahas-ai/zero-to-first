/* =============================================================
   MESA DE TRABALHO · painel de administração
   Só funciona para contas listadas em public.admins (Supabase).
   Os dados vêm de funções admin_* que conferem is_admin().
   ============================================================= */
(function () {
  "use strict";
  var SUPABASE_URL = "https://urdgezmqopcvxtaupdgz.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZGdlem1xb3Bjdnh0YXVwZGd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDUzMDUsImV4cCI6MjA5NzEyMTMwNX0.Lwb1lgEWG2lkbvsuHfeEVHeVnOBV3aaosAv8oLQ4h3E";
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  var $app = document.getElementById("app");
  var data = { overview: null, users: [], leads: [], mentorias: [] };
  var session = null;
  var TOOL = {}; (window.MESA && MESA.TOOLS || []).forEach(function (t) { TOOL[t.id] = t.name; }); TOOL.nota = "Notas manuais";
  var LENS = { entender: "Entender", explorar: "Explorar", experimentar: "Experimentar", validar: "Validar", avancar: "Avançar", nota: "Notas" };
  var KINDS = { hipotese: "Hipóteses", experimento: "Experimentos", evidencia: "Evidências", decisao: "Decisões", pergunta: "Perguntas" };
  var STATUS = { aberto: "Aberto", testando: "Testando", validado: "Validado", refutado: "Refutado", feito: "Feito" };
  var MSTATUS = { novo: "Novo", agendado: "Agendado", respondido: "Respondido", fechado: "Fechado" };
  var PKIND = { empreendedor: "Empreendedor", inovacao: "Inovação" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function md(s) { return window.DOMPurify.sanitize(window.marked.parse(s || "", { breaks: true })); }
  function dt(d, withTime) { if (!d) return "—"; var o = { day: "2-digit", month: "short", year: "2-digit" }; if (withTime) { o.hour = "2-digit"; o.minute = "2-digit"; } return new Date(d).toLocaleString("pt-BR", o); }
  function ast() { return '<svg class="ast" aria-hidden="true" viewBox="0 0 20 20"><path d="M10 1.5v17M2.64 5.75l14.72 8.5M2.64 14.25l14.72-8.5" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg>'; }
  function toast(t) { var el = document.getElementById("toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove("show"); }, 2600); }
  function fail(e) { console.error(e); toast("Erro: " + (e && e.message || "tente de novo")); }
  function rpc(name, args) { return sb.rpc(name, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function pct(a, b) { return b ? Math.round((a / b) * 100) + "%" : "—"; }
  function csv(rows, cols, name) {
    var q = function (v) { v = v == null ? "" : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var out = [cols.map(function (c) { return q(c[1]); }).join(";")].concat(rows.map(function (r) { return cols.map(function (c) { return q(typeof c[0] === "function" ? c[0](r) : r[c[0]]); }).join(";"); }));
    var blob = new Blob(["﻿" + out.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name + "-" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- tooltip dos gráficos ---------- */
  var tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip);
  document.addEventListener("pointermove", function (e) {
    var el = e.target.closest && e.target.closest("[data-tip]");
    if (!el) { tip.classList.remove("show"); return; }
    tip.textContent = el.getAttribute("data-tip"); tip.classList.add("show");
    var x = Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 8); tip.style.left = x + "px"; tip.style.top = (e.clientY - 36) + "px";
  });

  /* ---------- gráficos ---------- */
  function columns(weekly, key, label) {
    var max = Math.max.apply(null, weekly.map(function (w) { return w[key]; }).concat([1]));
    var bars = weekly.map(function (w) {
      var v = w[key], h = (v / max) * 100;
      var wk = new Date(w.week + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return '<div class="col" data-tip="Semana de ' + wk + ": " + v + " " + esc(label) + '" tabindex="0" aria-label="Semana de ' + wk + ": " + v + '">' +
        (v ? '<span class="n" style="bottom:calc(' + h + '% + 4px)">' + v + "</span>" : "") +
        '<div class="bar' + (v ? "" : " zero") + '" style="height:' + h + '%"></div></div>';
    }).join("");
    var labels = weekly.map(function (w) { return "<span>" + new Date(w.week + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + "</span>"; }).join("");
    return '<div class="cols" role="img" aria-label="' + esc(label) + ' por semana, últimas 12 semanas">' + bars + '</div><div class="col-labels" aria-hidden="true">' + labels + "</div>";
  }
  function hbars(items, opts) {
    opts = opts || {};
    if (!items.length || !items.some(function (i) { return i.v; })) return '<p class="muted small">Ainda sem dados.</p>';
    var max = opts.max || Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    return '<div class="hbars' + (opts.funnel ? " funnel" : "") + '">' + items.map(function (i) {
      var w = (i.v / max) * 100;
      return '<div class="hbar" data-tip="' + esc(i.l) + ": " + i.v + (i.p ? " (" + i.p + ")" : "") + '"><span class="lbl" title="' + esc(i.l) + '">' + esc(i.l) + '</span><span class="track"><span class="fill" style="width:' + w + '%"></span></span><span class="num">' + i.v + "</span></div>";
    }).join("") + "</div>";
  }
  function fromObj(obj, names, order) {
    var keys = order || Object.keys(obj || {});
    return keys.map(function (k) { return { l: names[k] || k, v: (obj && obj[k]) || 0 }; });
  }

  /* ---------- estrutura ---------- */
  var TABS = [["visao", "Visão geral"], ["mentorias", "Mentorias"], ["usuarios", "Usuários"], ["cadastros", "Cadastros"], ["uso", "Uso da Mesa"]];
  function shell(tab) {
    var novos = data.overview ? data.overview.mentoria_novo : 0;
    return '<header class="topbar"><a class="brand" href="#/">Mesa · Admin' + ast() + '</a><span class="spacer"></span>' +
      '<button class="btn btn-ghost btn-sm" data-act="reload">Atualizar</button><a class="btn btn-ghost btn-sm" href="../app/">Mesa</a><button class="btn btn-ghost btn-sm" data-act="logout">Sair</button></header>' +
      '<nav class="admin-tabs" aria-label="Seções do painel">' + TABS.map(function (t) {
        return '<a href="#/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : "") + ">" + t[1] + (t[0] === "mentorias" && novos ? '<span class="badge" aria-label="' + novos + ' novos">' + novos + "</span>" : "") + "</a>";
      }).join("") + '</nav><main class="page" id="main"></main>';
  }

  function route() {
    if (!session) return renderLogin();
    var tab = (location.hash.replace(/^#\/?/, "") || "visao").split("/")[0];
    if (!TABS.some(function (t) { return t[0] === tab; })) tab = "visao";
    $app.innerHTML = shell(tab);
    var main = document.getElementById("main");
    ({ visao: viewVisao, mentorias: viewMentorias, usuarios: viewUsuarios, cadastros: viewCadastros, uso: viewUso })[tab](main);
  }
  window.addEventListener("hashchange", route);

  function load() {
    $app.innerHTML = '<div class="loading">Carregando dados…</div>';
    return rpc("is_admin").then(function (ok) {
      if (!ok) return renderDenied();
      return Promise.all([rpc("admin_overview"), rpc("admin_users"), rpc("admin_leads"), rpc("admin_mentorias")]).then(function (r) {
        data.overview = r[0]; data.users = r[1] || []; data.leads = r[2] || []; data.mentorias = r[3] || [];
        route();
      });
    }).catch(function (e) { fail(e); renderDenied(); });
  }

  /* ---------- login ---------- */
  function renderLogin() {
    $app.innerHTML = '<div class="auth"><section class="auth-side"><span class="brand">Mesa · Admin' + ast() + '</span><div><h1>Painel da <em>Mesa de Trabalho</em>.</h1><p>Usuários, cadastros, pedidos de mentoria e uso das ferramentas.</p></div><span></span></section>' +
      '<main class="auth-main"><div class="auth-card"><form class="form" id="lf" novalidate><h2>Entrar como administrador</h2>' +
      '<label class="field"><span>E-mail</span><input class="input" name="email" type="email" autocomplete="email" required></label>' +
      '<label class="field"><span>Senha</span><input class="input" name="senha" type="password" autocomplete="current-password" required></label>' +
      '<div class="msg err" id="lm" hidden></div><button class="btn btn-primary">Entrar</button>' +
      '<p class="small muted">Use a mesma conta da Mesa de Trabalho. Só contas administradoras veem os dados.</p></form></div></main></div>';
    document.getElementById("lf").onsubmit = function (e) {
      e.preventDefault(); var f = e.target, m = document.getElementById("lm"); m.hidden = true;
      sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.senha.value }).then(function (r) {
        if (r.error) { m.textContent = /Invalid login/i.test(r.error.message) ? "E-mail ou senha incorretos." : r.error.message; m.hidden = false; }
      });
    };
  }
  function renderDenied() {
    var email = session && session.user ? session.user.email : "";
    $app.innerHTML = '<div class="page"><div class="empty"><h2>Esta conta não é administradora</h2><p>Você entrou como <b>' + esc(email) + '</b>. O acesso ao painel é liberado por conta, no banco de dados.</p><button class="btn btn-line" data-act="logout">Sair</button></div></div>';
  }

  /* ---------- visão geral ---------- */
  function viewVisao(main) {
    var o = data.overview, u = data.users;
    var comArtefato = u.filter(function (x) { return x.artefatos > 0; }).length;
    var comMentoria = u.filter(function (x) { return x.pedidos_mentoria > 0; }).length;
    main.innerHTML = '<div class="page-head"><div><p class="label">Painel</p><h1>Visão geral</h1></div><span class="small muted">Atualizado em ' + dt(new Date(), true) + "</span></div>" +
      '<div class="tiles">' +
        '<div class="tile"><span class="k">Usuários</span><span class="v">' + o.users_total + '</span><span class="d">+' + o.users_7d + " em 7 dias · +" + o.users_30d + " em 30</span></div>" +
        '<div class="tile"><span class="k">Ativos em 7 dias</span><span class="v">' + o.active_7d + '</span><span class="d">' + pct(o.active_7d, o.users_total) + " dos usuários</span></div>" +
        '<a class="tile" href="#/cadastros"><span class="k">Cadastros na página</span><span class="v">' + o.leads_total + '</span><span class="d">+' + o.leads_7d + " em 7 dias</span></a>" +
        '<div class="tile"><span class="k">Projetos</span><span class="v">' + o.projects_total + '</span><span class="d">' + o.users_with_project + " usuário(s) com projeto</span></div>" +
        '<a class="tile" href="#/uso"><span class="k">Artefatos</span><span class="v">' + o.artifacts_total + '</span><span class="d">' + o.board_total + " itens no quadro · " + o.radar_total + " sinais</span></a>" +
        '<a class="tile' + (o.mentoria_novo ? " alert" : "") + '" href="#/mentorias"><span class="k">Mentorias novas</span><span class="v">' + o.mentoria_novo + '</span><span class="d">' + o.mentoria_total + " pedido(s) no total</span></a>" +
      "</div>" +
      '<div class="cols-2"><section class="panel"><h2>Novos usuários por semana</h2><p class="small muted" style="margin-bottom:8px">Últimas 12 semanas</p>' + columns(o.weekly, "users", "novos usuários") + "</section>" +
        '<section class="panel"><h2>Cadastros na página por semana</h2><p class="small muted" style="margin-bottom:8px">Formulário da Mesa de Trabalho · últimas 12 semanas</p>' + columns(o.weekly, "leads", "cadastros") + "</section></div>" +
      '<section class="panel"><h2>Funil</h2><p class="small muted" style="margin-bottom:14px">Da página até a mentoria. Percentuais sobre o total de contas.</p>' +
        hbars([
          { l: "Cadastros na página", v: o.leads_total },
          { l: "Contas criadas", v: o.users_total },
          { l: "Criaram projeto", v: o.users_with_project, p: pct(o.users_with_project, o.users_total) },
          { l: "Salvaram artefato", v: comArtefato, p: pct(comArtefato, o.users_total) },
          { l: "Pediram mentoria", v: comMentoria, p: pct(comMentoria, o.users_total) }
        ], { funnel: true }) + "</section>" +
      '<div class="cols-2"><section class="panel"><h2>Projetos criados por semana</h2><p class="small muted" style="margin-bottom:8px">Últimas 12 semanas</p>' + columns(o.weekly, "projects", "projetos") + "</section>" +
        '<section class="panel"><h2>Artefatos salvos por semana</h2><p class="small muted" style="margin-bottom:8px">Últimas 12 semanas</p>' + columns(o.weekly, "artifacts", "artefatos") + "</section></div>";
  }

  /* ---------- mentorias ---------- */
  function viewMentorias(main) {
    var f = viewMentorias.f || "todos";
    var list = data.mentorias.filter(function (m) { return f === "todos" || m.status === f; });
    main.innerHTML = '<div class="page-head"><div><p class="label">Painel</p><h1>Pedidos de mentoria</h1></div></div>' +
      '<div class="filters">' + [["todos", "Todos"]].concat(Object.keys(MSTATUS).map(function (k) { return [k, MSTATUS[k]]; })).map(function (s) {
        var n = s[0] === "todos" ? data.mentorias.length : data.mentorias.filter(function (m) { return m.status === s[0]; }).length;
        return '<button data-act="mfilter" data-f="' + s[0] + '" aria-pressed="' + (f === s[0]) + '">' + s[1] + " · " + n + "</button>";
      }).join("") + "</div>" +
      (list.length ? '<div class="list">' + list.map(function (m) {
        return '<button class="req" data-act="open-req" data-id="' + m.id + '"><span class="chip st-' + m.status + '">' + MSTATUS[m.status] + '</span><span class="t">' + esc(m.tema) + " · " + esc(m.projeto.nome) + '</span><span class="small muted">' + dt(m.created_at, true) + '</span><span class="meta">' + esc(m.email || m.contato) + " · " + m.artefatos.length + " artefato(s) compartilhado(s)</span></button>";
      }).join("") + "</div>" : '<div class="empty"><p>Nenhum pedido ' + (f === "todos" ? "ainda" : "com este status") + ".</p></div>");
  }
  function openReq(id) {
    var m = data.mentorias.filter(function (x) { return x.id === id; })[0]; if (!m) return;
    var ctx = m.projeto.contexto || {};
    var labels = {}; (MESA.CONTEXT_FIELDS || []).forEach(function (f) { labels[f.id] = f.label; });
    var ctxRows = Object.keys(ctx).filter(function (k) { return ctx[k]; }).map(function (k) { return "<div><b>" + esc(labels[k] || k) + "</b><span>" + esc(ctx[k]) + "</span></div>"; }).join("");
    var mail = "mailto:" + encodeURIComponent(m.contato || m.email || "") + "?subject=" + encodeURIComponent("Mentoria Mesa de Trabalho: " + m.projeto.nome);
    var wrap = document.createElement("div"); wrap.className = "modal";
    wrap.innerHTML = '<div class="modal-box wide" role="dialog" aria-modal="true" aria-label="Pedido de mentoria">' +
      '<div class="row" style="margin-bottom:6px"><span class="chip st-' + m.status + '">' + MSTATUS[m.status] + '</span><span class="small muted">' + dt(m.created_at, true) + '</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-close>Fechar</button></div>' +
      "<h2>" + esc(m.tema) + "</h2>" +
      '<div class="ctx"><div><b>Pessoa</b><span>' + esc(m.email || "—") + (m.contato && m.contato !== m.email ? " · contato: " + esc(m.contato) : "") + "</span></div><div><b>Projeto</b><span>" + esc(m.projeto.nome) + " · " + (PKIND[m.projeto.tipo] || "") + " · foco em " + (LENS[m.projeto.foco] || m.projeto.foco) + "</span></div><div><b>Mensagem</b><span style=\"white-space:pre-wrap\">" + esc(m.mensagem) + "</span></div></div>" +
      '<div class="row" style="margin:16px 0"><label class="row small"><span class="muted">Status</span><select class="select" id="mst" style="width:auto">' + Object.keys(MSTATUS).map(function (k) { return '<option value="' + k + '"' + (k === m.status ? " selected" : "") + ">" + MSTATUS[k] + "</option>"; }).join("") + '</select></label><span class="spacer"></span><a class="btn btn-accent btn-sm" href="' + mail + '">Responder por e-mail</a></div>' +
      (ctxRows ? '<h3 style="margin:18px 0 8px">Contexto do projeto</h3><div class="ctx">' + ctxRows + "</div>" : "") +
      '<h3 style="margin:22px 0 8px">Artefatos compartilhados</h3>' + (m.artefatos.length ? '<div class="list">' + m.artefatos.map(function (a) {
        return '<details class="art"><summary>' + esc(a.titulo) + ' <span class="small muted">· ' + esc(TOOL[a.ferramenta] || "Nota") + "</span></summary><div class=\"md\">" + md(a.conteudo) + "</div></details>";
      }).join("") + "</div>" : '<p class="small muted">Nenhum artefato compartilhado.</p>') + "</div>";
    function close() { wrap.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    wrap.addEventListener("click", function (e) { if (e.target === wrap || e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", onKey); document.body.appendChild(wrap);
    wrap.querySelector("#mst").onchange = function (e) {
      var st = e.target.value;
      rpc("admin_set_mentoria_status", { pedido: m.id, novo_status: st }).then(function () {
        if (m.status === "novo" && st !== "novo") data.overview.mentoria_novo--; else if (m.status !== "novo" && st === "novo") data.overview.mentoria_novo++;
        m.status = st; toast("Status atualizado."); close(); route();
      }).catch(fail);
    };
  }

  /* ---------- usuários ---------- */
  function viewUsuarios(main) {
    var q = (viewUsuarios.q || "").toLowerCase();
    var leads = {}; data.leads.forEach(function (l) { leads[(l.email || "").toLowerCase()] = 1; });
    var list = data.users.filter(function (u) { return !q || (u.email || "").toLowerCase().indexOf(q) !== -1; });
    main.innerHTML = '<div class="page-head"><div><p class="label">Painel</p><h1>Usuários</h1></div><button class="btn btn-line" data-act="csv-users">Exportar CSV</button></div>' +
      '<div class="toolbar"><input class="input" id="uq" type="search" placeholder="Buscar por e-mail" value="' + esc(viewUsuarios.q || "") + '"><span class="small muted">' + list.length + " de " + data.users.length + "</span></div>" +
      (data.users.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>E-mail</th><th>Criada em</th><th>Último acesso</th><th class="num">Projetos</th><th class="num">Artefatos</th><th class="num">Quadro</th><th class="num">Mentorias</th><th>Veio do cadastro</th></tr></thead><tbody>' +
        list.map(function (u) {
          return "<tr><td>" + esc(u.email) + "</td><td>" + dt(u.created_at) + "</td><td>" + dt(u.last_sign_in_at, true) + '</td><td class="num">' + u.projetos + '</td><td class="num">' + u.artefatos + '</td><td class="num">' + u.itens_quadro + '</td><td class="num">' + u.pedidos_mentoria + "</td><td>" + (leads[(u.email || "").toLowerCase()] ? '<span class="yes">Sim</span>' : '<span class="muted">Não</span>') + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="empty"><p>Nenhum usuário ainda.</p></div>');
    var inp = document.getElementById("uq");
    inp.oninput = function () { viewUsuarios.q = inp.value; var pos = inp.selectionStart; route(); var n = document.getElementById("uq"); n.focus(); n.setSelectionRange(pos, pos); };
  }

  /* ---------- cadastros ---------- */
  function viewCadastros(main) {
    var users = {}; data.users.forEach(function (u) { users[(u.email || "").toLowerCase()] = 1; });
    main.innerHTML = '<div class="page-head"><div><p class="label">Painel</p><h1>Cadastros na página</h1><p class="muted" style="margin-top:6px">Formulário da página da Mesa de Trabalho (nome, e-mail e WhatsApp).</p></div><button class="btn btn-line" data-act="csv-leads">Exportar CSV</button></div>' +
      (data.leads.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Data</th><th>Nome</th><th>E-mail</th><th>WhatsApp</th><th>Origem</th><th>Criou conta</th></tr></thead><tbody>' +
        data.leads.map(function (l) {
          var digits = (l.telefone || "").replace(/\D/g, ""); if (digits.length <= 11) digits = "55" + digits;
          return "<tr><td>" + dt(l.created_at, true) + "</td><td>" + esc(l.nome) + '</td><td><a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a></td><td><a href="https://wa.me/' + digits + '" target="_blank" rel="noopener">' + esc(l.telefone) + "</a></td><td>" + esc(l.origem || "—") + "</td><td>" + (users[(l.email || "").toLowerCase()] ? '<span class="yes">Sim</span>' : '<span class="muted">Não</span>') + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="empty"><p>Nenhum cadastro ainda.</p></div>');
  }

  /* ---------- uso ---------- */
  function viewUso(main) {
    var o = data.overview;
    var tools = (o.artifacts_by_tool || []).map(function (t) { return { l: TOOL[t.tool] || t.tool, v: t.n }; });
    main.innerHTML = '<div class="page-head"><div><p class="label">Painel</p><h1>Uso da Mesa</h1><p class="muted" style="margin-top:6px">Números agregados. O conteúdo dos projetos não aparece aqui.</p></div></div>' +
      '<section class="panel"><h2>Ferramentas mais usadas</h2><p class="small muted" style="margin-bottom:14px">Artefatos salvos por ferramenta</p>' + hbars(tools) + "</section>" +
      '<div class="cols-2"><section class="panel"><h2>Artefatos por lente</h2><p class="small muted" style="margin-bottom:14px">Onde os projetos estão trabalhando</p>' + hbars(fromObj(o.artifacts_by_lens, LENS, ["entender", "explorar", "experimentar", "validar", "avancar", "nota"])) + "</section>" +
        '<section class="panel"><h2>Foco atual dos projetos</h2><p class="small muted" style="margin-bottom:14px">Lente marcada como "foco agora"</p>' + hbars(fromObj(o.projects_by_focus, LENS, ["entender", "explorar", "experimentar", "validar", "avancar"])) + "</section></div>" +
      '<div class="cols-2"><section class="panel"><h2>Quadro por tipo</h2><p class="small muted" style="margin-bottom:14px">' + o.board_total + " itens no total</p>" + hbars(fromObj(o.board_by_kind, KINDS, Object.keys(KINDS))) + "</section>" +
        '<section class="panel"><h2>Quadro por status</h2><p class="small muted" style="margin-bottom:14px">Quanto está sendo testado e validado</p>' + hbars(fromObj(o.board_by_status, STATUS, Object.keys(STATUS))) + "</section></div>" +
      '<div class="cols-2"><section class="panel"><h2>Projetos por tipo</h2><p class="small muted" style="margin-bottom:14px">' + o.projects_total + " projetos</p>" + hbars(fromObj(o.projects_by_kind, PKIND, ["empreendedor", "inovacao"])) + "</section>" +
        '<section class="panel"><h2>Mentorias por status</h2><p class="small muted" style="margin-bottom:14px">' + o.mentoria_total + " pedidos</p>" + hbars(fromObj(o.mentoria_by_status, MSTATUS, Object.keys(MSTATUS))) + "</section></div>";
  }

  /* ---------- ações ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el) return;
    var a = el.dataset.act;
    if (a === "logout") sb.auth.signOut().then(function () { session = null; route(); });
    else if (a === "reload") load().then(function () { toast("Dados atualizados."); });
    else if (a === "mfilter") { viewMentorias.f = el.dataset.f; route(); }
    else if (a === "open-req") openReq(el.dataset.id);
    else if (a === "csv-users") csv(data.users, [["email", "E-mail"], ["created_at", "Criada em"], ["last_sign_in_at", "Último acesso"], ["projetos", "Projetos"], ["artefatos", "Artefatos"], ["itens_quadro", "Itens no quadro"], ["pedidos_mentoria", "Pedidos de mentoria"]], "usuarios-mesa");
    else if (a === "csv-leads") csv(data.leads, [["created_at", "Data"], ["nome", "Nome"], ["email", "E-mail"], ["telefone", "WhatsApp"], ["origem", "Origem"]], "cadastros-mesa");
  });

  sb.auth.onAuthStateChange(function (ev, s) {
    var had = !!session; session = s;
    if (ev === "SIGNED_OUT") route(); else if (!had && s) load();
  });
  sb.auth.getSession().then(function (r) { session = r.data.session; if (session) load(); else route(); });
})();
