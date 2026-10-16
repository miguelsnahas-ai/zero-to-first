# Miguel Nahas + Zero to First

Site profissional de Miguel Nahas, publicado no GitHub Pages a partir da branch `main` (raiz `/`).

| Página | Arquivo | O que é |
| --- | --- | --- |
| `/` | `index.html` | Página principal: trajetória, método Zero to First, frentes de trabalho e agendamento |
| `/toolkit/` | `toolkit/index.html` | Página de venda do toolkit Zero to First: Toolkit + Comunidade (checkout Stripe) |
| `/privacidade.html`, `/termos.html` | | Política de privacidade e termos de uso do toolkit |

## Onde configurar

- **Página principal:** bloco `CONFIG`, no fim de `index.html`. Ali ficam a URL do Calendly, o link e o preço do produto de entrada, o e-mail, o WhatsApp, o LinkedIn, os números e os depoimentos. Campos vazios ficam ocultos na página.
- **Checkout do toolkit:** `CHECKOUT_URL`, no fim de `toolkit/index.html`.
- **Analytics:** cole o snippet no `<head>` de cada página. Os cliques nos CTAs já são enviados para `window.dataLayer`.
