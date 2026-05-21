# agent-ping-desktop

MVP do Agent Ping como app Electron + React. Janela flutuante (frameless, transparent, alwaysOnTop) que exibe a bolha de notificação nos três estados.

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

| Comando       | O que faz                                      |
|---------------|------------------------------------------------|
| `npm run dev` | Inicia Vite + Electron simultaneamente         |
| `npm run build` | Gera bundle de produção em `dist/`           |
| `npm start`   | Roda Electron com os arquivos em `dist/`       |

## Estados

Use os botões na barra de controle da janela para alternar:

- **done** — `task-complete` (verde)
- **idle** — `waiting-for-input` (azul, mascote com bob)
- **hold** — `permission-needed` (âmbar, mascote com shake)

O botão **◑ / ◐** alterna entre tema claro e escuro.

O **×** da bolha esconde a bolha; clique no placeholder pontilhado ou em qualquer botão de estado para reexibi-la.

## Estrutura

```
agent-ping-desktop/
├── electron/
│   ├── main.js          ← Electron main process
│   └── preload.js       ← IPC bridge (contextBridge)
├── src/
│   ├── App.jsx          ← Demo com state switcher
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
