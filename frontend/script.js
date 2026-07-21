const BACKEND_URL = "https://gustech-os-backend.onrender.com";

function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

function formatarResultado(texto) {

    const escapado = escaparHTML(texto);
    const linhas = escapado.split("\n").map(l => l.trim());
    let html = "";
    let dentroDeLista = false;
    let ultimaFoiVazia = true;

    const titulosSecao = ["DADOS DO EQUIPAMENTO", "RELATÓRIOS E DOCUMENTOS A SEREM EMITIDOS"];

    linhas.forEach((linhaOriginal) => {

        const textoSemNegrito = linhaOriginal.replace(/\*\*/g, "").trim();
        const linhaComNegrito = linhaOriginal.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        const linhaLimpa = linhaComNegrito.trim();

        const ehItemDeLista = /^-\s+/.test(linhaLimpa);
        const ehEtapa = /^ETAPA\s*[–-]/.test(textoSemNegrito);
        const ehTituloSecao = titulosSecao.some((t) => textoSemNegrito.toUpperCase() === t);

        if (ehItemDeLista) {
            if (!dentroDeLista) {
                html += "<ul>";
                dentroDeLista = true;
            }
            html += `<li>${linhaLimpa.replace(/^-\s+/, "")}</li>`;
            ultimaFoiVazia = false;
        } else {
            if (dentroDeLista) {
                html += "</ul>";
                dentroDeLista = false;
            }
            if (linhaLimpa === "") {
                ultimaFoiVazia = true;
            } else if (ehEtapa) {
                html += `<h3 class="etapa-titulo">${textoSemNegrito}</h3>`;
                ultimaFoiVazia = false;
            } else if (ehTituloSecao) {
                html += `<h3 class="secao-titulo">${textoSemNegrito}</h3>`;
                ultimaFoiVazia = false;
            } else {
                html += `<p>${linhaLimpa}</p>`;
                ultimaFoiVazia = false;
            }
        }

    });

    if (dentroDeLista) {
        html += "</ul>";
    }

    return html;

}



const botaoLogin = document.getElementById("botaoLogin");

if (botaoLogin) {

    botaoLogin.addEventListener("click", async () => {

        const usuario = document.getElementById("usuario").value;
        const senha = document.getElementById("senha").value;
        const mensagem = document.getElementById("mensagem");

        if (!usuario || !senha) {
            mensagem.textContent = "Preencha usuário e senha.";
            mensagem.style.color = "#EF4444";
            return;
        }

        botaoLogin.disabled = true;
        botaoLogin.textContent = "Entrando...";

        try {

            const resposta = await fetch(`${BACKEND_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuario, senha })
            });

            const dados = await resposta.json();

            if (dados.erro) {
                mensagem.textContent = dados.erro;
                mensagem.style.color = "#EF4444";
                botaoLogin.disabled = false;
                botaoLogin.textContent = "Entrar";
                return;
            }

            localStorage.setItem("gustech_token", dados.token);
            localStorage.setItem("gustech_usuario", usuario);
            window.location.href = "index.html";

        } catch (erro) {
            mensagem.textContent = "Não foi possível conectar ao servidor. O backend pode estar iniciando, tente novamente em 1 minuto.";
            mensagem.style.color = "#EF4444";
            botaoLogin.disabled = false;
            botaoLogin.textContent = "Entrar";
        }

    });

}

const botaoRegistrar = document.getElementById("botaoRegistrar");

if (botaoRegistrar) {

    botaoRegistrar.addEventListener("click", async () => {

        const usuario = document.getElementById("novoUsuario").value;
        const senha = document.getElementById("novaSenha").value;
        const mensagem = document.getElementById("mensagem");

        if (!usuario || !senha) {
            mensagem.textContent = "Preencha usuário e senha.";
            mensagem.style.color = "#EF4444";
            return;
        }

        botaoRegistrar.disabled = true;
        botaoRegistrar.textContent = "Criando...";

        try {

            const resposta = await fetch(`${BACKEND_URL}/registrar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuario, senha })
            });

            const dados = await resposta.json();

            if (dados.erro) {
                mensagem.textContent = dados.erro;
                mensagem.style.color = "#EF4444";
                botaoRegistrar.disabled = false;
                botaoRegistrar.textContent = "Criar Conta";
                return;
            }

            mensagem.textContent = "Conta criada! Redirecionando para o login...";
            mensagem.style.color = "#22D3EE";

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);

        } catch (erro) {
            mensagem.textContent = "Não foi possível conectar ao servidor. O backend pode estar iniciando, tente novamente em 1 minuto.";
            mensagem.style.color = "#EF4444";
            botaoRegistrar.disabled = false;
            botaoRegistrar.textContent = "Criar Conta";
        }

    });

}

const gerar = document.getElementById("gerar");

if (gerar) {

    const token = localStorage.getItem("gustech_token");

    if (!token) {
        window.location.href = "login.html";
    }

    gerar.addEventListener("click", async () => {

        const escopo = document.getElementById("escopo").value;
        const resultado = document.getElementById("resultado");

        if (!escopo.trim()) {
            alert("Cole o escopo antes de gerar a OS.");
            return;
        }

        resultado.innerHTML = "<p>Gerando OS...</p>";
        gerar.disabled = true;

        try {

            const resposta = await fetch(`${BACKEND_URL}/gerar-os`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("gustech_token")}`
                },
                body: JSON.stringify({ escopo })
            });

            if (resposta.status === 401) {
                alert("Sua sessão expirou. Faça login novamente.");
                localStorage.removeItem("gustech_token");
                window.location.href = "login.html";
                return;
            }

            const dados = await resposta.json();

            if (dados.erro) {
                resultado.innerHTML = `<p>Erro ao gerar a OS: ${dados.erro}</p>`;
            } else {
                resultado.innerHTML = formatarResultado(dados.resultado);
            }

        } catch (erro) {
            resultado.innerHTML = "<p>Não foi possível conectar ao servidor. Verifique se o backend está rodando.</p>";
        } finally {
            gerar.disabled = false;
        }

    });

}

const copiar = document.getElementById("copiar");

if (copiar) {

    copiar.addEventListener("click", async () => {

        const resultado = document.getElementById("resultado");
        const html = resultado.innerHTML;
        const texto = resultado.innerText;

        try {

            const item = new ClipboardItem({
                "text/html": new Blob([html], { type: "text/html" }),
                "text/plain": new Blob([texto], { type: "text/plain" })
            });

            await navigator.clipboard.write([item]);
            alert("OS copiada com formatação! Pode colar direto no Word.");

        } catch (erro) {

            navigator.clipboard.writeText(texto).then(() => {
                alert("OS copiada (texto simples).");
            }).catch(() => {
                alert("Não foi possível copiar. Selecione o texto manualmente.");
            });

        }

    });

}