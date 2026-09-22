'use client';

import { useMemo, useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Pencil,
  Trash2,
  Car,
  MapPin,
} from 'lucide-react';
import {
  createSucursalAction,
  updateSucursalAction,
  deleteSucursalAction,
} from '@/app/actions/sucursales.actions';
import {
  EstadoSolicitud,
  Sucursal,
  SucursalSolicitudItem,
  Zona,
} from '@/types/sucursal.types';
import { formatFecha } from '@/lib/fechas';
import { UsuarioNombreBoton } from '@/components/usuario-info-modal';

const estadoConfig: Record<EstadoSolicitud, { label: string; color: string }> = {
  pendiente_aprobacion: { label: 'Pendiente Aprobación', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  aprobada: { label: 'Aprobada', color: 'bg-green-50 text-green-700 border-green-200' },
  pendiente: { label: 'Pendiente', color: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
  priorizada: { label: 'Priorizada', color: 'bg-neutral-200 text-neutral-900 border-neutral-200' },
  asignada: { label: 'Asignada', color: 'bg-white text-neutral-900 border-neutral-400' },
  calendarizada: { label: 'Calendarizada', color: 'bg-white text-neutral-900 border-neutral-900 border-2' },
  en_transito: { label: 'En Tránsito', color: 'bg-neutral-700 text-white border-neutral-700' },
  entregada: { label: 'Entregada', color: 'bg-neutral-900 text-white border-neutral-900' },
  finalizada: { label: 'Finalizada', color: 'bg-black text-white border-black ring-2 ring-neutral-300' },
  cancelada: { label: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200' },
  rechazada: { label: 'Rechazada', color: 'bg-red-50 text-red-700 border-red-200' },
};

const tipoLabel: Record<string, string> = {
  evento: 'Evento',
  venta: 'Venta',
};

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

interface SucursalesTableClientProps {
  sucursales: Sucursal[];
  solicitudes: SucursalSolicitudItem[];
  zonas: Zona[];
}

export default function SucursalesTableClient({ sucursales, solicitudes, zonas }: SucursalesTableClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [detailSucursal, setDetailSucursal] = useState<Sucursal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sucursal | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [slots, setSlots] = useState('');
  const [zonaId, setZonaId] = useState<number | null>(null);

  const totalSucursales = sucursales.length;
  const capacidadTotal = useMemo(
    () => sucursales.reduce((acc, s) => acc + (s.slots || 0), 0),
    [sucursales]
  );
  const estacionados = useMemo(
    () => sucursales.reduce((acc, s) => acc + (s.slots_ocupados || 0), 0),
    [sucursales]
  );
  const reservados = useMemo(
    () => sucursales.reduce((acc, s) => acc + (s.slots_reservados || 0), 0),
    [sucursales]
  );

  const solicitudesPorSucursal = useMemo(() => {
    const map = new Map<number, SucursalSolicitudItem[]>();
    for (const sol of solicitudes) {
      const list = map.get(sol.sucursal) || [];
      list.push(sol);
      map.set(sol.sucursal, list);
    }
    return map;
  }, [solicitudes]);

  const filteredSucursales = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sucursales;
    return sucursales.filter(
      (s) =>
        (s.nombre || '').toLowerCase().includes(term) ||
        (s.direccion || '').toLowerCase().includes(term)
    );
  }, [sucursales, searchTerm]);

  function openCreateModal() {
    setEditingSucursal(null);
    setNombre('');
    setDireccion('');
    setSlots('');
    setZonaId(null);
    setIsModalOpen(true);
  }

  function openEditModal(sucursal: Sucursal) {
    setEditingSucursal(sucursal);
    setNombre(sucursal.nombre || '');
    setDireccion(sucursal.direccion || '');
    setSlots(sucursal.slots !== null && sucursal.slots !== undefined ? String(sucursal.slots) : '');
    setZonaId(sucursal.zona_id ?? null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = { nombre, direccion, slots, zona_id: zonaId };
      const result = editingSucursal
        ? await updateSucursalAction(editingSucursal.id, data)
        : await createSucursalAction(data);

      if (!result.success) {
        setFeedback({ type: 'error', message: result.error || 'Ocurrió un error.' });
      } else {
        setFeedback({ type: 'success', message: result.message || 'Operación exitosa.' });
        setIsModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteSucursalAction(deleteTarget.id);
      if (!result.success) {
        setDeleteError(result.error || 'No se pudo eliminar la sucursal.');
      } else {
        setFeedback({ type: 'success', message: result.message || 'Sucursal eliminada.' });
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const solicitudesDetalle = detailSucursal
    ? solicitudesPorSucursal.get(detailSucursal.id) || []
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-neutral-900" />
            <span>Gestión de Sucursales</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Administra los puntos H.Motores, su capacidad de estacionamiento y sus solicitudes asociadas
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nueva Sucursal</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Sucursales</p>
            <p className="text-3xl font-bold text-neutral-900 mt-1">{totalSucursales}</p>
          </div>
          <div className="w-11 h-11 rounded-xl border border-neutral-300 flex items-center justify-center text-neutral-900">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-900 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Capacidad Total</p>
            <p className="text-3xl font-bold text-white mt-1">{capacidadTotal}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <Car className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Reservados + Ocupados</p>
            <p className="text-3xl font-bold text-neutral-900 mt-1">{reservados + estacionados}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {reservados} reservados · {estacionados} ocupados
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500">
            <MapPin className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            feedback.type === 'success'
              ? 'bg-neutral-900 border-neutral-900 text-white'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-white shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              )}
              <p className="font-bold text-base">{feedback.message}</p>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className={`p-1 rounded-lg cursor-pointer ${
                feedback.type === 'success'
                  ? 'text-neutral-300 hover:text-white hover:bg-white/10'
                  : 'text-red-400 hover:text-red-700 hover:bg-red-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <p className="text-xs text-neutral-500 font-medium whitespace-nowrap">
          {filteredSucursales.length} de {totalSucursales} sucursales
        </p>
      </div>

      {/* Sucursales Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase font-semibold text-neutral-500 tracking-wider">
                <th className="py-3.5 px-4">Sucursal</th>
                <th className="py-3.5 px-4">Zona</th>
                <th className="py-3.5 px-4">Encargado</th>
                <th className="py-3.5 px-4">Capacidad</th>
                <th className="py-3.5 px-4">Solicitudes</th>
                <th className="py-3.5 px-4">Registro</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {filteredSucursales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    No se encontraron sucursales que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredSucursales.map((sucursal) => {
                  const ocupados = sucursal.slots_ocupados || 0;
                  const reservados = sucursal.slots_reservados || 0;
                  const usoSlots = ocupados + reservados;
                  const total = sucursal.slots;
                  const pct =
                    total && total > 0 ? Math.min(100, Math.round((usoSlots / total) * 100)) : 0;
                  const excede = total !== null && total !== undefined && usoSlots > total;
                  const nSol = solicitudesPorSucursal.get(sucursal.id)?.length || 0;

                  return (
                    <tr key={sucursal.id} className="hover:bg-neutral-50 transition-colors">
                      {/* Nombre & Dirección */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-neutral-900">{sucursal.nombre}</p>
                        {sucursal.direccion && (
                          <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {sucursal.direccion}
                          </p>
                        )}
                      </td>

                      {/* Zona */}
                      <td className="py-3.5 px-4">
                        {sucursal.zona_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {zonas.find((z) => z.id === sucursal.zona_id)?.nombre ||
                              `Zona #${sucursal.zona_id}`}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">Sin zona</span>
                        )}
                      </td>

                      {/* Encargado */}
                      <td className="py-3.5 px-4">
                        {sucursal.encargado ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center font-bold text-[10px] text-white uppercase shrink-0">
                              {sucursal.encargado.nombre.charAt(0)}
                              {sucursal.encargado.apellido.charAt(0)}
                            </div>
                            <span className="text-neutral-900 font-medium text-xs">
                              <UsuarioNombreBoton
                                usuarioId={sucursal.usuario_id || sucursal.encargado.id}
                                nombre={`${sucursal.encargado.nombre} ${sucursal.encargado.apellido}`}
                                muted
                              />
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">Sin asignar</span>
                        )}
                      </td>

                      {/* Capacidad */}
                      <td className="py-3.5 px-4 min-w-[160px]">
                        {total === null || total === undefined ? (
                          <span className="text-xs text-neutral-400">Sin capacidad definida</span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${excede ? 'text-red-600' : 'text-neutral-900'}`}>
                                {usoSlots}
                              </span>
                              <span className="text-xs text-neutral-400">/ {total} espacios</span>
                              {reservados > 0 && (
                                <span className="text-[10px] font-semibold text-neutral-400">
                                  · {reservados} reservados
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${excede ? 'bg-red-500' : 'bg-neutral-900'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-neutral-400">
                              {ocupados} estacionados · {reservados} reservados
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Solicitudes */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setDetailSucursal(sucursal)}
                          title="Ver solicitudes de esta sucursal"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-neutral-700 border border-neutral-300 hover:border-neutral-900 hover:text-neutral-900 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {nSol}
                        </button>
                      </td>

                      {/* Registro */}
                      <td className="py-3.5 px-4 text-xs text-neutral-500">
                        {formatFecha(sucursal.created_at)}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => setDetailSucursal(sucursal)}
                          title="Ver detalle y solicitudes"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(sucursal)}
                          title="Editar sucursal"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(sucursal);
                          }}
                          title="Eliminar sucursal"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear / Editar Sucursal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    {editingSucursal ? 'Editar Sucursal' : 'Registrar Nueva Sucursal'}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {editingSucursal
                      ? `Modificando "${editingSucursal.nombre}"`
                      : 'Alta de punto operativo H.Motores'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sucursal Santiago Centro"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Dirección
                </label>
                <input
                  type="text"
                  placeholder="Ej. Av. Libertador 1234, Santiago"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Espacios Totales *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    placeholder="Ej. 20"
                    value={slots}
                    onChange={(e) => setSlots(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Zona
                  </label>
                  <select
                    value={zonaId ?? ''}
                    onChange={(e) => setZonaId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    <option value="">Sin zona</option>
                    {zonas.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start gap-2.5 text-xs text-neutral-600">
                <Car className="w-4 h-4 shrink-0 mt-0.5 text-neutral-900" />
                <span>
                  Los espacios ocupados y reservados se calculan automáticamente según los vehículos estacionados
                  y las solicitudes de envío en curso, y no se editan manualmente.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-700 active:bg-black rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? 'Guardando...'
                    : editingSucursal
                      ? 'Guardar Cambios'
                      : 'Crear Sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Eliminar Sucursal</h2>
                  <p className="text-sm text-neutral-500">
                    ¿Confirmas eliminar <strong className="text-neutral-900">{deleteTarget.nombre}</strong>? Esta
                    acción no se puede deshacer.
                  </p>
                </div>
              </div>

              {(solicitudesPorSucursal.get(deleteTarget.id)?.length || 0) > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Se eliminarán también{' '}
                    <strong>{solicitudesPorSucursal.get(deleteTarget.id)!.length} solicitud(es)</strong> cuyo
                    origen es esta sucursal (eliminación en cascada).
                  </span>
                </div>
              )}

              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar Definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Sucursal con Solicitudes */}
      {detailSucursal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">{detailSucursal.nombre}</h2>
                  <p className="text-xs text-neutral-500">
                    {detailSucursal.direccion || 'Sin dirección registrada'} ·{' '}
                    {detailSucursal.encargado ? (
                      <>
                        Encargado:{' '}
                        <UsuarioNombreBoton
                          usuarioId={detailSucursal.usuario_id || detailSucursal.encargado.id}
                          nombre={`${detailSucursal.encargado.nombre} ${detailSucursal.encargado.apellido}`}
                          muted
                        />
                      </>
                    ) : (
                      'Sin encargado asignado'
                    )}{' '}
                    ·{' '}
                    {detailSucursal.slots !== null && detailSucursal.slots !== undefined
                      ? `${(detailSucursal.slots_ocupados || 0) + (detailSucursal.slots_reservados || 0)}/${detailSucursal.slots} espacios · ${detailSucursal.slots_reservados || 0} reservados`
                      : 'capacidad no definida'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailSucursal(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Solicitudes con origen en esta sucursal ({solicitudesDetalle.length})
              </p>

              {solicitudesDetalle.length === 0 ? (
                <div className="py-10 text-center text-sm text-neutral-400 border border-dashed border-neutral-200 rounded-2xl">
                  Esta sucursal aún no tiene solicitudes de traslado asociadas.
                </div>
              ) : (
                solicitudesDetalle.map((sol) => {
                  const estado = estadoConfig[sol.estado];
                  return (
                    <div
                      key={sol.id}
                      className="border border-neutral-200 rounded-2xl p-4 space-y-3 hover:border-neutral-300 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                          #{sol.id.slice(0, 8)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white text-neutral-600 border border-neutral-300">
                          {tipoLabel[sol.tipo_solicitud] || sol.tipo_solicitud}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${estado.color}`}
                        >
                          {estado.label}
                        </span>
                        {sol.posicion_prioridad !== null && sol.posicion_prioridad !== undefined && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-neutral-900 text-white">
                            #{sol.posicion_prioridad} en cola
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Creación
                          </p>
                          <p className="text-neutral-900 font-medium">{formatFecha(sol.fecha_creacion)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Despacho Tentativo
                          </p>
                          <p className="text-neutral-900 font-medium">
                            {formatFecha(sol.fecha_tentativa_despacho)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Fecha Límite
                          </p>
                          <p className="text-neutral-900 font-medium">{formatFecha(sol.fecha_limite)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs border-t border-neutral-100 pt-3">
                        <div>
                          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Ejecutivo
                          </p>
                          <p className="text-neutral-900 font-medium">
                            {sol.ejecutivo_id ? (
                              <UsuarioNombreBoton usuarioId={sol.ejecutivo_id} nombre={sol.ejecutivo} muted />
                            ) : (
                              sol.ejecutivo
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Jefe de Local
                          </p>
                          <p className="text-neutral-900 font-medium">
                            {sol.jefe_local_id ? (
                              <UsuarioNombreBoton usuarioId={sol.jefe_local_id} nombre={sol.jefe_local} muted />
                            ) : (
                              <span className="text-neutral-400 italic">Sin asignar</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Logística
                          </p>
                          <p className="text-neutral-900 font-medium">
                            {sol.logistica_id ? (
                              <UsuarioNombreBoton usuarioId={sol.logistica_id} nombre={sol.logistica} muted />
                            ) : (
                              <span className="text-neutral-400 italic">Sin asignar</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {sol.estado === 'cancelada' && sol.motivo_cancelacion && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                          <strong>Motivo de cancelación:</strong> {sol.motivo_cancelacion}
                        </div>
                      )}

                      <div className="space-y-2 border-t border-neutral-100 pt-3">
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                          Vehículos asociados ({sol.vehiculos.length})
                        </p>
                        {sol.vehiculos.length === 0 ? (
                          <p className="text-xs text-neutral-400 italic">Sin vehículos reservados.</p>
                        ) : (
                          <div className="space-y-2">
                            {sol.vehiculos.map((v) => (
                              <div
                                key={v.solicitud_vehiculo_id}
                                className="flex items-center justify-between gap-3 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0">
                                    <Car className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-neutral-900 font-mono">
                                      {v.patente}
                                    </p>
                                    <p className="text-[11px] text-neutral-500 truncate">
                                      {v.chasis} · {v.marca} {v.modelo} · {v.anio}
                                      {v.color ? ` · ${v.color}` : ''}
                                    </p>
                                  </div>
                                </div>
                                {v.disponibilidad === 'reservado' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-neutral-900 text-white shrink-0">
                                    Reservado
                                  </span>
                                ) : v.disponibilidad === 'vendido' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-green-700 text-white shrink-0">
                                    Vendido
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-white text-neutral-500 border border-neutral-300 shrink-0">
                                    Liberado
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
