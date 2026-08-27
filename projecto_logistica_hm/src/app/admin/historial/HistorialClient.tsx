'use client';

import { useMemo, useState } from 'react';
import {
  History,
  Search,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  CheckCircle2,
  Car,
  AlertCircle,
} from 'lucide-react';
import { AuditoriaRegistro } from '@/types/auditoria.types';
import { AuditoriaMetricas } from '@/services/auditoria.service';
import { getAuditoriaAction } from '@/app/actions/auditoria.actions';

const accionConfig: Record<string, { label: string; color: string }> = {
  CAMBIO_ESTADO: { label: 'Cambio de Estado', color: 'bg-neutral-900 text-white' },
  ASIGNACION_VEHICULO: { label: 'Asignación Vehículo', color: 'bg-neutral-200 text-neutral-900' },
  CAMBIO_DISPONIBILIDAD_VEHICULO: { label: 'Disponibilidad Vehículo', color: 'bg-neutral-100 text-neutral-700 border border-neutral-300' },
};

const entidadConfig: Record<string, { label: string; color: string }> = {
  solicitud: { label: 'Solicitud', color: 'bg-white text-neutral-700 border border-neutral-300' },
  solicitud_vehiculo: { label: 'Vehículo', color: 'bg-neutral-50 text-neutral-600 border border-neutral-200' },
};

const estadoColores: Record<string, string> = {
  pendiente: 'text-neutral-500',
  priorizada: 'text-neutral-700',
  asignada: 'text-neutral-800',
  calendarizada: 'text-neutral-900 font-bold',
  en_transito: 'text-neutral-900',
  entregada: 'text-neutral-900',
  finalizada: 'text-black font-bold',
  cancelada: 'text-red-600',
};

interface HistorialClientProps {
  registros: AuditoriaRegistro[];
  metricas: AuditoriaMetricas;
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL');
}

function formatFechaHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function formatId(id: string): string {
  return '#' + id.slice(0, 8);
}

function getDetalle(reg: AuditoriaRegistro): { texto: string; esCambioEstado: boolean; anterior?: string; nuevo?: string } {
  if (reg.accion === 'CAMBIO_ESTADO') {
    const anterior = (reg.valor_anterior?.estado as string) || '?';
    const nuevo = (reg.valor_nuevo?.estado as string) || '?';
    return { texto: `${anterior} → ${nuevo}`, esCambioEstado: true, anterior, nuevo };
  }
  if (reg.accion === 'ASIGNACION_VEHICULO') {
    const patente = (reg.valor_nuevo?.vehiculo_patente as string) || reg.patente || '?';
    return { texto: `Vehículo ${patente} reservado`, esCambioEstado: false };
  }
  if (reg.accion === 'CAMBIO_DISPONIBILIDAD_VEHICULO') {
    const anterior = (reg.valor_anterior?.disponibilidad as string) || '?';
    const nuevo = (reg.valor_nuevo?.disponibilidad as string) || '?';
    return { texto: `${anterior} → ${nuevo}`, esCambioEstado: false, anterior, nuevo };
  }
  return { texto: reg.accion, esCambioEstado: false };
}

function JsonBlock({ label, data }: { label: string; data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-neutral-400 italic">Sin datos</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-1.5">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="font-mono font-semibold text-neutral-500 shrink-0">{key}:</span>
            <span className="font-mono text-neutral-900 break-all">
              {typeof value === 'object' ? JSON.stringify(value) : String(value ?? 'null')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 25;

export default function HistorialClient({ registros, metricas }: HistorialClientProps) {
  const [filtrosEntidad, setFiltrosEntidad] = useState('');
  const [filtrosAccion, setFiltrosAccion] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [detailRegistro, setDetailRegistro] = useState<AuditoriaRegistro | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredRegistros = useMemo(() => {
    return registros.filter((r) => {
      if (filtrosEntidad && r.entidad !== filtrosEntidad) return false;
      if (filtrosAccion && r.accion !== filtrosAccion) return false;
      if (fechaDesde && r.created_at < fechaDesde) return false;
      if (fechaHasta && r.created_at > fechaHasta + 'T23:59:59') return false;
      return true;
    });
  }, [registros, filtrosEntidad, filtrosAccion, fechaDesde, fechaHasta]);

  const totalPaginas = Math.max(1, Math.ceil(filteredRegistros.length / ITEMS_PER_PAGE));
  const paginaSegura = Math.min(paginaActual, totalPaginas);

  const registrosPagina = useMemo(() => {
    const start = (paginaSegura - 1) * ITEMS_PER_PAGE;
    return filteredRegistros.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRegistros, paginaSegura]);

  function limpiarFiltros() {
    setFiltrosEntidad('');
    setFiltrosAccion('');
    setFechaDesde('');
    setFechaHasta('');
    setPaginaActual(1);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const result = await getAuditoriaAction();
      if (result.success && result.data) {
        window.location.reload();
      }
    } finally {
      setIsRefreshing(false);
    }
  }

  const tieneFiltros = filtrosEntidad || filtrosAccion || fechaDesde || fechaHasta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <History className="w-7 h-7 text-neutral-900" />
            <span>Historial y Trazabilidad</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Registro de acciones del sistema: cambios de estado y asignación de vehículos
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Solicitudes Finalizadas</p>
            <p className="text-3xl font-bold text-neutral-900 mt-1">{metricas.solicitudesFinalizadas}</p>
          </div>
          <div className="w-11 h-11 rounded-xl border border-neutral-300 flex items-center justify-center text-neutral-900">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-900 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Vehículos Reservados</p>
            <p className="text-3xl font-bold text-white mt-1">{metricas.vehiculosReservados}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <Car className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Solicitudes Canceladas</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{metricas.solicitudesCanceladas}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
          <Filter className="w-4 h-4" />
          <span>Filtros</span>
          {tieneFiltros && (
            <button
              onClick={limpiarFiltros}
              className="ml-auto text-neutral-400 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Entidad</label>
            <select
              value={filtrosEntidad}
              onChange={(e) => { setFiltrosEntidad(e.target.value); setPaginaActual(1); }}
              className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">Todas</option>
              <option value="solicitud">Solicitud</option>
              <option value="solicitud_vehiculo">Solicitud Vehículo</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Acción</label>
            <select
              value={filtrosAccion}
              onChange={(e) => { setFiltrosAccion(e.target.value); setPaginaActual(1); }}
              className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">Todas</option>
              <option value="CAMBIO_ESTADO">Cambio de Estado</option>
              <option value="ASIGNACION_VEHICULO">Asignación Vehículo</option>
              <option value="CAMBIO_DISPONIBILIDAD_VEHICULO">Cambio Disponibilidad</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Fecha Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setPaginaActual(1); }}
              className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Fecha Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setPaginaActual(1); }}
              className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>
        <p className="text-xs text-neutral-500 font-medium">
          {filteredRegistros.length} de {registros.length} registros
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase font-semibold text-neutral-500 tracking-wider">
                <th className="py-3.5 px-4">Fecha Solicitud</th>
                <th className="py-3.5 px-4">Fecha Cambio</th>
                <th className="py-3.5 px-4">Responsable</th>
                <th className="py-3.5 px-4">Chasis</th>
                <th className="py-3.5 px-4">Patente</th>
                <th className="py-3.5 px-4">Detalle</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {registrosPagina.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    No se encontraron registros que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                registrosPagina.map((reg) => {
                  const detalle = getDetalle(reg);
                  const accCfg = accionConfig[reg.accion] || { label: reg.accion, color: 'bg-neutral-100 text-neutral-600' };
                  const entCfg = entidadConfig[reg.entidad] || { label: reg.entidad, color: 'bg-neutral-100 text-neutral-600' };

                  return (
                    <tr key={reg.id} className="hover:bg-neutral-50 transition-colors">
                      {/* Fecha Solicitud */}
                      <td className="py-3.5 px-4 text-xs text-neutral-500">
                        {formatFecha(reg.solicitud_fecha_creacion)}
                      </td>

                      {/* Fecha Cambio */}
                      <td className="py-3.5 px-4 text-xs text-neutral-500 whitespace-nowrap">
                        {formatFechaHora(reg.created_at)}
                      </td>

                      {/* Responsable */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center font-bold text-[9px] text-white uppercase shrink-0">
                            {(reg.usuario_nombre || '?').charAt(0)}
                            {(reg.usuario_apellido || '').charAt(0)}
                          </div>
                          <span className="text-neutral-900 font-medium text-xs">
                            {reg.usuario_nombre} {reg.usuario_apellido}
                          </span>
                        </div>
                      </td>

                      {/* Chasis */}
                      <td className="py-3.5 px-4 font-mono text-xs text-neutral-700">
                        {reg.chasis || <span className="text-neutral-300">—</span>}
                      </td>

                      {/* Patente */}
                      <td className="py-3.5 px-4">
                        {reg.patente ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-neutral-900 text-white font-mono">
                            {reg.patente}
                          </span>
                        ) : (
                          <span className="text-neutral-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Detalle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold ${entCfg.color}`}>
                            {entCfg.label}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold ${accCfg.color}`}>
                            {accCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 mt-1.5 font-medium">
                          {reg.accion === 'CAMBIO_ESTADO' ? (
                            <>
                              <span className={`font-semibold ${estadoColores[detalle.anterior || ''] || ''}`}>{detalle.anterior}</span>
                              <span className="text-neutral-400 mx-1">→</span>
                              <span className={`font-semibold ${estadoColores[detalle.nuevo || ''] || ''}`}>{detalle.nuevo}</span>
                            </>
                          ) : (
                            detalle.texto
                          )}
                        </p>
                        {reg.solicitud_id && (
                          <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            Solicitud {formatId(reg.solicitud_id)}
                          </p>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setDetailRegistro(reg)}
                          title="Ver detalle"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50">
            <p className="text-xs text-neutral-500 font-medium">
              Página {paginaSegura} de {totalPaginas}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaSegura <= 1}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPaginas <= 7) {
                  pageNum = i + 1;
                } else if (paginaSegura <= 4) {
                  pageNum = i + 1;
                } else if (paginaSegura >= totalPaginas - 3) {
                  pageNum = totalPaginas - 6 + i;
                } else {
                  pageNum = paginaSegura - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPaginaActual(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      pageNum === paginaSegura
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaSegura >= totalPaginas}
                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Detalle de Registro */}
      {detailRegistro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Detalle de Registro</h2>
                  <p className="text-xs text-neutral-500">
                    {accionConfig[detailRegistro.accion]?.label || detailRegistro.accion}
                    {detailRegistro.solicitud_id && (
                      <> · Solicitud {formatId(detailRegistro.solicitud_id)}</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailRegistro(null)}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Fecha del Cambio</p>
                  <p className="text-sm text-neutral-900 font-medium">{formatFechaHora(detailRegistro.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Responsable</p>
                  <p className="text-sm text-neutral-900 font-medium">
                    {detailRegistro.usuario_nombre} {detailRegistro.usuario_apellido}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Entidad</p>
                  <p className="text-sm text-neutral-900 font-medium">
                    {entidadConfig[detailRegistro.entidad]?.label || detailRegistro.entidad}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Acción</p>
                  <p className="text-sm text-neutral-900 font-medium">
                    {accionConfig[detailRegistro.accion]?.label || detailRegistro.accion}
                  </p>
                </div>
                {detailRegistro.chasis && (
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Chasis</p>
                    <p className="text-sm text-neutral-900 font-mono font-medium">{detailRegistro.chasis}</p>
                  </div>
                )}
                {detailRegistro.patente && (
                  <div>
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Patente</p>
                    <p className="text-sm text-neutral-900 font-mono font-bold">{detailRegistro.patente}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-100" />

              {/* Valor Anterior */}
              <JsonBlock label="Valor Anterior" data={detailRegistro.valor_anterior} />

              {/* Valor Nuevo */}
              <JsonBlock label="Valor Nuevo" data={detailRegistro.valor_nuevo} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
