// These settings are public build-time configuration, never secrets.
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export const secureUrl = (value, base = window.location.origin) => {
  const url = new URL(value, base);
  const localHttp = import.meta.env.DEV && url.protocol === 'http:' && localHosts.has(url.hostname);
  if ((url.protocol !== 'https:' && !localHttp) || url.username || url.password) {
    throw new Error('La URL debe usar HTTPS y no contener credenciales.');
  }
  return url;
};

export const apiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_API_URL || '').trim();
  if (!configured) return '';
  const url = secureUrl(configured);
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_API_URL debe contener solo el origen de la API.');
  }
  return url.origin;
};

export const apiUrl = (path) => {
  if (typeof path !== 'string' || !path.startsWith('/api/v1/') || /[\\\r\n]/.test(path)) {
    throw new Error('Ruta de API no permitida.');
  }
  const result = `${apiBaseUrl()}${path}`;
  assertTrustedApiUrl(result);
  return result;
};

export const delegatesApiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_DLGA_API_URL || '').trim().replace(/\/+$/, '');
  // Route the legacy proxy setting through the application's authenticated API.
  const base = !configured || configured === '/dlga-api'
    ? apiUrl('/api/v1/delegados') : configured;
  const url = secureUrl(base);
  if (url.search || url.hash) throw new Error('Base de certificados no válida.');
  return base;
};

export const assertTrustedApiUrl = (input) => {
  const value = input instanceof Request ? input.url : String(input);
  const url = secureUrl(value);
  const main = secureUrl(`${apiBaseUrl() || window.location.origin}/api/v1/`);
  const configured = String(import.meta.env.VITE_DLGA_API_URL || '').trim();
  const bases = [main];
  if (configured && configured.replace(/\/+$/, '') !== '/dlga-api') {
    bases.push(secureUrl(`${configured.replace(/\/+$/, '')}/`));
  }
  if (url.hash || !bases.some(base => url.origin === base.origin && url.pathname.startsWith(base.pathname))) {
    throw new Error('Destino de API no permitido.');
  }
  return url;
};

export const authRedirectUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Redirección vacía.');
  const url = secureUrl(value);
  const origins = new Set([window.location.origin, apiBaseUrl() || window.location.origin]);
  for (const configured of String(import.meta.env.VITE_AUTH_REDIRECT_ORIGINS || '').split(',')) {
    if (!configured.trim()) continue;
    const allowed = secureUrl(configured.trim());
    if (allowed.pathname !== '/' || allowed.search || allowed.hash) throw new Error('Origen SAML no válido.');
    origins.add(allowed.origin);
  }
  if (!origins.has(url.origin)) throw new Error('Destino de autenticación no permitido.');
  return url.href;
};
