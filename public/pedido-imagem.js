/* Experimento: imagem vinculada ao pedido.
 * A primeira versão usa localStorage para testar a UX sem alterar o Firebase.
 * Fotos são redimensionadas/comprimidas antes de serem salvas.
 */
(() => {
  const PREFIX = "controleProducao:pedidoImagem:";
  const MARK = "data-pedido-imagem-ui";

  const norm = (v) => String(v || "").trim();
  const keyFor = (pedido) => PREFIX + norm(pedido);

  function getPedidoInput() {
    const inputs = [...document.querySelectorAll("input")];
    return inputs.find((el) => {
      const hint = `${el.name || ""} ${el.placeholder || ""} ${el.getAttribute("aria-label") || ""}`.toLowerCase();
      return /pedido|n[úu]mero.*pedido|n[ºo].*pedido/.test(hint);
    }) || inputs.find((el) => /^\d{2,}$/.test(norm(el.value)));
  }

  function getCurrentPedido() {
    return norm(getPedidoInput()?.value);
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

  function findModal() {
    const candidates = [...document.querySelectorAll('[role="dialog"], .modal, .modal-overlay, [class*="modal"], [class*="dialog"]')];
    return candidates.find((el) => /pedido|produto|quantidade/i.test(el.innerText || "")) || null;
  }

  function injectIntoModal() {
    const modal = findModal();
    if (!modal || modal.querySelector(`[${MARK}]`)) return;

    const box = document.createElement("div");
    box.setAttribute(MARK, "1");
    box.style.cssText = "margin-top:12px;padding:12px;border:1px dashed #b8a98c;border-radius:12px;background:#faf7ef";
    box.innerHTML = `
      <div style="font-weight:700;margin-bottom:7px">📷 Imagem do pedido <span style="font-weight:400;opacity:.7">(opcional)</span></div>
      <input type="file" accept="image/*" capture="environment" data-pedido-image-input style="display:block;width:100%;font-size:14px" />
      <div data-pedido-image-status style="margin-top:6px;font-size:12px;opacity:.7">Você pode tirar uma foto ou escolher uma imagem.</div>
      <img data-pedido-image-preview alt="Prévia do pedido" style="display:none;max-width:180px;max-height:140px;margin-top:8px;border-radius:10px;object-fit:cover" />
    `;

    const input = box.querySelector("[data-pedido-image-input]");
    const status = box.querySelector("[data-pedido-image-status]");
    const preview = box.querySelector("[data-pedido-image-preview]");

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      const pedido = getCurrentPedido();
      if (!file) return;
      if (!pedido) {
        status.textContent = "Informe o número do pedido antes de escolher a imagem.";
        input.value = "";
        return;
      }
      try {
        status.textContent = "Processando imagem…";
        const data = await resizeImage(file);
        try {
          localStorage.setItem(keyFor(pedido), JSON.stringify({ data, nome: file.name, atualizadoEm: Date.now() }));
        } catch (e) {
          status.textContent = "Não foi possível guardar a imagem neste navegador.";
          return;
        }
        preview.src = data;
        preview.style.display = "block";
        status.textContent = `Imagem vinculada ao pedido ${pedido}.`;
      } catch (e) {
        status.textContent = "Não foi possível processar essa imagem.";
      }
    });

    const anchor = [...modal.querySelectorAll("input,select,textarea")].at(-1)?.parentElement;
    if (anchor?.parentElement) anchor.parentElement.appendChild(box);
    else modal.appendChild(box);
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
      const matches = elements.filter((el) => norm(el.textContent) === pedido || new RegExp(`(^|\\D)${pedido}(\\D|$)`).test(el.textContent || ""));
      const card = matches.sort((a,b) => (a.innerText.length || 999999) - (b.innerText.length || 999999))[0];
      if (!card || card.querySelector(`[${MARK}-thumb]`)) return;
      const img = document.createElement("img");
      img.setAttribute(`${MARK}-thumb`, "1");
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

  const observer = new MutationObserver(() => {
    injectIntoModal();
    decorateCards();
  });

  function start() {
    injectIntoModal();
    decorateCards();
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(() => { injectIntoModal(); decorateCards(); }, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
