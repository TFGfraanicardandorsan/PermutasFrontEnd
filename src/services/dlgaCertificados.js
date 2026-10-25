import { csrfFetch, getCsrfToken } from "../lib/csrf.js";
import { assertTrustedApiUrl, delegatesApiBaseUrl, secureUrl } from '../lib/trustedUrls.js';

const DEFAULT_DLGA_LOCAL_PUBLIC_URL = "http://127.0.0.1:8001";
const ENDPOINT_PATHS = {
  generar: "generarCertificados",
  "preparar-correos": "prepararCorreos",
};

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

export const getDlgaApiBaseUrl = delegatesApiBaseUrl;

export const getDlgaPublicUrl = () => {
  const configuredUrl = import.meta.env.VITE_DLGA_PUBLIC_URL?.trim();
  if (configuredUrl) {
    const url = secureUrl(configuredUrl);
    if (url.search || url.hash) throw new Error('URL pública de certificados no válida.');
    return trimTrailingSlash(url.href);
  }

  return import.meta.env.DEV ? DEFAULT_DLGA_LOCAL_PUBLIC_URL : "";
};

export const postDlgaForm = async (endpoint, formData) => {
  return csrfFetch(getDlgaEndpointUrl(endpoint), {
    method: "POST",
    body: formData,
    credentials: "include",
  });
};

export const postDlgaJson = async (endpoint, payload) => {
  return csrfFetch(getDlgaEndpointUrl(endpoint), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });
};

export const getDlgaEndpointUrl = (endpoint) => {
  const cleanEndpoint = endpoint.replace(/^\/+/, "");
  if (!/^[a-zA-Z0-9-]+$/.test(cleanEndpoint)) throw new Error('Endpoint de certificados no válido.');
  const apiEndpoint = ENDPOINT_PATHS[cleanEndpoint] || cleanEndpoint;
  const url = `${getDlgaApiBaseUrl()}/${apiEndpoint}`;
  return assertTrustedApiUrl(url).href;
};

export const downloadDlgaTemplate = async () =>
  csrfFetch(getDlgaEndpointUrl('plantillaCSV'), {
    method: "GET",
    credentials: "include",
  });

// Native form navigation cannot set X-CSRF-Token. The backend must validate
// the same session token from the multipart _csrf field before side effects.
export const submitDlgaForm = async (form, endpoint, extraValues = {}) => {
  const action = getDlgaEndpointUrl(endpoint);
  const token = await getCsrfToken();
  const previous = ['action', 'target', 'method', 'enctype', 'rel'].map(name => [name, form.getAttribute(name)]);
  const inputs = Object.entries({ ...extraValues, _csrf: token }).map(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
    return input;
  });
  try {
    form.action = action;
    form.target = '_blank';
    form.method = 'post';
    form.enctype = 'multipart/form-data';
    form.setAttribute('rel', 'noopener noreferrer');
    HTMLFormElement.prototype.submit.call(form);
  } finally {
    inputs.forEach(input => input.remove());
    previous.forEach(([name, value]) => value === null ? form.removeAttribute(name) : form.setAttribute(name, value));
  }
};

export const getFilenameFromResponse = (response, fallback) => {
  const disposition = response.headers.get("content-disposition") || "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  }

  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (filenameMatch?.[1]) {
    return filenameMatch[1];
  }

  return fallback;
};

export const extractDlgaError = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("application/json")) {
    try {
      const payload = JSON.parse(text);
      if (Array.isArray(payload.errors)) return payload.errors.join(" ");
      if (Array.isArray(payload.errores)) return payload.errores.join(" ");
      if (payload.message) return payload.message;
      if (payload.errmsg) return payload.errmsg;
      if (payload.error) return payload.error;
    } catch {
      return text;
    }
  }

  const cleanText = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanText || `DLGA ha respondido con estado ${response.status}.`;
};
