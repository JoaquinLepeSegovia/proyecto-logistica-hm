export type UserRole = 'administrador' | 'ejecutivo' | 'jefe_local' | 'logistica' | 'operaciones';

export interface UsuarioSucursalAsignada {
  id: number;
  nombre: string | null;
}

export interface UsuarioZonaAsignada {
  id: number;
  nombre: string;
}

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  activo: boolean;
  requiere_cambio_clave: boolean;
  intentos_fallidos?: number;
  bloqueado_hasta?: string | null;
  sucursal_id?: number | null;
  sucursal_nombre?: string | null;
  sucursales?: UsuarioSucursalAsignada[];
  zonas?: UsuarioZonaAsignada[];
  telefono?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Detalle completo de un usuario para mostrar en tarjetas de contacto
 * (Contacto responsable del detalle de solicitud) y popups de datos de usuario
 * (historial de cambios y observaciones).
 */
export interface UsuarioDetalle {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  activo: boolean;
  telefono: string | null;
  sucursal_id: number | null;
  sucursal_nombre: string | null;
  sucursales?: UsuarioSucursalAsignada[];
  zonas?: UsuarioZonaAsignada[];
  created_at: string;
}

export const ROL_LABEL: Record<UserRole, string> = {
  administrador: 'Administrador',
  ejecutivo: 'Ejecutivo',
  jefe_local: 'Jefe de Local',
  logistica: 'Logística',
  operaciones: 'Operaciones',
};

export function nombreCompletoUsuario(u: { nombre: string; apellido: string } | null): string {
  return u ? `${u.nombre} ${u.apellido}`.trim() : '';
}

export interface CreateUserInput {
  email: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  sucursal_id?: number | null;
  sucursales_ids?: number[];
  zonas_ids?: number[];
}

export interface UpdateUserInput {
  nombre?: string;
  apellido?: string;
  rol?: UserRole;
  activo?: boolean;
  requiere_cambio_clave?: boolean;
  sucursal_id?: number | null;
  sucursales_ids?: number[];
  zonas_ids?: number[];
  telefono?: string | null;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
