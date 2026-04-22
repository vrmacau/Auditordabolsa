# Auditor da Bolsa — Site

Site institucional de Vitor Macau. HTML/CSS/JS puro, sem dependências de build.

## Arquivos

- `index.html` — estrutura completa da página
- `styles.css` — estilos (tema escuro + dourado, tipografia Playfair Display + Inter)
- `app.js` — lógica de cotações, rankings e interações
- `vitor.jpeg` — foto de apresentação

## Como testar localmente

Abra o `index.html` diretamente no navegador, ou rode um servidor simples:

```bash
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

## APIs utilizadas (todas gratuitas, sem chave)

- **AwesomeAPI** (`economia.awesomeapi.com.br`) — cotação de Dólar, Euro e Ouro (XAU)
- **CoinGecko** (`api.coingecko.com`) — cotação de Bitcoin e Ethereum
- **BRAPI** (`brapi.dev`) — Ibovespa, top 10 altas/baixas e dados fundamentalistas (LPA, VPA, DY) para rankings Graham e Bazin

Os dados são atualizados automaticamente a cada 60 segundos. Também há botão "Atualizar" manual.

## Deploy sugerido

1. **Vercel / Netlify** — arrastar a pasta inteira no painel. Deploy em < 1 minuto.
2. **GitHub Pages** — criar repositório, fazer push, ativar Pages nas configurações.
3. **Hostinger / Locaweb** — subir via FTP na pasta `public_html/`.

## Trocar a foto

Substitua `vitor.jpeg` por qualquer outra imagem com o mesmo nome (ou atualize o `src` no `index.html`).

## Links dos produtos

Os links do Hotmart estão hardcoded no HTML:

- **Curso Jornada da Riqueza**: `hotmart.com/.../Q90507480A`
- **Mentoria**: `hotmart.com/.../I95771046S`

Para alterar, busque essas URLs no `index.html` e substitua.

## Fórmulas aplicadas nos rankings

**Graham** — Valor Intrínseco:
```
VI = √(22,5 × LPA × VPA)
Margem = (VI - Preço) / Preço × 100
```
Ranking pelas 10 ações com maior margem de segurança positiva.

**Bazin** — Preço Teto:
```
DPA (implícito) = DY × Preço
Preço Teto = DPA / 0,06  (DY-alvo 6%)
Margem = (Preço Teto - Preço) / Preço × 100
```
Filtro: DY mínimo de 4%. Ranking pelas 10 com maior margem.

> Observação: a BRAPI gratuita não fornece histórico de dividendos de 5 anos.
> Para o método Bazin puro (DPA médio dos últimos 5 anos), seria necessária a BRAPI PRO.

## Customizações rápidas

**Cores** (no `styles.css`, topo):
```css
:root {
  --gold: #c9a961;
  --bg: #0a0a0a;
  --red: #e85858;
  --green: #5fc98e;
}
```

**Fontes** — trocar no `<link>` do `index.html` e nas regras `.font-display` / `body`.

## Contato

Vitor Macau · [@auditordabolsa](https://instagram.com/auditordabolsa)
