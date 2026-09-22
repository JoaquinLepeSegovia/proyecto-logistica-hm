-- Migracion: Nuevo rol 'operaciones'
-- Fecha: 2026-09-15
-- Descripcion: Agrega el valor 'operaciones' al enum public.rol_usuario.
--   El rol OPERACIONES ve todos los vehiculos del inventario, puede crear/editar/importar
--   vehiculos y CSV, pero NO puede eliminar vehiculos (borrado exclusivo administrador).
--
-- NOTA PostgreSQL (error 55P04): el valor recien agregado NO puede usarse en la misma
--   transaccion de este ALTER TYPE. Ejecutar este archivo SOLO (SQL Editor de Supabase
--   corre todo el buffer en una sola transaccion), commitear, y recien despues ejecutar
--   el resto de las migraciones 2026091X y la logica de la app.

ALTER TYPE public.rol_usuario
  ADD VALUE IF NOT EXISTS 'operaciones';