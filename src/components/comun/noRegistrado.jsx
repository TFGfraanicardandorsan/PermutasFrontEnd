import { useTranslation } from "react-i18next";
import PublicShell from "./PublicShell";

export default function RegistroTelegram() {
  const { t } = useTranslation();

  return (
    <PublicShell>
      <img src="/assets/logo-etsii-color.png" alt={t("common.logo_alt")} className="public-logo" />
      <h1>{t("registration.title")}</h1>
      <p>{t("registration.not_found")} {t("registration.instructions")}</p>
      <figure className="public-qr">
        <img src="/assets/telegram-qr.png" alt={t("registration.telegram_alt")} />
        <figcaption>@PERMUTASETSII_BOT</figcaption>
      </figure>
      <a href="/login" className="btn btn-primary public-action">{t("registration.back_login")}</a>
    </PublicShell>
  );
}
