import { describe, expect, it } from "vitest";
import { detectarTipoArchivo } from "./tipoArchivo.js";

describe("detectarTipoArchivo", () => {
  it("detecta un PNG aunque el identificador no tenga extension", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    expect(detectarTipoArchivo(png.buffer, "application/octet-stream", "uuid-123"))
      .toBe("image/png");
  });

  it("detecta un PDF por su firma", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7");

    expect(detectarTipoArchivo(pdf.buffer, "application/octet-stream", "uuid-456"))
      .toBe("application/pdf");
  });

  it("no confía en un Content-Type sin firma de archivo", () => {
    const contenido = new Uint8Array([0x00]);

    expect(detectarTipoArchivo(contenido.buffer, "image/png; charset=binary", "uuid-789"))
      .toBe("application/octet-stream");
  });

  it.each(['adjunto.pdf', 'adjunto.png', 'sin-extension'])("rechaza HTML disfrazado de %s", (filename) => {
    const html = new TextEncoder().encode('<html><script>alert(1)</script></html>');
    expect(detectarTipoArchivo(html.buffer, 'application/pdf', filename)).toBe('application/octet-stream');
  });
});
