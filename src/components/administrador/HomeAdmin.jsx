import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInbox, faHourglassHalf, faArrowRightArrowLeft, faBook, faBullhorn, faLayerGroup, faChartSimple,
  faFileSignature, faWandMagicSparkles, faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import useNotificaciones from '../../hooks/useNotificaciones.js';
import NotificacionesLista from '../comun/NotificacionesLista.jsx';
import PageHeader from '../comun/PageHeader.jsx';
import { obtenerIncidenciasSinAsignar } from '../../services/incidencia.js';
import { obtenerPanelGestionPermutas } from '../../services/permuta.js';
import { obtenerPanelAsignaturasAdmin } from '../../services/asignaturas.js';

const extraer = (respuesta) => (respuesta?.err ? undefined : respuesta?.result?.result);

const ACCIONES = [
  { key: 'action_notify', to: '/crearNotificacion', icon: faBullhorn },
  { key: 'action_subject', to: '/gestionAsignaturas', icon: faBook },
  { key: 'action_proposals', to: '/gestionPermutas', icon: faWandMagicSparkles },
  { key: 'action_groups', to: '/gestionGrupos', icon: faLayerGroup },
  { key: 'action_stats', to: '/estadisticas', icon: faChartSimple },
  { key: 'action_certificates', to: '/delegacion/certificados', icon: faFileSignature },
];

export default function HomeAdmin() {
  const { t } = useTranslation();
  const centro = useNotificaciones();
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    let vivo = true;
    // Cada indicador se carga por separado: si uno falla, los demás se muestran igualmente.
    Promise.allSettled([obtenerIncidenciasSinAsignar(), obtenerPanelGestionPermutas(), obtenerPanelAsignaturasAdmin()])
      .then(([inc, perm, asig]) => {
        if (!vivo) return;
        const incidencias = inc.status === 'fulfilled' ? extraer(inc.value) : undefined;
        const resumenPermutas = perm.status === 'fulfilled' ? extraer(perm.value)?.resumen : undefined;
        const resumenAsignaturas = asig.status === 'fulfilled' ? extraer(asig.value)?.resumen : undefined;
        setKpis({
          incidencias: Array.isArray(incidencias) ? incidencias.length : null,
          solicitudes: resumenPermutas?.solicitudes_pendientes ?? null,
          propuestas: resumenPermutas?.propuestas_pendientes ?? null,
          sinGrupos: resumenAsignaturas?.sin_grupos ?? null,
        });
      });
    return () => { vivo = false; };
  }, []);

  const tiles = [
    { key: 'unassigned', value: kpis?.incidencias, to: '/incidenciasSinAsignar', icon: faInbox, alert: true },
    { key: 'requests', value: kpis?.solicitudes, to: '/gestionPermutas', icon: faHourglassHalf },
    { key: 'proposals', value: kpis?.propuestas, to: '/gestionPermutas', icon: faArrowRightArrowLeft },
    { key: 'no_groups', value: kpis?.sinGrupos, to: '/gestionAsignaturas', icon: faBook, alert: true },
  ];

  return <div className="workspace-page home-workspace">
    <PageHeader eyebrow={t('home.admin_eyebrow')} title={t('home.admin_title')} description={t('home.admin_intro')} />

    <section className="kpi-grid" aria-label={t('home.admin_title')} aria-busy={!kpis}>
      {tiles.map(tile => {
        const sinDato = kpis && tile.value === null;
        const tono = tile.alert && tile.value > 0 ? 'kpi-warn' : '';
        return <Link key={tile.key} to={tile.to} className={`kpi-tile ${tono}`}>
          <span className="kpi-icon" aria-hidden="true"><FontAwesomeIcon icon={tile.icon} /></span>
          <strong>{!kpis ? '—' : sinDato ? '—' : tile.value}</strong>
          <span className="kpi-label">{t(`home.kpi_${tile.key}`)}</span>
          <small>{sinDato ? t('home.kpi_error') : t(`home.kpi_${tile.key}_hint`)}</small>
        </Link>;
      })}
    </section>

    <section className="dash-card" aria-labelledby="quick-title">
      <div className="workspace-section-heading"><h2 id="quick-title">{t('home.quick_actions')}</h2></div>
      <div className="quick-grid">{ACCIONES.map(a => <Link key={a.key} to={a.to} className="quick-action">
        <span className="quick-icon" aria-hidden="true"><FontAwesomeIcon icon={a.icon} /></span>
        <span><strong>{t(`home.${a.key}`)}</strong><small>{t(`home.${a.key}_help`)}</small></span>
        <FontAwesomeIcon icon={faArrowRight} className="quick-arrow" aria-hidden="true" />
      </Link>)}</div>
    </section>

    <section className="home-announcements dash-card"><div className="workspace-section-heading"><h2>{t('workspace.announcements')}</h2></div><NotificacionesLista centro={centro} limiteInicial={3} /></section>
  </div>;
}
