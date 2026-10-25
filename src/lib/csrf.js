import { apiUrl, assertTrustedApiUrl } from './trustedUrls.js';

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_HEADER_NAME = "X-CSRF-Token";

let csrfToken;
let csrfTokenPromise;
let sessionGeneration = 0;

export const clearCsrfToken = () => {
  sessionGeneration += 1;
  csrfToken = undefined;
  csrfTokenPromise = undefined;
};

export const getCsrfToken = async ({ forceRefresh = false } = {}) => {
  if (forceRefresh) clearCsrfToken();
  if (csrfToken) return csrfToken;
  if (csrfTokenPromise) return csrfTokenPromise;

  const generation = sessionGeneration;
  const pending = fetch(assertTrustedApiUrl(apiUrl('/api/v1/csrf-token')).href, {
    method: "GET",
    credentials: "include",
    redirect: "error",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`No se pudo obtener el token CSRF (${response.status}).`);
      }
      const payload = await response.json();
      if (typeof payload?.csrfToken !== "string" || !payload.csrfToken) {
        throw new Error("El servidor no devolvió un token CSRF válido.");
      }
      if (generation !== sessionGeneration) {
        throw new Error('La sesión ha cambiado. Vuelve a intentar la operación.');
      }
      csrfToken = payload.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      if (csrfTokenPromise === pending) csrfTokenPromise = undefined;
    });
  csrfTokenPromise = pending;
  return csrfTokenPromise;
};

export const csrfFetch = async (input, init = {}) => {
  const validatedUrl = assertTrustedApiUrl(input);
  // Fetch the URL that was actually validated, independent of document.baseURI.
  const target = input instanceof Request ? input : validatedUrl.href;
  const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return fetch(target, { ...init, credentials: 'include', redirect: 'error', cache: 'no-store' });
  }

  let token = await getCsrfToken();
  let response = await fetchWithToken(target, init, token);

  if (response.status === 403 && response.headers.get("X-CSRF-Error") === "1") {
    token = await getCsrfToken({ forceRefresh: true });
    response = await fetchWithToken(target, init, token);
  }

  return response;
};

const fetchWithToken = (input, init, token) => {
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : {}));
  headers.set(CSRF_HEADER_NAME, token);
  return fetch(input instanceof Request ? input.clone() : input, {
    ...init,
    credentials: "include",
    redirect: "error",
    cache: "no-store",
    headers,
  });
};
