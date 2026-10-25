# Corrección de seguridad y despliegue

Revisión del 24 de octubre de 2026. Los cambios del frontend están en este
repositorio; **no se han desplegado ni modificado el servidor o el backend**.

Una petición HEAD a `https://permutas.eii.us.es` respondió con
`Apache/2.4.62 (Rocky Linux) OpenSSL/3.2.2` y HSTS. Los pasos siguientes están
adaptados a Apache/Rocky, pero confirma la instalación con los primeros comandos:
una cabecera no demuestra la topología interna ni el estado de los parches de RPM.

## 1. Inventario y copia de seguridad

Ejecuta estos comandos en el servidor. No publiques su salida si contiene rutas,
usuarios o parámetros internos.

```bash
cat /etc/os-release
sudo httpd -v
sudo httpd -S
sudo httpd -M
sudo ss -lntp
sudo systemctl status httpd --no-pager
rpm -q httpd mod_ssl openssl nodejs
sudo dnf updateinfo list --security
sudo install -d -m 0700 /var/backups/permutas-security
sudo tar -C /etc -czf "/var/backups/permutas-security/httpd-$(date +%Y%m%d-%H%M%S).tgz" httpd
```

`httpd -S` identifica el fichero del VirtualHost HTTPS correcto. Comprueba su
`DocumentRoot` y los `ProxyPass`: no deben publicar el repositorio, `node_modules`,
Vite/Vitest ni un servicio de certificados que eluda los permisos del backend.
Solo `dist/` debe ser público. Conserva también una copia de la configuración y
los datos del backend mediante el procedimiento de respaldo de ese servicio.

## 2. Actualizar paquetes del sistema

En una ventana de mantenimiento:

```bash
sudo dnf upgrade --refresh --assumeno
sudo dnf upgrade --refresh
sudo httpd -t
sudo systemctl restart httpd
sudo systemctl --failed
```

La primera orden muestra la transacción sin aplicarla; la segunda pide confirmación
e instala las actualizaciones de los repositorios configurados. Reinicia también
los procesos de la aplicación que sigan usando bibliotecas antiguas. Si se
actualiza el kernel, programa el reinicio del sistema. Una versión visible de
Apache/OpenSSL, por sí sola, no permite saber si faltan parches: Rocky distribuye
correcciones sobre versiones estables.

## 3. Compilar y publicar el frontend corregido

Transfiere los cambios revisados, **incluido `package-lock.json`**, al checkout del
servidor o al entorno de CI. Usa una versión de Node 22 o 24 con los parches
vigentes. Las herramientas de compilación no deben estar expuestas por HTTP.

Desde ese checkout, como usuario de despliegue, sin `sudo npm`:

```bash
npm ci --ignore-scripts
npm audit --audit-level=low
npm run test:run
npm run lint
npm run build
```

Ejecuta cada paso solo si el anterior termina correctamente. `npm ci` conserva las
versiones verificadas del lockfile. No uses `npm audit fix --force` en producción.
La instalación limpia se verificó con npm 10; para **regenerar** el lockfile hizo
falta npm 11 por un error de resolución de npm 10.

Antes de compilar, revisa `.env.production` o el entorno del proceso:

- `VITE_API_URL` vacío para API y frontend en el mismo origen; en otro caso,
  solamente el origen HTTPS, sin `/api/v1`.
- `VITE_DLGA_API_URL` vacío utiliza la API autenticada de certificados. No apuntes
  al servicio interno directamente. Las configuraciones separadas requieren
  sesiones, CORS, permisos y CSRF compatibles.
- `VITE_AUTH_REDIRECT_ORIGINS`: orígenes HTTPS exactos del IdP que pueda devolver el
  logout SAML, separados por comas. Se obtienen de la configuración real de SAML.
  Si falta un origen, el frontend vuelve a `/login` tras el logout local y no
  completará el cierre de sesión en ese IdP.
- Un `VITE_AUTOFIRMA_SCRIPT_URL` personalizado necesita
  `VITE_AUTOFIRMA_SCRIPT_INTEGRITY` con el SHA-384/SHA-512 verificado del fichero.
  Dejando ambos vacíos se conserva la versión con integridad fijada del proyecto.
- Todas las variables `VITE_*` son públicas. No deben contener secretos.

Publicación sobre un **DocumentRoot dedicado a los estáticos de esta aplicación**
(si utilizas releases/CI, conserva tu mecanismo habitual):

```bash
# Introduce el DocumentRoot real que has comprobado en el VirtualHost.
read -r -p 'DocumentRoot de los estáticos de Permutas: ' PERMUTAS_ROOT
PERMUTAS_ROOT=$(realpath -e -- "$PERMUTAS_ROOT") || exit 1
test -f dist/index.html || exit 1
test -f "$PERMUTAS_ROOT/index.html" || exit 1
case "$PERMUTAS_ROOT" in /|/etc|/usr|/var|/var/www|/home) exit 1 ;; esac

sudo tar -C "$PERMUTAS_ROOT" -czf "/var/backups/permutas-security/frontend-$(date +%Y%m%d-%H%M%S).tgz" .
sudo rsync -rlt --exclude=index.html --chmod=D755,F644 dist/ "$PERMUTAS_ROOT/"
sudo install -m 0644 dist/index.html "$PERMUTAS_ROOT/.index.html.new"
sudo mv -- "$PERMUTAS_ROOT/.index.html.new" "$PERMUTAS_ROOT/index.html"
sudo restorecon -RF "$PERMUTAS_ROOT"
```

Los assets se publican antes que el HTML. No se borran los antiguos, para permitir
rollback y pestañas abiertas; depúralos después según vuestra retención. Si Apache
publica el repositorio entero, cambia primero `DocumentRoot`/`<Directory>` a un
directorio dedicado a `dist/`, manteniendo las rutas de API y el fallback de la SPA.

## 4. Cabeceras y restricciones de Apache

El fichero preparado es
[`deploy/apache/permutas-security.conf`](../deploy/apache/permutas-security.conf).
Conserva la configuración HSTS existente. El include añade TLS 1.2/1.3, `nosniff`,
protección contra enmarcado, control de referrer, ausencia de caché en `/api/` y
denegación de rutas sensibles. Requiere `headers_module`, `ssl_module` y
`authz_core_module`, comprobables con `httpd -M`.

Desde el checkout del proyecto:

```bash
sudo install -d -m 0755 /etc/httpd/permutas-includes
sudo install -m 0644 deploy/apache/permutas-security.conf /etc/httpd/permutas-includes/security.conf
sudo httpd -S
```

Abre **el fichero que `httpd -S` identifica para este dominio** con `sudoedit` y
añade dentro de su `<VirtualHost ...:443>`:

```apache
Include /etc/httpd/permutas-includes/security.conf
```

No copies el include a `conf.d` para que se aplique globalmente a otros sitios.
En el `<Directory>` de los estáticos utiliza `Options -Indexes` y evita permisos de
escritura para el usuario del servidor web. `ServerTokens Prod` puede configurarse
en el contexto global después de revisar el resto de VirtualHosts; reducir el
banner no sustituye las actualizaciones.

```bash
sudo httpd -t && sudo systemctl reload httpd
curl -sSI https://permutas.eii.us.es/
curl -sSI https://permutas.eii.us.es/login
curl -sSI https://permutas.eii.us.es/api/v1/autorizacion/obtenerSesion
```

Comprueba los encabezados también en errores 401/403/404. No se ha podido ejecutar
`httpd -t` aquí: esta estación Windows no contiene Apache ni el VirtualHost real.

La CSP mínima queda aplicada; la política completa de scripts/conexiones está en
**Report-Only** para probar SAML, AutoFirma, PDFs y Graph sin romperlos. No bloquea
scripts todavía. Revisa sus avisos en la consola del navegador, añade solo los
orígenes realmente necesarios (API/IdP si son separados) y cambia
`Content-Security-Policy-Report-Only` a `Content-Security-Policy` cuando todos los
flujos pasen. No resuelvas avisos añadiendo `*` o `unsafe-eval` indiscriminadamente.

## 5. Cerrar exposición de servicios internos

```bash
sudo ss -lntp
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --list-all-zones
```

Estos dos últimos comandos se aplican si utilizas firewalld. Vite (3033), preview
(4173), Vitest (51204 por defecto), el backend, DLGA (8001 en desarrollo) y la base
de datos no deben escuchar públicamente sin una necesidad documentada. Configura
los servicios internos para `127.0.0.1` o una red privada de contenedores y publica
solo el proxy autenticado. En Docker revisa también `ports:` y sus reglas propias;
una regla de firewalld no garantiza que un puerto publicado por Docker esté cerrado.

Si existe una regla explícita que abre un puerto de desarrollo, puedes retirarla
después de confirmar la zona activa y conservar acceso SSH:

```bash
read -r -p 'Zona activa de firewalld: ' PERMUTAS_ZONE
read -r -p 'Puerto de desarrollo expuesto (por ejemplo 3033): ' PERMUTAS_PORT
sudo firewall-cmd --zone="$PERMUTAS_ZONE" --query-port="$PERMUTAS_PORT/tcp"
sudo firewall-cmd --zone="$PERMUTAS_ZONE" --remove-port="$PERMUTAS_PORT/tcp"
sudo firewall-cmd --permanent --zone="$PERMUTAS_ZONE" --remove-port="$PERMUTAS_PORT/tcp"
```

No habilites un firewall nuevo ni cierres SSH de forma indiscriminada. Revisa
también servicios, rich rules, balanceadores y reglas de red que puedan permitir
los mismos puertos.

## 6. Cambios pendientes del backend: necesarios, no sustituibles por comandos

No se ha proporcionado el backend. Por tanto, lo siguiente es un contrato a
verificar/implementar, **no una afirmación de que esos fallos existan**:

1. **CSRF en certificados**: el frontend ya adjunta `_csrf` en el cuerpo multipart
   de `POST /api/v1/delegados/enviar-graph` y `firmar-lote`; el backend debe validar
   ese token de sesión antes de firmar, enviar correos o guardar ficheros. En fetch
   se usa `X-CSRF-Token`. No excluyas estas rutas del middleware CSRF. Limita el
   multipart al parsearlo y realiza la autorización antes de procesar el archivo.
2. El endpoint `/api/v1/csrf-token` debe entregar un token impredecible ligado a la
   sesión, con `Cache-Control: no-store`. Rotarlo al autenticar/cambiar sesión. El
   `403` con `X-CSRF-Error: 1` solo debe emitirse **antes de cualquier efecto**, ya
   que el cliente reintenta una vez. Las APIs devuelven JSON 401/403 y no redirigen
   peticiones fetch al IdP; el acceso SAML se inicia por navegación explícita.
3. **Permisos e IDOR**: comprobar sesión, rol y pertenencia en usuarios, incidencias,
   `uploads/:tipo/:id`, permutas, notificaciones y certificados. Ningún rol, UVUS,
   destinatario de Telegram o ID aportado por el navegador confiere autorización.
   Las rutas React solo ocultan pantallas. Rechazar asignación masiva de roles y
   propiedades administrativas por endpoints de estudiantes.
4. Cookies de sesión `HttpOnly; Secure`, alcance mínimo y caducidad razonable.
   Determinar `SameSite` con el binding SAML real: un ACS por POST entre sitios
   puede requerir `SameSite=None; Secure` para la cookie de correlación; no imponer
   `Strict` a todas las cookies. Regenerar sesión tras login, invalidarla al logout.
   En SAML validar firma, emisor, audiencia, destino, `InResponseTo`, caducidad y
   replay. En OAuth/Graph comprobar `state`, callback exacto y permisos mínimos.
5. Validar tipo real, tamaño, número y nombre de archivos; impedir traversal;
   guardar fuera del DocumentRoot; servirlos tras autorización y con MIME correcto.
   La detección de firma PDF/PNG del cliente no detecta malware ni sustituye al
   servidor. Añadir límites de cuerpo, filas CSV, PDFs por lote y tiempo de proceso.
6. En firma de documentos comprobar criptográficamente identidad, integridad y
   correspondencia con la permuta/certificado. El navegador puede modificar el
   PDF firmado y el destinatario antes de enviarlos.
7. SQL parametrizado, validación por esquema, protección contra SSRF en SMTP/URLs
   y cuotas para generación de certificados, correos, Telegram y búsquedas de
   parejas. No confiar en `smtp_host`/`smtp_port` del formulario. Mantener secretos
   SMTP/Graph/Telegram en el servidor, fuera de logs, bundles y repositorios.
8. CORS por origen exacto si es necesario; nunca reflejar cualquier `Origin` con
   credenciales. Validar Origin/Fetch Metadata además del token, contemplando las
   excepciones estrictas de los callbacks institucionales. Mantener copias de
   seguridad, auditoría y alertas sin registrar tokens ni contraseñas.

Pruebas de aceptación en un entorno de pruebas con cuentas propias: sin sesión
debe denegarse el acceso; un estudiante no puede invocar acciones administrativas
ni leer documentos de otro; una mutación sin token o con token ajeno debe fallar
sin efectos. Comprobar estos escenarios tanto en JSON como en multipart. Después,
verificar login/logout SAML, formularios Graph, AutoFirma, PDF y exportación CSV.
No ejecutar pruebas de envíos masivos contra destinatarios reales.

## Rollback

Antes de recargar, `httpd -t` debe pasar. Si la configuración produce problemas,
retira temporalmente el `Include`, valida y recarga de nuevo. Para el frontend,
restaura el respaldo de estáticos o el release anterior con el procedimiento de
despliegue. No reviertas parches del sistema con `dnf history undo` indiscriminado.

## Referencias

- [Apache: mod_headers](https://httpd.apache.org/docs/2.4/mod/mod_headers.html).
- [Apache: directivas del núcleo](https://httpd.apache.org/docs/2.4/mod/core.html).
- [Rocky Linux: actualización con dnf-automatic](https://docs.rockylinux.org/guides/security/dnf_automatic/).
- [OWASP: prevención CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
