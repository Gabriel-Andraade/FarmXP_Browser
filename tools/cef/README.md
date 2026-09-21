# Shell do jogo pra Steam (CEF)

O jogo é uma página web servida por `server.ts`. Pra Steam, quem desenha essa
página precisa ser **o processo que a Steam lançou**, apresentando frames num
swapchain D3D11 — é nisso que a overlay (Shift+Tab), o pop-up de conquista e o
F12 se engancham. Chrome/Electron não servem (apresentam por outro caminho).

O shell é o `cefclient` de exemplo do CEF (Chromium embutido) com um patch:

| O quê | Por quê |
|---|---|
| `KeyboardEvent.code` preenchido em OSR (scan code, não `lParam`) | sem isso o jogo, que mapeia teclas por `code`, fica sem teclado |
| `--fullscreen` (janela sem borda no tamanho do monitor) + `F11` do jogo | tela cheia de jogo, sem barra de tarefas |
| `--game-server*`: sobe o servidor do jogo como filho num Job Object | morre junto com o shell, até em crash; sem órfão |
| `SteamAPI_Init` no shell + callback da overlay → evento `steam:overlay` na página | a Steam só entrega esse callback ao processo que hospeda a overlay |
| `WM_POWERBROADCAST` → evento `system:suspend` na página | o jogo salva antes de o PC dormir |
| `cefQuery` `display:fullscreen` / `display:windowed` → `SetDisplayMode` | a opção "Tela" das configurações do jogo: borderless no monitor ou janela 1280×720 redimensionável |
| Encerramento: mata o timer da Steam **antes** do `CefShutdown`, e `SteamAPI_Shutdown` **depois** | sem isso o processo ficava preso no kernel ao fechar (zumbi inmatável segurando o perfil — e uma tela azul no reboot) |
| Defaults embutidos: sem `--url`, o exe assume todas as flags abaixo, cache em `%LOCALAPPDATA%\FarmingXP\cef-profile` e `farmxp-server.exe` da própria pasta | o pacote `dist-steam` roda com opções de inicialização vazias |
| CMake: linka a Steamworks SDK e copia `steam_api64.dll` | |

E **`-DUSE_SANDBOX=OFF`**: com sandbox o exe é um `bootstrap.exe` que carrega o
app depois, e a overlay não consegue enganchar o teclado. Sem sandbox, exe
próprio → Shift+Tab funciona. Sandbox não faz falta: o conteúdo é nosso, local.

A distribuição do CEF (~2 GB com builds) **não está no repositório** — só este
patch. Nada do jogo (`public/`) muda por causa do shell.

## Pré-requisitos

- Visual Studio 2022 Build Tools (C++ desktop) — traz o CMake em
  `Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin`
- Steamworks SDK descompactada (padrão `C:\sdk`; muda com `-DSTEAMWORKS_SDK=`)
- Bun (o servidor do jogo roda com ele)

## Montar

```
cd tools/cef
curl -L -o cef.tar.bz2 "https://cef-builds.spotifycdn.com/cef_binary_144.0.35%2Bg12f1636%2Bchromium-144.0.7559.262_windows64.tar.bz2"
tar -xjf cef.tar.bz2 && rm cef.tar.bz2 && mv cef_binary_* cef
cd cef
patch -p1 --ignore-whitespace < ../patches/farmingxp-shell.patch
cp ../patches/icon/cefclient.ico tests/cefclient/win/cefclient.ico
cp ../patches/icon/cefclient.ico tests/cefclient/win/small.ico
cmake -S . -B build-nosandbox -G "Visual Studio 17 2022" -A x64 -DUSE_SANDBOX=OFF
cmake --build build-nosandbox --config Release --target cefclient
```

(`--ignore-whitespace` porque o patch é LF e os fontes do CEF são CRLF.)

Sai em `cef/build-nosandbox/tests/cefclient/Release/cefclient.exe`, com
`libcef.dll` e cia ao lado. Copie `steam_appid.txt` pra essa pasta (o `Init` do
shell precisa dele quando aberto fora da Steam).

O patch são 6 arquivos, +336/−11 linhas (o ícone vai à parte, em
`patches/icon/`, porque patch de texto não carrega binário). Outra versão do CEF: se um hunk não
aplicar, o `.rej` mostra onde; as mudanças são pequenas e localizadas.

## Rodar

**Sem argumentos** (é o que o pacote `dist-steam` faz): o exe assume as flags
abaixo, `--cache-path=%LOCALAPPDATA%\FarmingXP\cef-profile` e
`--game-server="<pasta do exe>\farmxp-server.exe"` na porta 43110. Qualquer
switch passado na linha de comando tem prioridade; `--url` desliga os defaults.

**Em desenvolvimento**, apontando pro `server.ts` com Bun:

```
cefclient.exe --off-screen-rendering-enabled --shared-texture-enabled
  --off-screen-frame-rate=60 --hide-controls --hide-top-menu
  --force-device-scale-factor=1 --fullscreen
  --cache-path=%LOCALAPPDATA%\FarmingXP\cef-profile
  --game-server="<caminho do bun.exe> run server.ts"
  --game-server-cwd=<pasta do repositório> --game-server-port=43110
  --url=http://127.0.0.1:43110/
```

- `--shared-texture-enabled`: D3D11 zero-cópia (sem ele o hover do CSS trava)
- `--force-device-scale-factor=1`: sem esticar por DPI
- `--cache-path`: **obrigatório** — sem ele o `localStorage` (saves) some ao fechar
- `--game-server`: se a porta já responder, reusa; senão sobe e espera até 20 s

## Pacote `dist-steam`

```
bun run build:server        # compila serve.ts -> dist-steam/farmxp-server.exe (assets embutidos)
```

Depois, em `dist-steam/`: `cefclient.exe` renomeado pra `FarmingXP.exe`,
`libcef.dll` e o resto de `Release/` (menos `.lib/.exp/.pdb` e `cefclient_files/`),
`steam_api64.dll`, `steam_appid.txt`. ~480 MB. `dist-steam/` está no `.gitignore`.

## Steam

Adicionar como jogo não-Steam: destino `dist-steam\FarmingXP.exe`, **opções de
inicialização vazias**. (Em desenvolvimento: destino `cefclient.exe`, "iniciar
em" a pasta `Release`, opções = a linha de cima.) Overlay, F12 e pop-up de
conquista funcionam — pacote testado pela Steam em 2026-09-21, com o ícone do
jogo no atalho e na janela. Com `steam_appid.txt` = 480 (Spacewar) as horas não contam
(artefato do App ID emprestado); com App ID real, contam.

## O que a página recebe do shell

- `window` → `steam:overlay` `{ detail: { active } }` — o `steamBadge.js` traduz
  em `game:pause` / `game:resume`
- `window` → `system:suspend` — o `steamBadge.js` chama `saveActive('suspend')`

## O que a página manda pro shell

- `window.cefQuery({ request: 'display:fullscreen' | 'display:windowed' })` — o
  `displayMode.js` do jogo usa isso (sem gesto do usuário, então a preferência
  salva é aplicada no boot). Fora do shell cai na Fullscreen API.

## Comportamentos conhecidos

- **Segunda instância** com o mesmo `--cache-path` sai em silêncio (singleton do
  perfil). Aceitável; não abre duas.
- **Horas na Steam não contam com App ID 480**: o shell se registra como Spacewar
  e a Steam solta o atalho. Some com App ID real.
- **Suspender**: o shell não sobrevive ao acordar (D3D11 perdido); o
  `system:suspend` salva antes.

## Pendente

Feito: shell próprio (defaults embutidos, ícone), pacote `dist-steam`, overlay,
pop-up de conquista, tela cheia/janela, pausa na overlay, save ao suspender,
servidor sem órfão. Falta:

- Enxugar o cefclient: tirar menus/handlers de teste do `test_runner.cc`, título
  da janela "Farming XP" (hoje é o título da página)
- Suspender: recriar o device D3D11 ao acordar em vez de morrer (o save antes
  já cobre a perda de progresso)
- Controle: o shell OSR não propaga foco pra página (`document.hasFocus()` sempre
  `false`), e o Chromium só expõe `navigator.getGamepads()` à página focada.
  Corrigir em `OsrWindowWin::OnFocus` → `GetHost()->SetFocus(true)` e provar com
  `getGamepads()` depois de um botão
- App ID real: `steam_appid.txt` com o ID da conta Steamworks, 60 conquistas
  cadastradas (ids do `achievementDefinitions.js`), horas passam a contar
- Steam Cloud: saves em arquivo (hoje `localStorage` no perfil do CEF, que
  depende da porta 43110 — mudar a porta "some" com os saves)
- Linux/Steam Deck: CEF tem build Linux (OSR + OpenGL); só testável no aparelho
