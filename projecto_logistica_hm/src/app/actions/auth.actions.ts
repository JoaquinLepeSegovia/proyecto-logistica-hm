'use server';

import { AuthService } from '@/services/auth.service';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export interface UpdateProfileState {
  success?: boolean;
  message?: string;
  error?: string;
}

export async function updateProfileAction(
  prevState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const nombre = formData.get('nombre') as string;
  const apellido = formData.get('apellido') as string;
  const telefono = formData.get('telefono') as string;

  if (!nombre?.trim() || !apellido?.trim()) {
    return { success: false, error: 'El nombre y el apellido son obligatorios.' };
  }

  if (telefono && telefono.trim().length > 30) {
    return { success: false, error: 'El teléfono no puede superar los 30 caracteres.' };
  }

  const result = await AuthService.updateProfile({
    nombre,
    apellido,
    telefono,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'No se pudo actualizar el perfil.' };
  }

  revalidatePath('/perfil');
  revalidatePath('/dashboard');
  revalidatePath('/solicitudes');
  return { success: true, message: 'Perfil actualizado correctamente.' };
}

export interface RegisterState {
  success?: boolean;
  message?: string;
  error?: string;
}

export async function registerAction(
  prevState: RegisterState | null,
  formData: FormData
): Promise<RegisterState> {
  const nombre = formData.get('nombre') as string;
  const apellido = formData.get('apellido') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!nombre?.trim() || !apellido?.trim()) {
    return { success: false, error: 'El nombre y el apellido son obligatorios.' };
  }
  if (!email?.trim()) {
    return { success: false, error: 'El correo electrónico es obligatorio.' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (password !== confirmPassword) {
    return { success: false, error: 'Las contraseñas no coinciden.' };
  }

  const result = await AuthService.register({
    nombre,
    apellido,
    email,
    password,
  });

  if (!result.success) {
    return { success: false, error: result.error || 'No se pudo registrar la cuenta.' };
  }

  return {
    success: true,
    message: 'Cuenta creada exitosamente. Ya puedes iniciar sesión.',
  };
}

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Por favor completa todos los campos.',
    };
  }

  const result = await AuthService.signIn(email, password);

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Error al iniciar sesión.',
    };
  }

  if (result.requiresPasswordChange) {
    redirect('/establecer-clave');
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  await AuthService.signOut();
  redirect('/login');
}

export async function requestPasswordResetAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return {
      success: false,
      error: 'Por favor ingresa tu correo electrónico.',
    };
  }

  const result = await AuthService.sendPasswordResetEmail(email);

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'No se pudo enviar el correo de recuperación.',
    };
  }

  return {
    success: true,
    message: 'Te hemos enviado un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.',
  };
}

export async function updatePasswordAction(prevState: unknown, formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return {
      success: false,
      error: 'Por favor completa ambos campos de contraseña.',
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'Las contraseñas no coinciden.',
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: 'La contraseña debe tener al menos 8 caracteres.',
    };
  }

  const result = await AuthService.updatePassword(password);

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Error al establecer la nueva contraseña.',
    };
  }

  redirect('/dashboard?msg=password_updated');
}
