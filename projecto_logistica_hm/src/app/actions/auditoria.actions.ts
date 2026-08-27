'use server';

import { AuthService } from '@/services/auth.service';
import { AuditoriaService } from '@/services/auditoria.service';
import { AuditoriaFiltros } from '@/types/auditoria.types';

async function verifyAdminPermission() {
  const profile = await AuthService.getCurrentUserProfile();
  if (!profile || profile.rol !== 'administrador' || !profile.activo) {
    throw new Error('Acceso no autorizado. Se requieren permisos de Administrador.');
  }
  return profile;
}

export async function getAuditoriaAction(filtros?: AuditoriaFiltros) {
  try {
    await verifyAdminPermission();
    const data = await AuditoriaService.getAuditoria(filtros);
    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return { success: false, error: msg, data: [] };
  }
}
