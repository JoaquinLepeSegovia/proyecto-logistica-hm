import { createAdminClient } from '@/lib/supabase/admin';
import { Vehiculo, VehiculoConDisponibilidad, CreateVehiculoInput, UpdateVehiculoInput } from '@/types/vehiculo.types';
import { OrganizacionService } from '@/services/organizacion.service';
import type { SupabaseClient } from '@supabase/supabase-js';

export class VehiculoService {
  /**
   * Obtiene la lista completa de vehículos con su estado de disponibilidad
   */
  static async getVehiculos(): Promise<VehiculoConDisponibilidad[]> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('vehiculo')
        .select(`
          *,
          sucursal!vehiculo_ubicacion_fkey(nombre),
          solicitud_vehiculo!solicitud_vehiculo_vehiculo_fk (
            id,
            solicitud_id,
            disponibilidad
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al listar vehículos:', error);
        return [];
      }

      const vehiculos = (data || []).map((v: Record<string, unknown>) => {
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
      });

      return vehiculos;
    } catch (err) {
      console.error('Error en getVehiculos:', err);
      return [];
    }
  }

  /**
   * Obtiene las marcas únicas registradas en la base de datos
   */
  static async getMarcas(): Promise<string[]> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('vehiculo')
        .select('marca')
        .order('marca');

      if (error) {
        console.error('Error al obtener marcas:', error);
        return [];
      }

      const marcasUnicas = [...new Set((data || []).map((v: { marca: string }) => v.marca))];
      return marcasUnicas;
    } catch (err) {
      console.error('Error en getMarcas:', err);
      return [];
    }
  }

  /**
   * Verifica la disponibilidad de un vehículo específico
   */
  static async verificarDisponibilidad(id: string): Promise<{
    reservado: boolean;
    vendido: boolean;
    solicitud_id?: string;
  }> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('solicitud_vehiculo')
        .select('solicitud_id, disponibilidad')
        .eq('vehiculo_id', id);

      if (error) {
        console.error('Error al verificar disponibilidad:', error);
        return { reservado: false, vendido: false };
      }

      const reservaActiva = (data || []).find((s) => s.disponibilidad === 'reservado');
      const vendido = (data || []).some((s) => s.disponibilidad === 'vendido');

      return {
        reservado: !!reservaActiva,
        vendido,
        solicitud_id: reservaActiva?.solicitud_id,
      };
    } catch (err) {
      console.error('Error en verificarDisponibilidad:', err);
      return { reservado: false, vendido: false };
    }
  }

  /**
   * Crea un nuevo vehículo
   */
  static async createVehiculo(input: CreateVehiculoInput): Promise<{
    success: boolean;
    vehiculo?: Vehiculo;
    error?: string;
  }> {
    try {
      const admin = createAdminClient();
      const cleanChasis = input.chasis.trim().toUpperCase();
      const cleanPatente = input.patente?.trim().toUpperCase() || null;
      const cleanMarca = input.marca.trim();
      const cleanModelo = input.modelo.trim();

      // Validar chasis (17 caracteres alfanuméricos)
      if (!/^[A-Z0-9]{17}$/i.test(cleanChasis)) {
        return {
          success: false,
          error: 'El chasis debe tener exactamente 17 caracteres alfanuméricos.',
        };
      }

      // Validar patente opcional (formato chileno: XXXX-XX o XXXX-XXXX)
      if (cleanPatente !== null && !/^[A-Z]{4}-[0-9]{2,4}$/i.test(cleanPatente)) {
        return {
          success: false,
          error: 'La patente debe tener el formato XXXX-XX o XXXX-XXXX (letras y guión).',
        };
      }

      // Verificar chasis duplicado
      const { data: existingChasis } = await admin
        .from('vehiculo')
        .select('id')
        .eq('chasis', cleanChasis)
        .maybeSingle();

      if (existingChasis) {
        return {
          success: false,
          error: `Ya existe un vehículo con el chasis ${cleanChasis}.`,
        };
      }

      // Verificar patente duplicada (solo si se entrega patente)
      if (cleanPatente !== null) {
        const { data: existingPatente } = await admin
          .from('vehiculo')
          .select('id')
          .eq('patente', cleanPatente)
          .maybeSingle();

        if (existingPatente) {
          return {
            success: false,
            error: `Ya existe un vehículo con la patente ${cleanPatente}.`,
          };
        }
      }

      // Validar año
      const currentYear = new Date().getFullYear();
      if (input.anio < 1900 || input.anio > currentYear + 1) {
        return {
          success: false,
          error: `El año debe estar entre 1900 y ${currentYear + 1}.`,
        };
      }

      // Validar precio (opcional)
      if (input.precio !== undefined && input.precio !== null && input.precio < 0) {
        return {
          success: false,
          error: 'El precio no puede ser un valor negativo.',
        };
      }

      // Insertar vehículo
      const newVehiculo = {
        chasis: cleanChasis,
        patente: cleanPatente,
        marca: cleanMarca,
        modelo: cleanModelo,
        anio: input.anio,
        color: input.color?.trim() || null,
        precio: input.precio ?? null,
        ubicacion: input.ubicacion ?? null,
      };

      const { data, error } = await admin
        .from('vehiculo')
        .insert(newVehiculo)
        .select()
        .single();

      if (error) {
        console.error('Error al crear vehículo:', error);
        return {
          success: false,
          error: `Error al crear el vehículo: ${error.message}`,
        };
      }

      return {
        success: true,
        vehiculo: data as Vehiculo,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al crear vehículo';
      return { success: false, error: msg };
    }
  }

  /**
   * Actualiza un vehículo existente
   */
  static async updateVehiculo(id: string, input: UpdateVehiculoInput): Promise<{
    success: boolean;
    vehiculo?: Vehiculo;
    error?: string;
  }> {
    try {
      const admin = createAdminClient();

      // Verificar disponibilidad
      const disponibilidad = await this.verificarDisponibilidad(id);
      if (disponibilidad.reservado) {
        return {
          success: false,
          error: 'No se puede modificar un vehículo que se encuentra reservado en una solicitud activa.',
        };
      }
      if (disponibilidad.vendido) {
        return {
          success: false,
          error: 'No se puede modificar un vehículo que ya fue vendido.',
        };
      }

      const updateData: UpdateVehiculoInput = {};

      if (input.chasis !== undefined) {
        const cleanChasis = input.chasis.trim().toUpperCase();
        if (!/^[A-Z0-9]{17}$/i.test(cleanChasis)) {
          return {
            success: false,
            error: 'El chasis debe tener exactamente 17 caracteres alfanuméricos.',
          };
        }
        // Verificar duplicado
        const { data: existing } = await admin
          .from('vehiculo')
          .select('id')
          .eq('chasis', cleanChasis)
          .neq('id', id)
          .maybeSingle();
        if (existing) {
          return { success: false, error: `Ya existe otro vehículo con el chasis ${cleanChasis}.` };
        }
        updateData.chasis = cleanChasis;
      }

      if (input.patente !== undefined) {
        const cleanPatente = input.patente?.trim().toUpperCase() || null;
        if (cleanPatente !== null) {
          if (!/^[A-Z]{4}-[0-9]{2,4}$/i.test(cleanPatente)) {
            return {
              success: false,
              error: 'La patente debe tener el formato XXXX-XX o XXXX-XXXX.',
            };
          }
          // Verificar duplicado
          const { data: existing } = await admin
            .from('vehiculo')
            .select('id')
            .eq('patente', cleanPatente)
            .neq('id', id)
            .maybeSingle();
          if (existing) {
            return { success: false, error: `Ya existe otro vehículo con la patente ${cleanPatente}.` };
          }
        }
        updateData.patente = cleanPatente;
      }

      if (input.marca !== undefined) updateData.marca = input.marca.trim();
      if (input.modelo !== undefined) updateData.modelo = input.modelo.trim();
      if (input.color !== undefined) updateData.color = input.color?.trim() || null;

      if (input.precio !== undefined) {
        if (input.precio !== null && input.precio < 0) {
          return {
            success: false,
            error: 'El precio no puede ser un valor negativo.',
          };
        }
        updateData.precio = input.precio;
      }

      if (input.anio !== undefined) {
        const currentYear = new Date().getFullYear();
        if (input.anio < 1900 || input.anio > currentYear + 1) {
          return { success: false, error: `El año debe estar entre 1900 y ${currentYear + 1}.` };
        }
        updateData.anio = input.anio;
      }

      if (input.ubicacion !== undefined) {
        updateData.ubicacion = input.ubicacion ?? null;
      }

      const { data, error } = await admin
        .from('vehiculo')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error al actualizar vehículo:', error);
        return { success: false, error: `Error al actualizar: ${error.message}` };
      }

      return { success: true, vehiculo: data as Vehiculo };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al actualizar vehículo';
      return { success: false, error: msg };
    }
  }

  /**
   * Elimina un vehículo
   */
  static async deleteVehiculo(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const admin = createAdminClient();

      // Verificar disponibilidad
      const disponibilidad = await this.verificarDisponibilidad(id);
      if (disponibilidad.reservado) {
        return {
          success: false,
          error: 'No se puede eliminar un vehículo que se encuentra reservado en una solicitud activa.',
        };
      }
      if (disponibilidad.vendido) {
        return {
          success: false,
          error: 'No se puede eliminar un vehículo que ya fue vendido.',
        };
      }

      const { error } = await admin
        .from('vehiculo')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar vehículo:', error);
        return { success: false, error: `Error al eliminar: ${error.message}` };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al eliminar vehículo';
      return { success: false, error: msg };
    }
  }

  // ==========================================================================
  // IMPORTACION MASIVA DE STOCK (CSV)
  // ==========================================================================
  //
  // Formato esperado: exportacion del stock (modelo_excel/STOCK VN .xls / CSV).
  // Columnas (por nombre de encabezado, insensible a mayusculas):
  //   C.comp   -> codigo de sucursal (se mapea a sucursal.id; fallback por nombre)
  //   Marca    -> codigo de marca (resuelto contra el catalogo; autocrea si falta)
  //   Modelo   -> modelo del vehiculo
  //   Chasis   -> chasis (17 caracteres; es la clave de duplicado)
  //   Color    -> color
  //   Fec.adj. -> fecha de adjudicacion (de aqui se deriva el anio)
  //   P.V.D.   -> precio de venta directa (formato "13,859,244.00")
  //   (resto de columnas: Estad, IDV, Dias, F.limite, I.V.A., Rectifi, Imp.taller,
  //    T.Costo -> NO se persisten)
  // Patente NO viene en el stock -> se inserta NULL (patente opcional).

  static async importVehiculosCSV(
    textoCSV: string,
    opts?: { anioPorDefecto?: number }
  ): Promise<{
    success: boolean;
    total?: number;
    importados?: number;
    duplicados?: number;
    errores?: number;
    marcasProcesadas?: number;
    mensaje?: string;
    error?: string;
  }> {
    try {
      const admin = createAdminClient();
      const anioPorDefecto = opts?.anioPorDefecto ?? new Date().getFullYear();

      const filas = VehiculoService.parseCSV(textoCSV);
      if (filas.length === 0) {
        return { success: false, error: 'El archivo no contiene filas válidas.' };
      }

      const encabezados = (filas[0] || []).map((h) => h.trim().replace(/"/g, '').toLowerCase());
      const col = (nombres: string[]): number => encabezados.findIndex((h) => nombres.includes(h));

      const idxCcomp = col(['c.comp', 'ccomp', 'conces', 'sucursal', 'codigo']);
      const idxMarca = col(['marca']);
      const idxModelo = col(['modelo']);
      const idxChasis = col(['chasis', 'n° chasis', 'nro chasis', 'vin']);
      const idxColor = col(['color']);
      const idxFecAdj = col(['fec.adj.', 'fec adj', 'f.adj.', 'fec.adj', 'fecha adj']);
      const idxPvd = col(['p.v.d.', 'pvd', 'precio']);

      if (idxMarca < 0 || idxModelo < 0 || idxChasis < 0) {
        return {
          success: false,
          error: 'El archivo debe contener al menos las columnas Marca, Modelo y Chasis.',
        };
      }

      const sucursales = await VehiculoService.resolverSucursales(admin);

      // Resolver marcas una sola vez (autocreando lo que falte)
      const codigosMarca = new Set<string>();
      filas.slice(1).forEach((r) => {
        const raw = (r[idxMarca] || '').trim();
        if (raw) codigosMarca.add(raw.toUpperCase());
      });
      const marcasResueltas = new Map<string, string>();
      for (const codigoRaw of codigosMarca) {
        const nombre = await OrganizacionService.asegurarMarcaCodigo(codigoRaw);
        marcasResueltas.set(codigoRaw, nombre);
      }

      // Chasis ya existentes
      const { data: existentesData } = await admin.from('vehiculo').select('chasis');
      const chasisExistentes = new Set<string>((existentesData || []).map((v: { chasis: string }) => v.chasis));

      let importados = 0;
      let duplicados = 0;
      let errores = 0;
      const pendientes: Record<string, unknown>[] = [];
      const erroresDetalle: string[] = [];

      for (const fila of filas.slice(1)) {
        const chasis = (fila[idxChasis] || '').trim().toUpperCase();
        if (!chasis) {
          errores++;
          erroresDetalle.push('Fila sin chasis');
          continue;
        }
        if (!/^[A-Z0-9]{17}$/.test(chasis)) {
          errores++;
          erroresDetalle.push(`Chasis no válido: ${chasis}`);
          continue;
        }
        if (chasisExistentes.has(chasis)) {
          duplicados++;
          continue;
        }

        // Sucursal origen (ubicacion)
        const codigoSucursal = (fila[idxCcomp] || '').trim();
        let sucursalId: number | null = null;
        if (codigoSucursal) {
          const num = Number(codigoSucursal.replace(/\D/g, ''));
          sucursalId = sucursales.get(num) ?? null;
          if (sucursalId === null) {
            sucursalId = sucursales.get(String(codigoSucursal).toUpperCase()) ?? null;
          }
          if (sucursalId === null) {
            // Fallback por nombre
            const nombre = VehiculoService.normalizar(codigoSucursal);
            sucursalId = VehiculoService.findByNombre(sucursales, nombre);
          }
        }

        const marcaCodigoRaw = (fila[idxMarca] || '').trim();
        const marcaNombre = marcasResueltas.get(marcaCodigoRaw.toUpperCase()) || marcaCodigoRaw;
        const modelo = (fila[idxModelo] || '').trim();
        const color = (fila[idxColor] || '').trim() || null;
        const anio = idxFecAdj >= 0
          ? VehiculoService.extraerAnio(fila[idxFecAdj], anioPorDefecto)
          : anioPorDefecto;
        const precio = idxPvd >= 0 ? VehiculoService.parsePrecio(fila[idxPvd]) : null;

        pendientes.push({
          chasis,
          patente: null,
          marca: marcaNombre,
          modelo,
          anio,
          color,
          precio,
          ubicacion: sucursalId,
        });
        chasisExistentes.add(chasis);
        importados++;
      }

      // Insertar en lotes
      for (let i = 0; i < pendientes.length; i += 500) {
        const lote = pendientes.slice(i, i + 500);
        const { error } = await admin.from('vehiculo').insert(lote);
        if (error) {
          errores += lote.length;
          erroresDetalle.push(error.message);
        }
      }

      return {
        success: errores < importados || importados === 0 ? true : false,
        total: filas.length - 1,
        importados,
        duplicados,
        errores,
        marcasProcesadas: codigosMarca.size,
        mensaje:
          `Importación completada: ${importados} vehículos importados, ${duplicados} duplicados omitidos, ` +
          `${errores} errores${erroresDetalle.length > 0 ? ` (${erroresDetalle.slice(0, 5).join('; ')})` : ''}.`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al importar vehículos';
      return { success: false, error: msg };
    }
  }

  // --------------------------------------------------------------------------
  // Helpers internos de importacion (visibles para testeo)
  // --------------------------------------------------------------------------

  static parseCSV(texto: string): string[][] {
    const rows: string[][] = [];
    let current = '';
    let inQuotes = false;
    const cells: string[] = [];

    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (inQuotes) {
        if (ch === '"') {
          if (texto[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cells.push(current);
        current = '';
      } else if (ch === '\n') {
        cells.push(current);
        current = '';
        rows.push(cells.splice(0));
      } else if (ch !== '\r') {
        current += ch;
      }
    }
    if (current !== '' || cells.length > 0) {
      cells.push(current);
      rows.push(cells);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
  }

  /** Devuelve un mapa codigo -> id de sucursal (por id exacto y por nombre normalizado). */
  private static async resolverSucursales(
    admin: SupabaseClient
  ): Promise<Map<string | number, number>> {
    const mapa = new Map<string | number, number>();
    const { data } = await admin.from('sucursal').select('id, nombre');
    for (const s of (data || []) as Array<{ id: number; nombre: string | null }>) {
      mapa.set(Number(s.id), s.id);
      if (s.nombre) {
        const nombreNormal = VehiculoService.normalizar(s.nombre);
        if (nombreNormal) mapa.set(nombreNormal, s.id);
        mapa.set(s.nombre.trim(), s.id);
      }
    }
    return mapa;
  }

  private static findByNombre(mapa: Map<string | number, number>, nombre: string): number | null {
    if (!nombre) return null;
    for (const [clave, id] of mapa.entries()) {
      if (String(clave).startsWith(nombre) || nombre.startsWith(String(clave))) return id;
    }
    return null;
  }

  private static normalizar(txt: string): string {
    return txt
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  /** Extrae el año desde la fecha (Excel serial, dd.mm.yyyy, yyyy-mm-dd, dd/mm/yyyy). */
  static extraerAnio(valor: string, porDefecto: number): number {
    const txt = (valor || '').trim();
    if (!txt) return porDefecto;

    // Serial Excel (numero entero de dias desde 1899-12-30)
    const num = Number(txt.replace(',', '.'));
    if (Number.isFinite(num) && /^\d{4,5}(\.\d+)?$/.test(txt.trim())) {
      const fecha = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!Number.isNaN(fecha.getTime())) {
        const y = fecha.getUTCFullYear();
        if (y > 1990 && y < 2100) return y;
      }
    }

    let m = txt.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) {
      const y = Number(m[1]);
      if (y > 1990 && y < 2100) return y;
    }

    m = txt.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (m) {
      const y = Number(m[3]);
      if (y > 1990 && y < 2100) return y;
    }

    return porDefecto;
  }

  /** Convierte "13,859,244.00" (o "13.859.244,00") a numero. */
  static parsePrecio(valor: string): number | null {
    const txt = (valor || '').trim();
    if (!txt) return null;
    const limpio = txt.replace(/[^\d.,-]/g, '');
    if (!limpio) return null;

    let normalizado: string;
    if (limpio.includes('.')) {
      // Formato chileno/us con punto de miles y coma decimal ("12.345,67") o
      // con punto decimal ("12,345.67")
      if (limpio.includes(',') && limpio.lastIndexOf('.') < limpio.lastIndexOf(',')) {
        normalizado = limpio.replace(/\./g, '').replace(',', '.');
      } else {
        normalizado = limpio.replace(/,/g, '');
      }
    } else if (limpio.includes(',')) {
      normalizado = limpio.replace(',', '.');
    } else {
      normalizado = limpio;
    }

    const n = Number(normalizado);
    return Number.isFinite(n) ? n : null;
  }
}
