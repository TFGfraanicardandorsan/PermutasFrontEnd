// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n.js';

vi.mock('../../../services/estudio', () => ({ crearEstudio: vi.fn() }));

import { crearEstudio } from '../../../services/estudio';
import CrearGradoAdmin from '../CrearGradoAdmin.jsx';

const rellenarYEnviar = () => {
  fireEvent.change(screen.getByLabelText('Estudio del grado:'), { target: { value: 'Grado en Ingeniería' } });
  fireEvent.change(screen.getByLabelText('Siglas:'), { target: { value: 'GI' } });
  fireEvent.click(screen.getByRole('button', { name: 'Crear grado' }));
};

// postAPI nunca lanza: devuelve { err: true }. Antes se mostraba éxito aunque fallara.
describe('CrearGradoAdmin', () => {
  beforeEach(async () => { vi.clearAllMocks(); await i18n.changeLanguage('es'); });
  afterEach(cleanup);

  it('muestra error cuando la API devuelve err', async () => {
    crearEstudio.mockResolvedValue({ err: true, errmsg: 'Error 403' });
    render(<CrearGradoAdmin />);
    rellenarYEnviar();
    expect(await screen.findByText('Error al crear el grado.')).toBeInTheDocument();
    expect(screen.queryByText('Grado creado correctamente.')).not.toBeInTheDocument();
  });

  it('muestra éxito cuando la API responde bien', async () => {
    crearEstudio.mockResolvedValue({ err: false, result: { err: false, result: { id: 1 } } });
    render(<CrearGradoAdmin />);
    rellenarYEnviar();
    expect(await screen.findByText('Grado creado correctamente.')).toBeInTheDocument();
  });
});
