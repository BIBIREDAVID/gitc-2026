// Escapes one CSV cell: quotes anything containing a comma/quote/newline,
// doubles internal quotes, and prefixes a leading =, +, -, or @ with a
// single quote so spreadsheet apps never interpret it as a formula.
function escapeCell(value) {
  let str = value === null || value === undefined ? '' : String(value);

  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function toCsv(rows, headers) {
  const lines = [headers.map((h) => escapeCell(h.label)).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(h.value(row))).join(','));
  }
  return lines.join('\r\n');
}

// UTF-8 BOM so Excel detects the encoding and doesn't mangle characters.
export function downloadCsv(csvContent, filename) {
  const blob = new Blob(['﻿', csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
