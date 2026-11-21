import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRightArrowLeft, faHouse, faPlus, faListCheck, faUser, faLifeRing, faBell, faBars, faXmark,
  faArrowRightFromBracket, faChartSimple, faUsers, faLayerGroup, faFileSignature, faMessage, faStar,
  faBook, faInbox, faBullhorn, faGear, faCommentDots, faCircleUser,
} from '@fortawesome/free-solid-svg-icons';
import useNotificaciones from '../../hooks/useNotificaciones.js';
import NotificacionesLista from './NotificacionesLista.jsx';
import { logout } from '../../services/login.js';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import PropTypes from 'prop-types';

// Cada rol ve su menú agrupado por tareas. `mobile` marca los accesos de la barra inferior (solo estudiantes).
const menus = {
  estudiante: [
    { section: 'workspace.section_swap', items: [
      ['workspace.home', '/estudiante', faHouse, true], ['workspace.request', '/solicitarPermuta', faPlus, true],
      ['workspace.proposals', '/permutas', faArrowRightArrowLeft, true], ['workspace.tracking', '/seguimiento', faListCheck, true],
    ] },
    { section: 'workspace.section_account', items: [
      ['workspace.profile', '/miPerfil', faUser], ['workspace.support', '/misIncidencias', faLifeRing],
      ['navbar.feedback', '/feedback', faCommentDots],
    ] },
  ],
  administrador: [
    { section: 'workspace.section_daily', items: [
      ['workspace.home', '/admin', faHouse], ['navbar.new_incidents', '/incidenciasSinAsignar', faInbox],
      ['navbar.my_incidents', '/incidencias', faLifeRing], ['navbar.swap_management', '/gestionPermutas', faArrowRightArrowLeft],
    ] },
    { section: 'workspace.section_academic', items: [
      ['navbar.subject_management', '/gestionAsignaturas', faBook], ['navbar.group_management', '/gestionGrupos', faLayerGroup],
      ['navbar.user_management', '/gestionUsuarios', faUsers],
    ] },
    { section: 'workspace.section_communication', items: [
      ['navbar.create_notification', '/crearNotificacion', faBullhorn], ['navbar.feedback_management', '/gestionFeedback', faMessage],
    ] },
    { section: 'workspace.section_analysis', items: [
      ['navbar.view_stats', '/estadisticas', faChartSimple], ['navbar.subject_evaluations', '/valoracionesAsignaturas', faStar],
    ] },
    { section: 'workspace.section_delegation', items: [
      ['navbar.delegate_management', '/delegacion/certificados', faFileSignature],
    ] },
    { section: 'workspace.section_account', items: [
      ['workspace.settings', '/miPerfilAdmin', faGear], ['navbar.feedback', '/feedback', faCommentDots],
    ] },
  ],
  delegacion: [
    { section: 'workspace.section_delegation', items: [
      ['workspace.home', '/delegacion', faHouse], ['delegation.navbar.certificates', '/delegacion/certificados', faFileSignature],
    ] },
    { section: 'workspace.section_account', items: [['navbar.feedback', '/feedback', faCommentDots]] },
  ],
};

const TRACKING_ROUTES = ['/misPermutas', '/misSolicitudesPermuta', '/permutasAceptadas', '/generarPermuta'];

export default function WorkspaceNav({ role }) {
  const { t } = useTranslation();
  const location = useLocation();
  const auth = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const centro = useNotificaciones();
  const dialog = useRef(null);
  const trigger = useRef(null);
  const sections = menus[role];
  const items = sections.flatMap((s) => s.items);
  const homeRoute = items[0][1];
  const uvus = auth?.user?.uvus;

  useEffect(() => { setMenuOpen(false); setNoticesOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!noticesOpen) return;
    const previous = document.activeElement;
    dialog.current?.focus();
    const handler = e => {
      if (e.key === 'Escape') setNoticesOpen(false);
      if (e.key === 'Tab') {
        const nodes = dialog.current?.querySelectorAll('button:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => { document.removeEventListener('keydown', handler); previous?.focus(); };
  }, [noticesOpen]);

  const active = to => to === '/seguimiento' && TRACKING_ROUTES.includes(location.pathname);
  const linkClass = (to) => ({ isActive }) => `workspace-nav-link ${isActive || active(to) ? 'selected' : ''}`;

  return <>
    <a href="#workspace-content" className="skip-content">{t('workspace.skip')}</a>
    <header className="workspace-topbar">
      <Link to={homeRoute} className="workspace-brand">
        <span className="brand-mark" aria-hidden="true"><FontAwesomeIcon icon={faArrowRightArrowLeft} /></span>
        <span>Permutas<span className="brand-school">ETSII · Universidad de Sevilla</span></span>
      </Link>
      <div className="workspace-utilities">
        <span className={`workspace-role role-${role}`}>{t(`workspace.${role}`)}</span>
        {uvus && <span className="workspace-user" title={t('workspace.signed_in_as', { user: uvus })}>
          <FontAwesomeIcon icon={faCircleUser} aria-hidden="true" /><span>{uvus}</span>
        </span>}
        <div className="workspace-prefs"><LanguageSwitcher /><ThemeToggle /></div>
        <button className="icon-button notification-bell" aria-label={t('common.notifications')} aria-describedby="notification-count" aria-haspopup="dialog" onClick={() => setNoticesOpen(true)}>
          <FontAwesomeIcon icon={faBell} />
          {centro.noLeidas > 0 && <span className="notification-counter" aria-hidden="true">{centro.noLeidas > 99 ? '99+' : centro.noLeidas}</span>}
          <span id="notification-count" className="notification-sr-only">{t('notificationCenter.unreadCount', { count: centro.noLeidas })}</span>
        </button>
        <button ref={trigger} className="icon-button mobile-menu-toggle" aria-label={t('workspace.menu')} aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(v => !v)}>
          <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
        </button>
      </div>
    </header>
    {menuOpen && <button className="workspace-backdrop" aria-label={t('common.close')} onClick={() => setMenuOpen(false)} />}
    <aside className={`workspace-rail ${menuOpen ? 'is-open' : ''}`} onKeyDown={e => { if (e.key === 'Escape') { setMenuOpen(false); trigger.current?.focus(); } }}>
      <nav id="workspace-navigation" aria-label={t('workspace.main_navigation')}>
        {sections.map(({ section, items: sectionItems }) => <div className="nav-group" key={section}>
          <p className="nav-section-label">{t(section)}</p>
          {sectionItems.map(([key, to, icon]) => <NavLink key={to} to={to} end className={linkClass(to)}>
            <FontAwesomeIcon icon={icon} fixedWidth /><span>{t(key)}</span>
          </NavLink>)}
        </div>)}
      </nav>
      <div className="workspace-rail-bottom">
        <div className="workspace-rail-prefs"><p className="nav-section-label">{t('workspace.preferences')}</p><div><LanguageSwitcher /><ThemeToggle /></div></div>
        <p>{t('workspace.help_note')} <a href="mailto:delegacion_etsii@us.es">{t('footer.contact_us')}</a></p>
        <button onClick={() => logout()}><FontAwesomeIcon icon={faArrowRightFromBracket} /> {t('navbar.logout')}</button>
      </div>
    </aside>
    {role === 'estudiante' && <nav className="workspace-bottom-nav" aria-label={t('workspace.mobile_navigation')}>
      {items.filter((item) => item[3]).map(([key, to, icon]) => <NavLink key={to} to={to} end className={({ isActive }) => isActive || active(to) ? 'selected' : ''}>
        <FontAwesomeIcon icon={icon} /><span>{t(key)}</span>
      </NavLink>)}
    </nav>}
    {noticesOpen && <div className="workspace-dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) setNoticesOpen(false); }}>
      <section className="workspace-notifications" role="dialog" aria-modal="true" aria-labelledby="notifications-heading" tabIndex={-1} ref={dialog}>
        <div className="workspace-section-heading"><h2 id="notifications-heading">{t('common.notifications')}</h2><button className="icon-button" aria-label={t('common.close')} onClick={() => setNoticesOpen(false)}><FontAwesomeIcon icon={faXmark} /></button></div>
        <NotificacionesLista centro={centro} />
      </section>
    </div>}
  </>;
}
WorkspaceNav.propTypes = { role: PropTypes.oneOf(['estudiante', 'administrador', 'delegacion']).isRequired };
