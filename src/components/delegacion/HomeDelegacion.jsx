import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileCsv, faFilePdf, faSignature, faPaperPlane, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import useNotificaciones from '../../hooks/useNotificaciones.js';
import NotificacionesLista from '../comun/NotificacionesLista.jsx';
import PageHeader from '../comun/PageHeader.jsx';

const PASOS = [faFileCsv, faFilePdf, faSignature, faPaperPlane];

export default function HomeDelegacion() {
  const { t } = useTranslation();
  const centro = useNotificaciones();
  return <div className="workspace-page home-workspace">
    <PageHeader
      eyebrow={t('home.delegation_eyebrow')}
      title={t('home.delegation_title')}
      description={t('home.delegation_intro')}
      actions={<Link className="btn btn-primary" to="/delegacion/certificados">{t('home.cert_cta')} <FontAwesomeIcon icon={faArrowRight} /></Link>}
    />
    <section className="dash-card" aria-labelledby="cert-steps">
      <div className="workspace-section-heading"><h2 id="cert-steps">{t('home.cert_steps_title')}</h2></div>
      <ol className="flow-steps">{PASOS.map((icon, i) => <li key={i}>
        <span className="flow-icon" aria-hidden="true"><FontAwesomeIcon icon={icon} /></span>
        <span className="flow-number">{i + 1}</span>
        <strong>{t(`home.cert_step${i + 1}`)}</strong>
        <small>{t(`home.cert_step${i + 1}_help`)}</small>
      </li>)}</ol>
    </section>
    <section className="home-announcements dash-card"><div className="workspace-section-heading"><h2>{t('workspace.announcements')}</h2></div><NotificacionesLista centro={centro} limiteInicial={3} /></section>
  </div>;
}
