import { AuthService } from '@/services/auth.service';
import { AuditoriaService } from '@/services/auditoria.service';
import { redirect } from 'next/navigation';
import HistorialClient from './HistorialClient';
import Link from 'next/link';
import { History, ArrowLeft, LogOut } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth.actions';

export const dynamic = 'force-dynamic';

export default async function AdminHistorialPage() {
  const profile = await AuthService.getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  if (profile.rol !== 'administrador' || !profile.activo) {
    redirect('/dashboard?error=unauthorized');
  }

  const [registros, metricas] = await Promise.all([
    AuditoriaService.getAuditoria(),
    AuditoriaService.getMetricas(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-neutral-200 bg-white backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              title="Volver al Panel Principal"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white font-bold">
                <History className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-neutral-900 tracking-tight">H.Motores</span>
                <span className="text-xs text-neutral-500 block -mt-1 font-mono">
                  Historial y Trazabilidad
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-neutral-900">
                {profile.nombre} {profile.apellido}
              </p>
              <p className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider">
                {profile.rol}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="p-2 rounded-xl text-neutral-500 hover:text-red-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HistorialClient registros={registros} metricas={metricas} />
      </main>
    </div>
  );
}
