export const IMGBB_API_KEY = "5fd40076f033d2a910c688d4886186a5";

export async function enviarImagem(arquivo) {
  const formData = new FormData();
  formData.append("image", arquivo);

  const resposta = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: formData
  });

  const resultado = await resposta.json();
  if (!resultado.success) throw new Error("Falha ao enviar imagem");

  return resultado.data.url;
}