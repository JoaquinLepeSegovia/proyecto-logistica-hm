import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserProfile } from '@/types/auth.types';

export class AuthService {
  /**
   * Actualiza los datos editables del perfil del usuario autenticado
   * (nombre, apellido, teléfono). El rol, sucursal y correo no son editables desde el perfil.
   */
  static async updateProfile(
    data: { nombre: string; apellido: string; telefono?: string | null }
  ): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: 'Sesión no válida. Inicia sesión nuevamente.' };
      }

      const nombre = data.nombre?.trim();
      const apellido = data.apellido?.trim();

      if (!nombre || !apellido) {
        return { success: false, error: 'El nombre y el apellido son obligatorios.' };
      }

      const telefono = data.telefono?.trim() || null;

      const admin = createAdminClient();
      const { data: updated, error: updateError } = await admin
        .from('usuario')
        .update({
          nombre,
          apellido,
          telefono,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, profile: updated as UserProfile };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al actualizar el perfil.';
      console.error('Error en updateProfile:', err);
      return { success: false, error: msg };
    }
  }

  /**
   * Obtiene el perfil del usuario autenticado actualmente
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from('usuario')
        .select('*, sucursal:sucursal_id(nombre)')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        // Si no existe perfil en la tabla usuario pero sí en auth, crear o sincronizar
        const admin = createAdminClient();
        const isAdminEmail = user.email?.toLowerCase() === 'maic.hernandez.dev@gmail.com';
        const newProfile = {
          id: user.id,
          email: user.email!,
          nombre: user.user_metadata?.nombre || (isAdminEmail ? 'Maic' : 'Usuario'),
          apellido: user.user_metadata?.apellido || (isAdminEmail ? 'Hernández' : ''),
          rol: isAdminEmail ? 'administrador' : user.user_metadata?.rol || 'ejecutivo',
          activo: true,
          requiere_cambio_clave: false,
        };

        const { data: inserted, error: insertError } = await admin
          .from('usuario')
          .upsert(newProfile)
          .select()
          .single();

        if (insertError) {
          console.error('Error al sincronizar perfil de usuario:', insertError);
          return null;
        }

        return inserted as UserProfile;
      }

      const sucursal = profile.sucursal as
        | { nombre: string | null }
        | Array<{ nombre: string | null }>
        | null;

      const [sucursalesRes, zonasRes] = await Promise.all([
        supabase
          .from('usuario_sucursal')
          .select('sucursal_id, sucursal:sucursal_id(id, nombre)')
          .eq('usuario_id', user.id),
        supabase
          .from('usuario_zona')
          .select('zona_id, zona:zona_id(id, nombre)')
          .eq('usuario_id', user.id),
      ]);

      const sucursales = (sucursalesRes.data || []).map(
        (row: {
          sucursal_id: number;
          sucursal: Array<{ id: number; nombre: string | null }> | { id: number; nombre: string | null } | null;
        }) => {
          const s = Array.isArray(row.sucursal) ? row.sucursal[0] : row.sucursal;
          return {
            id: row.sucursal_id,
            nombre: s?.nombre ?? null,
          };
        }
      );
      const zonas = (zonasRes.data || []).map(
        (row: {
          zona_id: number;
          zona: Array<{ id: number; nombre: string }> | { id: number; nombre: string } | null;
        }) => {
          const z = Array.isArray(row.zona) ? row.zona[0] : row.zona;
          return {
            id: row.zona_id,
            nombre: z?.nombre ?? '',
          };
        }
      );

      return {
        ...profile,
        sucursal_nombre: Array.isArray(sucursal) ? sucursal[0]?.nombre ?? null : sucursal?.nombre ?? null,
        sucursales,
        zonas,
      } as UserProfile;
    } catch (error) {
      console.error('Error en getCurrentUserProfile:', error);
      return null;
    }
  }

  /**
   * Registro autogestionado (ruta /registro). Siempre crea el usuario con rol
   * 'ejecutivo'. El perfil public.usuario lo crea el trigger on_auth_user_created;
   * se fuerza confirmacion de email para que el usuario pueda iniciar sesion de
   * inmediato (intranet interna).
   */
  static async register(data: {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const admin = createAdminClient();
      const cleanEmail = data.email.trim().toLowerCase();

      const { data: existing } = await admin
        .from('usuario')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'Ya existe un usuario registrado con ese correo.' };
      }

      const supabase = await createClient();
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            nombre: data.nombre.trim(),
            apellido: data.apellido.trim(),
            rol: 'ejecutivo',
            requiere_cambio_clave: false,
          },
        },
      });

      if (signUpError) {
        return { success: false, error: signUpError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'No se pudo crear la cuenta. Intenta nuevamente.' };
      }

      // Confirmar email y asegurar el perfil base en public.usuario
      await admin.auth.admin.updateUserById(authData.user.id, { email_confirm: true });

      const { data: profileRow } = await admin
        .from('usuario')
        .select('id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!profileRow) {
        const isAdminEmail = cleanEmail === 'maic.hernandez.dev@gmail.com';
        await admin.from('usuario').upsert({
          id: authData.user.id,
          email: cleanEmail,
          nombre: data.nombre.trim(),
          apellido: data.apellido.trim(),
          rol: isAdminEmail ? 'administrador' : 'ejecutivo',
          activo: true,
          requiere_cambio_clave: false,
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar usuario';
      return { success: false, error: msg };
    }
  }

  /**
   * Inicia sesión validando estado activo y protección contra intentos excesivos
   */
  static async signIn(email: string, password: string): Promise<{
    success: boolean;
    error?: string;
    profile?: UserProfile;
    requiresPasswordChange?: boolean;
  }> {
    const admin = createAdminClient();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Consultar estado en la tabla usuario
    const { data: existingUser } = await admin
      .from('usuario')
      .select('*')
      .eq('email', cleanEmail)
      .single();

    if (existingUser) {
      // Verificar si la cuenta está desactivada
      if (existingUser.activo === false) {
        return {
          success: false,
          error: 'Esta cuenta ha sido desactivada por el administrador. Contacta a soporte o a tu jefatura.',
        };
      }

      // Verificar si la cuenta está bloqueada temporalmente por intentos excesivos
      if (existingUser.bloqueado_hasta) {
        const lockTime = new Date(existingUser.bloqueado_hasta).getTime();
        const now = Date.now();
        if (lockTime > now) {
          const remainingMinutes = Math.ceil((lockTime - now) / (1000 * 60));
          return {
            success: false,
            error: `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta nuevamente en ${remainingMinutes} minuto(s).`,
          };
        }
      }
    }

    // 2. Intentar autenticar con Supabase Auth
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      // Manejar intento fallido
      if (existingUser) {
        const nextAttempts = (existingUser.intentos_fallidos || 0) + 1;
        let bloqueadoHasta: string | null = null;

        if (nextAttempts >= 5) {
          // Bloquear por 15 minutos tras 5 intentos
          const lockDate = new Date(Date.now() + 15 * 60 * 1000);
          bloqueadoHasta = lockDate.toISOString();
        }

        await admin
          .from('usuario')
          .update({
            intentos_fallidos: nextAttempts,
            bloqueado_hasta: bloqueadoHasta,
          })
          .eq('id', existingUser.id);

        if (nextAttempts >= 5) {
          return {
            success: false,
            error: 'Has superado el límite de 5 intentos fallidos. Tu cuenta ha sido bloqueada por 15 minutos por seguridad.',
          };
        }

        const remainingAttempts = 5 - nextAttempts;
        return {
          success: false,
          error: `Credenciales inválidas. Te quedan ${remainingAttempts} intento(s) antes del bloqueo temporal.`,
        };
      }

      return {
        success: false,
        error: 'Credenciales inválidas. Verifica tu correo y contraseña.',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No se pudo iniciar sesión. Intenta nuevamente.',
      };
    }

    // 3. Obtener o asegurar perfil del usuario autenticado
    let profile: UserProfile | null = null;
    const { data: userProfile } = await admin
      .from('usuario')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!userProfile) {
      const isAdmin = cleanEmail === 'maic.hernandez.dev@gmail.com';
      const { data: created } = await admin
        .from('usuario')
        .upsert({
          id: data.user.id,
          email: cleanEmail,
          nombre: data.user.user_metadata?.nombre || (isAdmin ? 'Maic' : 'Usuario'),
          apellido: data.user.user_metadata?.apellido || (isAdmin ? 'Hernández' : ''),
          rol: isAdmin ? 'administrador' : 'ejecutivo',
          activo: true,
          requiere_cambio_clave: false,
          intentos_fallidos: 0,
          bloqueado_hasta: null,
        })
        .select()
        .single();
      profile = created as UserProfile;
    } else {
      profile = userProfile as UserProfile;
      // Resetear contador de intentos fallidos
      await admin
        .from('usuario')
        .update({
          intentos_fallidos: 0,
          bloqueado_hasta: null,
        })
        .eq('id', data.user.id);
    }

    // Verificar si sigue activo
    if (profile && !profile.activo) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Esta cuenta ha sido desactivada por el administrador.',
      };
    }

    return {
      success: true,
      profile: profile || undefined,
      requiresPasswordChange: profile?.requiere_cambio_clave,
    };
  }

  /**
   * Cierra la sesión activa
   */
  static async signOut(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  /**
   * Envía correo de recuperación de contraseña
   */
  static async sendPasswordResetEmail(email: string, redirectToUrl?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const supabase = await createClient();
      const cleanEmail = email.trim().toLowerCase();

      // Verificar si el usuario existe y está activo
      const admin = createAdminClient();
      const { data: user } = await admin
        .from('usuario')
        .select('activo')
        .eq('email', cleanEmail)
        .single();

      if (user && !user.activo) {
        return {
          success: false,
          error: 'No se puede restablecer la contraseña de una cuenta desactivada. Contacta al administrador.',
        };
      }

      const redirect = redirectToUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/establecer-clave`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirect,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al enviar correo de recuperación';
      return { success: false, error: msg };
    }
  }

  /**
   * Establece o actualiza la contraseña del usuario actualmente autenticado
   */
  static async updatePassword(newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (newPassword.length < 8) {
        return {
          success: false,
          error: 'La contraseña debe tener al menos 8 caracteres.',
        };
      }

      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return {
          success: false,
          error: 'Sesión no válida o expirada. Por favor solicita un nuevo enlace.',
        };
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Marcar que ya no requiere cambio de clave
      const admin = createAdminClient();
      await admin
        .from('usuario')
        .update({
          requiere_cambio_clave: false,
          intentos_fallidos: 0,
          bloqueado_hasta: null,
        })
        .eq('id', user.id);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la contraseña.';
      return { success: false, error: msg };
    }
  }
}
