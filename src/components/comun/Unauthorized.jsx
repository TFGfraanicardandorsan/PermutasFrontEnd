import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import PublicShell from './PublicShell';

export default function Unauthorized() {
    const { t } = useTranslation();

    return (
        <PublicShell>
            <span className="public-icon" aria-hidden="true"><FontAwesomeIcon icon={faLock} /></span>
            <h1>{t("pages.unauthorized.title")}</h1>
            <p>{t("pages.unauthorized.message")}</p>
            <Link to="/" className="btn btn-primary public-action">{t("common.back_home")}</Link>
        </PublicShell>
    );
}
