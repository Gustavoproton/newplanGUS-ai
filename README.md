# GusTech OS 🔷

Gerador Inteligente de Ordem de Serviço, com IA gratuita (OpenRouter).
Desenvolvido por Gustavo.

## 🔗 Links definitivos (uso diário)

- **Sistema (frontend):** https://newplan-gus-ai.vercel.app/login.html
- **Backend (API):** https://gustech-os-backend.onrender.com

Esses links são fixos e sempre ligados — não é mais necessário abrir o Codespaces, terminal, ou religar nada para usar o sistema no dia a dia. O Codespaces só é usado quando for **editar o código**.

## 📁 Estrutura do projeto
@Gustavoproton ➜ /workspaces/newplanGUS-ai (main) $ cd /workspaces/newplanGUS-ai
git add .
git commit -m "Adiciona rota de saude para o UptimeRobot"
git push origin main
[main f473266] Adiciona rota de saude para o UptimeRobot
 1 file changed, 3 insertions(+), 1 deletion(-)
Enumerating objects: 7, done.
Counting objects: 100% (7/7), done.
Delta compression using up to 2 threads
Compressing objects: 100% (4/4), done.
Writing objects: 100% (4/4), 446 bytes | 446.00 KiB/s, done.
Total 4 (delta 3), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (3/3), completed with 3 local objects.
To https://github.com/Gustavoproton/newplanGUS-ai
   0dc0734..f473266  main -> main
@Gustavoproton ➜ /workspaces/newplanGUS-ai (main) $Mostrar maisSubiu certinho, sem erro! O Render já deve estar fazendo o deploy automático agora. Vamos confirmar:Deliberated deployment timing and user guidance strategyDeliberated deployment timing and user guidance strategyO deploy leva uns 2-3 minutos para o Render aplicar essa mudança. Enquanto isso:
1. Você pode acompanhar o progresso em dashboard.render.com, na aba "Events" do seu serviço gustech-os-backend — deve aparecer um novo evento "Deploy started" seguido de "Deploy live" (bolinha verde) quando terminar.
2. Depois de uns 2-3 minutos, me avisa que eu testo o link https://gustech-os-backend.onrender.com/ pra confirmar se a mensagem "GusTech OS backend rodando!" já está aparecendo (em vez do 404 de antes).
Assim que confirmarmos isso, seguimos pro UptimeRobot (Passo 2)."Deploy live" com bolinha verde para o commit f473266 — deu certo! Vamos confirmar que a rota nova está respondendo:Fetched: https://gustech-os-backend.onrender.comFetched: https://gustech-os-backend.onrender.comConfirmado! Apareceu exatamente a mensagem "GusTech OS backend rodando!" — a rota nova está funcionando. 🎉
Agora vamos configurar o UptimeRobot:
1. Acesse: https://uptimerobot.com
2. Clique em "Sign Up" (gratuito, sem pedir cartão).
3. Confirme seu e-mail se ele pedir.
4. No painel, clique em "+ Add New Monitor".
5. Preencha:

Monitor Type: HTTP(s)
Friendly Name: GusTech OS Backend
URL (or IP): https://gustech-os-backend.onrender.com
Monitoring Interval: 5 minutes (deixe o menor disponível)

6. Clique em "Create Monitor".
Pronto! A partir de agora, o UptimeRobot vai "bater" no seu backend a cada 5 minutos, 24 horas por dia — ele nunca mais vai completar os 15 minutos de inatividade que fazem ele dormir. Isso elimina de vez aquela demora inicial de 30-50 segundos.
Faz esses passos e me avisa se travar em algo, ou quando o monitor for criado!Perfeito, criou certinho! O monitor "GusTech OS Backend" já está lá, monitorando a cada 5 minutos (vejo "5 minutos" na coluna certa). Está com status "Preparing..." só porque acabou de ser criado — em alguns instantes ele já vai começar a bater no seu backend de verdade.
Está tudo pronto agora! 🎉 Recapitulando o que você tem:
✅ Backend no Render (sempre ligado, sem dormir, graças ao UptimeRobot)
✅ Frontend no Vercel (sempre ligado, 100% do tempo, sem exceção)
✅ Login funcionando
✅ Geração de OS com IA gratuita (OpenRouter, com fallback entre modelos)
✅ Prompt Mestre seguindo o padrão da New Inter
✅ Tudo salvo e versionado no GitHub
A partir de agora, seu link definitivo pra usar (e mandar pra qualquer colega) é:
https://newplan-gus-ai.vercel.app/login.html
Sem terminal, sem Codespaces, sem religar nada. Só abrir e usar.
Só uma sugestão: vale atualizar o README com esses links finais e essa nova arquitetura (Render + Vercel + UptimeRobot), já que ele ainda fala só do Codespaces. Quer que eu prepare essa versão final agora?vamos atualizar o readme entaoReformulou arquitetura do README com novos endpointsReformulou arquitetura do README com novos endpointsBoa! Aqui vai a versão final, já refletindo a arquitetura definitiva. Cole no README.md, substituindo tudo:
markdown# GusTech OS 🔷

Gerador Inteligente de Ordem de Serviço, com IA gratuita (OpenRouter).
Desenvolvido por Gustavo.

## 🔗 Links definitivos (uso diário)

- **Sistema (frontend):** https://newplan-gus-ai.vercel.app/login.html
- **Backend (API):** https://gustech-os-backend.onrender.com

Esses links são fixos e sempre ligados — não é mais necessário abrir o Codespaces, terminal, ou religar nada para usar o sistema no dia a dia. O Codespaces só é usado quando for **editar o código**.

## 📁 Estrutura do projeto
newplanGUS-ai/
├── backend/
│   ├── server.js       # Servidor Node/Express + Prompt Mestre + fallback de modelos de IA
│   ├── package.json
│   └── .env             # Chave da API OpenRouter (NÃO subir pro GitHub — está no .gitignore)
└── frontend/
├── login.html        # Tela de login
├── index.html         # Tela do gerador de OS
## 🏗️ Arquitetura de hospedagem

| Parte | Onde roda | Plano | Observação |
|---|---|---|---|
| Frontend | Vercel | Gratuito | Sempre ligado, nunca dorme |
| Backend | Render | Gratuito | Dormiria após 15 min sem uso, mas o UptimeRobot evita isso |
| "Despertador" | UptimeRobot | Gratuito | Faz uma requisição ao backend a cada 5 minutos, 24h/dia |

Ambos os serviços (Render e Vercel) estão conectados ao repositório do GitHub e fazem **deploy automático** sempre que há um `git push` na branch `main`.

## 🔑 Login (temporário, fixo no código)

Definido em `frontend/script.js`, na função `login()`. Para trocar:
```javascript
if(usuario==="SEU_USUARIO" && senha==="SUA_SENHA"){
```
⚠️ Visível para quem abre o código-fonte no navegador. Ok para uso interno; para vários funcionários, migrar a validação pro backend no futuro.

## 🎨 Identidade visual

- **Nome:** GusTech OS
- **Paleta:** fundo azul-marinho escuro (`#0B1120`), destaque azul → ciano (`#3B82F6` → `#22D3EE`)
- **Tipografia:** Space Grotesk (títulos), Inter (textos), IBM Plex Mono (rótulos técnicos)
- **Ícone:** hexágono com "G", brilho pulsante

## 🤖 IA usada (gratuita, sem cartão)

O sistema usa a **OpenRouter** (openrouter.ai) como gateway de IA, com uma lista de modelos gratuitos em `MODELOS` dentro do `server.js`. Se o primeiro modelo estiver sobrecarregado (erro 429), o sistema tenta automaticamente o próximo da lista.

⚠️ **A lista de modelos gratuitos muda com frequência.** Se todos falharem:
1. Acesse https://openrouter.ai/models, filtre por "Free"
2. Copie os slugs (nomes) atuais
3. Atualize o array `MODELOS` no `server.js`
4. Faça commit e push — o Render atualiza sozinho

Chave da API: gerar/gerenciar em https://openrouter.ai/keys

⚠️ **Nunca cole a chave em nenhum arquivo que vá pro Git** (nem `.env` sem estar no `.gitignore`, nem em mensagens de commit). Se uma chave for exposta acidentalmente, apague e crie uma nova imediatamente.

## 🧠 Prompt Mestre

As regras completas de como montar a OS (etapas, formatação, calendário fabril, cálculo de datas, procedimentos por setor, etc.) estão na constante `PROMPT_MESTRE` dentro do `server.js`. Baseadas no padrão validado da New Inter Engenharia.

Se a IA gerar algo fora do padrão, o ajuste é sempre no texto do `PROMPT_MESTRE`.

## 🔄 Como atualizar o sistema (fazer uma alteração)

1. Abra o Codespaces do projeto.
2. Edite os arquivos necessários (`backend/server.js` para lógica/IA, arquivos em `frontend/` para visual).
3. Salve.
4. No terminal:
```bash
git add .
git commit -m "Descreva a alteração aqui"
git push origin main
```
5. Render e Vercel fazem o deploy automático (leva 1-3 minutos). Não precisa fazer mais nada.

## ⚠️ Se precisar rodar localmente no Codespaces (testes antes de publicar)

```bash
# Terminal 1
cd backend
npm install
node server.js

# Terminal 2
cd frontend
npx serve -l 5500
```
Depois, aba **PORTS** → deixar as portas como Public → clicar no ícone de globo 🌐 para abrir.

## 📋 Status atual do projeto

- [x] Tela de login
- [x] Tela do gerador
- [x] Backend conectado ao frontend
- [x] Integração com IA gratuita (OpenRouter, com fallback entre modelos)
- [x] Identidade visual (nome, cores, tipografia, ícone)
- [x] Prompt Mestre com as regras completas da New Inter
- [x] Hospedagem definitiva sempre ligada (Render + Vercel + UptimeRobot)
- [ ] Exportar OS em Word/PDF
- [ ] Login mais seguro (validação no backend, múltiplos usuários)
- [ ] Biblioteca de equipamentos específicos (olhal, cesta metálica, sub rack, etc.) com textos dedicados

## 🛠️ Próximos passos

1. Testar o Prompt Mestre com mais exemplos reais de escopo, para validar todas as regras.
2. Exportar a OS gerada direto em Word ou PDF.
3. Login mais seguro, se o sistema for usado por vários funcionários.
├── style.css          # Visual "blueprint industrial" (tema escuro/azul)
├── favicon.svg        # Ícone da aba do navegador (hexágono com "G")
└── script.js          # Lógica de login + chamada ao backend
