'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { registerAction } from '@/app/actions/auth.actions';
import { Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function RegistroPage() {
  const [state, formAction, isPending] = useActionState(registerAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-neutral-100 px-4 py-12 sm:px-6 lg:px-8 text-neutral-900">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-neutral-900/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
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
              Registro de Colaborador
            </p>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 shadow-xl rounded-2xl p-8 space-y-6">
          <div className="border-b border-neutral-200 pb-4">
            <h2 className="text-lg font-semibold text-neutral-700">
              Crear Cuenta
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Completa tus datos para solicitar acceso al sistema
            </p>
          </div>

          {state?.error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Error</span>
                <span className="text-xs leading-relaxed opacity-90">{state.error}</span>
              </div>
            </div>
          )}

          {state?.success && (
            <div className="flex items-start gap-3 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Cuenta creada</span>
                <span className="text-xs leading-relaxed opacity-90">
                  {state.message}. Ya puedes{' '}
                  <Link href="/login" className="underline font-semibold hover:text-green-900">
                    iniciar sesión
                  </Link>.
                </span>
              </div>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Nombre *
                </label>
                <input
                  name="nombre"
                  type="text"
                  required
                  placeholder="Ej. Juan"
                  className="block w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Apellido *
                </label>
                <input
                  name="apellido"
                  type="text"
                  required
                  placeholder="Ej. Pérez"
                  className="block w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Correo Electrónico *
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="usuario@gmail.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Contraseña *
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="block w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Confirmar Contraseña *
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Repite tu contraseña"
                  className="block w-full pl-10 pr-10 py-2.5 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !!state?.success}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-700 active:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 group cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <>
                  <span>Crear Cuenta</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-neutral-400 border-t border-neutral-200 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-neutral-400" />
            <span>Tu cuenta será asignada como <strong>Ejecutivo</strong> de forma automática</span>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="underline underline-offset-2 font-medium text-neutral-900 hover:text-neutral-600 transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
