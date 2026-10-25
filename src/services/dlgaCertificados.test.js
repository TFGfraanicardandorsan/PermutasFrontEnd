import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCsrfToken } from '../lib/csrf.js';
import { getDlgaEndpointUrl, postDlgaForm, submitDlgaForm } from './dlgaCertificados.js';

beforeEach(() => {
  clearCsrfToken();
  vi.stubEnv('VITE_API_URL', '');
  vi.stubEnv('VITE_DLGA_API_URL', '');
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  clearCsrfToken();
});

describe('formularios de certificados', () => {
  it('envía el token en el formulario nativo y restaura sus atributos', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'session-token' }) });
    const form = document.createElement('form');
    form.setAttribute('action', '/original');
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function () {
      const data = new FormData(this);
      expect(data.get('_csrf')).toBe('session-token');
      expect(data.get('email_transport')).toBe('graph');
      expect(this.action).toMatch(/\/api\/v1\/delegados\/firmar-lote$/);
      expect(this.method).toBe('post');
      expect(this.getAttribute('rel')).toBe('noopener noreferrer');
    });
    await submitDlgaForm(form, 'firmar-lote', { email_transport: 'graph', _csrf: 'untrusted' });
    expect(submit).toHaveBeenCalledOnce();
    expect(form.getAttribute('action')).toBe('/original');
    expect(form.hasAttribute('target')).toBe(false);
    expect(form.querySelector('input')).toBeNull();
  });
  it('no envía datos si no puede obtener el token de sesión', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    await expect(submitDlgaForm(document.createElement('form'), 'enviar-graph')).rejects.toThrow();
    expect(submit).not.toHaveBeenCalled();
  });
  it('protege las operaciones fetch y rechaza endpoints manipulados', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'session-token' }) }).mockResolvedValueOnce({ ok: true });
    await postDlgaForm('generar', new FormData());
    expect(fetch.mock.calls[1][0]).toBe(`${window.location.origin}/api/v1/delegados/generarCertificados`);
    expect(fetch.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe('session-token');
    expect(() => getDlgaEndpointUrl('../otro')).toThrow();
  });
});
