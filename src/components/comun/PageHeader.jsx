import PropTypes from 'prop-types';

// Cabecera común de página: etiqueta superior, título, descripción y acciones a la derecha.
export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="workspace-page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </header>
  );
}

PageHeader.propTypes = {
  eyebrow: PropTypes.node,
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  actions: PropTypes.node,
};
