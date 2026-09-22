import { AuthService } from '@/services/auth.service';
import { UsersService } from '@/services/users.service';
import { SucursalesService } from '@/services/sucursales.service';
import { OrganizacionService } from '@/services/organizacion.service';
import { redirect } from 'next/navigation';
import UsersTableClient from './UsersTableClient';
import TopNavbar from '@/components/TopNavbar';

export const dynamic = 'force-dynamic';

export default async function AdminUsuariosPage() {
  const profile = await AuthService.getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  if (profile.rol !== 'administrador' || !profile.activo) {
    redirect('/dashboard?error=unauthorized');
  }

  const [users, sucursales, zonas] = await Promise.all([
    UsersService.getUsers(),
    SucursalesService.getSucursales(),
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
        <UsersTableClient
          users={users}
          sucursales={sucursales}
          zonas={zonas}
          currentAdminId={profile.id}
        />
      </main>
    </div>
  );
}
