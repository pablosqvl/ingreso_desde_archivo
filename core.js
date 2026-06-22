(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CsvToolCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const HEADER_NAMES = ["id producto", "descripcion producto", "cantidad", "fecha"];

  function normalizeHeader(value) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, " ");
  }

  function isHeaderRow(columns) {
    return columns.length >= 3 && HEADER_NAMES.slice(0, 3).every((name, index) => normalizeHeader(columns[index] || "") === name);
  }

  function stripHeaders(lines) {
    if (!lines.length) return lines;
    const firstColumns = lines[0].split("\t");
    if (isHeaderRow(firstColumns)) return lines.slice(1);

    if (lines.length >= 4) {
      const possibleHeaders = lines.slice(0, 4).map(normalizeHeader);
      if (HEADER_NAMES.every((name, index) => possibleHeaders[index] === name)) return lines.slice(4);
    }
    return lines;
  }

  function parseQuantity(rawValue) {
    const value = rawValue.trim();
    const match = value.match(/^(\d+)(?:\s+[^\d].*)?$/u);
    if (!match) return null;
    const quantity = Number(match[1]);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
  }

  function parseBatch(text, existingIds) {
    const knownIds = new Set(Array.from(existingIds || [], String));
    const nonEmptyLines = String(text || "")
      .replace(/^\uFEFF/, "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .filter((line) => line.trim() !== "");
    const lines = stripHeaders(nonEmptyLines);
    const errors = [];
    const products = [];
    const batchIds = new Set();

    if (!lines.length) {
      return { products: [], errors: ["No se encontraron filas de productos para procesar."] };
    }

    lines.forEach((line, index) => {
      const rowNumber = index + 1;
      const columns = line.split("\t");
      if (columns.length !== 4) {
        errors.push(`Fila ${rowNumber}: se esperaban 4 columnas y se encontraron ${columns.length}.`);
        return;
      }

      const [rawId, rawDescription, rawQuantity, rawDate] = columns.map((value) => value.trim());
      if (!/^\d+$/.test(rawId)) {
        errors.push(`Fila ${rowNumber}: “${rawId || "vacío"}” no es un Id Producto válido.`);
      }
      if (!rawDescription) {
        errors.push(`Fila ${rowNumber}: la descripción está vacía.`);
      }
      const quantity = parseQuantity(rawQuantity);
      if (quantity === null) {
        errors.push(`Fila ${rowNumber}: “${rawQuantity || "vacío"}” no es una cantidad positiva válida.`);
      }
      if (rawId && (batchIds.has(rawId) || knownIds.has(rawId))) {
        errors.push(`Fila ${rowNumber}: el producto ${rawId} está duplicado.`);
      }
      batchIds.add(rawId);

      products.push({
        id: rawId,
        description: rawDescription,
        originalQuantity: rawQuantity,
        quantity,
        date: rawDate,
        selected: true,
      });
    });

    return errors.length ? { products: [], errors } : { products, errors: [] };
  }

  function generateCsv(products) {
    const rows = products
      .filter((product) => product.selected)
      .map((product) => `${product.id};${product.quantity};0`);
    return ["Id_Producto;Cantidad;Precio", ...rows].join("\r\n") + "\r\n";
  }

  return { parseBatch, parseQuantity, generateCsv };
});
