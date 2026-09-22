import { AuthService } from '@/services/auth.service';
import { SucursalesService } from '@/services/sucursales.service';
import { OrganizacionService } from '@/services/organizacion.service';
import { redirect } from 'next/navigation';
import SucursalesTableClient from './SucursalesTableClient';
import TopNavbar from '@/components/TopNavbar';

export const dynamic = 'force-dynamic';

export default async function AdminSucursalesPage() {
  const profile = await AuthService.getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  if (profile.rol !== 'administrador' || !profile.activo) {
    redirect('/dashboard?error=unauthorized');
  }

  const [sucursales, solicitudes, zonas] = await Promise.all([
    SucursalesService.getSucursales(),
    SucursalesService.getSolicitudesPorSucursal(),
    OrganizacionService.getZonas(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col">
      {/* Top Navbar */}
      <TopNavbar
        nombre={profile.nombre}
        apellido={profile.apellido}
        rol={profile.rol}
        sucursalNombre={profile.sucursal_nombre}
        backHref="/dashboard"
      />

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-8">
        <SucursalesTableClient sucursales={sucursales} solicitudes={solicitudes} zonas={zonas} />
      </main>
    </div>
  );
}
