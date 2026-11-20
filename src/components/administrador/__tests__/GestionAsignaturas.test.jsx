// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/asignaturas.js', () => ({
  obtenerPanelAsignaturasAdmin: vi.fn(),
  crearAsignatura: vi.fn(),
}));
vi.mock('../../../services/estudio.js', () => ({ obtenerEstudios: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { crearAsignatura, obtenerPanelAsignaturasAdmin } from '../../../services/asignaturas.js';
import { obtenerEstudios } from '../../../services/estudio.js';
import GestionAsignaturas from '../GestionAsignaturas.jsx';
import { validarAsignatura } from '../../../lib/validadores.js';

const respuesta = (result) => ({ err: false, result: { err: false, result } });
const panel = {
  resumen: { total: 2, permutables: 1, sin_grupos: 1, sin_grado: 0, total_grupos: 3, solicitudes_vigentes: 4 },
  asignaturas: [
    { id: 1, codigo: 2050001, nombre: 'Cálculo', siglas: 'CAL', curso: 'PRIMERO', grados: [{ id: 1, nombre: 'GII' }], num_grupos: 3, matriculados: 120, solicitudes_vigentes: 4 },
    { id: 2, codigo: 2050002, nombre: 'Redes', siglas: 'RED', curso: 'TERCERO', grados: [{ id: 2, nombre: 'GIS' }], num_grupos: 0, matriculados: 0, solicitudes_vigentes: 0 },
  ],
};

const renderizar = () => render(<MemoryRouter><GestionAsignaturas /></MemoryRouter>);

describe('GestionAsignaturas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerPanelAsignaturasAdmin.mockResolvedValue(respuesta(panel));
    obtenerEstudios.mockResolvedValue(respuesta([{ id: 1, nombre: 'GII' }, { id: 2, nombre: 'GIS' }]));
  });
  afterEach(cleanup);

  it('muestra el resumen y la tabla, y filtra por texto y estado de grupos', async () => {
    renderizar();
    const tabla = await screen.findByRole('table');
    expect(within(tabla).getByText('Cálculo')).toBeInTheDocument();
    expect(within(tabla).getByText('Sin grupos')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 2 de 2 asignaturas')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Nombre, siglas, código o grado'), { target: { value: 'red' } });
    expect(within(screen.getByRole('table')).queryByText('Cálculo')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Nombre, siglas, código o grado'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Grupos'), { target: { value: 'permutable' } });
    expect(within(screen.getByRole('table')).queryByText('Redes')).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Cálculo')).toBeInTheDocument();
  });

  it('valida el formulario del emergente antes de llamar a la API', async () => {
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva asignatura' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Crear asignatura' }));
    expect(within(dialogo).getByText('Indica el nombre de la asignatura.')).toBeInTheDocument();
    expect(crearAsignatura).not.toHaveBeenCalled();
  });

  it('crea la asignatura, cierra el emergente y recarga el panel', async () => {
    crearAsignatura.mockResolvedValue(respuesta({ id: 3, nombre: 'Álgebra' }));
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva asignatura' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: ' Álgebra ' } });
    fireEvent.change(within(dialogo).getByLabelText('Siglas'), { target: { value: 'alg' } });
    fireEvent.change(within(dialogo).getByLabelText('Código'), { target: { value: '2050003' } });
    fireEvent.change(within(dialogo).getByLabelText('Curso'), { target: { value: 'PRIMERO' } });
    fireEvent.change(within(dialogo).getByLabelText('Grado'), { target: { value: '1' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Crear asignatura' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(crearAsignatura).toHaveBeenCalledWith({ nombre: 'Álgebra', siglas: 'ALG', curso: 'PRIMERO', codigo: 2050003, estudios_id: 1 });
    expect(obtenerPanelAsignaturasAdmin).toHaveBeenCalledTimes(2);
  });

  it('mantiene el emergente abierto y muestra el error del servidor (p. ej. código duplicado)', async () => {
    crearAsignatura.mockResolvedValue({ err: true, errmsg: 'Ya existe una asignatura con el código 2050001' });
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva asignatura' }));
    const dialogo = screen.getByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: 'Cálculo' } });
    fireEvent.change(within(dialogo).getByLabelText('Siglas'), { target: { value: 'CAL' } });
    fireEvent.change(within(dialogo).getByLabelText('Código'), { target: { value: '2050001' } });
    fireEvent.change(within(dialogo).getByLabelText('Curso'), { target: { value: 'PRIMERO' } });
    fireEvent.change(within(dialogo).getByLabelText('Grado'), { target: { value: '1' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Crear asignatura' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Ya existe una asignatura con el código 2050001');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('validarAsignatura rechaza códigos no numéricos', () => {
    expect(validarAsignatura({ nombre: 'A', siglas: 'A', codigo: '12abc', curso: 'PRIMERO', estudios_id: '1' }).codigo).toBeDefined();
    expect(validarAsignatura({ nombre: 'A', siglas: 'A', codigo: '12', curso: 'PRIMERO', estudios_id: '1' })).toEqual({});
  });
});
