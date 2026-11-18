/* Testes das funções puras de montagem de prompt. Rodar: node tests/prompts.test.js */
var vm = require("vm"), fs = require("fs"), path = require("path"), assert = require("assert");
var sandbox = { window: {} }; sandbox.window.window = sandbox.window; vm.createContext(sandbox);
vm.runInContext("var window = this.window; var MESA;", sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../app/tools.js"), "utf8").replace("window.MESA = window.MESA || {};", "window.MESA = window.MESA || {}; MESA = window.MESA;"), sandbox);
var M = sandbox.window.MESA, n = 0;
function test(name, fn) { fn(); n++; console.log("ok - " + name); }
function tool(id) { return M.TOOLS.filter(function (t) { return t.id === id; })[0]; }
var proj = { name: "Caixa da Clínica Veterinária São José do Rio Preto", kind: "startup", context: { ideia: "gestão para clínicas", tipo: "saas", preco: "R$ 149/mês", hipoteses: "pagam R$ 99" } };

test("24 objetivos de prompt, ids únicos", function () {
  assert.strictEqual(M.TOOLS.length, 24);
  assert.strictEqual(new Set(M.TOOLS.map(function (t) { return t.id; })).size, 24);
});
test("todo objetivo tem as 6 seções e pelo menos 4 materiais válidos", function () {
  M.TOOLS.forEach(function (t) {
    var p = M.composePrompt(t, proj, {});
    ["# " + t.name, "## Seu papel", "## Contexto (informado pelo founder)", "## Embasamento", "## Sua tarefa", "## Formato da resposta", "## Regras"].forEach(function (s) { assert.ok(p.indexOf(s) !== -1, t.id + " sem " + s); });
    assert.ok(t.materials.length >= 4, t.id);
    t.materials.forEach(function (k) { assert.ok(M.MATERIALS[k], t.id + ": " + k); });
    assert.ok(t.blocker && t.role && t.steps.length >= 4 && t.format, t.id);
    assert.strictEqual(p.indexOf("—"), -1, t.id + " tem travessão");
  });
});
test("contextBlock: só campos preenchidos, sem duplicar, tipo legível", function () {
  var b = M.contextBlock(tool("mercado"), proj, { geo: "Brasil", preco: "R$ 149/mês" });
  assert.ok(b.indexOf("SaaS / software por assinatura") !== -1);
  assert.ok(b.indexOf("**Região de atuação**: Brasil") !== -1);
  assert.strictEqual(b.split("R$ 149/mês").length - 1, 1);
  assert.strictEqual(b.indexOf("Problema"), -1);
});
test("contextBlock vazio avisa a IA", function () {
  assert.ok(M.contextBlock(tool("csd"), { context: {} }, {}).indexOf("ainda não foi preenchido") !== -1);
});
test("mergeValues: campo próprio vazio não apaga a base", function () {
  var m = M.mergeValues({ preco: "R$ 10", modelo: "assinatura" }, { preco: "  ", modelo: "uso" });
  assert.strictEqual(m.preco, "R$ 10"); assert.strictEqual(m.modelo, "uso");
});
test("initialInputs puxa da base os campos fromBase", function () {
  var i = M.initialInputs(tool("precificacao"), proj);
  assert.strictEqual(i.preco, "R$ 149/mês"); assert.strictEqual(i.valor, undefined);
  assert.strictEqual(M.initialInputs(tool("mvp"), proj).hipotese, "pagam R$ 99");
});
test("campo próprio editado substitui o valor da base no prompt", function () {
  var b = M.contextBlock(tool("precificacao"), proj, { preco: "R$ 199/mês" });
  assert.ok(b.indexOf("R$ 199/mês") !== -1 && b.indexOf("R$ 149/mês") === -1);
});
test("transcrições separadas por --- viram entrevistas numeradas", function () {
  var b = M.contextBlock(tool("analisador"), proj, { transcricao: "Ana falou A\n---\nBeto falou B\n---\nCaio falou C" });
  assert.ok(/Entrevista 1:[\s\S]*Ana[\s\S]*Entrevista 2:[\s\S]*Beto[\s\S]*Entrevista 3:[\s\S]*Caio/.test(b));
});
test("nome do .md sem acento e com até 40 caracteres no projeto", function () {
  var f = M.mdFilename(tool("precificacao"), proj), slug = f.replace(/^precificacao-/, "").replace(/\.md$/, "");
  assert.ok(/^[a-z0-9-]+$/.test(slug) && slug.length <= 40 && !/-$/.test(slug), f);
  assert.strictEqual(M.mdFilename(tool("csd"), {}), "csd-projeto.md");
});
test("radar continua gerando prompt", function () {
  assert.ok(M.buildRadarPrompt(proj).indexOf("Radar de sinais") !== -1);
});
console.log("\n" + n + " testes passaram");
