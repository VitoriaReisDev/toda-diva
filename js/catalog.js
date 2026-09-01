import { auth, db } from "./firebase-config.js";
import {
  collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let produtos = [];
let carrinho = [];
let filtroAtivo = "todos";
let formaPagamento = null;

onSnapshot(collection(db, "produtos"), (snap) => {
  produtos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCatalogo();
});

function renderCatalogo() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  const lista = filtroAtivo === "todos" ? produtos : produtos.filter(p => p.categoria === filtroAtivo);
  grid.innerHTML = lista.map(produtoCardHTML).join("");
}

function produtoCardHTML(p) {
  const percentual = Math.round((p.loteAtual / p.loteTotal) * 100);
  const esgotado = p.loteAtual <= 0;
  return `
    <div class="product-card">
            <div class="product-image">${p.imagemUrl ? `<img src="${p.imagemUrl}" alt="${p.nome}">` : p.icone}</div>
      <div class="product-body">
        <h3 class="product-name">${p.nome}</h3>
        <span class="product-price">R$ ${p.preco.toFixed(2).replace(".", ",")}</span>
        <div class="lote-ribbon">
          <div class="lote-bar"><div class="lote-bar-fill" style="width:${percentual}%"></div></div>
          <span class="lote-label">
            ${esgotado ? '<span class="esgotado">esgotado</span>' : `<strong>${p.loteAtual}</strong>/${p.loteTotal} no laço`}
          </span>
        </div>
        <button class="btn btn-primary btn-block" ${esgotado ? "disabled" : ""} onclick="adicionarAoCarrinho('${p.id}')">
          ${esgotado ? "Sem estoque" : "Adicionar"}
        </button>
      </div>
    </div>
  `;
}

function filtrarCategoria(categoria, el) {
  filtroAtivo = categoria;
  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  renderCatalogo();
}

function adicionarAoCarrinho(id) {
  const produto = produtos.find(p => p.id === id);
  if (!produto || produto.loteAtual <= 0) return;
  const item = carrinho.find(i => i.id === id);
  if (item) item.qtd += 1; else carrinho.push({ id, qtd: 1 });
  atualizarCartCount();
  renderCarrinho();
}

function removerDoCarrinho(id) {
  carrinho = carrinho.filter(i => i.id !== id);
  atualizarCartCount();
  renderCarrinho();
}

function atualizarCartCount() {
  const count = carrinho.reduce((s, i) => s + i.qtd, 0);
  const el = document.getElementById("cartCount");
  if (el) el.textContent = count;
}

function renderCarrinho() {
  const container = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  if (!container) return;
  if (carrinho.length === 0) {
    container.innerHTML = `<p style="color:var(--color-text-light); font-size:0.85rem;">Seu carrinho está vazio.</p>`;
    if (totalEl) totalEl.textContent = "R$ 0,00";
    return;
  }
  let total = 0;
  container.innerHTML = carrinho.map(i => {
    const p = produtos.find(pr => pr.id === i.id);
    const subtotal = p.preco * i.qtd;
    total += subtotal;
    return `<div class="cart-item"><span>${p.icone} ${p.nome} × ${i.qtd}</span><span>R$ ${subtotal.toFixed(2).replace(".", ",")} <a href="#" onclick="removerDoCarrinho('${i.id}'); return false;" style="color:var(--color-danger); margin-left:8px;">remover</a></span></div>`;
  }).join("");
  if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
}

function toggleDrawer(open) {
  document.getElementById("cartDrawer").classList.toggle("open", open);
  document.getElementById("drawerOverlay").classList.toggle("open", open);
}

function selecionarPagamento(forma, el) {
  formaPagamento = forma;
  document.querySelectorAll(".payment-option").forEach(o => o.classList.remove("selected"));
  el.classList.add("selected");
}

async function finalizarPedido() {
  if (carrinho.length === 0) { alert("Seu carrinho está vazio."); return; }
  if (!formaPagamento) { alert("Escolha uma forma de pagamento."); return; }

  if (!auth.currentUser) {
    alert("Você precisa entrar na sua conta pra finalizar o pedido.");
    window.location.href = "login.html";
    return;
  }

  const itens = carrinho.map(i => {
    const p = produtos.find(pr => pr.id === i.id);
    return { produtoId: p.id, nome: p.nome, qtd: i.qtd, preco: p.preco };
  });
  const total = itens.reduce((s, i) => s + i.preco * i.qtd, 0);

  await addDoc(collection(db, "pedidos"), {
    clienteId: auth.currentUser.uid,
    itens, total,
    formaPagamento,
    status: formaPagamento === "dinheiro" ? "reservado" : "aguardando_pagamento",
    criadoEm: serverTimestamp()
  });

    if (formaPagamento === "dinheiro") {
    for (const i of carrinho) {
      const p = produtos.find(pr => pr.id === i.id);
      await updateDoc(doc(db, "produtos", p.id), { loteAtual: Math.max(0, p.loteAtual - i.qtd) });
    }
    alert("Pedido reservado! Pagamento em dinheiro na retirada da loja.");
  } else {
    try {
      const resposta = await fetch("https://toda-diva-pagamento.vercel.app/api/criar-preferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens })
      });
      const dados = await resposta.json();

      if (dados.init_point) {
        window.location.href = dados.init_point;
        return; // sai da função aqui, já que a página vai mudar
      } else {
        alert("Não foi possível iniciar o pagamento. Tenta de novo em instantes.");
      }
    } catch (erro) {
      alert("Erro ao conectar com o pagamento. Tenta de novo em instantes.");
    }
  }

  carrinho = [];
  atualizarCartCount();
  renderCarrinho();
  toggleDrawer(false);
}

window.filtrarCategoria = filtrarCategoria;
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.removerDoCarrinho = removerDoCarrinho;
window.toggleDrawer = toggleDrawer;
window.selecionarPagamento = selecionarPagamento;
window.finalizarPedido = finalizarPedido;