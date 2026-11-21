import { useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import {
  downloadDlgaTemplate,
  extractDlgaError,
  submitDlgaForm,
  getDlgaPublicUrl,
  getFilenameFromResponse,
  postDlgaForm,
  postDlgaJson,
} from "../../services/dlgaCertificados.js";
import { signPdfDocuments } from "../../services/autofirma.js";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faDownload, faEnvelope, faEnvelopeOpenText, faFileCsv, faFilePdf, faPaperPlane, faSignature, faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "../comun/PageHeader.jsx";
import "../../styles/delegacion-certificados-style.css";

const DEFAULT_SENDER = "delegacion_etsii@us.es";
const DEFAULT_SMTP_HOST = "smtp.office365.com";
const DEFAULT_SMTP_PORT = "587";

const fallbackNames = {
  generar: "certificados_delegados.zip",
  "preparar-correos": "correos_certificados.zip",
  "firmar-lote": "certificados_delegados_firmados.zip",
  plantilla: "plantilla_certificados.csv",
};

const normalizeCsvHeader = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/^"|"$/g, "")
    .trim()
    .toLowerCase();

// Bloque numerado de la página. Se define fuera del componente para que los campos no pierdan el foco.
const Paso = ({ n, titulo, ayuda, children, aside }) => (
  <section className="cert-step" aria-labelledby={`cert-step-${n}`}>
    <div className="cert-step-head">
      <span className="cert-step-number" aria-hidden="true">{n}</span>
      <div className="cert-step-copy"><h2 id={`cert-step-${n}`}>{titulo}</h2><p>{ayuda}</p></div>
      {aside}
    </div>
    <div className="cert-step-body">{children}</div>
  </section>
);
Paso.propTypes = { n: PropTypes.number, titulo: PropTypes.string, ayuda: PropTypes.string, children: PropTypes.node, aside: PropTypes.node };

export default function CertificadosDelegacion() {
  const { t } = useTranslation();
  const formRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [firmante, setFirmante] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState(() => new Date().toISOString().slice(0, 10));
  const [enviarEmail, setEnviarEmail] = useState(false);
  const [remitenteEmail, setRemitenteEmail] = useState(DEFAULT_SENDER);
  const [passwordEmail, setPasswordEmail] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  const dlgaPublicUrl = useMemo(() => getDlgaPublicUrl(), []);
  const isLoading = Boolean(loadingAction);

  const validateForm = () => {
    if (!archivo) {
      toast.warning(t("delegation.certificates.errors.select_csv"));
      return false;
    }
    if (!firmante.trim()) {
      toast.warning(t("delegation.certificates.errors.signer_required"));
      return false;
    }
    return true;
  };

  const buildFormData = (extraValues = {}) => {
    const formData = new FormData(formRef.current);
    Object.entries(extraValues).forEach(([name, value]) => {
      formData.set(name, value);
    });
    return formData;
  };

  const downloadResponse = async (response, fallbackName) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      throw new Error(t("delegation.certificates.errors.invalid_download"));
    }

    const blob = await response.blob();
    const filename = getFilenameFromResponse(response, fallbackName);
    saveAs(blob, filename);
  };

  const handleDownloadAction = async (endpoint) => {
    if (!validateForm()) return;

    setLoadingAction(endpoint);
    try {
      const response = await postDlgaForm(endpoint, buildFormData());
      if (!response.ok) {
        throw new Error(await extractDlgaError(response));
      }

      await downloadResponse(response, fallbackNames[endpoint]);
      toast.success(t("delegation.certificates.messages.download_ready"));
    } catch (error) {
      toast.error(error.message || t("delegation.certificates.errors.operation_failed"));
    } finally {
      setLoadingAction("");
    }
  };

  const handleTemplateDownload = async () => {
    setLoadingAction("plantilla");
    try {
      const response = await downloadDlgaTemplate();
      if (!response.ok) {
        throw new Error(await extractDlgaError(response));
      }
      await downloadResponse(response, fallbackNames.plantilla);
    } catch (error) {
      toast.error(error.message || t("delegation.certificates.errors.template_failed"));
    } finally {
      setLoadingAction("");
    }
  };

  const validateTelegramCsv = async () => {
    try {
      const content = await archivo.text();
      const headerLine = content.split(/\r?\n/).find((line) => line.trim());
      const headers = (headerLine || "").split(/[;,]/).map(normalizeCsvHeader);
      if (!headers.includes("uvus")) {
        toast.error(t("delegation.certificates.errors.telegram_missing_uvus"));
        return false;
      }
      return true;
    } catch {
      toast.error(t("delegation.certificates.errors.telegram_failed"));
      return false;
    }
  };

  const handleTelegramAction = async () => {
    if (!validateForm()) return;
    const canSendTelegram = await validateTelegramCsv();
    if (!canSendTelegram) return;

    setLoadingAction("telegram");
    try {
      const payloadResponse = await postDlgaForm(
        "payloadFirmaLote",
        buildFormData({ email_transport: "telegram" }),
      );
      if (!payloadResponse.ok) {
        throw new Error(await extractDlgaError(payloadResponse));
      }

      const payload = await payloadResponse.json();
      const signedDocuments = await signPdfDocuments(payload.result?.documents);
      let sent = 0;
      let failed = 0;

      for (const document of signedDocuments) {
        try {
          const response = await postDlgaJson("enviarCertificadoFirmadoTelegram", {
            uvus: document.uvus,
            name: document.name,
            delegateType: document.delegateType,
            filename: document.filename,
            pdfBase64: document.pdfBase64,
          });
          if (response.ok) {
            sent += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        }
      }

      if (failed === 0) {
        toast.success(t("delegation.certificates.messages.telegram_sent", { count: sent }));
      } else if (sent > 0) {
        toast.warning(
          t("delegation.certificates.messages.telegram_partial", {
            sent,
            failed,
          }),
        );
      } else {
        toast.error(t("delegation.certificates.errors.telegram_failed"));
      }
    } catch (error) {
      toast.error(error.message || t("delegation.certificates.errors.telegram_failed"));
    } finally {
      setLoadingAction("");
    }
  };

  const submitExternalAction = async (endpoint, extraValues = {}) => {
    if (!validateForm()) return;
    setLoadingAction(endpoint);
    try {
      await submitDlgaForm(formRef.current, endpoint, extraValues);
    } catch (error) {
      toast.error(error.message || t('delegation.certificates.errors.operation_failed'));
    } finally {
      setPasswordEmail('');
      setLoadingAction('');
    }
  };

  const openMicrosoftLogin = () => {
    window.open(`${dlgaPublicUrl}/auth/microsoft/login`, "_blank", "noopener,noreferrer");
  };

  const cargando = (accion, texto, textoCargando) => (loadingAction === accion ? textoCargando : texto);

  return (
    <div className="workspace-page cert-page">
      <PageHeader
        eyebrow={t("delegation.certificates.kicker")}
        title={t("delegation.certificates.title")}
        description={t("delegation.certificates.intro")}
        actions={<img src="/assets/dlga/dlga.png" alt="DLGA" className="cert-dlga-logo" />}
      />

      <form ref={formRef} className="cert-form" onSubmit={(event) => event.preventDefault()} aria-busy={isLoading}>
        <input type="hidden" name="smtp_host" value={DEFAULT_SMTP_HOST} />
        <input type="hidden" name="smtp_port" value={DEFAULT_SMTP_PORT} />

        <Paso n={1} titulo={t("delegation.certificates.sections.batch")} ayuda={t("delegation.certificates.step_batch_help")}
          aside={<button type="button" className="btn btn-secondary btn-sm" onClick={handleTemplateDownload} disabled={isLoading}>
            <FontAwesomeIcon icon={faDownload} /> {t("delegation.certificates.buttons.csv_template")}</button>}>
          <div className="cert-grid">
            <label className="cert-file cert-field-wide">
              <input name="archivo" type="file" accept=".csv,text/csv" onChange={(event) => setArchivo(event.target.files?.[0] || null)} required />
              <FontAwesomeIcon icon={archivo ? faCircleCheck : faFileCsv} aria-hidden="true" />
              <span><strong>{archivo ? archivo.name : t("delegation.certificates.file_choose")}</strong>
                <small>{archivo ? t("delegation.certificates.file_change") : t("delegation.certificates.file_hint")}</small></span>
            </label>
            <label className="cert-field">
              <span>{t("delegation.certificates.fields.signer")}</span>
              <input name="firmante" type="text" value={firmante} onChange={(event) => setFirmante(event.target.value)}
                placeholder={t("delegation.certificates.placeholders.signer")} required />
            </label>
            <label className="cert-field">
              <span>{t("delegation.certificates.fields.request_date")}</span>
              <input name="fecha_solicitud" type="date" value={fechaSolicitud} onChange={(event) => setFechaSolicitud(event.target.value)} />
            </label>
          </div>
        </Paso>

        <Paso n={2} titulo={t("delegation.certificates.step_generate")} ayuda={t("delegation.certificates.step_generate_help")}>
          <div className="cert-actions">
            <button type="button" className="btn btn-primary" onClick={() => handleDownloadAction("generar")} disabled={isLoading}>
              <FontAwesomeIcon icon={faFilePdf} /> {cargando("generar", t("delegation.certificates.buttons.generate_pdfs"), t("delegation.certificates.buttons.generating"))}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => handleDownloadAction("preparar-correos")} disabled={isLoading}>
              <FontAwesomeIcon icon={faEnvelopeOpenText} /> {t("delegation.certificates.buttons.outlook_emails")}
            </button>
          </div>
        </Paso>

        <Paso n={3} titulo={t("delegation.certificates.step_sign")} ayuda={t("delegation.certificates.step_sign_help")}>
          <div className="cert-actions">
            <button type="button" className="btn btn-primary" onClick={() => handleDownloadAction("firmar-lote")} disabled={isLoading}>
              <FontAwesomeIcon icon={faSignature} /> {cargando("firmar-lote", t("delegation.certificates.buttons.sign_batch"), t("delegation.certificates.buttons.signing_batch"))}
            </button>
          </div>
        </Paso>

        <Paso n={4} titulo={t("delegation.certificates.step_send")} ayuda={t("delegation.certificates.step_send_help")}>
          <div className="cert-channels">
            <article className="cert-channel">
              <h3><FontAwesomeIcon icon={faPaperPlane} /> Telegram</h3>
              <p>{t("delegation.certificates.telegram_hint")}</p>
              <button type="button" className="btn btn-primary" onClick={handleTelegramAction} disabled={isLoading}>
                {cargando("telegram", t("delegation.certificates.buttons.generate_and_send_telegram"), t("delegation.certificates.buttons.sending_telegram"))}
              </button>
            </article>
            <article className="cert-channel">
              <h3><FontAwesomeIcon icon={faCloudArrowUp} /> {t("delegation.certificates.sections.graph")}</h3>
              <p>{t("delegation.certificates.graph_hint")}</p>
              <div className="cert-actions">
                <button type="button" className="btn btn-secondary" onClick={openMicrosoftLogin} disabled={isLoading}>{t("delegation.certificates.buttons.connect_microsoft")}</button>
                <button type="button" className="btn btn-secondary" onClick={() => submitExternalAction("enviar-graph")} disabled={isLoading}>{t("delegation.certificates.buttons.send_graph")}</button>
                <button type="button" className="btn btn-primary" onClick={() => submitExternalAction("firmar-lote", { email_transport: "graph" })} disabled={isLoading}>{t("delegation.certificates.buttons.sign_and_send_graph")}</button>
              </div>
            </article>
            <article className="cert-channel cert-channel-wide">
              <h3><FontAwesomeIcon icon={faEnvelope} /> {t("delegation.certificates.sections.email")}</h3>
              <p>{t("delegation.certificates.smtp_hint")}</p>
              <div className="cert-grid">
                <label className="cert-field">
                  <span>{t("delegation.certificates.fields.sender")}</span>
                  <input name="remitente_email" type="email" value={remitenteEmail} onChange={(event) => setRemitenteEmail(event.target.value)} />
                </label>
                <label className="cert-field">
                  <span>{t("delegation.certificates.fields.smtp_password")}</span>
                  <input name="password_email" type="password" value={passwordEmail} onChange={(event) => setPasswordEmail(event.target.value)} autoComplete="current-password" />
                </label>
                <label className="cert-check cert-field-wide">
                  <input name="enviar_email" type="checkbox" value="1" checked={enviarEmail} onChange={(event) => setEnviarEmail(event.target.checked)} />
                  {t("delegation.certificates.fields.send_on_generate")}
                </label>
              </div>
            </article>
          </div>
        </Paso>
      </form>
    </div>
  );
}
