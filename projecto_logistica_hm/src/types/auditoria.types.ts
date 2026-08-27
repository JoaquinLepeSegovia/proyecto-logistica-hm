export interface AuditoriaRegistro {
  id: string;
  usuario_id: string;
  entidad: string;
  entidad_id: string;
  accion: string;
  valor_anterior: Record<string, unknown> | null;
  valor_nuevo: Record<string, unknown> | null;
  created_at: string;
  usuario_nombre: string | null;
  usuario_apellido: string | null;
  solicitud_id: string | null;
  solicitud_fecha_creacion: string | null;
  chasis: string | null;
  patente: string | null;
}

export interface AuditoriaFiltros {
  entidad?: string;
  accion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}
