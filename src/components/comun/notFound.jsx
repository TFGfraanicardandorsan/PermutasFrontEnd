import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass } from '@fortawesome/free-solid-svg-icons';
import PublicShell from './PublicShell';

const NotFound = () => {
    const { t } = useTranslation();

    return (
        <PublicShell>
            <span className="public-icon" aria-hidden="true"><FontAwesomeIcon icon={faCompass} /></span>
            <h1>{t("pages.not_found.title")}</h1>
            <p>{t("pages.not_found.message")}</p>
            <Link to="/" className="btn btn-primary public-action">{t("common.back_home")}</Link>
        </PublicShell>
    );
};

export default NotFound;
