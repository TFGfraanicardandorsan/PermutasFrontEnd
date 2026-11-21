import { useCallback, useEffect, useState } from 'react';
import {
  obtenerSolicitudesPermuta, obtenerPermutasPropuestasSistema, obtenerPermutasAgrupadasPorUsuario,
  misPermutasPropuestas, misPermutasPropuestasPorMi,
} from '../services/permuta.js';
import { agruparBloques, resultadoAPI } from '../lib/bloquesPermuta.js';

const SOURCES = [obtenerSolicitudesPermuta, obtenerPermutasPropuestasSistema, obtenerPermutasAgrupadasPorUsuario, misPermutasPropuestas, misPermutasPropuestasPorMi];
export const FUENTE = { solicitudes: 0, propuestasSistema: 1, documentos: 2, recibidas: 3, enviadas: 4 };
const DOCUMENTO_COMPLETO = ['ACEPTADA', 'VALIDADA'];

// Estado de permutas del estudiante: lo usan el seguimiento y la portada.
export default function useResumenPermutas() {
  const [data, setData] = useState([[], [], [], [], []]);
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const responses = await Promise.allSettled(SOURCES.map(fn => fn()));
    const failed = [];
    const lists = responses.map((r, index) => {
      try {
        if (r.status === 'rejected') throw r.reason;
        const list = resultadoAPI(r.value);
        if (!Array.isArray(list)) throw new Error();
        return list;
      } catch { failed.push(index); return []; }
    });
    setData(lists); setFailures(failed); setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Los UUID de propuestas y de solicitudes pertenecen a espacios distintos: nunca se cruzan.
  const requests = agruparBloques(data[FUENTE.solicitudes]);
  const proposals = agruparBloques(data[FUENTE.propuestasSistema]).map(g => ({ ...g, to: '/permutas' }));
  const proposalIds = new Set(data[FUENTE.propuestasSistema].map(p => String(p.permuta_id)));
  const manual = [...new Map([...data[FUENTE.recibidas], ...data[FUENTE.enviadas]]
    .filter(p => !proposalIds.has(String(p.permuta_id))).map(p => [String(p.permuta_id), p])).values()];
  const agreements = [...proposals, ...agruparBloques(manual).map(g => ({ ...g, key: `manual:${g.key}`, to: g.bloque ? '/permutas' : '/misPermutas' }))];
  const documents = data[FUENTE.documentos];

  // Lo que espera una acción del propio estudiante.
  const pendientes = {
    propuestas: proposals.filter(g => g.miembros.some(m => !m.aceptada_por_mi)).length,
    validaciones: agruparBloques(data[FUENTE.recibidas]).length,
    documentos: documents.filter(d => !(d.permutas?.length && d.permutas.every(p => DOCUMENTO_COMPLETO.includes(p.estado_permuta_asociada)))).length,
  };

  return { loading, failures, reload: load, requests, agreements, documents, pendientes };
}
