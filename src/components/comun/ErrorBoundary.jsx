import { Component } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import { logError } from '../../lib/logger.js';

// Evita que un fallo de una pantalla deje la aplicación en blanco: el menú sigue disponible
// y se ofrece reintentar. Se reinicia al cambiar de ruta (el layout le pasa la ruta como key).
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    logError(error);
  }

  render() {
    const { t, children } = this.props;
    if (!this.state.error) return children;
    return (
      <div className="workspace-page">
        <div className="dash-card error-boundary" role="alert">
          <h1>{t('common.error_boundary.title')}</h1>
          <p>{t('common.error_boundary.text')}</p>
          <div className="page-heading-actions">
            <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>{t('common.error_boundary.retry')}</button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>{t('common.error_boundary.reload')}</button>
          </div>
        </div>
      </div>
    );
  }
}

ErrorBoundary.propTypes = { t: PropTypes.func.isRequired, children: PropTypes.node };
const ErrorBoundaryTraducido = withTranslation()(ErrorBoundary);
export default ErrorBoundaryTraducido;
