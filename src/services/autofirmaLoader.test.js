import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_AUTOFIRMA_SCRIPT_URL', '');
  vi.stubEnv('VITE_AUTOFIRMA_SCRIPT_INTEGRITY', '');
  delete window.AutoScript;
});
afterEach(() => {
  vi.unstubAllEnvs();
  delete window.AutoScript;
  document.querySelectorAll('script').forEach(script => script.remove());
});

describe('carga segura de AutoFirma', () => {
  it('fija la integridad y la versión del script predeterminado', async () => {
    const { loadAutoFirma } = await import('./autofirma.js');
    const loaded = loadAutoFirma();
    const script = document.querySelector('script');
    expect(script.integrity).toMatch(/^sha384-/);
    expect(script.src).toContain('@fe60ef3fdbae3c491e97c262a2179e2787b85776/');
    expect(script.crossOrigin).toBe('anonymous');
    window.AutoScript = { sign: vi.fn() };
    script.dispatchEvent(new Event('load'));
    expect(await loaded).toBe(window.AutoScript);
  });
  it('rechaza scripts personalizados sin SRI antes de insertarlos', async () => {
    vi.stubEnv('VITE_AUTOFIRMA_SCRIPT_URL', 'https://cdn.example.test/autoscript.js');
    const { loadAutoFirma } = await import('./autofirma.js');
    await expect(loadAutoFirma()).rejects.toThrow('SRI');
    expect(document.querySelector('script')).toBeNull();
  });
  it('permite reintentar después de un error de carga', async () => {
    const { loadAutoFirma } = await import('./autofirma.js');
    const failed = loadAutoFirma();
    document.querySelector('script').dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow();
    expect(document.querySelector('script')).toBeNull();
    const retry = loadAutoFirma();
    window.AutoScript = {};
    document.querySelector('script').dispatchEvent(new Event('load'));
    await expect(retry).resolves.toBe(window.AutoScript);
  });
});
