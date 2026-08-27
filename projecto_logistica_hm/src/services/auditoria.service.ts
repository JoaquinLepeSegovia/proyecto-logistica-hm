import { createAdminClient } from '@/lib/supabase/admin';
import { AuditoriaFiltros, AuditoriaRegistro } from '@/types/auditoria.types';

interface AuditoriaRawRow {
  id: string;
  usuario_id: string;
  entidad: string;
  entidad_id: string;
  accion: string;
  valor_anterior: Record<string, unknown> | null;
  valor_nuevo: Record<string, unknown> | null;
  created_at: string;
  usuario: { nombre: string; apellido: string } | null;
}

interface SolicitudVehiculoRow {
  id: string;
  solicitud_id: string;
  vehiculo_id: string;
}

interface SolicitudRow {
  id: string;
  fecha_creacion: string | null;
}

interface VehiculoRow {
  id: string;
  chasis: string;
  patente: string;
}

export interface AuditoriaMetricas {
  solicitudesFinalizadas: number;
  vehiculosReservados: number;
  solicitudesCanceladas: number;
}

export class AuditoriaService {
  static async getMetricas(): Promise<AuditoriaMetricas> {
    try {
      const admin = createAdminClient();

      const [finalizadasResult, reservadosResult, canceladasResult] = await Promise.all([
        admin
          .from('solicitud')
          .select('id', { count: 'exact', head: true })
          .in('estado', ['entregada', 'finalizada']),
        admin
          .from('solicitud_vehiculo')
          .select('id', { count: 'exact', head: true })
          .eq('disponibilidad', 'reservado'),
        admin
          .from('solicitud')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'cancelada'),
      ]);

      return {
        solicitudesFinalizadas: finalizadasResult.count || 0,
        vehiculosReservados: reservadosResult.count || 0,
        solicitudesCanceladas: canceladasResult.count || 0,
      };
    } catch (err) {
      console.error('Error en getMetricas:', err);
      return { solicitudesFinalizadas: 0, vehiculosReservados: 0, solicitudesCanceladas: 0 };
    }
  }

  static async getAuditoria(filtros?: AuditoriaFiltros): Promise<AuditoriaRegistro[]> {
    try {
      const admin = createAdminClient();

      // 1. Query base: auditoría + usuario
      let query = admin
        .from('auditoria')
        .select('*, usuario:usuario_id(nombre, apellido)');

      if (filtros?.entidad) {
        query = query.eq('entidad', filtros.entidad);
      }
      if (filtros?.accion) {
        query = query.eq('accion', filtros.accion);
      }
      if (filtros?.fecha_desde) {
        query = query.gte('created_at', filtros.fecha_desde);
      }
      if (filtros?.fecha_hasta) {
        query = query.lte('created_at', filtros.fecha_hasta);
      }

      query = query.order('created_at', { ascending: false });

      const { data: auditoriaData, error: auditoriaError } = await query;

      if (auditoriaError) {
        console.error('Error al consultar auditoría:', auditoriaError);
        return [];
      }

      const rows = (auditoriaData || []) as unknown as AuditoriaRawRow[];
      if (rows.length === 0) return [];

      // 2. Obtener todas las solicitud_vehiculo involucradas (para resolver entidad_id → solicitud_id + vehiculo_id)
      const svIds = rows
        .filter((r) => r.entidad === 'solicitud_vehiculo')
        .map((r) => r.entidad_id);

      const solicitudIdsFromSolicitud = rows
        .filter((r) => r.entidad === 'solicitud')
        .map((r) => r.entidad_id);

      let svMap = new Map<string, SolicitudVehiculoRow>();
      let solicitudMap = new Map<string, SolicitudRow>();
      let vehiculoMap = new Map<string, VehiculoRow>();

      // Queries paralelas
      const [svResult, solResult, vehResult] = await Promise.all([
        svIds.length > 0
          ? admin
              .from('solicitud_vehiculo')
              .select('id, solicitud_id, vehiculo_id')
              .in('id', svIds)
          : Promise.resolve({ data: [], error: null }),
        admin
          .from('solicitud')
          .select('id, fecha_creacion')
          .in('id', [...new Set([...svIds.map(() => ''), ...solicitudIdsFromSolicitud])].filter(Boolean)),
        admin
          .from('vehiculo')
          .select('id, chasis, patente'),
      ]);

      // 3. Construir maps
      if (svResult.data) {
        for (const sv of svResult.data as SolicitudVehiculoRow[]) {
          svMap.set(sv.id, sv);
        }
      }

      // Solicitudes: buscar las de solicitud_vehiculo también
      const allSolicitudIds = new Set<string>(solicitudIdsFromSolicitud);
      for (const sv of svMap.values()) {
        allSolicitudIds.add(sv.solicitud_id);
      }

      if (allSolicitudIds.size > 0) {
        const { data: solData } = await admin
          .from('solicitud')
          .select('id, fecha_creacion')
          .in('id', Array.from(allSolicitudIds));

        if (solData) {
          for (const s of solData as SolicitudRow[]) {
            solicitudMap.set(s.id, s);
          }
        }
      }

      if (vehResult.data) {
        for (const v of vehResult.data as VehiculoRow[]) {
          vehiculoMap.set(v.id, v);
        }
      }

      // 4. Merge: enriquecer cada registro de auditoría
      return rows.map((row): AuditoriaRegistro => {
        let solicitudId: string | null = null;
        let solicitudFecha: string | null = null;
        let chasis: string | null = null;
        let patente: string | null = null;

        if (row.entidad === 'solicitud') {
          solicitudId = row.entidad_id;
          const sol = solicitudMap.get(row.entidad_id);
          solicitudFecha = sol?.fecha_creacion || null;
        } else if (row.entidad === 'solicitud_vehiculo') {
          const sv = svMap.get(row.entidad_id);
          if (sv) {
            solicitudId = sv.solicitud_id;
            const sol = solicitudMap.get(sv.solicitud_id);
            solicitudFecha = sol?.fecha_creacion || null;
            const veh = vehiculoMap.get(sv.vehiculo_id);
            if (veh) {
              chasis = veh.chasis;
              patente = veh.patente;
            }
          }
        }

        return {
          id: row.id,
          usuario_id: row.usuario_id,
          entidad: row.entidad,
          entidad_id: row.entidad_id,
          accion: row.accion,
          valor_anterior: row.valor_anterior,
          valor_nuevo: row.valor_nuevo,
          created_at: row.created_at,
          usuario_nombre: row.usuario?.nombre || null,
          usuario_apellido: row.usuario?.apellido || null,
          solicitud_id: solicitudId,
          solicitud_fecha_creacion: solicitudFecha,
          chasis,
          patente,
        };
      });
    } catch (err) {
      console.error('Error en getAuditoria:', err);
      return [];
    }
  }
}
