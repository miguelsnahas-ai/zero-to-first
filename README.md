# Zero to First · Mesa de Trabalho

Metodologia Zero to First e Mesa de Trabalho, publicadas no GitHub Pages em `miguelsnahas-ai.github.io/zero-to-first/` a partir da branch `main`.

O site pessoal de Miguel Nahas fica no repositório `miguelsnahas-ai.github.io` (https://miguelsnahas-ai.github.io/).

| Página | Arquivo | O que é |
| --- | --- | --- |
| `/` | `index.html` | Redireciona para `/toolkit/` |
| `/toolkit/` | `toolkit/index.html` | Mesa de Trabalho: três fases e 27 ferramentas, gratuita, com formulário de cadastro |
| `/app/` | `app/` | Área interna da Mesa de Trabalho: projetos, ferramentas com IA, quadro, radar e mentoria (Supabase) |
| `/admin/` | `admin/` | Painel de administração (somente contas em `public.admins` no Supabase) |
| `/privacidade.html`, `/termos.html` | | Política de privacidade e termos de uso do toolkit |

## Onde configurar

- **Cadastro da Mesa de Trabalho:** `LEADS`, no fim de `toolkit/index.html` (serviço que recebe nome, e-mail e WhatsApp). Vazio = abre um e-mail pronto.
- **Analytics:** cole o snippet no `<head>` de cada página. Os cliques nos CTAs já são enviados para `window.dataLayer`.

## Identidade visual

Guia de cores, tipografia, fotos e voz em [`BRAND.md`](BRAND.md).

## Área interna (`/app/`)

O método tem **três fases oficiais** (`MESA.PHASES` em `app/tools.js`): **Discovery** (subetapas Entender e Explorar), **Validation** (Experimentar, Validar, Avançar) e **Traction** (Vender, Repetir). A aba **Jornada** mostra as fases com objetivo, entregáveis, progresso e ferramentas; a **Mesa** agrupa os objetos por fase.

- `app/traction.js` e `app/traction.css`: as sete ferramentas da Fase 3, em ordem (First Customers → Go-to-Market → Sales Playbook → Traction Channels → Traction Metrics → Unit Economics → Activation, Retention & Review). Cada uma tem guia (quando usar, conceitos, método, exemplo, referências), área de trabalho estruturada, resultado em Markdown (copiar, baixar, salvar na Mesa), critérios de qualidade e de conclusão, próxima ação e prompts de apoio de IA. Os dados de uma ferramenta alimentam as seguintes (ex.: objeções de First Customers → Sales Playbook; custo e clientes dos canais → Unit Economics).
- As áreas de trabalho ficam na tabela `tool_workspaces` (uma linha por projeto e ferramenta, `data` em JSON, `status` em andamento ou concluído), com RLS por dono. O entregável de cada ferramenta é salvo como artefato com o `tool_id` da ferramenta.
- A IA não roda dentro do app: as ferramentas montam prompts com o contexto e os dados registrados, para usar no Claude ou no ChatGPT.

- `app/tools.js`: catálogo de ferramentas e montagem dos prompts. Para editar ou criar uma ferramenta, mexa em `MESA.TOOLS`.
- `app/radar.js`: curadoria do radar (`MESA.RADAR_LIBRARY`), regras de próximos movimentos e leitura dos sinais colados.
- `app/desk.js` e `app/desk.css`: a mesa. Cada ferramenta é um objeto (mapa, telefone, post-its, ampulheta…) que aparece quando o projeto tem um artefato dela. A ordem e os nomes dos objetos ficam em `MESA.DESK_ORDER` e `MESA.DESK_OBJECT`.
- `app/app.js`: aplicação (login, projetos, telas). Configuração no topo: Supabase e link de agendamento da mentoria (`mentoriaUrl`).
- Banco (Supabase): `projects`, `artifacts`, `tool_workspaces`, `board_items`, `radar_items` e `mentoria_pedidos`. Cada pessoa só acessa os próprios dados (RLS). Os pedidos de mentoria aparecem no painel do Supabase.

## Painel de administração (`/admin/`)

- Entra com a mesma conta da Mesa. Só funciona para contas listadas na tabela `public.admins` (por `user_id`).
- Os dados vêm de funções no banco (`admin_overview`, `admin_users`, `admin_leads`, `admin_mentorias`, `admin_set_mentoria_status`), e cada uma confere `is_admin()`.
- Dos projetos, só aparecem números agregados. Nos pedidos de mentoria aparecem o nome e o contexto do projeto e **apenas** os artefatos que a pessoa escolheu compartilhar.
- Para dar acesso a outra conta, rode no SQL Editor: `insert into public.admins (user_id) select id from auth.users where email = 'email@exemplo.com';`
