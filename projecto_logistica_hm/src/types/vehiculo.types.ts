export interface Vehiculo {
  id: string;
  chasis: string;
  patente: string | null;
  marca: string;
  modelo: string;
  anio: number;
  color: string | null;
  precio: number | null;
  ubicacion: number | null;
  created_at: string;
  updated_at: string;
}

export interface VehiculoConDisponibilidad extends Vehiculo {
  estado_disponibilidad: 'reservado' | 'liberado' | 'vendido';
  solicitud_id: string | null;
  ubicacion_nombre?: string | null;
}

export interface CreateVehiculoInput {
  chasis: string;
  patente?: string | null;
  marca: string;
  modelo: string;
  anio: number;
  color?: string;
  precio?: number | null;
  ubicacion?: number | null;
}

export interface UpdateVehiculoInput {
  chasis?: string;
  patente?: string | null;
  marca?: string;
  modelo?: string;
  anio?: number;
  color?: string | null;
  precio?: number | null;
  ubicacion?: number | null;
}

export interface Marca {
  id: number;
  codigo: string;
  nombre: string;
  created_at?: string;
}

export interface CreateMarcaInput {
  codigo: string;
  nombre: string;
}

export interface UpdateMarcaInput {
  codigo?: string;
  nombre?: string;
}