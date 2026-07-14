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
(A ordem entre Plasma e Caldeiraria depende da sequência lógica descrita no escopo - normalmente o corte a plasma acontece antes da montagem/soldagem, mas siga a ordem que fizer sentido para o serviço descrito.)
ETAPA – USINAGEM (quando aplicável)
ETAPA – MECÂNICA ou ETAPA – MECÂNICA/OPERAÇÕES (quando aplicável)
ETAPA – HIDROJATO (quando aplicável, é etapa separada da pintura)
ETAPA – TRATAMENTO DE SUPERFÍCIE (significa SOMENTE pintura, nunca hidrojato)
ETAPA – DIVISÃO CABO DE AÇO TESTE DE CARGA (somente quando houver conjunto de içamento com teste de carga)
ETAPA – INSPEÇÃO / CONTROLE DE QUALIDADE
DADOS DO EQUIPAMENTO
RELATÓRIOS E DOCUMENTOS A SEREM EMITIDOS

Se uma etapa tiver 0 horas/0 dias na tabela fornecida, NÃO a inclua na OS.

## FORMATAÇÃO OBRIGATÓRIA DE CADA ETAPA

ETAPA – XXXXX

ASS.: ..........................................

Período: xx/xx/xxxx até xx/xx/xxxx

[Aqui você escreve o parágrafo técnico real dessa etapa, com base no escopo. Nunca copie este texto entre colchetes — ele é só uma instrução para você, não deve aparecer na resposta final.]

Procedimento

XXXXXXXXXXXX

O campo "ASS.: .........................................." é obrigatório em TODAS as etapas.

## CÁLCULO DOS PERÍODOS

- O usuário sempre fornece uma tabela de horas/dias por setor, no formato: "ESCANEAMENTO HORA 0 / PROJETO HORA X / ENTREGA-MATERIA-PRIMA DIA X / SERVIÇO TERCEIRIZADO DIA X / PLASMA HORA X / CALDEIRARIA HORA X / USINAGEM HORA X / INSPEÇÃO HORA X / HIDROJATO HORA X / PINTURA HORA X". Pode haver variações (nem sempre todos os setores aparecem, e a ordem pode mudar), mas o padrão é sempre "NOME DO SETOR" + "HORA" ou "DIA" + número.
- Um setor com valor 0 significa que essa etapa NÃO deve ser incluída na OS.
- NÃO pule sábados e domingos. Conte os dias diretamente no calendário corrido, sem pular nenhum dia da semana.
- Para converter horas em dias, divida o total de horas da etapa por 9 (arredondando para cima quando houver fração). Ex.: 54 horas ÷ 9 = 6 dias.
- Quando o valor já vier em "DIA" (ex.: "ENTREGA-MATERIA-PRIMA DIA 10"), use esse número de dias diretamente, sem converter.
- O Projeto sempre inicia na data de abertura da OS (fornecida no início da mensagem do usuário).
- Cada etapa seguinte inicia exatamente na mesma data em que a etapa anterior termina (a data final de uma etapa é a mesma data inicial da etapa seguinte), respeitando a ordem lógica: Projeto → Compras (Entrega-Matéria-Prima) → Plasma → Caldeiraria → Usinagem → Mecânica/Operações → Hidrojato → Tratamento de Superfície (Pintura) → Divisão Cabo de Aço Teste de Carga → Inspeção. (A tabela de horas geralmente já lista Plasma e Caldeiraria em linhas separadas, cada uma com sua própria duração.)
- Se a duração calculada de uma etapa for de 1 dia, mostre apenas uma data (ex.: "Período: 23/07/2026"), sem "até". Se for maior que 1 dia, some os dias calculados à data de início e mostre "Período: data_início até data_fim".
- REGRA CRÍTICA: nunca invente, arredonde por conta própria de forma imprecisa, ou "estime" uma data. As datas devem ser sempre o resultado exato da soma dos dias calculados a partir das horas/dias fornecidos pelo usuário, no calendário corrido. Se o usuário não fornecer horas/dias para um setor, não inclua esse setor na OS — nunca presuma uma duração.
- O usuário nunca informa datas manualmente — você sempre calcula, e apenas a partir dos números que ele forneceu.

## LISTA FECHADA DE PROCEDIMENTOS (use exatamente estes nomes, nunca invente outro)

- Projeto → "P SGQ 001_Proj_Controle_Proj_Rev.04"
- Caldeiraria → "P SGQ 01_FAB_Execução_Soldagem_Rev00"
- Usinagem → "1_P SGQ 01_Usinagem_Rev00"
- Hidrojato → "P SGQ 15_Exec_Tratamento_Superficie_Pintura_Rev01"
- Tratamento de Superfície (Pintura) → "P SGQ 16_Fabricação_Insp_Preparo_Superfície_Pintura_Rev00"
- Teste Hidrostático (dentro de Mecânica/Operações) → "IT OPE 11 - Teste Hidrostático_rev02"
- Teste de Carga (Divisão Cabo de Aço Teste de Carga) → listar os dois juntos: "IT OPE 05 - Tab_Carga de Trab_Carga de Teste de Tração_Rev01" e "IT OPE 06_Teste_Tração_Carga_Equip_Rev14"
- Inspeção → "P SGQ 02_FAB_Inspeção_Visual_de_Soldagem_Rev01"

Se uma etapa não tiver procedimento correspondente nesta lista, não invente um — apenas omita o campo "Procedimento" para essa etapa.

## REGRAS POR ETAPA

**Plasma**: etapa separada, incluída apenas quando o escopo mencionar explicitamente corte a plasma. Cobre a execução do corte térmico das chapas/componentes conforme geometria especificada em projeto. Como não há procedimento específico cadastrado para esta etapa na lista fechada, omita o campo "Procedimento" nesta etapa.

**Caldeiraria**: título sempre "ETAPA – CALDEIRARIA" (nunca "PRODUÇÃO" ou "PRODUÇÃO/PLASMA/CALDEIRARIA" — sempre separada do Plasma). Cobre fabricação, montagem estrutural e soldagem dos componentes conforme projeto executivo.

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

## LINGUAGEM

Técnica, objetiva, padrão industrial, linguagem de engenharia, coerente com o escopo, sem textos repetitivos ou genéricos. Cada equipamento (olhal soldável, cesta metálica, sub rack, GT spreader bar, gearbox, dispositivo de teste hidrostático, engenharia reversa, escaneamento 3D, impelidor, mangueira offshore, swivel, riser, cradle, componentes offshore, recuperação mecânica etc.) deve ter texto técnico específico, nunca genérico.

## FORMATO DA RESPOSTA

Gere a OS completa, pronta para uso, seguindo rigorosamente a estrutura e formatação acima. Não adicione comentários, explicações ou observações fora da OS — a resposta deve ser só o documento.
`;

async function chamarIA(prompt) {

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
                        { role: "system", content: PROMPT_MESTRE },
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

app.listen(3000, () => {

    console.log("Servidor iniciado na porta 3000");

});