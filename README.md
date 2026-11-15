# Projeto Fênix

Portal para descobrir jogos que rodam no navegador. O projeto cataloga os jogos e leva o visitante ao endereço original; não hospeda os jogos nem seus arquivos.

- **Tecnologias:** HTML, CSS e JavaScript puro em módulos ES, sem etapa de build.
- **Idioma:** português do Brasil.
- **Páginas:** início, tendências, recentes, todos os jogos, gêneros, entrar e registro.
- **Efeitos visuais:** brasas em Canvas e ponteiros flamejantes com círculos de faíscas.
- Conta opcional de demonstração; sem cookies de rastreamento ou analytics.

## Como executar

O site usa `fetch()` e módulos ES, portanto precisa de um servidor HTTP local.

```bash
node tools/serve.mjs
```

Também é possível abrir `index.html` com a extensão Live Server do VS Code.

## Estrutura

```text
index.html · tendencias.html · recentes.html · todos-os-jogos.html · generos.html
assets/css/                  estilos globais e de cada página
assets/js/                   configuração, páginas e módulos compartilhados
assets/js/modules/fire-cursor.js  ponteiros flamejantes
assets/js/modules/auth.js         contas locais de demonstração
assets/images/               imagens, identidade visual e artes do catálogo
data/games.json              catálogo de jogos
login.html · registro.html   acesso e criação de conta
docs/                        documentação do projeto
tools/                       servidor e verificador estático
```

## Dados e configuração

O catálogo fica em `data/games.json`. Cada jogo deve ter fontes verificáveis; siga `docs/DATA_SCHEMA.md` e `docs/CATALOG_IMPORT.md`. Navegação e parâmetros gerais ficam em `assets/js/config.js`.

## Privacidade

Favoritos, histórico e métricas de acesso ficam no `localStorage` do próprio navegador. A popularidade é local e não representa estatísticas globais. As fontes Inter e Oxanium são autohospedadas.
