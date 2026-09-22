'use server';

import { AuthService } from '@/services/auth.service';
import { OrganizacionService } from '@/services/organizacion.service';
import { CreateMarcaInput, UpdateMarcaInput } from '@/types/vehiculo.types';
import { revalidatePath } from 'next/cache';

async function verifyAdminPermission() {
  const profile = await AuthService.getCurrentUserProfile();
  if (!profile || profile.rol !== 'administrador' || !profile.activo) {
    throw new Error('Acceso no autorizado. Se requieren permisos de Administrador.');
  }
  return profile;
}

// ============================================================================
// ZONAS
// ============================================================================

export async function createZonaAction(nombre: string) {
  try {
    await verifyAdminPermission();
    const result = await OrganizacionService.createZona(nombre);
    if (!result.success) {
      return { success: false, error: result.error || 'Error al crear la zona.' };
    }
    revalidatePath('/admin/zonas');
    return { success: true, message: `Zona "${nombre.trim()}" creada exitosamente.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}

export async function updateZonaAction(id: number, nombre: string) {
  try {
    await verifyAdminPermission();
    const result = await OrganizacionService.updateZona(id, nombre);
    if (!result.success) {
      return { success: false, error: result.error || 'Error al actualizar la zona.' };
    }
    revalidatePath('/admin/zonas');
    return { success: true, message: `Zona "${nombre.trim()}" actualizada exitosamente.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}

export async function deleteZonaAction(id: number) {
  try {
    await verifyAdminPermission();
    const result = await OrganizacionService.deleteZona(id);
    if (!result.success) {
      return { success: false, error: result.error || 'Error al eliminar la zona.' };
    }
    revalidatePath('/admin/zonas');
    return { success: true, message: 'Zona eliminada exitosamente.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}

// ============================================================================
// CATALOGO DE MARCAS
// ============================================================================

export async function createMarcaAction(input: CreateMarcaInput) {
  try {
    await verifyAdminPermission();
    const result = await OrganizacionService.createMarca(input);
    if (!result.success) {
      return { success: false, error: result.error || 'Error al crear la marca.' };
    }
    revalidatePath('/admin/marcas');
    return { success: true, message: `Marca "${input.nombre.trim()}" creada exitosamente.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}

export async function updateMarcaAction(id: number, input: UpdateMarcaInput) {
  try {
    await verifyAdminPermission();
    const result = await OrganizacionService.updateMarca(id, input);
    if (!result.success) {
      return { success: false, error: result.error || 'Error al actualizar la marca.' };
    }
    revalidatePath('/admin/marcas');
    return { success: true, message: 'Marca actualizada exitosamente.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}

export async function deleteMarcaAction(id: number) {
  try {
    await verifyAdminPermission();
    const result = await OrganizacionService.deleteMarca(id);
    if (!result.success) {
      return { success: false, error: result.error || 'Error al eliminar la marca.' };
    }
    revalidatePath('/admin/marcas');
    return { success: true, message: 'Marca eliminada exitosamente.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}