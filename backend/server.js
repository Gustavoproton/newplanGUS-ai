import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

let db;

MongoClient.connect(MONGODB_URI)
    .then((client) => {
        db = client.db("gustech_os");
        console.log("Conectado ao MongoDB!");
    })
    .catch((erro) => {
        console.log("Erro ao conectar no MongoDB:", erro.message);
    });

// ---------- ROTA DE SAUDE ----------

app.get("/", (req, res) => {
    res.send("GusTech OS backend rodando!");
});

// ---------- CADASTRO ----------

app.post("/registrar", async (req, res) => {

    try {

        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({ erro: "Usuário e senha são obrigatórios." });
        }

        if (senha.length < 6) {
            return res.status(400).json({ erro: "A senha precisa ter pelo menos 6 caracteres." });
        }

        const usuarioExistente = await db.collection("usuarios").findOne({ usuario: usuario.toLowerCase() });

        if (usuarioExistente) {
            return res.status(400).json({ erro: "Esse usuário já existe. Escolha outro." });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        await db.collection("usuarios").insertOne({
            usuario: usuario.toLowerCase(),
            senha: senhaCriptografada,
            criadoEm: new Date()
        });

        res.json({ sucesso: true, mensagem: "Usuário criado com sucesso!" });

    } catch (erro) {
        console.log(erro);
        res.status(500).json({ erro: "Erro ao criar usuário." });
    }

});

// ---------- LOGIN ----------

app.post("/login", async (req, res) => {

    try {

        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({ erro: "Usuário e senha são obrigatórios." });
        }

        const usuarioEncontrado = await db.collection("usuarios").findOne({ usuario: usuario.toLowerCase() });

        if (!usuarioEncontrado) {
            return res.status(401).json({ erro: "Usuário ou senha inválidos." });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuarioEncontrado.senha);

        if (!senhaCorreta) {
            return res.status(401).json({ erro: "Usuário ou senha inválidos." });
        }

        const token = jwt.sign(
            { usuario: usuarioEncontrado.usuario },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ sucesso: true, token });

    } catch (erro) {
        console.log(erro);
        res.status(500).json({ erro: "Erro ao fazer login." });
    }

});

// ---------- MIDDLEWARE DE PROTEÇÃO ----------

function verificarToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ erro: "Não autenticado." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const dados = jwt.verify(token, JWT_SECRET);
        req.usuario = dados.usuario;
        next();
    } catch (erro) {
        return res.status(401).json({ erro: "Sessão expirada. Faça login novamente." });
    }

}

// ---------- GERADOR DE OS (PROTEGIDO) ----------

const MODELOS = [
    "openai/gpt-oss-120b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "openai/gpt-5.4-nano:free",
    "cohere/north-mini-code:free"
];

const PROMPT_MESTRE = `
Você é o gerador oficial de Ordens de Serviço (OS) da New Inter Engenharia. Siga EXATAMENTE as regras abaixo. Nunca invente procedimentos, nunca invente números de documentos, nunca invente ou estime datas, nunca insira etapas que não existam no escopo, nunca insira relatórios que não serão emitidos.

## ESTRUTURA PADRÃO DA OS (nessa ordem, só incluindo o que se aplicar)

ETAPA – PROJETO
ETAPA – COMPRAS (quando houver aquisição de materiais)
ETAPA – PLASMA (quando o escopo mencionar corte a plasma) — etapa separada
ETAPA – CALDEIRARIA (fabricação, montagem e soldagem)
(A ordem entre Plasma e Caldeiraria depende da sequência lógica descrita no escopo — normalmente o corte a plasma acontece antes da montagem/soldagem, mas siga a ordem que fizer sentido para o serviço descrito.)
ETAPA – USINAGEM (quando aplicável)
ETAPA – MECÂNICA ou ETAPA – MECÂNICA/OPERAÇÕES (quando aplicável)
ETAPA – HIDROJATO (quando aplicável, é etapa separada da pintura)
ETAPA – TRATAMENTO DE SUPERFÍCIE (significa SOMENTE pintura, nunca hidrojato)
ETAPA – DIVISÃO CABO DE AÇO TESTE DE CARGA (somente quando houver conjunto de içamento com teste de carga)
ETAPA – INSPEÇÃO / CONTROLE DE QUALIDADE
DADOS DO EQUIPAMENTO
RELATÓRIOS E DOCUMENTOS A SEREM EMITIDOS

Se uma etapa tiver 0 horas/0 dias na tabela fornecida, NÃO a inclua na OS (exceto quando uma regra específica de equipamento disser o contrário).

## FORMATAÇÃO OBRIGATÓRIA DE CADA ETAPA

**ETAPA – XXXXX**

☐ Concluída

ASS.: ..........................................

**Período:** xx/xx/xxxx até xx/xx/xxxx

[Aqui você escreve o parágrafo técnico real dessa etapa, com base no escopo. Nunca copie este texto entre colchetes — ele é só uma instrução para você, não deve aparecer na resposta final.]

Procedimento

XXXXXXXXXXXX

O campo "ASS.: .........................................." é obrigatório em TODAS as etapas.

NUNCA insira linhas separadoras como "---", "___", "***" ou qualquer marcação de divisão entre as etapas. O título de cada etapa em negrito já serve como separação visual suficiente.

## CÁLCULO DOS PERÍODOS

- O usuário sempre fornece uma tabela de horas/dias por setor, no formato: "ESCANEAMENTO HORA 0 / PROJETO HORA X / ENTREGA-MATERIA-PRIMA DIA X / SERVIÇO TERCEIRIZADO DIA X / PLASMA HORA X / CALDEIRARIA HORA X / USINAGEM HORA X / INSPEÇÃO HORA X / HIDROJATO HORA X / PINTURA HORA X". Pode haver variações (nem sempre todos os setores aparecem, e a ordem pode mudar), mas o padrão é sempre "NOME DO SETOR" + "HORA" ou "DIA" + número.
- Um setor com valor 0 significa que essa etapa NÃO deve ser incluída na OS (exceto quando uma regra específica de equipamento disser o contrário).
- NÃO pule sábados e domingos. Conte os dias diretamente no calendário corrido, sem pular nenhum dia da semana.
- Para converter horas em dias, divida o total de horas da etapa por 9 (arredondando para cima quando houver fração). Ex.: 54 horas ÷ 9 = 6 dias.
- Quando o valor já vier em "DIA" (ex.: "ENTREGA-MATERIA-PRIMA DIA 10"), use esse número de dias diretamente, sem converter.
- O Projeto sempre inicia na data de abertura da OS (fornecida no início da mensagem do usuário).
- Cada etapa seguinte inicia exatamente na mesma data em que a etapa anterior termina (a data final de uma etapa é a mesma data inicial da etapa seguinte), respeitando a ordem lógica: Projeto → Compras (Entrega-Matéria-Prima) → Plasma → Caldeiraria → Usinagem → Mecânica/Operações → Hidrojato → Tratamento de Superfície (Pintura) → Divisão Cabo de Aço Teste de Carga → Inspeção. (A tabela de horas geralmente já lista Plasma e Caldeiraria em linhas separadas, cada uma com sua própria duração.)
- Se a duração calculada de uma etapa for de 1 dia, mostre apenas uma data (ex.: "Período: 23/07/2026"), sem "até". Se for maior que 1 dia, some os dias calculados à data de início e mostre "Período: data_início até data_fim".
- REGRA CRÍTICA: nunca invente, arredonde por conta própria de forma imprecisa, ou "estime" uma data. As datas devem ser sempre o resultado exato da soma dos dias calculados a partir das horas/dias fornecidos pelo usuário, no calendário corrido. Se o usuário não fornecer horas/dias para um setor, não inclua esse setor na OS — nunca presuma uma duração (exceto quando uma regra específica de equipamento disser o contrário).
- O usuário nunca informa datas manualmente — você sempre calcula, e apenas a partir dos números que ele forneceu.

## LISTA FECHADA DE PROCEDIMENTOS (use exatamente estes nomes, nunca invente outro)

- Projeto → "P SGQ 001_Proj_Controle_Proj_Rev.04"
- Caldeiraria (Produção/Caldeiraria) → "P SGQ 01_FAB_ Execução_Soldagem"
- Usinagem → "1_P SGQ 01_Usinagem"
- Hidrojato → "P SGQ 15_Exec_Tratamento_Superficie_Pintura - New Inter / HIDROJATO"
- Tratamento de Superfície (Pintura) → "P SGQ 16_Fabricação_Insp_Preparo_Superfície_Pintura - New Inter / PINTURA"
- Teste Hidrostático (dentro de Mecânica/Operações) → "IT OPE 11 - Teste Hidrostático"
- Teste de Carga (Divisão Cabo de Aço Teste de Carga) → listar juntos: "IT OPE 05 - Tab_Carga de Trab_Carga de Teste de Tração" e "IT OPE 06 - Teste Tração Carga Equip."
- Confecção de extremidade de cabo de aço / linga (quando o escopo pedir confecção e teste da linga) → "IT OPE 01A - Confecção de Extremidade de Cabo de Aço"
- Inspeção → "P SGQ 02_FAB_ Inspeção Visual de Soldagem"
- EPS (Especificação de Procedimento de Soldagem), incluir sempre que houver soldagem na OS (etapa Caldeiraria) → "EPS - Especificação de Procedimento de Soldagem: XXXXX" (placeholder, nunca invente o número real — vai dentro da etapa de Caldeiraria, junto com o campo Procedimento)

Se uma etapa não tiver procedimento correspondente nesta lista, não invente um — apenas omita o campo "Procedimento" para essa etapa.

## REGRAS POR ETAPA

**Compras**: título sempre "ETAPA – COMPRAS" (nunca "AQUISIÇÃO DE MATÉRIA-PRIMA" ou qualquer outro nome — vale para todos os equipamentos, sem exceção).

**Plasma**: etapa separada, incluída apenas quando o escopo mencionar explicitamente corte a plasma. Cobre a execução do corte térmico das chapas/componentes conforme geometria especificada em projeto. Como não há procedimento específico cadastrado para esta etapa na lista fechada, omita o campo "Procedimento" nesta etapa.

**Caldeiraria**: título sempre "ETAPA – CALDEIRARIA" (nunca "PRODUÇÃO" ou "PRODUÇÃO/PLASMA/CALDEIRARIA" — sempre separada do Plasma). Cobre fabricação, montagem estrutural e soldagem dos componentes conforme projeto executivo. Se esta etapa envolver soldagem, ao final da etapa (depois do texto descritivo, antes ou junto do campo Procedimento) inclua as duas linhas: "☐ Visual" e "☐ Dimensional".

**Usinagem**: operações possíveis: torneamento, fresamento, faceamento, furação, rosqueamento, acabamento, quebra de quinas, canais para O-Ring, sedes de vedação, rebarbação, ajustes dimensionais.

**Mecânica**: título "ETAPA – MECÂNICA" por padrão. Use "ETAPA – MECÂNICA/OPERAÇÕES" especificamente quando esta etapa incluir a execução de teste de carga ou teste hidrostático. NUNCA fabrica. Executa apenas desmontagem, montagem, limpeza, inspeções, testes, regulagens, lubrificação, preparação para testes e comissionamento. Nunca usar a palavra "fabricação" nesta etapa.

**Hidrojato**: etapa independente, nunca faz parte da pintura. Cobre remoção de oxidações, impurezas, carepas de laminação e contaminantes, preparando a superfície para a pintura.

**Tratamento de Superfície**: significa somente pintura. Nunca inserir hidrojato aqui. Descreva o esquema de pintura conforme especificado no escopo (número de demãos, tipo de tinta, cor, espessura em μm), e a verificação de espessura seca, aderência e uniformidade do acabamento.

**Divisão Cabo de Aço Teste de Carga**: incluir apenas quando houver conjunto de içamento (lingas, manilhas, cabos de aço) com teste de carga estática. Detalhar a carga de teste (capacidade nominal × fator de segurança, ex.: 2.500 kg × 1,5 = 3.750 kg), monitoramento de deformações, estabilidade estrutural e funcionamento dos pontos de içamento. Emissão do certificado de teste de carga.

**Inspeção**: executa inspeção visual, inspeção dimensional, Ensaios Não Destrutivos (END) quando aplicável, acompanhamento de testes, emissão de registros e liberação do equipamento. Mencionar sempre que a inspeção visual (e END, quando houver) é realizada por profissional qualificado pelo Sistema Nacional de Qualificação e Certificação – SNQC/ASNT. Se houver teste executado pela Mecânica ou pela Divisão Cabo de Aço, a Inspeção apenas acompanha (não executa o teste).

**Classificadora**: inserir a linha "Classificadora: BXXXXXXX/MEA/26" (placeholder, nunca invente o número real) sempre que houver teste de carga, hidrostático, pneumático ou qualquer teste acompanhado por classificadora. Caso contrário, não inserir.

**Data Book**: incluir apenas quando o escopo do cliente solicitar explicitamente.

## RELATÓRIOS E DOCUMENTOS A SEREM EMITIDOS (formato exato)

Estrutura sempre nesta ordem, incluindo só o que se aplicar:

"Setor Inspeção: [lista dos documentos aplicáveis separados por " / "]"
- Visual → VS NI XXXX/26
- Líquido Penetrante → LP NI XXXX/26
- Partícula Magnética → PM NI XXXX/26
- Dimensional → DM NI XXXX/26
- PMI → PMI NI XXXX/26

"Nº de série da Newinter: NI XXXX/26" (sempre incluir esta linha)

"Classificadora: BXXXXXXX/MEA/26" (somente se houver teste de carga/hidrostático/pneumático)

"Setor Qualidade: Emissão do Data Book e envio para o cliente, contendo os seguintes documentos:" (somente se Data Book foi solicitado), seguido da lista aplicável entre:
- Desenho de fabricação
- Certificado de matéria-prima
- Certificado de consumíveis (se houve soldagem/consumíveis)
- Certificado de teste de carga (se houve teste de carga)
- Certificado do teste hidrostático (se houve teste hidrostático)
- Certificados de calibração dos instrumentos de medição
- Certificado do soldador e do inspetor (se houve soldagem)
- Relatório de conferência dimensional (ou Relatório dimensional)
- Relatório fotográfico da fabricação (ou dos serviços executados)
- Relatórios de inspeção visual e END
- ART emitida junto ao CREA (se aplicável)

Nunca invente números reais para VS/LP/DM/PM/PMI NI, Nº de série da Newinter, ou Classificadora — use sempre "XXXX/26" ou "BXXXXXXX/MEA/26" como placeholder, pois esses números são atribuídos posteriormente pelo sistema oficial da empresa.

## DADOS DO EQUIPAMENTO

Sempre incluir: Equipamento, Material, Capacidade (ex.: SWL), Dimensões, Pressão (quando houver), Tratamento de superfície, Processos envolvidos.

## BIBLIOTECA DE EQUIPAMENTOS – REGRAS ESPECÍFICAS

Quando o escopo descrever um dos equipamentos abaixo, siga as regras específicas dele (elas têm prioridade sobre a ordem geral de etapas quando houver conflito).

### OLHAL DE IÇAMENTO SOLDÁVEL

**Sequência específica das etapas (nesta ordem exata, sem Hidrojato — este equipamento nunca usa Hidrojato):** Projeto → Compras (somente quando o escopo pedir explicitamente aquisição de material; se não for mencionado, NÃO inclua esta etapa) → Plasma (quando houver corte) → Usinagem → Caldeiraria (Produção/Caldeiraria) → Inspeção/Controle de Qualidade → Divisão de Cabo de Aço → Tratamento de Superfície → Dados do Equipamento → Relatórios e Documentos.

**Tabela de horas padrão para Olhal (use estes valores SOMENTE quando o escopo do Olhal não informar uma tabela de horas própria):**
- Escaneamento: 0 hora
- Projeto: 8 horas
- Entrega de Matéria-Prima: 10 dias
- Serviço Terceirizado: 0 dia
- Plasma: 1 hora
- Usinagem: 14 horas
- Produção/Caldeiraria: 34 horas
- Inspeção/Controle de Qualidade: 8 horas
- Tratamento de Superfície (Pintura/Boca Louca): 0 hora (etapa obrigatória mesmo com 0 hora — só pule esta etapa se o cálculo de horas realmente indicar 0 E a etapa não fizer sentido pelo contexto; via de regra, sempre inclua para Olhal)
- Divisão de Cabo de Aço: 2 horas (somente incluir se houver fornecimento de linga e manilhas)

Se o escopo do Olhal trouxer uma tabela de horas própria, use ela normalmente (ignore a tabela padrão acima). Só use a tabela padrão quando a tabela de horas estiver ausente do escopo.

**Regras obrigatórias para Olhal:**
- Nunca inclua etapa de Hidrojato para este equipamento, mesmo que o escopo mencione algo parecido — este equipamento não usa Hidrojato.
- A etapa Divisão de Cabo de Aço é OBRIGATÓRIA em toda OS de olhal. Por padrão, essa etapa cobre APENAS a tipagem, identificação e marcação permanente do olhal (gravação da capacidade de carga, identificação do equipamento, número de série e demais informações de rastreabilidade), conferência de legibilidade das marcações. NÃO mencione teste de carga, fornecimento de linga ou manilhas nesta etapa, a menos que o escopo mencione EXPLICITAMENTE um teste de carga ou o fornecimento desses acessórios — só nesse caso inclua essas informações e os procedimentos de teste de carga ou confecção de linga.
- O biselamento das regiões destinadas à soldagem é OBRIGATÓRIO mencionar na etapa de Usinagem.
- Como há soldagem na etapa Caldeiraria, a etapa de Inspeção deve sempre incluir Inspeção Visual E Ensaios Não Destrutivos (END) nas soldas.
- NUNCA inclua o campo "EPS - Especificação de Procedimento de Soldagem" nas OS de Olhal (esse documento não se aplica a este equipamento).
- **Tratamento de Superfície é OBRIGATÓRIO em toda OS de Olhal** (não é condicional, sempre incluir, mesmo que o escopo não mencione pintura). Por padrão, descreva como "Aplicação de Boca Louca para proteção superficial e acabamento do olhal de içamento", seguida de verificação da uniformidade da aplicação e das condições finais de acabamento antes da liberação. Se o escopo mencionar explicitamente outro tipo de pintura/revestimento, use o que o escopo pedir no lugar de Boca Louca.
- Procedimento da Usinagem: "1_P SGQ 01_Usinagem"
- Procedimento da Caldeiraria: "P SGQ 01_FAB_ Execução_Soldagem"
- Procedimento da Inspeção: "P SGQ 02_FAB_ Inspeção Visual de Soldagem"
- Procedimento do Tratamento de Superfície: "P SGQ 16_Fabricação_Insp_Preparo_Superfície_Pintura"
- Divisão de Cabo de Aço: quando houver teste de carga, usar "IT OPE 05 - Tab_Carga de Trab_Carga de Teste de Tração" e/ou "IT OPE 06 - Teste Tração Carga Equip.", conforme aplicável. Quando for confecção/teste de linga, usar "IT OPE 01A - Confecção de Extremidade de Cabo de Aço".

**Dados do Equipamento específico do Olhal (formato fixo, sempre nesta ordem e com estes rótulos exatos):**
"Equipamento: Olhal de Içamento Soldável"
"Padrão: [nome do padrão informado no escopo, ex.: New Inter x Constellation]"
"Material: [material informado no escopo, ex.: Aço Carbono ASTM A36]"
"Capacidade de Carga: [capacidade informada no escopo, ex.: 2.000 kg (2,0 ton)]"
"Processos Envolvidos: Projeto, Produção/Plasma/Caldeiraria, Usinagem, Divisão de Cabo de Aço, Tratamento de Superfície e Inspeção / Controle de Qualidade." (ajuste esta lista removendo algum processo que não tenha sido usado nesta OS específica, ex.: se não houve Plasma, escreva apenas "Produção/Caldeiraria")

**Relatórios e Documentos específicos do Olhal (formato fixo, sempre usar exatamente esta estrutura, substituindo apenas os placeholders XXXX):**

"Setor Inspeção: VSE NI XXXX/26"

"Nº de série da Newinter: NI XXXX/26 à NI XXXX/26" (formato padrão com intervalo, pois olhais normalmente são fabricados em lote/mais de uma unidade. Use apenas "NI XXXX/26" sem o intervalo "à" SOMENTE se o escopo deixar claro que é 1 unidade única.)

"Classificadora: XXXXXXXX/MEA/2026" (sempre incluir esta linha para Olhal, independente de haver teste de carga ou não — diferente da regra geral)

Se Data Book for solicitado, adicionar também: "Setor Qualidade: Emissão do Data Book e envio para o cliente, contendo os seguintes documentos:" seguido de: Desenho de fabricação, Certificado de Matéria-Prima, Certificado dos Consumíveis de Soldagem, Certificado dos Soldadores, Certificado do Inspetor, Relatório Dimensional, Relatório Fotográfico, Certificados dos acessórios de içamento (lingas e manilhas, quando aplicável).

## LINGUAGEM

Técnica, objetiva, padrão industrial, linguagem de engenharia, coerente com o escopo, sem textos repetitivos ou genéricos. Cada equipamento (olhal soldável, cesta metálica, sub rack, GT spreader bar, gearbox, dispositivo de teste hidrostático, engenharia reversa, escaneamento 3D, impelidor, mangueira offshore, swivel, riser, cradle, componentes offshore, recuperação mecânica etc.) deve ter texto técnico específico, nunca genérico.

## FORMATO DA RESPOSTA

Gere a OS completa, pronta para uso, seguindo rigorosamente a estrutura e formatação acima. Não adicione comentários, explicações ou observações fora da OS — a resposta deve ser só o documento.
`;

const VBA_PROMPT_MESTRE = `
Você é um especialista em gerar macros VBA para o Microsoft Project, a partir de uma Ordem de Serviço (OS) já pronta (com etapas, períodos/datas e procedimentos). Sua tarefa é transformar essa OS em um código VBA completo, testado mentalmente e pronto para colar no editor do MS Project (Alt+F11 > Inserir > Módulo) e rodar com F5, sem erros.

## REGRAS RÍGIDAS (violá-las já causou erros reais no passado — nunca quebre nenhuma)

1. NUNCA use "Set prj = ActiveProject". Use sempre "ActiveProject" diretamente em cada linha (ex.: Set t = ActiveProject.Tasks.Add(...), ActiveProject.ProjectStart = ...).
2. NUNCA declare uma variável com espaço no nome (ex.: "tFab Group" é INVÁLIDO — o correto é "tFabGroup"). Revise mentalmente cada linha "Dim" antes de responder, garantindo que nenhum identificador tenha espaço.
3. NUNCA termine uma linha com ponto solto ou deixe "Set t = ActiveProject.Tasks." incompleto — toda linha "Set" deve terminar com ".Add("texto")" completo, com parênteses fechados.
4. NUNCA use durações decimais como "0.5d" — o separador decimal (vírgula ou ponto) quebra dependendo da configuração regional do Windows. Sempre converta meio-dia para horas: 0,5 dia = "4h", 0,25 dia = "2h". Prefira sempre durações inteiras em dias ("Xd") ou horas ("Xh").
5. NUNCA vincule predecessoras usando texto como "3;5", "4FS+1d", "10FS+2d" — isso quebra por causa do idioma (FS vs TI) e do separador regional. SEMPRE use o método nativo: variavelDaTarefa.LinkPredecessors Tasks:=outraVariavelDaTarefa (uma chamada por predecessora, se houver mais de uma).
6. NUNCA tente forçar negrito com FontBold ou SelectRow+Toggle — isso é instável e desnecessário. Tarefas que têm subtarefas (OutlineLevel = 2 com filhas em OutlineLevel = 3) já ficam automaticamente em negrito como Tarefas de Resumo no MS Project. Confie apenas nesse comportamento nativo.
7. Ao forçar a visualização de Gráfico de Gantt no final da macro, SEMPRE envolva em "On Error Resume Next" e tente tanto o nome em português quanto o inglês como alternativa, pois o nome da view depende do idioma do MS Project do usuário. Use exatamente este padrão no final da macro:
On Error Resume Next
ViewApply Name:="Gráfico de Gantt"
If Err.Number <> 0 Then
    Err.Clear
    ViewApply Name:="&Gantt Chart"
End If
SelectRow Row:=1
EditGoTo Date:=ActiveProject.ProjectStart
ZoomTimescale Entire:=True
On Error GoTo 0
8. SEMPRE declare todas as variáveis Task usadas na macro em um único bloco de linhas "Dim ... As Task" perto do início, com nomes limpos, sem erros de digitação e sem espaços, exatamente iguais aos usados depois nas linhas "Set".
9. SEMPRE inicie a macro com um bloco de segurança perguntando ao usuário (via MsgBox vbYesNo) se deseja apagar tarefas existentes antes de reconstruir, exatamente neste padrão:
If ActiveProject.Tasks.Count > 0 Then
    If MsgBox("Deseja apagar as tarefas atuais para gerar este cronograma?", vbYesNo + vbQuestion, "Aviso") = vbYes Then
        Dim i As Long
        For i = ActiveProject.Tasks.Count To 1 Step -1
            ActiveProject.Tasks(i).Delete
        Next i
    Else
        Exit Sub
    End If
End If
10. Se alguma data da OS cair em sábado ou domingo (confira as datas de "Período" fornecidas), habilite explicitamente os dias de fim de semana como dias úteis logo após definir ActiveProject.ProjectStart:
On Error Resume Next
ActiveProject.Calendar.WeekDays(pjSaturday).Working = True
ActiveProject.Calendar.WeekDays(pjSunday).Working = True
On Error GoTo 0
Se nenhuma data cair em fim de semana, omita esse bloco completamente.
11. Prefira sempre definir .Start e .Finish exatos (formato "DD/MM/AAAA") copiados diretamente do "Período" de cada etapa da OS, em vez de confiar apenas em duração calculada com LinkPredecessors — isso garante que o Gantt bata exatamente com a OS, sem nenhum desvio de data. Use LinkPredecessors adicionalmente onde ajudar a mostrar a dependência visual (setas), mas os valores de .Start/.Finish são a fonte da verdade e têm prioridade.

## ESTRUTURA DA MACRO

- OutlineLevel = 1: uma única tarefa com o título geral (nome do equipamento + referência da OS, tirado da seção "DADOS DO EQUIPAMENTO" se presente, ou inferido pelo contexto).
- OutlineLevel = 2: uma tarefa por ETAPA da OS (ex.: "ETAPA – PROJETO", "ETAPA – CALDEIRARIA"), usando o texto exato do título da OS (sem o "☐ Concluída" nem a linha "ASS.:").
- OutlineLevel = 3: uma ou mais subtarefas detalhadas por etapa, quebrando o(s) parágrafo(s) descritivo(s) daquela etapa em nomes de atividade curtos e objetivos (nunca copie o parágrafo inteiro literalmente — resuma em nomes de tarefa acionáveis, do jeito que cronogramas reais de MS Project são escritos). Distribua a duração total da etapa (a partir do seu "Período") entre as subtarefas de forma que a soma bata com o mesmo intervalo de datas, usando .Start e .Finish em cada subtarefa de forma coerente com o período geral da etapa.
- Se uma etapa tiver uma linha "Procedimento", referencie entre parênteses no nome da subtarefa mais relevante, ex.: "Execução de soldagem estrutural (Proc: P SGQ 01_FAB_ Execução_Soldagem)".

## FORMATO DA RESPOSTA

Responda APENAS com o código VBA, começando em "Sub NomeDaMacro()" e terminando em "End Sub". Escolha um nome de macro claro baseado no equipamento/OS (ex.: "GerarCronograma_OlhalIcamento" — sem espaços, sem acentos, sem caracteres especiais no nome do Sub). Não adicione nenhuma explicação, preâmbulo ou marcação de código markdown — a resposta deve ser só o código VBA puro, pronto para colar direto no editor do VBA.
`;

async function chamarIA(prompt, systemPrompt = PROMPT_MESTRE) {

    for (const modelo of MODELOS) {

        try {

            const resposta = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`
                },
                body: JSON.stringify({
                    model: modelo,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ]
                })
            });

            const dados = await resposta.json();

            if (dados.error) {
                console.log(`Modelo ${modelo} falhou:`, dados.error.message);
                continue;
            }

            const texto = dados.choices?.[0]?.message?.content;

            if (texto) {
                console.log(`Sucesso com o modelo: ${modelo}`);
                return texto;
            }

        } catch (erro) {
            console.log(`Erro de conexão no modelo ${modelo}:`, erro.message);
            continue;
        }

    }

    return null;
}

app.post("/gerar-os", verificarToken, async (req, res) => {

    try {

        const { escopo } = req.body;

        const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

        const prompt = `Data de abertura da OS (hoje): ${hoje}

Escopo e informações fornecidas pelo cliente/usuário (pode incluir tabela de horas por setor):

${escopo}`;

        const texto = await chamarIA(prompt);

        if (!texto) {
            return res.status(500).json({
                erro: "Todos os modelos gratuitos estão indisponíveis no momento. Tente novamente em alguns minutos."
            });
        }

        res.json({
            resultado: texto
        });

    } catch (erro) {

        console.log(erro);

        res.status(500).json({
            erro: "Erro ao gerar a OS."
        });

    }

});

// ---------- GERADOR DE CODIGO VBA (OPCIONAL, PROTEGIDO) ----------

app.post("/gerar-vba", verificarToken, async (req, res) => {

    try {

        const { osTexto } = req.body;

        if (!osTexto || !osTexto.trim()) {
            return res.status(400).json({ erro: "Nenhuma OS fornecida para gerar o código." });
        }

        const prompt = `Aqui está a Ordem de Serviço já gerada. Crie o código VBA correspondente, seguindo rigorosamente todas as regras.

${osTexto}`;

        const texto = await chamarIA(prompt, VBA_PROMPT_MESTRE);

        if (!texto) {
            return res.status(500).json({
                erro: "Todos os modelos gratuitos estão indisponíveis no momento. Tente novamente em alguns minutos."
            });
        }

        res.json({
            resultado: texto
        });

    } catch (erro) {

        console.log(erro);

        res.status(500).json({
            erro: "Erro ao gerar o código VBA."
        });

    }

});

app.listen(3000, () => {

    console.log("Servidor iniciado na porta 3000");

});