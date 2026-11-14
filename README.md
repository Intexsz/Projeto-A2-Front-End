# Projeto Fênix

Portal de **descoberta de jogos que rodam no navegador**. O Projeto Fênix não hospeda jogos nem arquivos: ele cataloga projetos, mostra suas características (gêneros, plataforma de origem, controles aceitos…) e leva o visitante ao endereço **original** do projeto.

- Stack: **HTML5 + CSS3 + JavaScript puro** (módulos ES). Sem frameworks, sem bibliotecas, sem build.
- Idioma: pt-BR. Sem cadastro, sem cookies de rastreamento, sem analytics.
- Seis páginas: `index`, `tendencias`, `recentes`, `todos-os-jogos`, `generos`, `blog`.

## Como executar

O site carrega JSON com `fetch()` e usa módulos ES, então **não funciona abrindo o arquivo direto (`file://`)**. Use um servidor HTTP local:

```bash
# Opção 1 — servidor incluso (precisa só do Node.js 18+)
node tools/serve.mjs          # abre em http://localhost:5173
node tools/serve.mjs 8080     # outra porta

# Opção 2 — VS Code: extensão "Live Server" → botão direito em index.html → Open with Live Server
```

## Verificação automática

```bash
node tools/check.mjs
```

Confere: exatamente 6 páginas; CSS/JS externos; **nenhum `rem`**; sem `eval`/`innerHTML`; caminhos de arquivos e imports; links externos com `rel="noopener noreferrer"`; sem recursos de terceiros; JSON consistente (campos obrigatórios, fontes, datas, capas com crédito).

## Estrutura

```text
index.html · tendencias.html · recentes.html · todos-os-jogos.html · generos.html · blog.html
assets/css/{base,components}.css + pages/*.css
assets/js/{config,main}.js + modules/*.js + pages/*.js
assets/{fonts,icons,images}/
data/{games,posts}.json
docs/            ← documentação e continuidade (comece por docs/RESUME_PROMPT.md)
tools/           ← serve.mjs e check.mjs
```

## Configuração

Nome do projeto, navegação, regras de selos de novidade e parâmetros ficam em `assets/js/config.js`. Para renomear o Projeto Fênix, altere `config.name` ali.

## Adicionar jogos

Edite `data/games.json` seguindo `docs/DATA_SCHEMA.md` e as regras de `docs/CATALOG_IMPORT.md` (toda entrada precisa de **fonte verificável**; nada de dados inventados). Rode `node tools/check.mjs` depois.

## Privacidade (LGPD)

Tudo o que o usuário faz (favoritos, histórico, contagem de acessos) fica **somente no `localStorage` do próprio navegador**, em chaves versionadas `projeto-fenix:v1:*`, e pode ser apagado na própria interface (Privacidade e preferências). A popularidade é **local**: nunca é apresentada como estatística global. Fontes (Inter e Oxanium) são autohospedadas — nenhuma requisição a terceiros ao carregar o site.

## Estado do projeto

As seis etapas do plano estão concluídas. Veja `docs/PROGRESS.md` e `docs/TASKS.md` (backlog). Para retomar o desenvolvimento em uma nova sessão, use o prompt de `docs/RESUME_PROMPT.md`.
