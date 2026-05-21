# agent-ping-desktop

MVP do Agent Ping como app Electron + React. Janela flutuante (frameless, transparent, alwaysOnTop) que exibe a bolha de notificação nos três estados. A partir da fase 2, a bolha pode ser acionada por qualquer processo local via HTTP.

## Requisitos

- Node.js >= 18
- npm >= 9

## Como rodar

### Modo de desenvolvimento

```bash
cd agent-ping-desktop
npm install
npm run dev        # Vite + Electron (hot-reload)
# ou
agent-ping dev     # equivalente, via CLI
```

O Vite sobe em `localhost:5173` e o Electron abre automaticamente.
`scripts/electron-dev.js` seta `AGENT_PING_DEV=1` via `spawn` (funciona em macOS, Linux e Windows), sinalizando ao Electron para carregar o dev server em vez de `dist/`.

### Modo de produção local

```bash
npm run build      # gera dist/
agent-ping start   # inicia Electron carregando dist/index.html
# ou
npm run app:start  # equivalente sem a CLI
```

> Publicação via npm/npx virá em fase futura. Por ora a CLI funciona
> localmente com `npm link`.

## CLI local

O projeto inclui uma CLI unificada em `bin/agent-ping.js`.

### Usar sem instalar

```bash
node bin/agent-ping.js help
node bin/agent-ping.js doctor
node bin/agent-ping.js dev           # desenvolvimento (Vite + Electron)
node bin/agent-ping.js start         # produção (usa dist/)
node bin/agent-ping.js health
node bin/agent-ping.js notify permission
node bin/agent-ping.js notify complete --title "Deploy OK" --message "v2.4.1"
node bin/agent-ping.js hooks install
node bin/agent-ping.js hooks uninstall
```

### Instalar globalmente com npm link

```bash
# Na raiz do projeto
npm link

# Agora disponível globalmente
agent-ping help
agent-ping doctor
agent-ping dev              # development
agent-ping start            # production (requer build prévio)
agent-ping health
agent-ping notify waiting
agent-ping hooks install
```

Para desfazer: `npm unlink` na raiz do projeto.

### Comandos

| Comando                        | O que faz                                            |
|-------------------------------|-------------------------------------------------------|
| `agent-ping dev`              | Inicia em dev mode (Vite + Electron, hot-reload)      |
| `agent-ping start`            | Inicia usando o build de produção em `dist/`          |
| `agent-ping health`           | Verifica se o servidor HTTP está rodando              |
| `agent-ping notify <state>`   | Envia notificação à bolha (`complete`, `waiting`, `permission`) |
| `agent-ping hooks install`    | Instala hooks do Claude Code                          |
| `agent-ping hooks uninstall`  | Remove os hooks do Claude Code                        |
| `agent-ping doctor`           | Diagnóstico completo do ambiente                      |
| `agent-ping help`             | Mostra ajuda e exemplos                               |

Flags aceitas por `notify`:

```bash
agent-ping notify permission \
  --title "Aprovação necessária" \
  --message "Allow bash execution?" \
  --meta "ferramenta: Bash"
```

### npm run cli e npm run doctor

```bash
npm run cli -- help     # equivale a node bin/agent-ping.js help
npm run doctor          # equivale a node bin/agent-ping.js doctor
```

## Scripts npm

| Comando                  | O que faz                                              |
|--------------------------|--------------------------------------------------------|
| `npm run dev`            | Inicia Vite + Electron em modo de desenvolvimento      |
| `npm run build`          | Gera bundle de produção em `dist/`                     |
| `npm start`              | Roda Electron carregando `dist/` (produção)            |
| `npm run app:start`      | Alias para `npm start`                                 |
| `npm run cli`            | Acessa a CLI (`node bin/agent-ping.js`)                |
| `npm run doctor`         | Roda diagnóstico (`agent-ping doctor`)                 |
| `npm run health`         | Verifica se o app está rodando                         |
| `npm run notify:complete`   | Envia evento `complete` para a bolha               |
| `npm run notify:waiting`    | Envia evento `waiting` para a bolha                |
| `npm run notify:permission` | Envia evento `permission` para a bolha             |
| `npm run hooks:install`     | Instala hooks do Claude Code em `.claude/settings.local.json` |
| `npm run hooks:uninstall`   | Remove os hooks do Claude Code                     |

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

Clicar no card da bolha tenta trazer para frente o terminal ou editor configurado. O comportamento é **best-effort**: sistemas operacionais impõem restrições ao foco programático de janelas, então o resultado pode variar conforme o estado do sistema.

### macOS

Os apps são tentados nesta ordem de prioridade:

| Prioridade | App                | Processo (`pgrep`) |
|------------|--------------------|--------------------|
| 1          | Warp               | `Warp`             |
| 2          | iTerm2             | `iTerm2`           |
| 3          | Terminal           | `Terminal`         |
| 4          | Visual Studio Code | `Code`             |

Usa AppleScript (`tell application "X" to activate`). Na primeira execução, macOS pode solicitar permissão de Automação — aceite para que o foco funcione.

### Windows

Os apps são tentados nesta ordem de prioridade:

| Prioridade | App                | Processos verificados     |
|------------|--------------------|---------------------------|
| 1          | Windows Terminal   | `WindowsTerminal`         |
| 2          | PowerShell         | `pwsh`, `powershell`      |
| 3          | cmd                | `cmd`                     |
| 4          | Visual Studio Code | `Code`                    |

Usa PowerShell + `Microsoft.VisualBasic.Interaction.AppActivate` com o PID do processo. O "foreground lock" do Windows pode impedir o foco completo em alguns cenários — o app pode apenas piscar na barra de tarefas.

## Integração com Claude Code hooks

> **Escopo:** a integração é **local ao projeto**. Os hooks são gravados em
> `.claude/settings.local.json` (ignorado pelo git) e não afetam outros
> projetos nem a configuração global do Claude Code em `~/.claude/settings.json`.

### Instalar

```bash
# Terminal 1 — app deve estar rodando para os hooks funcionarem
npm run dev

# Terminal 2
npm run hooks:install
```

O script cria ou edita `.claude/settings.local.json`, sempre fazendo um
backup com timestamp antes de alterar qualquer coisa.

### Mapeamento de eventos → estados visuais

O roteamento é feito pelo script `scripts/claude-hook-notify.js`, que lê o
payload JSON enviado pelo Claude Code via stdin e decide qual estado exibir:

| Evento Claude Code | Condição                              | Estado da bolha          |
|--------------------|---------------------------------------|--------------------------|
| `Stop`             | sempre                                | `complete` (verde — DONE)|
| `Notification`     | mensagem contém palavra de permissão  | `permission` (âmbar — HOLD) |
| `Notification`     | qualquer outro conteúdo               | `waiting` (azul — IDLE)  |

**Palavras-chave que ativam o estado `permission`** (busca case-insensitive
na mensagem da notificação):

```
permission, allow, approve, authorize, grant, blocked,
requires approval, do you want to, do you wish to, confirm
```

O roteamento de `permission` vs `waiting` depende do payload real que o
Claude Code envia na notificação. Se a mensagem não contiver nenhuma dessas
palavras, o estado padrão é `waiting`.

### Modo debug

Para inspecionar o que está acontecendo nos hooks:

```bash
AGENT_PING_HOOK_DEBUG=1 node scripts/claude-hook-notify.js Stop
```

Quando a variável `AGENT_PING_HOOK_DEBUG=1` está ativa, o script grava
entradas JSON em `.claude/agent-ping-hook-debug.log`:

```json
{"ts":"2026-05-21T15:30:00.000Z","type":"input","hookEvent":"Stop","payload":{...}}
{"ts":"2026-05-21T15:30:00.000Z","type":"decision","state":"complete"}
{"ts":"2026-05-21T15:30:00.000Z","type":"result","ok":true,"status":200}
```

Para ativar durante uma sessão de Claude Code, defina a variável antes de
abrir o Claude Code ou adicione-a ao hook command manualmente.

### Remover

```bash
npm run hooks:uninstall
```

Remove as entradas adicionadas pelo Agent Ping (tanto as do script legado
`notify.js` quanto as do novo `claude-hook-notify.js`). Outras hooks
configuradas pelo usuário são preservadas.

### Teste manual

```
Terminal 1:  npm run dev           ← Agent Ping rodando
Terminal 2:  npm run hooks:install ← instala os hooks

Abra Claude Code neste projeto e execute um prompt qualquer.
  ✓ Ao terminar (Stop)                → bolha aparece no estado verde (done)
  ✓ Notificação com palavra de permissão → bolha aparece no estado âmbar (hold)
  ✓ Notificação genérica              → bolha aparece no estado azul (waiting)
```

Para testar os estados manualmente (sem Claude Code):

```bash
npm run notify:complete    # verde — done
npm run notify:waiting     # azul — idle
npm run notify:permission  # âmbar — hold
```

Para testar o script de hook diretamente, simulando o payload do Claude Code:

```bash
# Simular evento Stop
echo '{"hook_event_name":"Stop","session_id":"test"}' | \
  node scripts/claude-hook-notify.js Stop

# Simular Notification com permissão
echo '{"hook_event_name":"Notification","message":"Claude needs permission to run bash"}' | \
  node scripts/claude-hook-notify.js Notification

# Simular Notification genérica (waiting)
echo '{"hook_event_name":"Notification","message":"Task is running..."}' | \
  node scripts/claude-hook-notify.js Notification

# Com debug ativo
AGENT_PING_HOOK_DEBUG=1 \
  echo '{"hook_event_name":"Stop"}' | \
  node scripts/claude-hook-notify.js Stop
cat .claude/agent-ping-hook-debug.log
```

### Comportamento se o app não estiver rodando

O comando do hook termina com `>/dev/null 2>&1 || true` — sem saída e
sempre com exit 0. Claude Code nunca recebe um erro e continua funcionando
normalmente. O script também tem timeout de 3 segundos na requisição HTTP,
então não bloqueia mesmo se o servidor não responder.

### Limitações conhecidas

- Os hooks disparam uma vez por `Stop` / `Notification`. Se o Claude Code
  disparar múltiplas notificações em sequência, a bolha exibe o último
  estado recebido.
- O roteamento `permission` vs `waiting` depende do texto real que o
  Claude Code envia no campo `message` da notificação. Se o formato mudar
  em versões futuras do Claude Code, pode ser necessário ajustar as
  palavras-chave em `scripts/claude-hook-notify.js`.
- Em `Stop`, o hook não distingue tarefa bem-sucedida de interrompida —
  sempre exibe `complete`.

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
├── bin/
│   └── agent-ping.js            ← CLI unificada (entry point do "bin" no package.json)
├── electron/
│   ├── main.js          ← Electron main process + servidor HTTP
│   └── preload.js       ← IPC bridge (contextBridge)
├── scripts/
│   ├── claude-hook-notify.js    ← hook entry point — lê stdin, roteia estado
│   ├── notify.js                ← helper HTTP para os scripts npm
│   ├── install-claude-hooks.js  ← instala hooks em .claude/settings.local.json
│   └── uninstall-claude-hooks.js ← remove os hooks
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
