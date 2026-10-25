import { describe, expect, it } from 'vitest';
import { buildObjectCsv, escapeCsvCell } from './csv.js';

describe('exportación CSV segura', () => {
  it.each(['=1+1', '+1+1', '-1+1', '@SUM(A1)', '  =1+1', '\t=1+1', '\r=1+1', '\n=1+1', '\ufeff=1+1'])(
    'neutraliza la fórmula %j', value => expect(escapeCsvCell(value)).toBe(`"'${value}"`),
  );
  it('escapa comillas, delimitadores y saltos sin crear celdas adicionales', () => {
    expect(buildObjectCsv([{ nombre: 'Ana",=1+1,\nPérez', uvus: '=1+1' }])).toBe(
      '"nombre","uvus"\r\n"Ana"",=1+1,\nPérez","\'=1+1"',
    );
  });
});
