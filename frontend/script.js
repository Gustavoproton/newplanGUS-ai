const BACKEND_URL = "https://gustech-os-backend.onrender.com";

// ---------- LOGIN ----------

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

// ---------- CADASTRO ----------

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

// ---------- PROTEÇÃO DA PÁGINA DO GERADOR ----------

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

        resultado.value = "Gerando OS...";
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
                resultado.value = "Erro ao gerar a OS: " + dados.erro;
            } else {
                resultado.value = dados.resultado;
            }

        } catch (erro) {
            resultado.value = "Não foi possível conectar ao servidor. Verifique se o backend está rodando.";
        } finally {
            gerar.disabled = false;
        }

    });

}

// ---------- COPIAR ----------

const copiar = document.getElementById("copiar");

if (copiar) {

    copiar.addEventListener("click", () => {
        const texto = document.getElementById("resultado");
        texto.select();
        document.execCommand("copy");
        alert("OS copiada com sucesso!");
    });

}