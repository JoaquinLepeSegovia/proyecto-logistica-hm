'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  X,
  Eye,
  Car,
  Clock,
} from 'lucide-react';
import {
  aprobarSolicitudAction,
  rechazarSolicitudAction,
} from '@/app/actions/solicitudes.actions';
import { SolicitudLista, EstadoSolicitud, TipoSolicitud, VehiculoInventario } from '@/types/solicitud.types';
import SolicitudDetalleModal from '@/components/SolicitudDetalleModal';
import { hoyISO } from '@/lib/fechas';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

interface ViewerInfo {
  id: string;
  nombre: string;
  apellido: string;
  rol: 'administrador' | 'ejecutivo' | 'jefe_local' | 'logistica' | 'operaciones';
  sucursal_id: number | null;
}

interface AprobacionesClientProps {
  solicitudes: SolicitudLista[];
  vehiculos: VehiculoInventario[];
  viewer: ViewerInfo;
}

const PRE_DESPACHO: EstadoSolicitud[] = [
  'pendiente_aprobacion',
  'aprobada',
  'pendiente',
  'priorizada',
];

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL');
}

function getEncargadoNombre(sol: SolicitudLista): string | null {
  if (sol.ejecutivo_nombre) return sol.ejecutivo_nombre;
  if (sol.jefe_local_nombre) return sol.jefe_local_nombre;
  return null;
}

const tipoLabel: Record<TipoSolicitud, string> = {
  venta: 'Venta',
  evento: 'Evento',
};

export default function AprobacionesClient({
  solicitudes,
  vehiculos,
  viewer,
}: AprobacionesClientProps) {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<SolicitudLista | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [approveTarget, setApproveTarget] = useState<SolicitudLista | null>(null);
  const [aprobacionFecha, setAprobacionFecha] = useState('');
  const [detailTarget, setDetailTarget] = useState<SolicitudLista | null>(null);

  const esAdmin = viewer.rol === 'administrador';
  const esJefeLocal = viewer.rol === 'jefe_local';

  const pendientesAprobar = useMemo(() => {
    let lista = solicitudes.filter((s) => s.estado === 'pendiente_aprobacion');
    if (esJefeLocal) {
      if (viewer.sucursal_id === null) return [];
      lista = lista.filter((s) => s.sucursal === viewer.sucursal_id);
    }
    return lista;
  }, [solicitudes, esJefeLocal, viewer.sucursal_id]);

  function puedoRechazar(sol: SolicitudLista): boolean {
    if (esAdmin) return true;
    if (esJefeLocal)
      return viewer.sucursal_id !== null && sol.sucursal === viewer.sucursal_id;
    return false;
  }

  function abrirAprobacion(sol: SolicitudLista) {
    setAprobacionFecha('');
    setApproveTarget(sol);
  }

  async function handleConfirmarAprobacion() {
    if (!approveTarget) return;
    setIsSubmitting(true);
    try {
      const result = await aprobarSolicitudAction(approveTarget.id, aprobacionFecha.trim());
      if (!result.success) {
        setFeedback({ type: 'error', message: result.error || 'Error al aprobar.' });
      } else {
        setFeedback({ type: 'success', message: result.message || 'Aprobada.' });
        setApproveTarget(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmarRechazo() {
    if (!rejectTarget) return;
    setIsSubmitting(true);
    try {
      const result = await rechazarSolicitudAction(rejectTarget.id, rejectMotivo);
      if (!result.success) {
        setFeedback({ type: 'error', message: result.error || 'Error al rechazar.' });
      } else {
        setFeedback({ type: 'success', message: result.message || 'Rechazada.' });
        setRejectTarget(null);
        setRejectMotivo('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${feedback.type === 'success'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
            }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="cursor-pointer" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aprobaciones</h1>
        <p className="text-sm text-neutral-500">
          Aprobar o rechazar solicitudes pendientes de aprobación de tu sucursal.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {pendientesAprobar.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p>No hay solicitudes pendientes de aprobación.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {pendientesAprobar.map((sol) => (
              <div key={sol.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-neutral-500">#{sol.id.slice(0, 8)}</span>
                    <span className="px-2 py-0.5 rounded-md text-xs bg-amber-50 text-amber-700 border border-amber-200">
                      Pendiente Aprobación
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-neutral-900">
                    {sol.sucursal_nombre || 'Sucursal'} · {tipoLabel[sol.tipo_solicitud]}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Creada: {formatFecha(sol.fecha_creacion)}
                    </span>
                    {sol.fecha_limite && (
                      <span>Límite: {formatFecha(sol.fecha_limite)}</span>
                    )}
                    {getEncargadoNombre(sol) && (
                      <span>Encargado: {getEncargadoNombre(sol)}</span>
                    )}
                  </div>
                  {sol.vehiculos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {sol.vehiculos.map((v) => (
                        <span
                          key={v.solicitud_vehiculo_id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-neutral-700"
                        >
                          <Car className="w-3 h-3" />
                          {v.patente}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDetailTarget(sol)}
                    className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer"
                    title="Ver detalle"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  {puedoRechazar(sol) && (
                    <>
                      <button
                        onClick={() => abrirAprobacion(sol)}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-700 disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => {
                          setRejectMotivo('');
                          setRejectTarget(sol);
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-semibold hover:border-red-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-900">Aprobar solicitud</h3>
              <button
                onClick={() => setApproveTarget(null)}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
              Aprobando la solicitud #{approveTarget.id.slice(0, 8)}. Indica la fecha limite en la que el o los vehiculos debe ser entregado.
            </p>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">
              Fecha limite de Entrega *
            </label>
<input
              type="date"
              min={hoyISO()}
              value={aprobacionFecha}
              onChange={(e) => setAprobacionFecha(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setApproveTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarAprobacion}
                disabled={isSubmitting || !aprobacionFecha.trim()}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold disabled:opacity-50 hover:bg-neutral-700 cursor-pointer"
              >
                {isSubmitting ? 'Aprobando...' : 'Confirmar aprobación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-900">Rechazar solicitud</h3>
              <button
                onClick={() => setRejectTarget(null)}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
              Rechazando la solicitud #{rejectTarget.id.slice(0, 8)}. Indica el motivo del rechazo
              (quedará registrado).
            </p>
            <textarea
              value={rejectMotivo}
              onChange={(e) => setRejectMotivo(e.target.value)}
              rows={3}
              placeholder="Motivo del rechazo (mínimo 5 caracteres)"
              className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRechazo}
                disabled={isSubmitting || rejectMotivo.trim().length < 5}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 cursor-pointer"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <SolicitudDetalleModal
          solicitud={detailTarget}
          vehiculosInventario={vehiculos}
          onClose={() => setDetailTarget(null)}
          onMensaje={(tipo, mensaje) => setFeedback({ type: tipo, message: mensaje })}
          onCancelar={() => {}}
          puedeCancelar={false}
          puedeGestionarVehiculos={
            PRE_DESPACHO.includes(detailTarget.estado) && puedoRechazar(detailTarget)
          }
          currentUserId={viewer.id}
          currentUserRol={viewer.rol}
        />
      )}
    </div>
  );
}
