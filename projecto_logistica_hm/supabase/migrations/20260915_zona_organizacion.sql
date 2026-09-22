-- Migracion: Organizacion territorial - zonas, multisede y logistica por zonas
-- Fecha: 2026-09-15
-- Descripcion: Modelo de organizacion para DEV 1 + contrato DEV 2.
--   1. Tabla public.zona (encargado/logistica por zonas territoriales: V Region, Santiago, Maule...).
--   2. Columna sucursal.zona_id (sucursal -> zona).
--   3. Tabla public.usuario_sucursal (N:M): sucursales asignadas a un usuario
--      (Jefe de Local multi-sucursal; opcional para logistica).
--      usuario.sucursal_id se conserva como SUCURSAL PRINCIPAL (contexto de origen).
--   4. Tabla public.usuario_zona (N:M): zonas asignadas a un usuario de logistica.
--   5. Backfill: usuarios con sucursal_id -> usuario_sucursal.
--   6. RLS sobre las tablas nuevas (patron de politicas existentes: usuario_activo / tiene_rol).
--   7. Funcion public.usuario_tiene_sucursal(uuid, bigint): helper de negocio para validar
--      que un usuario gestiona una sucursal (consumida por DEV 2).
--
-- DEPENDENCIA: requiere que 20260915_rol_operaciones.sql ya haya corrido (commit).

-- ============================================================================
-- 1. TABLA zona
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.zona (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. sucursal.zona_id
-- ============================================================================

ALTER TABLE public.sucursal
  ADD COLUMN IF NOT EXISTS zona_id BIGINT REFERENCES public.zona(id);

CREATE INDEX IF NOT EXISTS idx_sucursal_zona_id ON public.sucursal USING btree (zona_id);

COMMENT ON COLUMN public.sucursal.zona_id IS
  'Zona territorial a la que pertenece la sucursal';

-- ============================================================================
-- 3. TABLA usuario_sucursal (N:M)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usuario_sucursal (
    usuario_id   UUID        NOT NULL REFERENCES public.usuario(id)   ON DELETE CASCADE,
    sucursal_id  BIGINT      NOT NULL REFERENCES public.sucursal(id)  ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, sucursal_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_sucursal_sucursal ON public.usuario_sucursal USING btree (sucursal_id);

COMMENT ON TABLE public.usuario_sucursal IS
  'Sucursales asignadas a un usuario (Jefe de Local multi-sucursal; logistica opcional). usuario.sucursal_id es la sucursal PRINCIPAL.';

-- ============================================================================
-- 4. TABLA usuario_zona (N:M)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usuario_zona (
    usuario_id   UUID        NOT NULL REFERENCES public.usuario(id)  ON DELETE CASCADE,
    zona_id      BIGINT      NOT NULL REFERENCES public.zona(id)     ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, zona_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_zona_zona ON public.usuario_zona USING btree (zona_id);

COMMENT ON TABLE public.usuario_zona IS
  'Zonas asignadas a un usuario de logistica (encargado por zonas).';

-- ============================================================================
-- 5. BACKFILL usuario.sucursal_id -> usuario_sucursal
-- ============================================================================

INSERT INTO public.usuario_sucursal (usuario_id, sucursal_id)
SELECT id, sucursal_id
FROM public.usuario
WHERE sucursal_id IS NOT NULL
ON CONFLICT (usuario_id, sucursal_id) DO NOTHING;

-- ============================================================================
-- 6. RLS
-- ============================================================================

-- 6.1 zona
ALTER TABLE public.zona ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zona_select_autenticados" ON public.zona;
CREATE POLICY "zona_select_autenticados"
    ON public.zona FOR SELECT TO authenticated
    USING (public.usuario_activo());

DROP POLICY IF EXISTS "zona_admin_total" ON public.zona;
CREATE POLICY "zona_admin_total"
    ON public.zona FOR ALL TO authenticated
    USING (public.tiene_rol('administrador'))
    WITH CHECK (public.tiene_rol('administrador'));

-- 6.2 usuario_sucursal
ALTER TABLE public.usuario_sucursal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_sucursal_select_own" ON public.usuario_sucursal;
CREATE POLICY "usuario_sucursal_select_own"
    ON public.usuario_sucursal FOR SELECT TO authenticated
    USING (public.usuario_activo() AND (auth.uid() = usuario_id OR public.tiene_rol('administrador')));

DROP POLICY IF EXISTS "usuario_sucursal_admin_total" ON public.usuario_sucursal;
CREATE POLICY "usuario_sucursal_admin_total"
    ON public.usuario_sucursal FOR ALL TO authenticated
    USING (public.tiene_rol('administrador'))
    WITH CHECK (public.tiene_rol('administrador'));

-- 6.3 usuario_zona
ALTER TABLE public.usuario_zona ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario_zona_select_own" ON public.usuario_zona;
CREATE POLICY "usuario_zona_select_own"
    ON public.usuario_zona FOR SELECT TO authenticated
    USING (public.usuario_activo() AND (auth.uid() = usuario_id OR public.tiene_rol('administrador')));

DROP POLICY IF EXISTS "usuario_zona_admin_total" ON public.usuario_zona;
CREATE POLICY "usuario_zona_admin_total"
    ON public.usuario_zona FOR ALL TO authenticated
    USING (public.tiene_rol('administrador'))
    WITH CHECK (public.tiene_rol('administrador'));

-- ============================================================================
-- 7. FUNCION usuario_tiene_sucursal (contrato DEV 2)
-- ============================================================================

-- Consulta si un usuario tiene asignada una sucursal, ya sea como sucursal
-- PRINCIPAL (usuario.sucursal_id) o a traves de usuario_sucursal (N:M).
-- Uso en logica de negocio: validar que un Jefe de Local / Ejecutivo / Logistica
-- puede operar sobre una sucursal determinada.

CREATE OR REPLACE FUNCTION public.usuario_tiene_sucursal(
    p_usuario_id uuid,
    p_sucursal_id bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuario u
        WHERE u.id = p_usuario_id AND u.sucursal_id = p_sucursal_id
        UNION ALL
        SELECT 1 FROM public.usuario_sucursal us
        WHERE us.usuario_id = p_usuario_id AND us.sucursal_id = p_sucursal_id
    );
$$;