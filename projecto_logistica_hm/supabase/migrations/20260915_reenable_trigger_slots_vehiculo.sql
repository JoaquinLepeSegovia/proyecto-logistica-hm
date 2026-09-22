-- Migracion: RE-ACTIVAR trigger de recalculo de slots por vehiculo
-- Fecha: 2026-09-15
-- Descripcion: Re-activa tr_recalcular_slots_vehiculo (desactivado por
--   20260915_desactivar_trigger_slots_vehiculo.sql) y sincroniza slots_ocupados de
--   TODAS las sucursales contra el estado real del inventario (incluye los vehiculos
--   importados durante la ventana desactivada).
--
--   Ejecutar SOLO despues de que termine la importacion masiva y antes de retomar
--   el flujo de solicitudes DEV 2. Si alguna sucursal excede su capacidad se lanzara
--   la excepcion (RAISE) de fn_recalcular_slots_ocupados y habra que regularla.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tr_recalcular_slots_vehiculo'
      AND tgrelid = 'public.vehiculo'::regclass
  ) THEN
    ALTER TABLE public.vehiculo ENABLE TRIGGER tr_recalcular_slots_vehiculo;
    RAISE NOTICE 'Trigger tr_recalcular_slots_vehiculo RE-ACTIVADO.';
  ELSE
    RAISE NOTICE 'Trigger tr_recalcular_slots_vehiculo no existe; no se pudo re-activar. Verificar que 20260911_recount_slots_vehiculo.sql este aplicado.';
  END IF;
END $$;

-- Deploy de consistencia: recalcular slots_ocupados de todas las sucursales.
-- Si alguna excede slote, este bloque lanza la excepcion (RAISE).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id, nombre FROM public.sucursal ORDER BY id LOOP
    PERFORM public.fn_recalcular_slots_ocupados(r.id);
  END LOOP;
  RAISE NOTICE 'Recalculado slots_ocupados de todas las sucursales: OK';
END $$;