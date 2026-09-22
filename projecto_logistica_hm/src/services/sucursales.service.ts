import { createAdminClient } from '@/lib/supabase/admin';
import {
  CreateSucursalInput,
  Sucursal,
  SucursalSolicitudItem,
  UpdateSucursalInput,
  VehiculoAsociado,
} from '@/types/sucursal.types';

interface SolicitudRawRow {
  id: string;
  sucursal: number;
  estado: SucursalSolicitudItem['estado'];
  tipo_solicitud: SucursalSolicitudItem['tipo_solicitud'];
  posicion_prioridad: number | null;
  fecha_creacion: string | null;
  fecha_tentativa_despacho: string | null;
  fecha_limite: string | null;
  motivo_cancelacion: string | null;
  ejecutivo: { id: string; nombre: string; apellido: string } | null;
  jefe: { id: string; nombre: string; apellido: string } | null;
  logistica: { id: string; nombre: string; apellido: string } | null;
  solicitud_vehiculo: Array<{
    id: string;
    disponibilidad: VehiculoAsociado['disponibilidad'];
    vehiculo: {
      patente: string;
      chasis: string;
      marca: string;
      modelo: string;
      anio: number;
      color: string | null;
    } | null;
  }> | null;
}

function formatPersona(p: { nombre: string; apellido: string } | null): string | null {
  if (!p) return null;
  return `${p.nombre} ${p.apellido}`.trim();
}

export class SucursalesService {
  static async getSucursales(): Promise<Sucursal[]> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('sucursal')
        .select('*, encargado:usuario_id(id, nombre, apellido), zona:zona_id(id, nombre)')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error al listar sucursales:', error);
        return [];
      }

      return (data || []) as unknown as Sucursal[];
    } catch (err) {
      console.error('Error en getSucursales:', err);
      return [];
    }
  }

  static async getSolicitudesPorSucursal(): Promise<SucursalSolicitudItem[]> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('solicitud')
        .select(
          `id, sucursal, estado, tipo_solicitud, posicion_prioridad,
           fecha_creacion, fecha_tentativa_despacho, fecha_limite, motivo_cancelacion,
           ejecutivo:ejecutivo_id(id, nombre, apellido),
           jefe:jefe_local_id(id, nombre, apellido),
           logistica:logistica_id(id, nombre, apellido),
           solicitud_vehiculo(id, disponibilidad, vehiculo(chasis, patente, marca, modelo, anio, color))`
        )
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.error('Error al obtener solicitudes por sucursal:', error);
        return [];
      }

      const rows = (data || []) as unknown as SolicitudRawRow[];

      return rows.map((row) => ({
        id: row.id,
        sucursal: row.sucursal,
        estado: row.estado,
        tipo_solicitud: row.tipo_solicitud,
        posicion_prioridad: row.posicion_prioridad,
        fecha_creacion: row.fecha_creacion,
        fecha_tentativa_despacho: row.fecha_tentativa_despacho,
        fecha_limite: row.fecha_limite,
        motivo_cancelacion: row.motivo_cancelacion,
        ejecutivo: formatPersona(row.ejecutivo) || 'Sin responsable',
        jefe_local: formatPersona(row.jefe),
        logistica: formatPersona(row.logistica),
        ejecutivo_id: row.ejecutivo?.id ?? null,
        jefe_local_id: row.jefe?.id ?? null,
        logistica_id: row.logistica?.id ?? null,
        vehiculos: (row.solicitud_vehiculo || [])
          .filter((sv) => sv.vehiculo)
          .map((sv) => ({
            solicitud_vehiculo_id: sv.id,
            disponibilidad: sv.disponibilidad,
            patente: sv.vehiculo!.patente,
            chasis: sv.vehiculo!.chasis,
            marca: sv.vehiculo!.marca,
            modelo: sv.vehiculo!.modelo,
            anio: sv.vehiculo!.anio,
            color: sv.vehiculo!.color,
          })),
      }));
    } catch (err) {
      console.error('Error en getSolicitudesPorSucursal:', err);
      return [];
    }
  }

  static async createSucursal(input: CreateSucursalInput): Promise<{
    success: boolean;
    sucursal?: Sucursal;
    error?: string;
  }> {
    try {
      const admin = createAdminClient();

      const { data: existing } = await admin
        .from('sucursal')
        .select('id, nombre')
        .ilike('nombre', input.nombre.trim());

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: `Ya existe una sucursal registrada con el nombre "${input.nombre.trim()}".`,
        };
      }

      const { data, error } = await admin
        .from('sucursal')
        .insert({
          nombre: input.nombre.trim(),
          direccion: input.direccion?.trim() || null,
          slots: input.slots,
          zona_id: input.zona_id ?? null,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, sucursal: data as Sucursal };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al crear la sucursal';
      return { success: false, error: msg };
    }
  }

  static async updateSucursal(id: number, input: UpdateSucursalInput): Promise<{
    success: boolean;
    sucursal?: Sucursal;
    error?: string;
  }> {
    try {
      const admin = createAdminClient();

      if (input.nombre !== undefined) {
        const { data: existing } = await admin
          .from('sucursal')
          .select('id')
          .ilike('nombre', input.nombre.trim())
          .neq('id', id);

        if (existing && existing.length > 0) {
          return {
            success: false,
            error: `Ya existe otra sucursal con el nombre "${input.nombre.trim()}".`,
          };
        }
      }

      const updateData: Record<string, unknown> = {};
      if (input.nombre !== undefined) updateData.nombre = input.nombre.trim();
      if (input.direccion !== undefined) updateData.direccion = input.direccion?.trim() || null;
      if (input.slots !== undefined) updateData.slots = input.slots;
      if (input.zona_id !== undefined) updateData.zona_id = input.zona_id ?? null;

      const { data, error } = await admin
        .from('sucursal')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, sucursal: data as Sucursal };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al actualizar la sucursal';
      return { success: false, error: msg };
    }
  }

  static async deleteSucursal(id: number): Promise<{
    success: boolean;
    solicitudesEliminadas?: number;
    error?: string;
  }> {
    try {
      const admin = createAdminClient();

      const { count: usuariosAsignados, error: usuariosError } = await admin
        .from('usuario')
        .select('id', { count: 'exact', head: true })
        .eq('sucursal_id', id);

      if (usuariosError) {
        return { success: false, error: usuariosError.message };
      }

      if ((usuariosAsignados || 0) > 0) {
        return {
          success: false,
          error: `No se puede eliminar: hay ${usuariosAsignados} usuario(s) con esta sucursal asignada. Reasígnalos primero desde Gestión de Usuarios.`,
        };
      }

      const { count: solicitudes, error: solicitudesError } = await admin
        .from('solicitud')
        .select('id', { count: 'exact', head: true })
        .eq('sucursal', id);

      if (solicitudesError) {
        return { success: false, error: solicitudesError.message };
      }

      const { error: deleteError } = await admin.from('sucursal').delete().eq('id', id);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      return { success: true, solicitudesEliminadas: solicitudes || 0 };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al eliminar la sucursal';
      return { success: false, error: msg };
    }
  }
}
