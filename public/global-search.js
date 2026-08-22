(() => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const norm = (v) => String(v || '').toLowerCase().trim();

  function getTabs() {
    return Array.from(document.querySelectorAll('.tabs-row .tab-btn'));
  }

  function getActiveTabIndex(tabs) {
    const index = tabs.findIndex((b) => getComputedStyle(b).backgroundColor === 'rgb(216, 98, 44)');
    return index >= 0 ? index : 0;
  }

  function textMatches(el, term) {
    return norm(el.textContent).includes(term);
  }

  function findOrderElements(term) {
    const byData = Array.from(document.querySelectorAll('[data-pedido]')).filter((el) => norm(el.dataset.pedido).includes(term));
    if (byData.length) return byData;
    return Array.from(document.querySelectorAll('.pedido-card, .item-linha, .diaGrupo')).filter((el) => textMatches(el, '#' + term) || textMatches(el, term));
  }

  function stageLabelFromButton(button) {
    return (button?.textContent || '').replace(/\s*\(\d+\)\s*$/, '').trim();
  }

  function install() {
    if (document.querySelector('.global-order-search')) return true;
    const headerInner = document.querySelector('.app-header .headerInner');
    const tabs = document.querySelector('.app-header .tabs-row');
    if (!headerInner || !tabs) return false;

    const wrap = document.createElement('div');
    wrap.className = 'global-order-search';
    wrap.style.cssText = 'position:relative;width:100%;margin:0 0 10px;z-index:60;';
    wrap.innerHTML = '<input class="global-order-input" type="search" autocomplete="off" placeholder="🔎 Buscar pedido em todas as etapas..." aria-label="Buscar pedido em todas as etapas" /><div class="global-order-results" hidden></div>';
    headerInner.insertBefore(wrap, tabs);

    const input = wrap.querySelector('.global-order-input');
    const resultsBox = wrap.querySelector('.global-order-results');
    let timer = null;
    let scanToken = 0;
    let scanning = false;
    let originalTab = 0;

    input.style.cssText = 'width:100%;box-sizing:border-box;padding:10px 13px;border:1px solid #cfc2ad;border-radius:9px;font-size:15px;background:#fff;color:#231f1a;outline:none;';
    resultsBox.style.cssText = 'position:absolute;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1px solid #d9cdb8;border-radius:10px;padding:6px;box-shadow:0 5px 18px rgba(0,0,0,.18);max-height:320px;overflow:auto;';

    function showMessage(text) {
      resultsBox.hidden = false;
      resultsBox.innerHTML = `<div style="padding:10px;color:#6f6658;font-size:13px">${text}</div>`;
    }

    function showResults(found) {
      resultsBox.hidden = false;
      if (!found.length) { showMessage('Pedido não encontrado.'); return; }
      resultsBox.innerHTML = found.map((r, i) => `<button type="button" data-result="${i}" style="width:100%;border:0;background:#fff;text-align:left;padding:9px 10px;border-radius:7px;cursor:pointer;display:flex;justify-content:space-between;gap:12px;align-items:center"><span><b>#${r.pedido}</b>${r.produto ? ` · ${r.produto}` : ''}</span><b style="color:#d8622c;white-space:nowrap">${r.stage}</b></button>`).join('');
      resultsBox.querySelectorAll('[data-result]').forEach((btn) => btn.addEventListener('click', () => openResult(found[Number(btn.dataset.result)])));
    }

    async function scan(term) {
      const token = ++scanToken;
      const tabsNow = getTabs();
      if (!tabsNow.length) return;
      originalTab = getActiveTabIndex(tabsNow);
      const found = [];
      scanning = true;
      for (let i = 0; i < tabsNow.length; i++) {
        if (token !== scanToken) return;
        const b = tabsNow[i];
        b.click();
        await sleep(100);
        const els = findOrderElements(term);
        if (els.length) {
          const stage = stageLabelFromButton(b);
          const seen = new Set();
          els.slice(0, 8).forEach((el) => {
            const match = String(el.textContent).match(/#?\b\d{3,}\b/);
            const pedido = el.dataset?.pedido || (match ? match[0].replace(/^#/, '') : term);
            const bold = el.querySelector('b');
            const produto = bold ? bold.textContent.trim() : '';
            const key = `${stage}|${pedido}|${produto}`;
            if (!seen.has(key)) { seen.add(key); found.push({ pedido, produto, stage, stageIndex: i }); }
          });
        }
      }
      if (token !== scanToken) return;
      scanning = false;
      getTabs()[originalTab]?.click();
      await sleep(100);
      showResults(found);
    }

    async function openResult(result) {
      scanToken++;
      resultsBox.hidden = true;
      input.value = '';
      getTabs()[result.stageIndex]?.click();
      await sleep(130);
      const term = norm(result.pedido);
      let el = Array.from(document.querySelectorAll('[data-pedido]')).find((x) => norm(x.dataset.pedido) === term);
      if (!el) el = Array.from(document.querySelectorAll('.pedido-card, .item-linha, .diaGrupo')).find((x) => textMatches(x, '#' + term));
      if (el) {
        el.style.outline = '3px solid #d8622c';
        el.style.outlineOffset = '3px';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 2500);
      }
    }

    input.addEventListener('input', () => {
      clearTimeout(timer);
      const term = norm(input.value);
      if (!term) { scanToken++; resultsBox.hidden = true; return; }
      showMessage('Procurando em todas as etapas...');
      timer = setTimeout(() => scan(term), 180);
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; scanToken++; resultsBox.hidden = true; input.blur(); } });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target) && !scanning) resultsBox.hidden = true; });
    return true;
  }

  const observer = new MutationObserver(() => { if (install()) observer.disconnect(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  install();
})();
