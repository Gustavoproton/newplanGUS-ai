const BACKEND_URL = "https://literate-space-goldfish-5vv5qp457w7x24x74-3000.app.github.dev";

function login(){
    let usuario=document.getElementById("usuario").value;
    let senha=document.getElementById("senha").value;
    if(usuario==="gustavo" && senha==="gustech2026"){
        window.location.href="index.html";
    }
    else{
        alert("Usuario ou senha invalidos.");
    }
}

const gerar=document.getElementById("gerar");

if(gerar){
    
    gerar.addEventListener("click", async function(){
        var escopo=document.getElementById("escopo").value;
        var resultado=document.getElementById("resultado");

        if(escopo.trim()===""){
            alert("Cole o escopo antes de gerar a OS.");
            return;
        }

        resultado.value = "Gerando OS...";
        gerar.disabled = true;

        try {
            var resposta = await fetch(BACKEND_URL + "/gerar-os", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ escopo: escopo })
            });

            var dados = await resposta.json();

            if (dados.erro) {
                resultado.value = "Erro ao gerar a OS. Tente novamente.";
            } else {
                resultado.value = dados.resultado;
            }

        } catch (erro) {
            resultado.value = "Nao foi possivel conectar ao servidor. Verifique se o backend esta rodando.";
        } finally {
            gerar.disabled = false;
        }
    });
}

const copiar=document.getElementById("copiar");

if(copiar){
    copiar.addEventListener("click", function(){
        var texto=document.getElementById("resultado");
        texto.select();
        document.execCommand("copy");
        alert("OS copiada com sucesso!");
    });
}