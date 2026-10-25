import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearCsrfToken,
  csrfFetch,
  getCsrfToken,
} from "./csrf.js";

const response = ({ status = 200, payload = {}, csrfError = false } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers(csrfError ? { "X-CSRF-Error": "1" } : {}),
  json: vi.fn().mockResolvedValue(payload),
});

describe("protección CSRF del cliente", () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_DLGA_API_URL', '');
    clearCsrfToken();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    clearCsrfToken();
  });

  it("obtiene y reutiliza un token de sesión", async () => {
    fetch.mockResolvedValueOnce(response({ payload: { csrfToken: "token-1" } }));

    await expect(getCsrfToken()).resolves.toBe("token-1");
    await expect(getCsrfToken()).resolves.toBe("token-1");

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe(`${window.location.origin}/api/v1/csrf-token`);
  });

  it("adjunta X-CSRF-Token en las peticiones POST", async () => {
    fetch
      .mockResolvedValueOnce(response({ payload: { csrfToken: "token-1" } }))
      .mockResolvedValueOnce(response());

    await csrfFetch("/api/v1/grupo/crearGrupoAsignatura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    const requestOptions = fetch.mock.calls[1][1];
    expect(requestOptions.credentials).toBe("include");
    expect(requestOptions.headers.get("X-CSRF-Token")).toBe("token-1");
    expect(requestOptions.headers.get("Content-Type")).toBe("application/json");
  });

  it("renueva el token una vez cuando el servidor indica error CSRF", async () => {
    fetch
      .mockResolvedValueOnce(response({ payload: { csrfToken: "token-antiguo" } }))
      .mockResolvedValueOnce(response({ status: 403, csrfError: true }))
      .mockResolvedValueOnce(response({ payload: { csrfToken: "token-nuevo" } }))
      .mockResolvedValueOnce(response());

    const result = await csrfFetch("/api/v1/incidencia/crearIncidencia", {
      method: "POST",
    });

    expect(result.ok).toBe(true);
    expect(fetch.mock.calls[3][1].headers.get("X-CSRF-Token")).toBe("token-nuevo");
  });

  it("no solicita token para métodos seguros", async () => {
    fetch.mockResolvedValueOnce(response());

    await csrfFetch("/api/v1/autorizacion/obtenerSesion", { method: "GET" });

    expect(fetch).toHaveBeenCalledOnce();
  });

  it('no obtiene ni filtra el token a un origen no autorizado', async () => {
    await expect(csrfFetch('https://evil.test/api/v1/write', { method: 'POST' })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('no deja que un elemento base cambie el destino validado', async () => {
    const base = document.createElement('base');
    base.href = 'https://evil.test/';
    document.head.appendChild(base);
    try {
      fetch.mockResolvedValueOnce(response({ payload: { csrfToken: 'token' } })).mockResolvedValueOnce(response());
      await csrfFetch('/api/v1/write', { method: 'POST' });
      expect(fetch.mock.calls[0][0]).toBe(`${window.location.origin}/api/v1/csrf-token`);
      expect(fetch.mock.calls[1][0]).toBe(`${window.location.origin}/api/v1/write`);
    } finally {
      base.remove();
    }
  });

  it('impide redirecciones y caché incluso si el llamante las solicita', async () => {
    fetch.mockResolvedValueOnce(response({ payload: { csrfToken: 'token' } })).mockResolvedValueOnce(response());
    await csrfFetch('/api/v1/write', { method: 'POST', redirect: 'follow', cache: 'force-cache' });
    for (const [, options] of fetch.mock.calls) {
      expect(options.redirect).toBe('error');
      expect(options.cache).toBe('no-store');
    }
  });

  it('protege también el método y las cabeceras de un Request', async () => {
    fetch.mockResolvedValueOnce(response({ payload: { csrfToken: 'token' } })).mockResolvedValueOnce(response());
    const request = new Request('http://localhost:3000/api/v1/write', { method: 'POST', headers: { 'X-Test': '1' }, body: 'data' });
    // jsdom's default origin is http://localhost:3000.
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
    await csrfFetch(request);
    expect(fetch.mock.calls[1][1].headers.get('X-CSRF-Token')).toBe('token');
    expect(fetch.mock.calls[1][1].headers.get('X-Test')).toBe('1');
  });

  it('descarta el token pendiente al cerrar o cambiar la sesión', async () => {
    let resolveOld;
    fetch.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const old = getCsrfToken();
    clearCsrfToken();
    fetch.mockResolvedValueOnce(response({ payload: { csrfToken: 'new' } }));
    expect(await getCsrfToken()).toBe('new');
    resolveOld(response({ payload: { csrfToken: 'old' } }));
    await expect(old).rejects.toThrow('sesión ha cambiado');
    expect(await getCsrfToken()).toBe('new');
  });

  it('no reintenta un 403 de permisos ni envía la mutación si falla el token', async () => {
    fetch.mockResolvedValueOnce(response({ status: 500 }));
    await expect(csrfFetch('/api/v1/write', { method: 'POST' })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockResolvedValueOnce(response({ payload: { csrfToken: 'token' } })).mockResolvedValueOnce(response({ status: 403 }));
    expect((await csrfFetch('/api/v1/write', { method: 'POST' })).status).toBe(403);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
