import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const EMAIL_ADMIN = "adrianajsantos52@gmail.com"; 

onAuthStateChanged(auth, (user) => {
  const icone = document.getElementById("accountIcon");
  const iconeAdmin = document.getElementById("adminIcon");
  if (!icone) return;

  if (user) {
    const userEmail = (user.email || "").toLowerCase();

    // Sempre direciona o bonequinho para a página da conta do usuário
    icone.href = "conta.html";

    // Se for a Adriana, exibe o botão da engrenagem separado
    if (userEmail === EMAIL_ADMIN) {
      if (iconeAdmin) {
        iconeAdmin.style.display = "inline-flex";
        iconeAdmin.href = "admin.html";
      }
    } else {
      if (iconeAdmin) iconeAdmin.style.display = "none";
    }
  } else {
    icone.href = "login.html";
    if (iconeAdmin) iconeAdmin.style.display = "none";
  }
});