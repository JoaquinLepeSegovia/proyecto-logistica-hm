-- Migracion: DESACTIVAR trigger de recalculo de slots por vehiculo
-- Fecha: 2026-09-15
-- Descripcion: Desactiva TEMPORALMENTE tr_recalcular_slots_vehiculo (migracion
--   20260911_recount_slots_vehiculo.sql) para que la importacion masiva de stock
--   (DEV 1) no falle por validacion slots_ocupados > slots.
--
--   Efecto durante la ventana desactivada:
--     * Los INSERT/UPDATE/DELETE sobre public.vehiculo NO recalcularan ni validaran
--       slots_ocupados de la sucursal.
--     * slots_ocupados / slots_reservados quedan CONGELADOS (no reflejan el import).
--     * IMPORTANTE: NO crear solicitudes de venta durante esta ventana en sucursales
--       sobrecapacitadas (la validacion de reserva lee slots_ocupados subestimado).
--
--   Para re-activar usar 20260915_reenable_trigger_slots_vehiculo.sql (recupera el
--   trigger y hace recalculado global de todas las sucursales).
--
--   Se ejecuta SOLO si el trigger existe (20260911 puede no haberse aplicado aun).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tr_recalcular_slots_vehiculo'
      AND tgrelid = 'public.vehiculo'::regclass
  ) THEN
    ALTER TABLE public.vehiculo DISABLE TRIGGER tr_recalcular_slots_vehiculo;
    RAISE NOTICE 'Trigger tr_recalcular_slots_vehiculo DESACTIVADO.';
  ELSE
    RAISE NOTICE 'Trigger tr_recalcular_slots_vehiculo no existe en public.vehiculo; nada que desactivar.';
  END IF;
END $$;