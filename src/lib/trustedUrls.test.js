import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiUrl, assertTrustedApiUrl, authRedirectUrl, delegatesApiBaseUrl, secureUrl } from './trustedUrls.js';

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', '');
  vi.stubEnv('VITE_DLGA_API_URL', '');
  vi.stubEnv('VITE_AUTH_REDIRECT_ORIGINS', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('destinos de API y autenticación', () => {
  it('usa rutas relativas sin variables y respeta el backend configurado', () => {
    expect(apiUrl('/api/v1/csrf-token')).toBe('/api/v1/csrf-token');
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/');
    expect(apiUrl('/api/v1/csrf-token')).toBe('https://api.example.test/api/v1/csrf-token');
    expect(delegatesApiBaseUrl()).toBe('https://api.example.test/api/v1/delegados');
  });
  it.each(['javascript:alert(1)', 'data:text/html,x', 'https://user:password@example.test', 'http://example.test'])('rechaza %s', value => {
    expect(() => secureUrl(value)).toThrow();
  });
  it('solo permite HTTP local durante desarrollo', () => {
    expect(secureUrl('http://127.0.0.1:3000').hostname).toBe('127.0.0.1');
    vi.stubEnv('DEV', false);
    expect(() => secureUrl('http://127.0.0.1:3000')).toThrow();
  });
  it.each(['https://evil.test/api/v1/write', '//evil.test/api/v1/write', '/api/v1/../../outside', '/api/v10/write'])('bloquea el destino %s', value => {
    expect(() => assertTrustedApiUrl(value)).toThrow();
  });
  it('admite el origen IdP exacto únicamente al configurarlo', () => {
    expect(() => authRedirectUrl('https://idp.example.test/logout')).toThrow();
    vi.stubEnv('VITE_AUTH_REDIRECT_ORIGINS', 'https://idp.example.test');
    expect(authRedirectUrl('https://idp.example.test/logout')).toBe('https://idp.example.test/logout');
    expect(() => authRedirectUrl('https://idp.example.test.evil.test/logout')).toThrow();
    expect(() => authRedirectUrl('https://idp.example.test@evil.test/logout')).toThrow();
  });
  it('no permite paths o query en el origen de API', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/api/v1');
    expect(() => apiUrl('/api/v1/write')).toThrow();
  });
});
