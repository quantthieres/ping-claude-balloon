# agent-ping-desktop

MVP do Agent Ping como app Electron + React. Janela flutuante (frameless, transparent, alwaysOnTop) que exibe a bolha de notificação nos três estados. A partir da fase 2, a bolha pode ser acionada por qualquer processo local via HTTP.

## Requisitos

- Node.js >= 18
- npm >= 9

## Como rodar

```bash
cd agent-ping-desktop
npm install
npm run dev
```

O Vite sobe em `localhost:5173` e o Electron abre automaticamente após o servidor estar pronto.

## Scripts

| Comando                  | O que faz                                              |
|--------------------------|--------------------------------------------------------|
| `npm run dev`            | Inicia Vite + Electron simultaneamente                 |
| `npm run build`          | Gera bundle de produção em `dist/`                     |
| `npm start`              | Roda Electron com os arquivos em `dist/`               |
| `npm run health`         | Verifica se o app está rodando                         |
| `npm run notify:complete`| Envia evento `complete` para a bolha                   |
| `npm run notify:waiting` | Envia evento `waiting` para a bolha                    |
| `npm run notify:permission` | Envia evento `permission` para a bolha             |

## Servidor HTTP local

Quando o app está rodando, ele expõe um servidor HTTP em:

```
http://127.0.0.1:47321
```

### GET /health

```bash
curl http://127.0.0.1:47321/health
# → {"ok":true,"app":"agent-ping"}
```

### POST /notify

```bash
curl -X POST http://127.0.0.1:47321/notify \
  -H 'Content-Type: application/json' \
  -d '{"state":"complete"}'
```

Campos aceitos:

| Campo     | Tipo                                    | Obrigatório |
|-----------|-----------------------------------------|-------------|
| `state`   | `"complete"` \| `"waiting"` \| `"permission"` | ✓  |
| `title`   | string                                  | —           |
| `message` | string                                  | —           |
| `meta`    | string ou string[]                      | —           |

Quando `title`, `message` ou `meta` são omitidos, a bolha usa os textos padrão de demonstração para aquele estado.

### Testando com npm scripts

Com o app rodando em um terminal:

```bash
# Em outro terminal:
npm run notify:complete
npm run notify:waiting
npm run notify:permission
npm run health
```

Se o app não estiver rodando:

```
Agent Ping app is not running. Start it with npm run dev.
```

### Enviando conteúdo customizado

```bash
node scripts/notify.js complete \
  --title "Deploy finalizado" \
  --message "prod v2.4.1 deploy OK · 3 serviços" \
  --meta "2m 14s"
```

## Clique na bolha — foco no terminal

Clicar no card da bolha tenta trazer para frente o terminal ou editor configurado.

### Suporte atual (macOS)

Os apps são tentados nesta ordem de prioridade:

| App             | Nome do processo |
|-----------------|-----------------|
| Warp            | `Warp`          |
| iTerm2          | `iTerm2`        |
| Terminal        | `Terminal`      |
| Visual Studio Code | `Code`       |

O primeiro app **em execução** é ativado via AppleScript (`tell application "X" to activate`). Se nenhum estiver aberto, o clique é silencioso (erro logado no console).

Na primeira vez, macOS pode pedir permissão de Automação — aceite para que o AppleScript funcione.

### Windows

Suporte planejado para uma fase futura.

## Estados

| API state    | Visual                         |
|--------------|-------------------------------|
| `complete`   | Verde — DONE                  |
| `waiting`    | Azul — IDLE (mascote com bob) |
| `permission` | Âmbar — HOLD (mascote shake)  |

## Interface de demonstração

A barra de controle na janela permite alternar estados manualmente:

- **done** — `task-complete` (verde)
- **idle** — `waiting-for-input` (azul)
- **hold** — `permission-needed` (âmbar)

O botão **◑ / ◐** alterna entre tema claro e escuro.

O **×** da bolha esconde a bolha; clique no placeholder pontilhado ou em qualquer botão de estado para reexibi-la. Um novo evento `/notify` também a reexibe automaticamente.

## Estrutura

```
agent-ping-desktop/
├── electron/
│   ├── main.js          ← Electron main process + servidor HTTP
│   └── preload.js       ← IPC bridge (contextBridge)
├── scripts/
│   └── notify.js        ← CLI para testar o endpoint /notify
├── src/
│   ├── App.jsx          ← Demo com state switcher + listener IPC
│   ├── main.jsx         ← React entry
│   ├── index.css        ← Tailwind + reset
│   └── components/
│       ├── BubbleNotification.jsx
│       ├── BubbleNotification.css
│       ├── state-config.js
│       └── mascots/
├── index.html
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Posição da janela

Por padrão a janela aparece no canto superior direito da área de trabalho. Para mudar, edite `x` e `y` em `electron/main.js`.
