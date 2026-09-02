/* Teste: imagem vinculada ao pedido.
 * Mantido separado do React/Firebase para permitir rollback simples.
 */
(() => {
  const PREFIX = "controleProducao:pedidoImagem:";
  const MARK = "data-pedido-imagem-ui";
  const THUMB = "data-pedido-imagem-thumb";

  const norm = (v) => String(v || "").trim();
  const keyFor = (pedido) => PREFIX + norm(pedido);

  function getForm() {
    const all = [...document.querySelectorAll("div,section,form,article")];
    const titled = all.filter((el) => /lan[cç]ar novo pedido/i.test(norm(el.innerText)));
    for (const el of titled.sort((a, b) => a.innerText.length - b.innerText.length)) {
      const inputs = el.querySelectorAll("input,select,textarea");
      if (inputs.length >= 3) return el;
    }
    return null;
  }

  function getPedidoInput(form) {
    if (!form) return null;
    const inputs = [...form.querySelectorAll("input")];
    return inputs.find((el) => {
      const hint = `${el.name || ""} ${el.placeholder || ""} ${el.getAttribute("aria-label") || ""}`.toLowerCase();
      return /pedido|n[úu]mero.*pedido|n[ºo].*pedido/.test(hint) || /ex\.?\s*:\s*1042/.test(hint);
    }) || inputs.find((el) => /^\d{2,}$/.test(norm(el.value))) || inputs[0];
  }

  function getCurrentPedido(form) {
    return norm(getPedidoInput(form)?.value);
  }

  function loadImage(pedido) {
    if (!pedido) return null;
    try {
      const raw = localStorage.getItem(keyFor(pedido));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 1000;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function updatePreview(box, pedido) {
    const status = box.querySelector("[data-pedido-image-status]");
    const preview = box.querySelector("[data-pedido-image-preview]");
    const data = loadImage(pedido);
    if (data?.data) {
      preview.src = data.data;
      preview.style.display = "block";
      status.textContent = `Imagem vinculada ao pedido ${pedido}. Você pode trocar pela câmera ou galeria.`;
    } else {
      preview.removeAttribute("src");
      preview.style.display = "none";
      status.textContent = "Você pode tirar uma foto ou escolher uma imagem.";
    }
  }

  function injectIntoForm() {
    const form = getForm();
    if (!form || form.querySelector(`[${MARK}]`)) return;

    const box = document.createElement("div");
    box.setAttribute(MARK, "1");
    box.style.cssText = "display:block!important;box-sizing:border-box;width:100%;margin:12px 0;padding:14px;border:1px dashed #b8a98c;border-radius:12px;background:#faf7ef;color:inherit;position:relative;z-index:5";
    box.innerHTML = `
      <div style="font-weight:700;margin-bottom:7px;font-size:14px">📷 Imagem do pedido <span style="font-weight:400;opacity:.7">(opcional)</span></div>
      <div style="font-size:12px;opacity:.75;margin-bottom:8px">Anexe uma foto do pedido, modelo ou referência.</div>
      <input type="file" accept="image/*" capture="environment" data-pedido-image-input style="display:block!important;width:100%;box-sizing:border-box;font-size:14px;cursor:pointer" />
      <div data-pedido-image-status style="margin-top:7px;font-size:12px;opacity:.75">Você pode tirar uma foto ou escolher uma imagem.</div>
      <img data-pedido-image-preview alt="Prévia da imagem do pedido" style="display:none;max-width:180px;max-height:140px;margin-top:9px;border-radius:10px;object-fit:cover;border:1px solid #d8cbb5;cursor:pointer" />
    `;

    const input = box.querySelector("[data-pedido-image-input]");
    const status = box.querySelector("[data-pedido-image-status]");
    const preview = box.querySelector("[data-pedido-image-preview]");

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      const pedido = getCurrentPedido(form);
      if (!file) return;
      if (!pedido) {
        status.textContent = "⚠️ Informe o número do pedido antes de escolher a imagem.";
        input.value = "";
        return;
      }
      if (!file.type.startsWith("image/")) {
        status.textContent = "⚠️ Escolha um arquivo de imagem.";
        input.value = "";
        return;
      }
      try {
        status.textContent = "Processando imagem…";
        const data = await resizeImage(file);
        localStorage.setItem(keyFor(pedido), JSON.stringify({ data, nome: file.name, atualizadoEm: Date.now() }));
        preview.src = data;
        preview.style.display = "block";
        status.textContent = `✅ Imagem vinculada ao pedido ${pedido}.`;
        decorateCards();
      } catch (e) {
        status.textContent = "❌ Não foi possível guardar essa imagem neste navegador.";
      }
    });

    preview.addEventListener("click", () => {
      if (!preview.src) return;
      const w = window.open();
      if (w) w.document.write(`<img src="${preview.src}" style="max-width:95vw;max-height:95vh;display:block;margin:auto"/>`);
    });

    const submit = [...form.querySelectorAll("button")].find((b) => /adicionar.*pr[eé]-?corte|adicionar ao pr[eé]/i.test(norm(b.innerText))) || [...form.querySelectorAll("button")].at(-1);
    if (submit?.parentElement) {
      submit.parentElement.parentElement?.insertBefore(box, submit.parentElement);
    } else {
      form.appendChild(box);
    }

    updatePreview(box, getCurrentPedido(form));
  }

  function decorateCards() {
    const stored = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) stored.push([k.slice(PREFIX.length), localStorage.getItem(k)]);
    }
    if (!stored.length) return;

    const elements = [...document.querySelectorAll("div,section,article")];
    stored.forEach(([pedido, raw]) => {
      if (!raw) return;
      let data;
      try { data = JSON.parse(raw); } catch { return; }
      if (!data?.data) return;
      const escaped = pedido.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|\\D)${escaped}(\\D|$)`);
      const matches = elements.filter((el) => norm(el.textContent) === pedido || re.test(el.textContent || ""));
      const card = matches.sort((a, b) => (a.innerText.length || 999999) - (b.innerText.length || 999999))[0];
      if (!card || card.querySelector(`[${THUMB}]`)) return;
      const img = document.createElement("img");
      img.setAttribute(THUMB, "1");
      img.src = data.data;
      img.alt = `Imagem do pedido ${pedido}`;
      img.title = `Imagem do pedido ${pedido}`;
      img.style.cssText = "width:42px;height:42px;object-fit:cover;border-radius:8px;margin-left:7px;vertical-align:middle;cursor:pointer;border:1px solid #d8cbb5";
      img.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const w = window.open();
        if (w) w.document.write(`<img src="${data.data}" style="max-width:95vw;max-height:95vh;display:block;margin:auto"/>`);
      });
      card.appendChild(img);
    });
  }

  function start() {
    injectIntoForm();
    decorateCards();
    const observer = new MutationObserver(() => {
      injectIntoForm();
      decorateCards();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(() => { injectIntoForm(); decorateCards(); }, 1000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
