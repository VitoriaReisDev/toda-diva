import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { enviarImagem } from "./imgbb-config.js";
import {
  collection, onSnapshot, doc, getDoc, updateDoc, addDoc, deleteDoc,
  query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ---------- Proteção da página: só admin entra ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  const usuarioDoc = await getDoc(doc(db, "usuarios", user.uid));
  const role = usuarioDoc.exists() ? usuarioDoc.data().role : null;

  if (role !== "admin") {
    alert("Você não tem permissão para acessar essa página.");
    window.location.href = "index.html";
  }
});

// ---------- Navegação entre seções ----------
function mostrarSecao(secao) {
  const secaoEstoque = document.getElementById("secaoEstoque");
  const secaoPedidos = document.getElementById("secaoPedidos");
  const navEstoque = document.getElementById("navEstoque");
  const navPedidos = document.getElementById("navPedidos");

  if (secaoEstoque) secaoEstoque.style.display = secao === "estoque" ? "block" : "none";
  if (secaoPedidos) secaoPedidos.style.display = secao === "pedidos" ? "block" : "none";
  if (navEstoque) navEstoque.classList.toggle("active", secao === "estoque");
  if (navPedidos) navPedidos.classList.toggle("active", secao === "pedidos");
}

// ---------- Estoque ----------
let produtosAdmin = [];
let termoBusca = "";

onSnapshot(collection(db, "produtos"), (snap) => {
  produtosAdmin = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderTabelaAdmin();
});

function renderTabelaAdmin() {
  const tbody = document.getElementById("adminTableBody");
  if (!tbody) return;

  const listaFiltrada = produtosAdmin.filter(p =>
    (p.nome || "").toLowerCase().includes(termoBusca.toLowerCase()) ||
    (p.categoria || "").toLowerCase().includes(termoBusca.toLowerCase())
  );

  if (listaFiltrada.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-text-light); padding:16px;">Nenhum produto encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = listaFiltrada.map(p => {
    const badge = badgeEstoque(p);
    return `
      <tr>
        <td>${p.icone || "🛍️"} ${p.nome}</td>
        <td>${p.categoria}</td>
        <td>R$ ${(p.preco || 0).toFixed(2).replace(".", ",")}</td>
        <td>
          <div class="stepper">
            <button onclick="alterarLote('${p.id}', -1)">−</button>
            <span>${p.loteAtual ?? 0}/${p.loteTotal ?? 0}</span>
            <button onclick="alterarLote('${p.id}', 1)">+</button>
          </div>
        </td>
        <td>${badge}</td>
        <td style="display:flex; gap:6px;">
          <button class="btn btn-outline" onclick="reporLote('${p.id}')">Repor lote</button>
          <button class="btn btn-outline" style="color:var(--color-danger); border-color:var(--color-danger);" onclick="excluirProduto('${p.id}', '${(p.nome || "").replace(/'/g, "")}')">Excluir</button>
        </td>
      </tr>
    `;
  }).join("");
}

function badgeEstoque(p) {
  if ((p.loteAtual ?? 0) <= 0) return `<span class="badge badge-out">esgotado</span>`;
  if ((p.loteAtual ?? 0) <= (p.loteTotal ?? 0) * 0.3) return `<span class="badge badge-low">acabando</span>`;
  return `<span class="badge badge-ok">disponível</span>`;
}

async function alterarLote(id, delta) {
  const p = produtosAdmin.find(pr => pr.id === id);
  if (!p) return;
  const novo = Math.min(p.loteTotal, Math.max(0, (p.loteAtual || 0) + delta));
  await updateDoc(doc(db, "produtos", id), { loteAtual: novo });
}

async function reporLote(id) {
  const p = produtosAdmin.find(pr => pr.id === id);
  if (!p) return;
  const qtd = prompt(`Repor lote de "${p.nome}" — quantas unidades chegaram?`, p.loteTotal);
  if (qtd === null) return;
  const numero = parseInt(qtd, 10);
  if (isNaN(numero) || numero < 0) { alert("Digite um número válido."); return; }
  await updateDoc(doc(db, "produtos", id), { loteTotal: numero, loteAtual: numero });
}

async function excluirProduto(id, nome) {
  const confirmar = confirm(`Tem certeza que quer excluir "${nome}"? Essa ação não pode ser desfeita.`);
  if (!confirmar) return;
  await deleteDoc(doc(db, "produtos", id));
}

function abrirModalProduto() {
  document.getElementById("productModal").classList.add("open");
  document.getElementById("modalOverlay").classList.add("open");
}

function fecharModalProduto() {
  document.getElementById("productModal").classList.remove("open");
  document.getElementById("modalOverlay").classList.remove("open");
}

async function salvarNovoProduto(event) {
  event.preventDefault();

  const nome = document.getElementById("pNome").value.trim();
  const categoria = document.getElementById("pCategoria").value;
  const descricao = document.getElementById("pDescricao").value.trim();
  const preco = parseFloat(document.getElementById("pPreco").value);

  const iconeInput = document.getElementById("pIcone");
  const icone = iconeInput ? (iconeInput.value.trim() || "🛍️") : "🛍️";

  const arquivoImagem = document.getElementById("pImagemArquivo").files[0];
  const lote = parseInt(document.getElementById("pLote").value, 10);

  if (!nome || isNaN(preco) || isNaN(lote) || lote < 1) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  let imagemUrl = "";
  if (arquivoImagem) {
    const statusEl = document.getElementById("statusUpload");
    if (statusEl) statusEl.textContent = "Enviando foto...";
    try {
      imagemUrl = await enviarImagem(arquivoImagem);
      if (statusEl) statusEl.textContent = "";
    } catch (erro) {
      alert("Não foi possível enviar a foto. O produto será salvo sem imagem.");
      if (statusEl) statusEl.textContent = "";
    }
  }

  await addDoc(collection(db, "produtos"), {
    nome, categoria, descricao, preco, icone, imagemUrl,
    loteTotal: lote,
    loteAtual: lote
  });

  fecharModalProduto();
  event.target.reset();
}

// ---------- Pedidos ----------
let pedidosAdmin = [];
let clientesCache = {};

onSnapshot(query(collection(db, "pedidos"), orderBy("criadoEm", "desc")), (snap) => {
  pedidosAdmin = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  carregarNomesClientes();
});

async function carregarNomesClientes() {
  const idsFaltando = [...new Set(pedidosAdmin.map(p => p.clienteId))].filter(id => id && !clientesCache[id]);
  for (const id of idsFaltando) {
    try {
      const snap = await getDoc(doc(db, "usuarios", id));
      clientesCache[id] = snap.exists() ? snap.data().nome : "Cliente";
    } catch {
      clientesCache[id] = "Cliente";
    }
  }
  renderTabelaPedidos();
}

function renderTabelaPedidos() {
  const tbody = document.getElementById("pedidosTableBody");
  if (!tbody) return;

  if (pedidosAdmin.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--color-text-light);">Nenhum pedido ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = pedidosAdmin.map(p => {
    const nomeCliente = p.clienteNome || clientesCache[p.clienteId] || "Cliente";
    const telefone = p.clienteTelefone || "-";
    const itens = (p.itens || []).map(i => `${i.qtd}x ${i.nome}`).join(", ");
    const total = p.total ? `R$ ${p.total.toFixed(2).replace(".", ",")}` : "-";
    const data = p.criadoEm && p.criadoEm.toDate ? p.criadoEm.toDate().toLocaleDateString("pt-BR") : "-";
    const status = badgeStatus(p.status);
    const acao = (p.status === "reservado" || p.status === "aguardando_pagamento" || p.status === "pendente" || !p.status)
      ? `<button class="btn btn-outline" onclick="marcarRetirado('${p.id}')">Marcar retirado</button>`
      : "-";

    return `
      <tr>
        <td>${nomeCliente}</td>
        <td>${telefone}</td>
        <td>${itens}</td>
        <td>${total}</td>
        <td>${status}</td>
        <td>${data}</td>
        <td>24h</td>
        <td>${acao}</td>
      </tr>
    `;
  }).join("");
}

function badgeStatus(status) {
  if (status === "retirado" || status === "pago") return `<span class="badge badge-ok">${status}</span>`;
  if (status === "cancelado") return `<span class="badge badge-out">cancelado</span>`;
  return `<span class="badge badge-low">${status || "pendente"}</span>`;
}

// ---------- Confirmação de Retirada e Baixa no Lote ----------
async function marcarRetirado(id) {
  const pedido = pedidosAdmin.find(p => p.id === id);
  if (!pedido) return;

  const confirmar = confirm("Confirmar a retirada do pedido e dar baixa nos itens do estoque?");
  if (!confirmar) return;

  try {
    // 1. Atualiza o status do pedido para 'retirado'
    await updateDoc(doc(db, "pedidos", id), { status: "retirado" });

    // 2. Desconta a quantidade reservada de cada item no lote do produto
    if (Array.isArray(pedido.itens)) {
      for (const item of pedido.itens) {
        if (item.produtoId) {
          const prodRef = doc(db, "produtos", item.produtoId);
          const prodSnap = await getDoc(prodRef);

          if (prodSnap.exists()) {
            const prodData = prodSnap.data();
            const novoLoteAtual = Math.max(0, (prodData.loteAtual || 0) - (item.qtd || 1));
            await updateDoc(prodRef, { loteAtual: novoLoteAtual });
          }
        }
      }
    }

    alert("Pedido marcado como retirado e estoque atualizado!");
  } catch (erro) {
    console.error("Erro ao atualizar retirada e estoque:", erro);
    alert("Erro ao processar a baixa no estoque.");
  }
}

// ---------- Escutador da Barra de Busca ----------
document.addEventListener("DOMContentLoaded", () => {
  const inputBusca = document.getElementById("buscaProduto");
  if (inputBusca) {
    inputBusca.addEventListener("input", (e) => {
      termoBusca = e.target.value;
      renderTabelaAdmin();
    });
  }
});

// ---------- Exposição de funções globais para o HTML ----------
window.mostrarSecao = mostrarSecao;
window.alterarLote = alterarLote;
window.reporLote = reporLote;
window.excluirProduto = excluirProduto;
window.abrirModalProduto = abrirModalProduto;
window.fecharModalProduto = fecharModalProduto;
window.salvarNovoProduto = salvarNovoProduto;
window.marcarRetirado = marcarRetirado;