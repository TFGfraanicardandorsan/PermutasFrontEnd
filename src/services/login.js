import { getAPI, postAPI } from "../lib/methodAPIs.js";
import { clearCsrfToken } from "../lib/csrf.js";
import { apiUrl, assertTrustedApiUrl, authRedirectUrl } from '../lib/trustedUrls.js';

export const login = async () => {
    window.location.assign(assertTrustedApiUrl(apiUrl('/api/v1/autorizacion/saml/login')).href);
}

export const logout = async () => {
    const response = await postAPI("/api/v1/autorizacion/saml/logout");
    if (!response.err) {
        clearCsrfToken();
        sessionStorage.removeItem('permutasSeleccionadas');
        let destination = '/login';
        if (response.result?.redirectUrl) {
            try {
                destination = authRedirectUrl(response.result.redirectUrl);
            } catch {
                // A successful logout must never execute a server-supplied URL scheme.
                destination = '/login';
            }
        }
        window.location.assign(new URL(destination, window.location.origin).href);
    }
    return response;
}

export const obtenerSesion = async () => {
    return await getAPI("/api/v1/autorizacion/obtenerSesion")
}
