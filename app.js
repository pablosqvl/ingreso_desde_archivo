(function () {
  "use strict";

  const elements = {
    textarea: document.querySelector("#source-data"),
    process: document.querySelector("#process-button"),
    clearInput: document.querySelector("#clear-input-button"),
    feedback: document.querySelector("#feedback-content"),
    tbody: document.querySelector("#product-rows"),
    summary: document.querySelector("#selection-summary"),
    selectAll: document.querySelector("#select-all-button"),
    selectNone: document.querySelector("#select-none-button"),
    reset: document.querySelector("#reset-button"),
    download: document.querySelector("#download-button"),
    openHelp: document.querySelector("#open-help-button"),
    helpDialog: document.querySelector("#help-dialog"),
    helpGif: document.querySelector("#help-gif"),
    replayHelp: document.querySelector("#help-replay-button"),
    closeHelp: document.querySelector("#help-close-button"),
    closeHelpIcon: document.querySelector("#help-close-icon"),
  };

  let products = [];
  const helpGifUrl = "assets/generar-csv.gif";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setFeedback(type, title, content) {
    const icons = {
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
      success: '<path d="m5 12 4 4L19 6"/><circle cx="12" cy="12" r="9"/>',
      error: '<path d="M12 4 3 20h18L12 4Z"/><path d="M12 9v5m0 3h.01"/>',
    };
    elements.feedback.className = `feedback feedback-${type}`;
    elements.feedback.innerHTML = `
      <svg aria-hidden="true" viewBox="0 0 24 24">${icons[type]}</svg>
      <div><h2>${escapeHtml(title)}</h2>${content}</div>`;
  }

  function render() {
    const selectedCount = products.filter((product) => product.selected).length;
    const hasProducts = products.length > 0;

    if (!hasProducts) {
      elements.tbody.innerHTML = `
        <tr class="empty-row"><td colspan="6">
          <strong>La lista está vacía</strong>
          <span>Los productos aparecerán aquí después de procesar el primer pegado.</span>
        </td></tr>`;
      elements.summary.textContent = "Todavía no agregaste productos.";
    } else {
      elements.tbody.innerHTML = products.map((product, index) => `
        <tr class="${product.selected ? "" : "row-unselected"}">
          <td class="check-column">
            <input type="checkbox" data-index="${index}" ${product.selected ? "checked" : ""} aria-label="Incluir ${escapeHtml(product.description)}" />
          </td>
          <td>${escapeHtml(product.id)}</td>
          <td>${escapeHtml(product.description)}</td>
          <td>${escapeHtml(product.originalQuantity)}</td>
          <td>${product.quantity}</td>
          <td><span class="status-ok">Listo</span></td>
        </tr>`).join("");
      elements.summary.textContent = `${products.length} ${products.length === 1 ? "producto acumulado" : "productos acumulados"} · ${selectedCount} ${selectedCount === 1 ? "seleccionado" : "seleccionados"}`;
    }

    elements.selectAll.disabled = !hasProducts || selectedCount === products.length;
    elements.selectNone.disabled = !hasProducts || selectedCount === 0;
    elements.reset.disabled = !hasProducts;
    elements.download.disabled = selectedCount === 0;
  }

  function syncInputButtons() {
    const hasText = elements.textarea.value.trim().length > 0;
    elements.process.disabled = !hasText;
    elements.clearInput.disabled = !hasText;
  }

  function processInput() {
    const existingIds = new Set(products.map((product) => product.id));
    const result = CsvToolCore.parseBatch(elements.textarea.value, existingIds);

    if (result.errors.length) {
      const visibleErrors = result.errors.slice(0, 8);
      const extra = result.errors.length - visibleErrors.length;
      const items = visibleErrors.map((error) => `<li>${escapeHtml(error)}</li>`).join("");
      const extraMessage = extra > 0 ? `<p>Y ${extra} ${extra === 1 ? "problema más" : "problemas más"}.</p>` : "";
      setFeedback("error", `${result.errors.length} ${result.errors.length === 1 ? "problema encontrado" : "problemas encontrados"}`, `<ul>${items}</ul>${extraMessage}`);
      return;
    }

    products = products.concat(result.products);
    elements.textarea.value = "";
    syncInputButtons();
    setFeedback(
      "success",
      `${result.products.length} ${result.products.length === 1 ? "producto agregado" : "productos agregados"}`,
      `<p>La lista ahora contiene ${products.length} ${products.length === 1 ? "producto" : "productos"}. Podés pegar otro lote o descargar la selección.</p>`,
    );
    render();
  }

  function clearInput() {
    elements.textarea.value = "";
    syncInputButtons();
    elements.textarea.focus();
  }

  function selectEvery(value) {
    products = products.map((product) => ({ ...product, selected: value }));
    render();
  }

  function resetList() {
    if (!window.confirm("¿Querés eliminar todos los productos acumulados?")) return;
    products = [];
    setFeedback("info", "Lista reiniciada", "<p>Podés pegar una nueva tabla para volver a comenzar.</p>");
    render();
  }

  function downloadCsv() {
    const selected = products.filter((product) => product.selected);
    if (!selected.length) {
      setFeedback("error", "No hay productos seleccionados", "<p>Seleccioná al menos un producto antes de descargar el archivo.</p>");
      return;
    }
    const csv = CsvToolCore.generateCsv(products);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ingreso_productos.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setFeedback("success", "CSV generado correctamente", `<p>Se incluyeron ${selected.length} ${selected.length === 1 ? "producto seleccionado" : "productos seleccionados"}.</p>`);
  }

  function loadHelpGif() {
    elements.helpGif.hidden = false;
    elements.helpGif.src = helpGifUrl;
  }

  function unloadHelpGif() {
    elements.helpGif.removeAttribute("src");
    elements.helpGif.hidden = true;
  }

  function openHelpDialog() {
    loadHelpGif();
    elements.helpDialog.showModal();
  }

  function closeHelpDialog() {
    elements.helpDialog.close();
  }

  function replayHelpGif() {
    unloadHelpGif();
    window.requestAnimationFrame(loadHelpGif);
  }

  elements.textarea.addEventListener("input", syncInputButtons);
  elements.process.addEventListener("click", processInput);
  elements.clearInput.addEventListener("click", clearInput);
  elements.selectAll.addEventListener("click", () => selectEvery(true));
  elements.selectNone.addEventListener("click", () => selectEvery(false));
  elements.reset.addEventListener("click", resetList);
  elements.download.addEventListener("click", downloadCsv);
  elements.openHelp.addEventListener("click", openHelpDialog);
  elements.replayHelp.addEventListener("click", replayHelpGif);
  elements.closeHelp.addEventListener("click", closeHelpDialog);
  elements.closeHelpIcon.addEventListener("click", closeHelpDialog);
  elements.helpDialog.addEventListener("click", (event) => {
    if (event.target === elements.helpDialog) closeHelpDialog();
  });
  elements.helpDialog.addEventListener("close", unloadHelpGif);
  elements.tbody.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"][data-index]');
    if (!checkbox) return;
    const index = Number(checkbox.dataset.index);
    products[index] = { ...products[index], selected: checkbox.checked };
    render();
  });

  render();
  syncInputButtons();
})();
