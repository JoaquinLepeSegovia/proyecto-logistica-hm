import { AuthService } from '@/services/auth.service';
import { SucursalesService } from '@/services/sucursales.service';
import { SolicitudesService } from '@/services/solicitudes.service';
import { redirect } from 'next/navigation';
import SolicitudesClient from './SolicitudesClient';
import SolicitudesHeader from '@/components/SolicitudesHeader';

export const dynamic = 'force-dynamic';

export default async function SolicitudesPage() {
  const profile = await AuthService.getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  if (!profile.activo) {
    redirect('/dashboard?error=unauthorized');
  }

  const esGestor = profile.rol === 'jefe_local' || profile.rol === 'administrador';
  const esEjecutivo = profile.rol === 'ejecutivo';

  const rolesSolicitudes = ['administrador', 'jefe_local', 'ejecutivo', 'logistica'];
  if (!rolesSolicitudes.includes(profile.rol)) {
    redirect('/dashboard?error=unauthorized');
  }

  const [solicitudes, sucursales, vehiculos] = await Promise.all([
    SolicitudesService.getSolicitudes(),
    SucursalesService.getSucursales(),
    SolicitudesService.getVehiculosInventario(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col">
      <SolicitudesHeader
        title="Módulo de Solicitudes"
        nombre={profile.nombre}
        apellido={profile.apellido}
        rol={profile.rol}
        sucursalNombre={profile.sucursal_nombre}
        tabs={[
          { href: '/solicitudes', label: 'General', active: true },
          ...(esGestor || esEjecutivo
            ? [
                { href: '/solicitudes/aprobaciones', label: 'Aprobaciones', active: false },
                { href: '/solicitudes/prioridades', label: 'Prioridades', active: false },
              ]
            : []),
        ]}
      />

      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-8">
        <SolicitudesClient
          solicitudes={solicitudes}
          sucursales={sucursales}
          vehiculos={vehiculos}
          viewer={{
            id: profile.id,
            nombre: profile.nombre,
            apellido: profile.apellido,
            rol: profile.rol,
            sucursal_id: profile.sucursal_id ?? null,
          }}
        />
      </main>
    </div>
  );
}
