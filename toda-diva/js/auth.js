import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let modo = "entrar";

function trocarModo(novoModo) {
  modo = novoModo;
  document.getElementById("tabEntrar").classList.toggle("active", modo === "entrar");
  document.getElementById("tabCriar").classList.toggle("active", modo === "criar");
  document.getElementById("campoNome").style.display = modo === "criar" ? "block" : "none";
  document.getElementById("btnSubmit").textContent = modo === "criar" ? "Criar conta" : "Entrar";
  document.getElementById("authError").textContent = "";
}

async function enviarFormulario(event) {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const erroEl = document.getElementById("authError");
  erroEl.textContent = "";

  try {
    if (modo === "criar") {
      const nome = document.getElementById("nome").value.trim();
      if (!nome) { erroEl.textContent = "Digite seu nome."; return; }
      const cred = await createUserWithEmailAndPassword(auth, email, senha);
      await setDoc(doc(db, "usuarios", cred.user.uid), { nome, email, role: "cliente" });
      window.location.href = "index.html";
    } else {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const usuarioDoc = await getDoc(doc(db, "usuarios", cred.user.uid));
      if (usuarioDoc.exists() && usuarioDoc.data().role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "index.html";
      }
    }
  } catch (erro) {
    erroEl.textContent = traduzirErro(erro.code);
  }
}

function traduzirErro(codigo) {
  const mensagens = {
    "auth/email-already-in-use": "Esse e-mail já está cadastrado.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/invalid-credential": "E-mail ou senha incorretos."
  };
  return mensagens[codigo] || "Algo deu errado. Tenta de novo.";
}

window.trocarModo = trocarModo;
window.enviarFormulario = enviarFormulario;