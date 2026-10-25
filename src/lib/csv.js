// Quoting alone does not prevent formulas when opening a CSV in Excel/Calc.
export const escapeCsvCell = (value) => {
  const text = String(value ?? '');
  // Control characters before a formula must also be neutralized.
  // eslint-disable-next-line no-control-regex
  const formula = /^[\s\u0000-\u001f\ufeff]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text);
  return `"${(formula ? `'${text}` : text).replaceAll('"', '""')}"`;
};

export const buildObjectCsv = (rows) => {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  return [columns.map(escapeCsvCell).join(','), ...rows.map(row =>
    columns.map(key => escapeCsvCell(row[key])).join(','))].join('\r\n');
};
