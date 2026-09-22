'use client';

import { useActionState, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { loginAction } from '@/app/actions/auth.actions';
import { Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Error proveniente de query params (?error=...)
  let paramError: string | null = null;
  const err = searchParams.get('error');
  if (err === 'enlace_expirado' || err === 'auth_callback_failed') {
    paramError = 'El enlace de acceso ha expirado o ya fue utilizado. Por favor solicita uno nuevo al administrador.';
  } else if (err === 'account_deactivated') {
    paramError = 'Tu cuenta se encuentra desactivada por el administrador.';
  } else if (err === 'unauthorized') {
    paramError = 'No tienes permisos suficientes para acceder a esta sección.';
  }

  // Verificar si en el hash del navegador vino un error de OTP expirado
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash.includes('error=')) return;
    if (window.location.hash.includes('otp_expired') || window.location.hash.includes('expired')) {
      const t = setTimeout(() => {
        setHashError('El enlace de invitación o recuperación ha expirado. Por favor solicita un nuevo enlace.');
      }, 0);
      return () => clearTimeout(t);
    }
  }, []);

  const activeError = state?.error || paramError || hashError;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-neutral-100 px-4 py-12 sm:px-6 lg:px-8 text-neutral-900">
      {/* Decorative ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-neutral-900/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header / Logo */}
        <div className="text-center space-y-3">
          <Image
            src="/images.png"
            alt="Escudo H.Motores"
            width={80}
            height={80}
            priority
            className="h-20 w-auto mx-auto mix-blend-multiply"
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              H.Motores
            </h1>
            <p className="text-sm text-neutral-500 mt-1 font-medium">
              Sistema de Gestión y Logística de Vehículos
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-neutral-200 shadow-xl rounded-2xl p-8 space-y-6">
          <div className="border-b border-neutral-200 pb-4">
            <h2 className="text-lg font-semibold text-neutral-700">
              Inicio de Sesión Corporativo
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Acceso restringido a colaboradores autorizados
            </p>
          </div>

          {/* Feedback error alert */}
          {activeError && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Aviso de seguridad</span>
                <span className="text-xs leading-relaxed opacity-90">{activeError}</span>
              </div>
            </div>
          )}

          <form action={formAction} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider"
              >
                Correo Electrónico
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="usuario@hmotores.cl o gmail.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider"
                >
                  Contraseña
                </label>
                <Link
                  href="/recuperar-clave"
                  className="text-xs text-neutral-900 underline underline-offset-2 hover:text-neutral-600 transition-colors font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-700 active:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 group cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar a la Plataforma</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="pt-2 text-center text-xs text-neutral-400 border-t border-neutral-200 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-neutral-400" />
            <span>Conexión cifrada y protegida contra intentos de fuerza bruta</span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-neutral-400 space-x-2">
          <span>¿No tienes cuenta?</span>
          <Link href="/registro" className="underline underline-offset-2 font-medium text-neutral-900 hover:text-neutral-600 transition-colors">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
      <LoginForm />
    </Suspense>
  );
}
