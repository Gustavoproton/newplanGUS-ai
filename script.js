function login(){

    let usuario=document.getElementById("usuario").value;

    let senha=document.getElementById("senha").value;

    if(usuario==="admin" && senha==="123456"){

        window.location.href="index.html";

    }

    else{

        alert("Usuário ou senha inválidos.");

    }

}

const gerar=document.getElementById("gerar");

if(gerar){

gerar.addEventListener("click",()=>{

let escopo=document.getElementById("escopo").value;

document.getElementById("resultado").value=

`A IA irá gerar a Ordem de Serviço aqui.

Escopo recebido:

${escopo}`;

});

}

const copiar=document.getElementById("copiar");

if(copiar){

copiar.addEventListener("click",()=>{

let texto=document.getElementById("resultado");

texto.select();

document.execCommand("copy");

alert("OS copiada com sucesso!");

});

}