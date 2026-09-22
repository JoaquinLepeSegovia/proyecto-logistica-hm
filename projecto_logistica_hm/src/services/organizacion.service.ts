import { createAdminClient } from '@/lib/supabase/admin';
import { UsuarioSucursalAsignada, UsuarioZonaAsignada } from '@/types/auth.types';
import { Zona } from '@/types/sucursal.types';
import { Marca, CreateMarcaInput, UpdateMarcaInput, VehiculoConDisponibilidad } from '@/types/vehiculo.types';

/**
 * Servicio de ORGANIZACION (DEV 1).
 *
 * Responsabilidades:
 *  - CRUD de ZONAS territoriales (V Region, Santiago, Maule, ...).
 *  - CRUD del CATALOGO DE MARCAS (tabla public.marca) generado por UI / por
 *    autocreacion durante la importacion CSV.
 *  - CONTRATO para DEV 2 (modulo Solicitudes + Logistica):
 *      * getUserAssignedBranches(usuarioId)  -> sucursales asignadas (principal + N:M)
 *      * getUserZones(usuarioId)             -> zonas asignadas a logistica
 *      * getBranch(id) / getZone(id)
 *      * getVehicle(id) / getAvailableVehicles()
 *      * usuarioTieneSucursal(usuarioId, sucursalId) -> validacion de negocio
 *
 * Regla de no-duplicacion DEV 2: DEV 2 DEBE consumir estas funciones en lugar de
 * reimplementar la logica de asignacion de sucursales/zonas.
 */
export class OrganizacionService {
  // ==========================================================================
  // ZONAS
  // ==========================================================================

  static async getZonas(): Promise<Zona[]> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.from('zona').select('*').order('nombre', { ascending: true });
      if (error) {
        console.error('Error al listar zonas:', error);
        return [];
      }
      return (data || []) as Zona[];
    } catch (err) {
      console.error('Error en getZonas:', err);
      return [];
    }
  }

  static async createZona(nombre: string): Promise<{ success: boolean; zona?: Zona; error?: string }> {
    try {
      const admin = createAdminClient();
      const clean = nombre.trim();
      if (!clean) return { success: false, error: 'El nombre de la zona es obligatorio.' };

      const { data: existing } = await admin
        .from('zona')
        .select('id')
        .ilike('nombre', clean)
        .maybeSingle();

      if (existing) {
        return { success: false, error: `Ya existe una zona registrada con el nombre "${clean}".` };
      }

      const { data, error } = await admin
        .from('zona')
        .insert({ nombre: clean })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, zona: data as Zona };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al crear la zona';
      return { success: false, error: msg };
    }
  }

  static async updateZona(id: number, nombre: string): Promise<{ success: boolean; zona?: Zona; error?: string }> {
    try {
      const admin = createAdminClient();
      const clean = nombre.trim();
      if (!clean) return { success: false, error: 'El nombre de la zona es obligatorio.' };

      const { data: existing } = await admin
        .from('zona')
        .select('id')
        .ilike('nombre', clean)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return { success: false, error: `Ya existe otra zona con el nombre "${clean}".` };
      }

      const { data, error } = await admin
        .from('zona')
        .update({ nombre: clean })
        .eq('id', id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, zona: data as Zona };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al actualizar la zona';
      return { success: false, error: msg };
    }
  }

  static async deleteZona(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const admin = createAdminClient();

      const { count: sucursales } = await admin
        .from('sucursal')
        .select('id', { count: 'exact', head: true })
        .eq('zona_id', id);

      if ((sucursales || 0) > 0) {
        return {
          success: false,
          error: `No se puede eliminar: hay ${sucursales} sucursale(s) en esta zona. Reasígnalas primero.`,
        };
      }

      const { error } = await admin.from('zona').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al eliminar la zona';
      return { success: false, error: msg };
    }
  }

  // ==========================================================================
  // CATALOGO DE MARCAS
  // ==========================================================================

  static async getMarcasCatalogo(): Promise<Marca[]> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('marca')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error al listar marcas del catálogo:', error);
        return [];
      }
      return (data || []) as Marca[];
    } catch (err) {
      console.error('Error en getMarcasCatalogo:', err);
      return [];
    }
  }

  static async createMarca(input: CreateMarcaInput): Promise<{ success: boolean; marca?: Marca; error?: string }> {
    try {
      const admin = createAdminClient();
      const codigo = input.codigo.trim().toUpperCase();
      const nombre = input.nombre.trim();

      if (!codigo || !nombre) {
        return { success: false, error: 'El código y el nombre de la marca son obligatorios.' };
      }

      const { data: existing } = await admin
        .from('marca')
        .select('id')
        .eq('codigo', codigo)
        .maybeSingle();

      if (existing) {
        return { success: false, error: `Ya existe una marca con el código "${codigo}".` };
      }

      const { data, error } = await admin
        .from('marca')
        .insert({ codigo, nombre })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, marca: data as Marca };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al crear la marca';
      return { success: false, error: msg };
    }
  }

  static async updateMarca(id: number, input: UpdateMarcaInput): Promise<{ success: boolean; marca?: Marca; error?: string }> {
    try {
      const admin = createAdminClient();
      const updateData: Record<string, unknown> = {};
      if (input.codigo !== undefined) {
        const codigo = input.codigo.trim().toUpperCase();
        if (!codigo) return { success: false, error: 'El código de la marca es obligatorio.' };
        const { data: existing } = await admin
          .from('marca')
          .select('id')
          .eq('codigo', codigo)
          .neq('id', id)
          .maybeSingle();
        if (existing) return { success: false, error: `Ya existe otra marca con el código "${codigo}".` };
        updateData.codigo = codigo;
      }
      if (input.nombre !== undefined) {
        const nombre = input.nombre.trim();
        if (!nombre) return { success: false, error: 'El nombre de la marca es obligatorio.' };
        updateData.nombre = nombre;
      }

      const { data, error } = await admin
        .from('marca')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, marca: data as Marca };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al actualizar la marca';
      return { success: false, error: msg };
    }
  }

  static async deleteMarca(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const admin = createAdminClient();
      const { error } = await admin.from('marca').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al eliminar la marca';
      return { success: false, error: msg };
    }
  }

  /**
   * Autocrea una marca en el catalogo si el codigo no existe. Usado por la
   * importacion CSV y por el alta de vehiculos. Devuelve el nombre comercial a
   * guardar en vehiculo.marca (si no hay catalogo, se usa el codigo, normalizado).
   */
  static async asegurarMarcaCodigo(codigoRaw: string): Promise<string> {
    const codigo = (codigoRaw || '').trim().toUpperCase();
    if (!codigo) return codigoRaw?.trim() || '';

    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from('marca')
        .select('codigo, nombre')
        .eq('codigo', codigo)
        .maybeSingle();

      if (data) return data.nombre;

      await admin.from('marca').insert({ codigo, nombre: codigo });
      return codigo;
    } catch (err) {
      console.error('Error en asegurarMarcaCodigo:', err);
      return codigo;
    }
  }

  // ==========================================================================
  // CONTRATO DEV 2 — asignacion de sucursales / zonas
  // ==========================================================================

  /** Sucursales asignadas a un usuario = principal (usuario.sucursal_id) + N:M (usuario_sucursal). */
  static async getUserAssignedBranches(usuarioId: string): Promise<UsuarioSucursalAsignada[]> {
    if (!usuarioId) return [];
    try {
      const admin = createAdminClient();

      const [principal, asignadas] = await Promise.all([
        admin
          .from('usuario')
          .select('sucursal_id, sucursal:sucursal_id(id, nombre)')
          .eq('id', usuarioId)
          .maybeSingle(),
        admin
          .from('usuario_sucursal')
          .select('sucursal_id, sucursal:sucursal_id(id, nombre)')
          .eq('usuario_id', usuarioId),
      ]);

      const mapa = new Map<number, UsuarioSucursalAsignada>();

      const principalData = principal.data as {
        sucursal_id: number | null;
        sucursal: { id: number; nombre: string | null } | Array<{ id: number; nombre: string | null }> | null;
      } | null;
      if (principalData?.sucursal_id) {
        const raw = Array.isArray(principalData.sucursal)
          ? principalData.sucursal[0]
          : principalData.sucursal;
        if (raw) mapa.set(principalData.sucursal_id, { id: raw.id, nombre: raw.nombre });
      }

      (asignadas.data || []).forEach((row: {
        sucursal_id: number;
        sucursal: Array<{ id: number; nombre: string | null }> | { id: number; nombre: string | null } | null;
      }) => {
        if (!row.sucursal_id) return;
        const s = Array.isArray(row.sucursal) ? row.sucursal[0] : row.sucursal;
        mapa.set(row.sucursal_id, { id: row.sucursal_id, nombre: s?.nombre ?? null });
      });

      return Array.from(mapa.values());
    } catch (err) {
      console.error('Error en getUserAssignedBranches:', err);
      return [];
    }
  }

  /** Zonas asignadas a un usuario (logistica por zonas). */
  static async getUserZones(usuarioId: string): Promise<UsuarioZonaAsignada[]> {
    if (!usuarioId) return [];
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('usuario_zona')
        .select('zona_id, zona:zona_id(id, nombre)')
        .eq('usuario_id', usuarioId);

      if (error) {
        console.error('Error en getUserZones:', error);
        return [];
      }

      return (data || []).map((row: {
        zona_id: number;
        zona: Array<{ id: number; nombre: string }> | { id: number; nombre: string } | null;
      }) => {
        const z = Array.isArray(row.zona) ? row.zona[0] : row.zona;
        return {
          id: row.zona_id,
          nombre: z?.nombre ?? '',
        };
      });
    } catch (err) {
      console.error('Error en getUserZones:', err);
      return [];
    }
  }

  /** Valida que un usuario gestiona (o pertenece a) una sucursal determinada. Usa la funcion SQL SECURITY DEFINER. */
  static async usuarioTieneSucursal(usuarioId: string, sucursalId: number): Promise<boolean> {
    if (!usuarioId || !sucursalId) return false;
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc('usuario_tiene_sucursal', {
        p_usuario_id: usuarioId,
        p_sucursal_id: sucursalId,
      });

      if (error) {
        // Fallback: replica la consulta si el RPC no esta disponible
        console.warn('RPC usuario_tiene_sucursal no disponible, usando fallback:', error.message);
        const branches = await this.getUserAssignedBranches(usuarioId);
        return branches.some((b) => b.id === sucursalId);
      }

      return data === true;
    } catch (err) {
      console.error('Error en usuarioTieneSucursal:', err);
      return false;
    }
  }

  /** Sucursal simple para DEV 2. */
  static async getBranch(branchId: number): Promise<{ id: number; nombre: string | null; zona_id: number | null } | null> {
    if (!branchId) return null;
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('sucursal')
        .select('id, nombre, zona_id')
        .eq('id', branchId)
        .maybeSingle();

      if (error) return null;
      return data as { id: number; nombre: string | null; zona_id: number | null } | null;
    } catch (err) {
      console.error('Error en getBranch:', err);
      return null;
    }
  }

  /** Zona simple para DEV 2. */
  static async getZone(zoneId: number): Promise<Zona | null> {
    if (!zoneId) return null;
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.from('zona').select('*').eq('id', zoneId).maybeSingle();
      if (error) return null;
      return (data as Zona) || null;
    } catch (err) {
      console.error('Error en getZone:', err);
      return null;
    }
  }

  /** Vehiculo con estado de disponibilidad (mismo criterio que VehiculoService.getVehiculos). */
  static async getVehicle(vehicleId: string): Promise<VehiculoConDisponibilidad | null> {
    if (!vehicleId) return null;
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('vehiculo')
        .select(`
          *,
          sucursal!vehiculo_ubicacion_fkey(nombre),
          solicitud_vehiculo!solicitud_vehiculo_vehiculo_fk (id, solicitud_id, disponibilidad)
        `)
        .eq('id', vehicleId)
        .maybeSingle();

      if (error || !data) return null;

      const v = data as Record<string, unknown>;
      const sv = v.solicitud_vehiculo as Array<{ solicitud_id: string; disponibilidad: string }> | null;
      const reservaActiva = sv?.find((s) => s.disponibilidad === 'reservado');
      const vendido = !reservaActiva && (sv?.some((s) => s.disponibilidad === 'vendido') || false);
      const sucursalUbicacion = v.sucursal as { nombre?: string | null } | null;

      return {
        id: v.id as string,
        chasis: v.chasis as string,
        patente: (v.patente as string | null) ?? null,
        marca: v.marca as string,
        modelo: v.modelo as string,
        anio: v.anio as number,
        color: v.color as string | null,
        precio: v.precio as number | null,
        ubicacion: v.ubicacion as number | null,
        ubicacion_nombre: sucursalUbicacion?.nombre || null,
        created_at: v.created_at as string,
        updated_at: v.updated_at as string,
        estado_disponibilidad: reservaActiva ? 'reservado' : vendido ? 'vendido' : 'liberado',
        solicitud_id: reservaActiva?.solicitud_id || null,
      } as VehiculoConDisponibilidad;
    } catch (err) {
      console.error('Error en getVehicle:', err);
      return null;
    }
  }

  /** Vehiculos disponibles (LIBERADOS: sin reserva activa ni venta). */
  static async getAvailableVehicles(): Promise<VehiculoConDisponibilidad[]> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('vehiculo')
        .select(`
          *,
          sucursal!vehiculo_ubicacion_fkey(nombre),
          solicitud_vehiculo!solicitud_vehiculo_vehiculo_fk (id, solicitud_id, disponibilidad)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error en getAvailableVehicles:', error);
        return [];
      }

      const disponibles: VehiculoConDisponibilidad[] = [];
      for (const v of (data || []) as Array<Record<string, unknown>>) {
        const sv = v.solicitud_vehiculo as Array<{ solicitud_id: string; disponibilidad: string }> | null;
        const reservaActiva = sv?.find((s) => s.disponibilidad === 'reservado');
        const vendido = sv?.some((s) => s.disponibilidad === 'vendido') || false;
        if (reservaActiva || vendido) continue;

        const sucursalUbicacion = v.sucursal as { nombre?: string | null } | null;
        disponibles.push({
          id: v.id as string,
          chasis: v.chasis as string,
          patente: (v.patente as string | null) ?? null,
          marca: v.marca as string,
          modelo: v.modelo as string,
          anio: v.anio as number,
          color: v.color as string | null,
          precio: v.precio as number | null,
          ubicacion: v.ubicacion as number | null,
          ubicacion_nombre: sucursalUbicacion?.nombre || null,
          created_at: v.created_at as string,
          updated_at: v.updated_at as string,
          estado_disponibilidad: 'liberado',
          solicitud_id: null,
        } as VehiculoConDisponibilidad);
      }

      return disponibles;
    } catch (err) {
      console.error('Error en getAvailableVehicles:', err);
      return [];
    }
  }
}