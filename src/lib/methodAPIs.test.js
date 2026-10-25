import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAPI, postAPI } from './methodAPIs.js';
import { clearCsrfToken } from './csrf.js';

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', '');
  vi.stubGlobal('fetch', vi.fn());
  clearCsrfToken();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); clearCsrfToken(); });

describe('respuestas de API', () => {
  it('no convierte un HTTP 401 con cuerpo manipulado en una sesión autenticada', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ isAuthenticated: true }) });
    expect(await getAPI('/api/v1/autorizacion/obtenerSesion')).toMatchObject({ err: true, status: 401 });
  });
  it('no navega ni propaga HTML recibido en lugar de JSON', async () => {
    fetch.mockResolvedValueOnce({ ok: true, headers: new Headers({ 'content-type': 'text/html' }), text: async () => '<script>secret</script>' });
    const response = await getAPI('/api/v1/autorizacion/obtenerSesion');
    expect(response.err).toBe(true);
    expect(JSON.stringify(response)).not.toContain('secret');
    expect(fetch.mock.calls[0][1].redirect).toBe('error');
  });
  it('conserva el método, cuerpo y CSRF sin necesitar VITE_API_URL', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'token' }) });
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) });
    expect(await postAPI('/api/v1/write', { value: 'ok' })).toMatchObject({ err: false });
    expect(fetch.mock.calls[1][0]).toBe(`${window.location.origin}/api/v1/write`);
    expect(fetch.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe('token');
  });
});
