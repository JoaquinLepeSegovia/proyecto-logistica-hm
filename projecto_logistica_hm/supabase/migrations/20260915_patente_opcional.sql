-- Migracion: Patente de vehiculo OPCIONAL
-- Fecha: 2026-09-15
-- Descripcion: La patente pasa a ser opcional en la base de datos.
--   Motivo: el stock importado (modelo_excel/STOCK VN .xls) NO trae patente; y en el
--   momento de importar el vehiculo puede no estar patenteado aun.
--   El indice UNIQUE se mantiene: PostgreSQL permite multiples NULL en columnas
--   con constraint UNIQUE (indice btree), por lo que los vehiculos sin patente no chocan.

ALTER TABLE public.vehiculo
  ALTER COLUMN patente DROP NOT NULL;

COMMENT ON COLUMN public.vehiculo.patente IS
  'Patente del vehiculo. OPCIONAL (nullable): el stock importado no la trae y puede patentarse despues.';