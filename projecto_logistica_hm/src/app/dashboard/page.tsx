import { AuthService } from '@/services/auth.service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  Car,
  FileText,
  Building2,
  Truck,
  History,
  LogOut,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth.actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const profile = await AuthService.getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  if (!profile.activo) {
    redirect('/login?error=account_deactivated');
  }

  if (profile.requiere_cambio_clave) {
    redirect('/establecer-clave');
  }

  const isAdmin = profile.rol === 'administrador';

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images.png"
              alt="Escudo H.Motores"
              width={40}
              height={40}
              className="h-10 w-auto mix-blend-multiply"
            />
            <div>
              <span className="font-bold text-lg text-neutral-900 tracking-tight">H.Motores</span>
              <span className="text-[11px] text-neutral-500 block -mt-1 font-mono">
                Logística & Traslado de Vehículos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-neutral-900">
                {profile.nombre} {profile.apellido}
              </p>
              <p className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider">
                Rol: {profile.rol}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-red-600 hover:bg-neutral-100 transition-colors border border-neutral-200 cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-neutral-900 border border-neutral-900 text-white rounded-3xl p-8 shadow-xl">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/25 text-white">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Sesión Activa y Segura</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Bienvenido, {profile.nombre} {profile.apellido}
            </h1>
            <p className="text-sm text-neutral-300 max-w-2xl">
              Plataforma interna para la gestión, control operativo y trazabilidad del traslado de vehículos entre sucursales de H.Motores.
            </p>
          </div>
        </div>

        {/* System Modules Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <span>Módulos de la Plataforma</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Admin User Management */}
            {isAdmin && (
              <Link
                href="/admin/usuarios"
                className="group bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900 group-hover:text-neutral-600 transition-colors">
                        Gestión de Usuarios
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white border border-neutral-900">
                        Admin
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Creación de cuentas, envío de invitaciones por correo y control de activación/desactivación.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-neutral-900 group-hover:text-neutral-600">
                  <span>Administrar colaboradores</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {/* Vehicle Management */}
            <Link
              href="/admin/vehiculos"
              className="group bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 group-hover:text-neutral-600 transition-colors">
                    Gestión de Vehículos
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Incorporación manual de vehículos al inventario interno, control de disponibilidad y datos del vehículo.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-neutral-900 group-hover:text-neutral-600">
                <span>Administrar vehículos</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Requests Management */}
            <Link
              href="/solicitudes"
              className="group bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 group-hover:text-neutral-600 transition-colors">
                    Gestión de Solicitudes
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Creación de traslados, cola de priorización por sucursal y reserva de vehículos.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-neutral-900 group-hover:text-neutral-600">
                <span>Gestionar solicitudes</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Branches Management */}
            {isAdmin && (
              <Link
                href="/admin/sucursales"
                className="group bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900 group-hover:text-neutral-600 transition-colors">
                        Gestión de Sucursales
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white border border-neutral-900">
                        Admin
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Alta y edición de sucursales, capacidad de estacionamiento y solicitudes asociadas por punto.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-neutral-900 group-hover:text-neutral-600">
                  <span>Administrar sucursales</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}

            {/* Logistics Management */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between opacity-85">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900">Gestión Logística</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Calendarización de traslados, fecha tentativa, despacho y confirmación de entrega en destino.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
                <span>Próximo módulo operativo</span>
              </div>
            </div>

            {/* Traceability & History */}
            {isAdmin && (
              <Link
                href="/admin/historial"
                className="group bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900 group-hover:text-neutral-600 transition-colors">
                        Historial y Trazabilidad
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-900 text-white border border-neutral-900">
                        Admin
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      Registro inmutable de acciones, responsables y fechas para auditoría operativa continua.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-neutral-900 group-hover:text-neutral-600">
                  <span>Ver historial completo</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
