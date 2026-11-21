import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightArrowLeft } from '@fortawesome/free-solid-svg-icons';
import Footer from './footer';
import LanguageSwitcher from './LanguageSwitcher';

// Estructura de las páginas públicas (sin sesión): misma cabecera que el inicio de sesión
// y una tarjeta centrada con el mensaje.
export default function PublicShell({ children }) {
  return (
    <div className="public-workspace">
      <header className="public-topbar">
        <a href="/login" className="workspace-brand">
          <span className="brand-mark" aria-hidden="true"><FontAwesomeIcon icon={faArrowRightArrowLeft} /></span>Permutas ETSII
        </a>
        <LanguageSwitcher />
      </header>
      <main className="public-main"><div className="public-card">{children}</div></main>
      <Footer />
    </div>
  );
}

PublicShell.propTypes = { children: PropTypes.node.isRequired };
