import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightArrowLeft, faCircleCheck, faFileSignature, faHandshake, faPlus, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import useNotificaciones from '../../hooks/useNotificaciones.js';
import useResumenPermutas from '../../hooks/useResumenPermutas.js';
import NotificacionesLista from '../comun/NotificacionesLista.jsx';
import PageHeader from '../comun/PageHeader.jsx';

const STAGE_ROUTES = ['/miPerfil', '/solicitarPermuta', '/permutas', '/permutasAceptadas'];

export default function HomeEstudiante() {
  const { t } = useTranslation();
  const centro = useNotificaciones();
  const { loading, failures, requests, agreements, documents, pendientes } = useResumenPermutas();

  // Etapa actual: la más avanzada en la que el estudiante tiene algo en curso.
  const stage = documents.length ? 3 : agreements.length ? 2 : requests.length ? 1 : 0;
  const acciones = [
    { count: pendientes.propuestas, key: 'pending_proposals', action: 'pending_proposals_action', to: '/permutas', icon: faArrowRightArrowLeft },
    { count: pendientes.validaciones, key: 'pending_validations', action: 'pending_validations_action', to: '/misPermutas', icon: faHandshake },
    { count: pendientes.documentos, key: 'pending_documents', action: 'pending_documents_action', to: '/permutasAceptadas', icon: faFileSignature },
  ].filter(a => a.count > 0);
  const resumen = [
    { label: t('workspace.requests'), value: requests.length, to: '/misSolicitudesPermuta' },
    { label: t('workspace.agreements'), value: agreements.length, to: '/misPermutas' },
    { label: t('workspace.documents'), value: documents.length, to: '/permutasAceptadas' },
  ];

  return <div className="workspace-page home-workspace">
    <PageHeader
      eyebrow={t('home.student_eyebrow')}
      title={t('home.student_title')}
      description={t('home.student_intro')}
      actions={<Link className="btn btn-primary" to="/solicitarPermuta"><FontAwesomeIcon icon={faPlus} /> {t('workspace.new_request')}</Link>}
    />

    <div className="dash-grid">
      <section className="dash-card dash-attention" aria-labelledby="attention-title" aria-busy={loading}>
        <div className="workspace-section-heading"><h2 id="attention-title">{t('home.attention')}</h2>
          {!loading && acciones.length > 0 && <span className="dash-count">{acciones.reduce((n, a) => n + a.count, 0)}</span>}</div>
        {loading ? <div className="dash-skeleton" role="status"><span /><span /><span className="sr-only">{t('common.loading')}</span></div>
          : acciones.length ? <ul className="dash-actions">{acciones.map(a => <li key={a.key}>
              <span className="dash-action-icon" aria-hidden="true"><FontAwesomeIcon icon={a.icon} /></span>
              <span className="dash-action-text">{t(`home.${a.key}`, { count: a.count })}</span>
              <Link className="btn btn-primary btn-sm" to={a.to}>{t(`home.${a.action}`)} <FontAwesomeIcon icon={faArrowRight} /></Link>
            </li>)}</ul>
          : <div className="dash-all-clear"><FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" /><div><h3>{t('home.all_clear_title')}</h3><p>{t('home.all_clear_text')}</p></div></div>}
        {failures.length > 0 && !loading && <p className="dash-note" role="status">{t('home.load_partial')}</p>}
      </section>

      <section className="dash-card" aria-labelledby="summary-title">
        <div className="workspace-section-heading"><h2 id="summary-title">{t('home.summary_title')}</h2></div>
        <div className="dash-stats">{resumen.map(r => <Link key={r.to} to={r.to} className="dash-stat">
          <strong>{loading ? '—' : r.value}</strong><span>{r.label}</span>
        </Link>)}</div>
        <Link className="workspace-text-link" to="/seguimiento">{t('home.see_tracking')} →</Link>
      </section>
    </div>

    <section className="dash-card dash-stages" aria-labelledby="stage-title">
      <div className="workspace-section-heading"><h2 id="stage-title">{t('home.stage_title')}</h2></div>
      <ol className="stage-track">{STAGE_ROUTES.map((to, i) => {
        const state = loading ? 'upcoming' : i < stage ? 'done' : i === stage ? 'current' : 'upcoming';
        return <li key={to} className={`stage-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
          <Link to={to}>
            <span className="stage-dot" aria-hidden="true">{state === 'done' ? '✓' : i + 1}</span>
            <span className="stage-copy"><strong>{t(`workspace.step${i + 1}`)}</strong><small>{t(`workspace.step${i + 1}_help`)}</small>
              {state === 'current' && <em>{t('home.stage_current')}</em>}</span>
          </Link>
        </li>;
      })}</ol>
    </section>

    <section className="home-announcements dash-card"><div className="workspace-section-heading"><h2>{t('workspace.announcements')}</h2></div><NotificacionesLista centro={centro} limiteInicial={3} /></section>
  </div>;
}
