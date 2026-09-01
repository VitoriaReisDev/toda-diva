// MINHA CONTA — dados do cliente, edição, foto de perfil e histórico de pedidos
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { enviarImagem } from "./imgbb-config.js";
import {
  doc, getDoc, setDoc,
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let usuarioAtual = null;
let dadosAtuais = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  usuarioAtual = user;

  const refUsuario = doc(db, "usuarios", user.uid);
  const usuarioDoc = await getDoc(refUsuario);

  if (usuarioDoc.exists()) {
    dadosAtuais = usuarioDoc.data();
  } else {
    dadosAtuais = { nome: user.email.split("@")[0], email: user.email, role: "cliente" };
    await setDoc(refUsuario, dadosAtuais);
  }

  atualizarTela();
  carregarPedidos(user.uid);

  document.getElementById("fotoPerfilArquivo").addEventListener("change", enviarFotoPerfil);
});

function atualizarTela() {
  document.getElementById("contaNome").textContent = dadosAtuais.nome;
  document.getElementById("contaEmail").textContent = dadosAtuais.email;
  document.getElementById("editNome").value = dadosAtuais.nome;
  renderAvatar();
}

function renderAvatar() {
  const avatar = document.getElementById("avatarCirculo");
  if (dadosAtuais.fotoUrl) {
    avatar.innerHTML = `<img src="${dadosAtuais.fotoUrl}" alt="Foto de perfil" style="width:100%; height:100%; object-fit:cover;">`;
  } else {
    avatar.textContent = dadosAtuais.nome ? dadosAtuais.nome[0].toUpperCase() : "?";
  }
}

async function enviarFotoPerfil(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  const statusEl = document.getElementById("statusUploadFoto");
  statusEl.textContent = "Enviando foto...";

  try {
    const url = await enviarImagem(arquivo);
    await setDoc(doc(db, "usuarios", usuarioAtual.uid), { fotoUrl: url }, { merge: true });
    dadosAtuais.fotoUrl = url;
    renderAvatar();
    statusEl.textContent = "Foto atualizada!";
    setTimeout(() => { statusEl.textContent = ""; }, 2000);
  } catch (erro) {
    statusEl.textContent = "";
    alert("Não foi possível enviar a foto. Tenta de novo.");
  }
}

async function salvarNome() {
  const novoNome = document.getElementById("editNome").value.trim();
  if (!novoNome) { alert("Digite um nome válido."); return; }

  await setDoc(doc(db, "usuarios", usuarioAtual.uid), { nome: novoNome }, { merge: true });
  dadosAtuais.nome = novoNome;
  atualizarTela();
  alert("Dados atualizados!");
}

async function carregarPedidos(uid) {
  const container = document.getElementById("listaPedidos");
  const q = query(collection(db, "pedidos"), where("clienteId", "==", uid));
  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = "Você ainda não fez nenhum pedido.";
    return;
  }

  container.innerHTML = snap.docs.map(d => {
    const p = d.data();
    const total = p.total ? `R$ ${p.total.toFixed(2).replace(".", ",")}` : "-";
    return `<div class="cart-item"><span>Pedido #${d.id.slice(0, 6)}</span><span>${total}</span></div>`;
  }).join("");
}

async function sair() {
  await signOut(auth);
  window.location.href = "login.html";
}

window.salvarNome = salvarNome;
window.sair = sair;