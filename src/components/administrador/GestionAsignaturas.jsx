import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { crearAsignatura, obtenerPanelAsignaturasAdmin } from '../../services/asignaturas.js';
import { obtenerEstudios } from '../../services/estudio.js';
import { validarAsignatura } from '../../lib/validadores.js';
import '../../styles/gestionPermutas-style.css';
import '../../styles/gestionAsignaturas-style.css';

const CURSOS = [
  ['PRIMERO', '1º'], ['SEGUNDO', '2º'], ['TERCERO', '3º'], ['CUARTO', '4º'],
];
const etiquetaCurso = (curso) => CURSOS.find(([valor]) => valor === curso)?.[1] ?? curso;
const formularioVacio = { nombre: '', siglas: '', codigo: '', curso: '', estudios_id: '' };

const extraer = (respuesta) => respuesta?.result?.result;
// "Grado en Ingeniería Informática - Ingeniería del Software" → "Ingeniería del Software" (el nombre completo va en el title).
const nombreCortoGrado = (nombre = '') => nombre.includes(' - ') ? nombre.split(' - ').slice(1).join(' - ') : nombre;

const EstadoGrupos = ({ numGrupos }) => {
  if (numGrupos === 0) return <span className="swap-admin-status status-cancelada">Sin grupos</span>;
  if (numGrupos === 1) return <span className="swap-admin-status status-solicitada">1 grupo · no permutable</span>;
  return <span className="swap-admin-status status-validada">{numGrupos} grupos · permutable</span>;
};
EstadoGrupos.propTypes = { numGrupos: PropTypes.number.isRequired };

function ModalCrearAsignatura({ estudios, onCerrar, onCreada }) {
  const [form, setForm] = useState(formularioVacio);
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const dialogo = useRef(null);
  const primerCampo = useRef(null);

  const cerrar = useCallback(() => { if (!guardando) onCerrar(); }, [guardando, onCerrar]);

  useEffect(() => {
    const anterior = document.activeElement;
    primerCampo.current?.focus();
    return () => anterior?.focus?.();
  }, []);

  useEffect(() => {
    const manejar = (e) => {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'Tab') {
        const nodos = dialogo.current?.querySelectorAll('input:not([disabled]), select:not([disabled]), button:not([disabled])');
        if (!nodos?.length) return;
        const primero = nodos[0];
        const ultimo = nodos[nodos.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    };
    document.addEventListener('keydown', manejar);
    return () => document.removeEventListener('keydown', manejar);
  }, [cerrar]);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errores[name]) setErrores((prev) => ({ ...prev, [name]: undefined }));
    setErrorServidor('');
  };

  const enviar = async (e) => {
    e.preventDefault();
    const nuevosErrores = validarAsignatura(form);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length) return;

    setGuardando(true);
    const respuesta = await crearAsignatura({
      nombre: form.nombre.trim(),
      siglas: form.siglas.trim().toUpperCase(),
      curso: form.curso,
      codigo: Number(form.codigo),
      estudios_id: Number(form.estudios_id),
    });
    setGuardando(false);
    const creada = extraer(respuesta);
    if (respuesta?.err || !creada) {
      setErrorServidor(respuesta?.errmsg || 'No se pudo crear la asignatura.');
      return;
    }
    onCreada(creada);
  };

  const campo = (nombre) => ({
    id: `asig-${nombre}`,
    name: nombre,
    value: form[nombre],
    onChange: cambiar,
    disabled: guardando,
    'aria-invalid': Boolean(errores[nombre]),
    'aria-describedby': errores[nombre] ? `asig-${nombre}-error` : undefined,
  });
  const mensajeError = (nombre) => errores[nombre]
    ? <small id={`asig-${nombre}-error`} className="subject-admin-field-error">{errores[nombre]}</small> : null;

  return (
    <div className="swap-admin-dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <section ref={dialogo} className="swap-admin-dialog subject-admin-dialog" role="dialog" aria-modal="true" aria-labelledby="subject-create-title">
        <h2 id="subject-create-title">Nueva asignatura</h2>
        <p>La asignatura se asociará al grado seleccionado. Después podrás crear sus grupos desde la gestión de grupos.</p>
        <form onSubmit={enviar} noValidate>
          <div className="subject-admin-form-grid">
            <label className="subject-admin-span-2" htmlFor="asig-nombre"><span>Nombre</span>
              <input ref={primerCampo} {...campo('nombre')} maxLength={100} placeholder="Fundamentos de Programación" />
              {mensajeError('nombre')}
            </label>
            <label htmlFor="asig-siglas"><span>Siglas</span>
              <input {...campo('siglas')} maxLength={10} placeholder="FP" />
              {mensajeError('siglas')}
            </label>
            <label htmlFor="asig-codigo"><span>Código</span>
              <input {...campo('codigo')} inputMode="numeric" placeholder="2050001" />
              {mensajeError('codigo')}
            </label>
            <label htmlFor="asig-curso"><span>Curso</span>
              <select {...campo('curso')}>
                <option value="">Selecciona…</option>
                {CURSOS.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta} · {valor.toLowerCase()}</option>)}
              </select>
              {mensajeError('curso')}
            </label>
            <label htmlFor="asig-estudios_id"><span>Grado</span>
              <select {...campo('estudios_id')}>
                <option value="">Selecciona…</option>
                {estudios.map((estudio) => <option key={estudio.id} value={estudio.id}>{estudio.nombre}</option>)}
              </select>
              {mensajeError('estudios_id')}
            </label>
          </div>
          {errorServidor && <div className="subject-admin-server-error" role="alert">{errorServidor}</div>}
          <div className="swap-admin-dialog-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={cerrar} disabled={guardando}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={guardando}>{guardando ? 'Creando…' : 'Crear asignatura'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
ModalCrearAsignatura.propTypes = {
  estudios: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number, nombre: PropTypes.string })).isRequired,
  onCerrar: PropTypes.func.isRequired,
  onCreada: PropTypes.func.isRequired,
};

export default function GestionAsignaturas() {
  const [datos, setDatos] = useState({ resumen: {}, asignaturas: [] });
  const [estudios, setEstudios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [curso, setCurso] = useState('');
  const [grado, setGrado] = useState('');
  const [estadoGrupos, setEstadoGrupos] = useState('');

  const cargarPanel = useCallback(async () => {
    setCargando(true);
    const respuesta = await obtenerPanelAsignaturasAdmin();
    const panel = extraer(respuesta);
    if (respuesta?.err || !panel) {
      toast.error(respuesta?.errmsg || 'No se pudo cargar la gestión de asignaturas.');
    } else {
      setDatos(panel);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarPanel();
    obtenerEstudios().then((respuesta) => {
      const lista = extraer(respuesta);
      setEstudios(Array.isArray(lista) ? lista : []);
    });
  }, [cargarPanel]);

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return datos.asignaturas.filter((a) => {
      if (curso && a.curso !== curso) return false;
      if (grado && !a.grados.some((g) => String(g.id) === grado)) return false;
      if (estadoGrupos === 'sin' && a.num_grupos !== 0) return false;
      if (estadoGrupos === 'uno' && a.num_grupos !== 1) return false;
      if (estadoGrupos === 'permutable' && a.num_grupos < 2) return false;
      if (!termino) return true;
      return [a.nombre, a.siglas, String(a.codigo), ...a.grados.map((g) => g.nombre)]
        .some((valor) => valor?.toLocaleLowerCase('es').includes(termino));
    });
  }, [datos.asignaturas, busqueda, curso, grado, estadoGrupos]);

  const alCrear = async (asignatura) => {
    setModalAbierto(false);
    toast.success(`Asignatura «${asignatura.nombre}» creada correctamente.`);
    await cargarPanel();
  };

  const hayFiltros = busqueda || curso || grado || estadoGrupos;
  const limpiarFiltros = () => { setBusqueda(''); setCurso(''); setGrado(''); setEstadoGrupos(''); };
  const resumen = datos.resumen || {};

  return (
    <div className="swap-admin-page">
      <header className="swap-admin-hero">
        <div>
          <p className="swap-admin-eyebrow">CATÁLOGO ACADÉMICO</p>
          <h1>Gestión de asignaturas</h1>
          <p>Consulta el estado de cada asignatura, sus grupos y su actividad de permutas, y da de alta nuevas asignaturas.</p>
        </div>
        <div className="swap-admin-hero-actions">
          <button className="admin-btn admin-btn-primary" onClick={() => setModalAbierto(true)} disabled={estudios.length === 0}>
            + Nueva asignatura
          </button>
        </div>
      </header>

      <section className="swap-admin-summary" aria-label="Resumen de asignaturas">
        <article><span>Asignaturas</span><strong>{resumen.total ?? 0}</strong><small>{resumen.total_grupos ?? 0} grupos habilitados</small></article>
        <article><span>Permutables</span><strong>{resumen.permutables ?? 0}</strong><small>con dos o más grupos</small></article>
        <article><span>Sin grupos</span><strong>{resumen.sin_grupos ?? 0}</strong><small>{resumen.sin_grado ? `${resumen.sin_grado} sin grado asociado` : 'pendientes de configurar'}</small></article>
        <article><span>Solicitudes vigentes</span><strong>{resumen.solicitudes_vigentes ?? 0}</strong><small>en todas las asignaturas</small></article>
      </section>

      <section className="swap-admin-workspace">
        <div className="swap-admin-toolbar subject-admin-toolbar">
          <label className="swap-admin-search"><span>Buscar</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, siglas, código o grado" /></label>
          <label><span>Curso</span><select value={curso} onChange={(e) => setCurso(e.target.value)}><option value="">Todos</option>{CURSOS.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select></label>
          <label><span>Grado</span><select value={grado} onChange={(e) => setGrado(e.target.value)}><option value="">Todos</option>{estudios.map((e) => <option key={e.id} value={String(e.id)}>{e.nombre}</option>)}</select></label>
          <label><span>Grupos</span><select value={estadoGrupos} onChange={(e) => setEstadoGrupos(e.target.value)}><option value="">Todas</option><option value="permutable">Permutables</option><option value="uno">Un solo grupo</option><option value="sin">Sin grupos</option></select></label>
          <button className="admin-btn admin-btn-secondary" onClick={cargarPanel} disabled={cargando}>Actualizar</button>
        </div>

        {!cargando && (
          <p className="subject-admin-count" aria-live="polite">
            Mostrando {filtradas.length} de {datos.asignaturas.length} asignaturas
            {hayFiltros && <button type="button" className="subject-admin-link" onClick={limpiarFiltros}>Limpiar filtros</button>}
          </p>
        )}

        {cargando ? <div className="swap-admin-empty">Cargando asignaturas…</div>
          : datos.asignaturas.length === 0 ? (
            <div className="swap-admin-empty">
              Todavía no hay asignaturas. <button type="button" className="subject-admin-link" onClick={() => setModalAbierto(true)}>Crea la primera</button>
            </div>
          ) : filtradas.length === 0 ? <div className="swap-admin-empty">No hay asignaturas que coincidan con los filtros.</div> : (
            <div className="swap-admin-table-wrap">
              <table className="swap-admin-table">
                <thead><tr><th>Asignatura</th><th>Código</th><th>Curso</th><th>Grado</th><th>Grupos</th><th className="subject-admin-num">Matriculados</th><th className="subject-admin-num">Solicitudes</th></tr></thead>
                <tbody>{filtradas.map((a) => <tr key={a.id}>
                  <td data-label="Asignatura"><strong>{a.nombre}</strong><small>{a.siglas}</small></td>
                  <td data-label="Código"><span className="subject-admin-code">{a.codigo}</span></td>
                  <td data-label="Curso">{etiquetaCurso(a.curso)}</td>
                  <td data-label="Grado">{a.grados.length ? <span className="subject-admin-degrees">{a.grados.map((g) => <span key={g.id} className="subject-admin-degree" title={g.nombre}>{nombreCortoGrado(g.nombre)}</span>)}</span> : <small>Sin grado</small>}</td>
                  <td data-label="Grupos"><EstadoGrupos numGrupos={a.num_grupos} /></td>
                  <td data-label="Matriculados" className="subject-admin-num">{a.matriculados}</td>
                  <td data-label="Solicitudes" className="subject-admin-num">{a.solicitudes_vigentes}</td>
                </tr>)}</tbody>
              </table>
            </div>
          )}
      </section>

      {resumen.sin_grupos > 0 && !cargando && (
        <p className="subject-admin-hint">
          Hay {resumen.sin_grupos} asignaturas sin grupos: los estudiantes no podrán pedir permutas en ellas. <Link to="/gestionGrupos">Ir a gestión de grupos</Link>
        </p>
      )}

      {modalAbierto && <ModalCrearAsignatura estudios={estudios} onCerrar={() => setModalAbierto(false)} onCreada={alCrear} />}
    </div>
  );
}
