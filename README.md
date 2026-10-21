# Miguel Nahas + Zero to First

Site profissional de Miguel Nahas, publicado no GitHub Pages a partir da branch `main` (raiz `/`).

| Página | Arquivo | O que é |
| --- | --- | --- |
| `/` | `index.html` | Página principal: trajetória, método Zero to First, frentes de trabalho e agendamento |
| `/toolkit/` | `toolkit/index.html` | Mesa de Trabalho: ferramentas + comunidade, gratuita, com formulário de cadastro |
| `/app/` | `app/` | Área interna da Mesa de Trabalho: projetos, ferramentas com IA, quadro, radar e mentoria (Supabase) |
| `/admin/` | `admin/` | Painel de administração (somente contas em `public.admins` no Supabase) |
| `/privacidade.html`, `/termos.html` | | Política de privacidade e termos de uso do toolkit |

## Onde configurar

- **Página principal:** bloco `CONFIG`, no fim de `index.html`. Ali ficam a URL do Calendly, o link e o preço do produto de entrada, o e-mail, o WhatsApp, o LinkedIn, os números e os depoimentos. Campos vazios ficam ocultos na página.
- **Cadastro da Mesa de Trabalho:** `LEADS`, no fim de `toolkit/index.html` (serviço que recebe nome, e-mail e WhatsApp). Vazio = abre um e-mail pronto.
- **Analytics:** cole o snippet no `<head>` de cada página. Os cliques nos CTAs já são enviados para `window.dataLayer`.

## Identidade visual

Guia de cores, tipografia, fotos e voz em [`BRAND.md`](BRAND.md).

## Área interna (`/app/`)

- `app/tools.js`: catálogo de ferramentas e montagem dos prompts. Para editar ou criar uma ferramenta, mexa em `MESA.TOOLS`.
- `app/radar.js`: curadoria do radar (`MESA.RADAR_LIBRARY`), regras de próximos movimentos e leitura dos sinais colados.
- `app/app.js`: aplicação (login, projetos, telas). Configuração no topo: Supabase e link de agendamento da mentoria (`mentoriaUrl`).
- Banco (Supabase): `projects`, `artifacts`, `board_items`, `radar_items` e `mentoria_pedidos`. Cada pessoa só acessa os próprios dados (RLS). Os pedidos de mentoria aparecem no painel do Supabase.

## Painel de administração (`/admin/`)

- Entra com a mesma conta da Mesa. Só funciona para contas listadas na tabela `public.admins` (por `user_id`).
- Os dados vêm de funções no banco (`admin_overview`, `admin_users`, `admin_leads`, `admin_mentorias`, `admin_set_mentoria_status`), e cada uma confere `is_admin()`.
- Dos projetos, só aparecem números agregados. Nos pedidos de mentoria aparecem o nome e o contexto do projeto e **apenas** os artefatos que a pessoa escolheu compartilhar.
- Para dar acesso a outra conta, rode no SQL Editor: `insert into public.admins (user_id) select id from auth.users where email = 'email@exemplo.com';`
