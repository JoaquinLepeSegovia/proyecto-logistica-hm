-- Migracion: Catalogo de marcas
-- Fecha: 2026-09-15
-- Descripcion: Tabla public.marca para el catalogo maestro de marcas (llenada por UI
--   en /admin/marcas y autocreada durante la importacion CSV de vehiculos).
--   El catalogo referencia las marcas de los archivos modelo Excel
--   (modelo_excel/Sucursales de Ventas y Marcas.xlsx, hoja "Marcas").
--
--   codigo: acronimo interno tal como figura en la columna `Marca` del stock
--           (ej.: BAI, HY, JAC, MAX, SWM, JIM).
--   nombre: descripcion/comercial (ej.: BAIC, HYUNDAI, JAC, MAXUS, SWM, JIM).

CREATE TABLE IF NOT EXISTS public.marca (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo     VARCHAR(20) NOT NULL UNIQUE,
    nombre     VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marca_select_autenticados" ON public.marca;
CREATE POLICY "marca_select_autenticados"
    ON public.marca FOR SELECT TO authenticated
    USING (public.usuario_activo());

DROP POLICY IF EXISTS "marca_admin_total" ON public.marca;
CREATE POLICY "marca_admin_total"
    ON public.marca FOR ALL TO authenticated
    USING (public.tiene_rol('administrador'))
    WITH CHECK (public.tiene_rol('administrador'));