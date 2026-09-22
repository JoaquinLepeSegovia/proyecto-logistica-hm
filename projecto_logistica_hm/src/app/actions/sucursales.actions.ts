'use server';

import { AuthService } from '@/services/auth.service';
import { SucursalesService } from '@/services/sucursales.service';
import { revalidatePath } from 'next/cache';

async function verifyAdminPermission() {
  const profile = await AuthService.getCurrentUserProfile();
  if (!profile || profile.rol !== 'administrador' || !profile.activo) {
    throw new Error('Acceso no autorizado. Se requieren permisos de Administrador.');
  }
  return profile;
}

function parseSlots(value: string): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

export interface SucursalFormData {
  nombre: string;
  direccion?: string;
  slots: string;
  zona_id?: number | null;
}

export async function createSucursalAction(data: SucursalFormData) {
  try {
    await verifyAdminPermission();

    const nombre = data.nombre?.trim();
    if (!nombre) {
      return { success: false, error: 'El nombre de la sucursal es obligatorio.' };
    }

    const slots = parseSlots(data.slots);

    if (slots === null) {
      return { success: false, error: 'Los espacios deben ser números enteros mayores o iguales a 0.' };
    }

    const result = await SucursalesService.createSucursal({
      nombre,
      direccion: data.direccion?.trim() || null,
      slots,
      zona_id: data.zona_id ?? null,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Error al crear la sucursal.' };
    }

    revalidatePath('/admin/sucursales');
    revalidatePath('/admin/zonas');
    return { success: true, message: `Sucursal "${nombre}" creada exitosamente.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}

export async function updateSucursalAction(id: number, data: SucursalFormData) {
  try {
    await verifyAdminPermission();

    const nombre = data.nombre?.trim();
    if (!nombre) {
      return { success: false, error: 'El nombre de la sucursal es obligatorio.' };
    }

    const slots = parseSlots(data.slots);

    if (slots === null) {
      return { success: false, error: 'Los espacios deben ser números enteros mayores o iguales a 0.' };
    }

    const result = await SucursalesService.updateSucursal(id, {
      nombre,
      direccion: data.direccion?.trim() || null,
      slots,
      zona_id: data.zona_id ?? null,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Error al actualizar la sucursal.' };
    }

    revalidatePath('/admin/sucursales');
    revalidatePath('/admin/zonas');
    return { success: true, message: `Sucursal "${nombre}" actualizada exitosamente.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}

export async function deleteSucursalAction(id: number) {
  try {
    await verifyAdminPermission();

    const result = await SucursalesService.deleteSucursal(id);

    if (!result.success) {
      return { success: false, error: result.error || 'Error al eliminar la sucursal.' };
    }

    revalidatePath('/admin/sucursales');
    return {
      success: true,
      message:
        result.solicitudesEliminadas && result.solicitudesEliminadas > 0
          ? `Sucursal eliminada junto con ${result.solicitudesEliminadas} solicitud(es) asociada(s).`
          : 'Sucursal eliminada exitosamente.',
      solicitudesEliminadas: result.solicitudesEliminadas,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}
