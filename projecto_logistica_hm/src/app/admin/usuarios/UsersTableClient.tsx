'use client';

import { useState, useEffect, useTransition } from 'react';
import { UserProfile, UserRole } from '@/types/auth.types';
import { Sucursal, Zona } from '@/types/sucursal.types';
import { UsuarioNombreBoton } from '@/components/usuario-info-modal';
import { createUserAction, updateUserAction, toggleUserStatusAction, resetUserPasswordAction } from '@/app/actions/users.actions';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Key,
  Power,
  X,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  Lock,
  Building2,
  Pencil,
} from 'lucide-react';

interface Props {
  users: UserProfile[];
  sucursales: Sucursal[];
  zonas: Zona[];
  currentAdminId: string;
}

const roleLabels: Record<UserRole, { label: string; color: string }> = {
  administrador: {
    label: 'Administrador',
    color: 'bg-neutral-900 text-white border-neutral-900',
  },
  jefe_local: {
    label: 'Jefe de Local',
    color: 'bg-neutral-700 text-white border-neutral-700',
  },
  ejecutivo: {
    label: 'Ejecutivo',
    color: 'bg-neutral-200 text-neutral-900 border-neutral-200',
  },
  logistica: {
    label: 'Logística',
    color: 'bg-neutral-100 text-neutral-500 border-neutral-300',
  },
  operaciones: {
    label: 'Operaciones',
    color: 'bg-neutral-600 text-white border-neutral-600',
  },
};

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function MultiCheckSelector({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { id: number; label: string }[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
        {title}
      </label>
      {options.length === 0 ? (
        <p className="text-xs text-neutral-400 italic">Sin opciones disponibles.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const active = selected.includes(o.id);
            return (
              <button
                type="button"
                key={o.id}
                onClick={() => onToggle(o.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  active
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-900'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function UsersTableClient({ users, sucursales, zonas, currentAdminId }: Props) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    email?: string;
    tempPassword?: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Form states for Create User modal
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailDomain, setEmailDomain] = useState('gmail.com');
  const [customPassword, setCustomPassword] = useState('');
  const [rol, setRol] = useState<UserRole>('ejecutivo');
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [sucursalesIds, setSucursalesIds] = useState<number[]>([]);
  const [zonasIds, setZonasIds] = useState<number[]>([]);
  const [isSubmitting, startTransition] = useTransition();

  // Edit User modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editApellido, setEditApellido] = useState('');
  const [editRol, setEditRol] = useState<UserRole>('ejecutivo');
  const [editSucursalId, setEditSucursalId] = useState<number | null>(null);
  const [editSucursalesIds, setEditSucursalesIds] = useState<number[]>([]);
  const [editZonasIds, setEditZonasIds] = useState<number[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHydrated(true);
  }, []);

  // Filter users - only apply filters after hydration to avoid SSR mismatch
  const filteredUsers = users.filter((u) => {
    if (!isHydrated) return true;
    
    const matchesSearch =
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === 'todos' || u.rol === selectedRole;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.activo).length;
  const inactiveUsers = totalUsers - activeUsers;

  const resetForm = () => {
    setNombre('');
    setApellido('');
    setEmailPrefix('');
    setCustomPassword('');
    setSucursalId(null);
    setSucursalesIds([]);
    setZonasIds([]);
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    setCopiedCreds(false);

    let fullEmail = emailPrefix.trim();
    if (!fullEmail.includes('@')) {
      fullEmail = `${emailPrefix.trim()}@${emailDomain.trim()}`;
    }

    startTransition(async () => {
      const res = await createUserAction({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: fullEmail,
        rol,
        password: customPassword.trim() || undefined,
        sucursal_id: sucursalId,
        sucursales_ids: sucursalesIds.length > 0 ? sucursalesIds : undefined,
        zonas_ids: zonasIds.length > 0 ? zonasIds : undefined,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Usuario creado con éxito.',
          email: res.email,
          tempPassword: res.tempPassword,
        });
        setIsModalOpen(false);
        resetForm();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Error al crear usuario.',
        });
      }
    });
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean, email: string) => {
    if (email.toLowerCase() === 'maic.hernandez.dev@gmail.com' && currentStatus) {
      alert('La cuenta del Administrador Principal no puede ser desactivada.');
      return;
    }
    if (userId === currentAdminId && currentStatus) {
      alert('No puedes desactivar tu propia cuenta de administrador.');
      return;
    }

    const actionText = currentStatus ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de que deseas ${actionText} a ${email}?`)) {
      return;
    }

    startTransition(async () => {
      const res = await toggleUserStatusAction(userId, !currentStatus);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Estado del usuario actualizado a ${!currentStatus ? 'Activo' : 'Inactivo'}.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'No se pudo actualizar el estado.',
        });
      }
    });
  };

  const handleResetPassword = (userId: string, email: string) => {
    if (!confirm(`¿Deseas generar una nueva contraseña provisoria para ${email}?`)) {
      return;
    }

    setCopiedCreds(false);
    startTransition(async () => {
      const res = await resetUserPasswordAction(userId, email);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `Nueva contraseña generada para ${email}.`,
          email: res.email,
          tempPassword: res.tempPassword,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Error al resetear contraseña.',
        });
      }
    });
  };

  const handleCopyCredentials = (email: string, pass: string) => {
    const text = `Credenciales H.Motores:\nCorreo: ${email}\nContraseña Provisoria: ${pass}\nEnlace de Ingreso: ${window.location.origin}/login\n(El sistema te pedirá establecer tu contraseña propia al ingresar)`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 3000);
  };

  const openEditModal = (user: UserProfile) => {
    setEditUserId(user.id);
    setEditNombre(user.nombre);
    setEditApellido(user.apellido);
    setEditRol(user.rol);
    setEditSucursalId(user.sucursal_id ?? null);
    setEditSucursalesIds((user.sucursales ?? []).map((s) => s.id).filter((id) => id !== user.sucursal_id));
    setEditZonasIds((user.zonas ?? []).map((z) => z.id));
    setIsEditModalOpen(true);
  };

  const resetEditForm = () => {
    setEditUserId('');
    setEditNombre('');
    setEditApellido('');
    setEditRol('ejecutivo');
    setEditSucursalId(null);
    setEditSucursalesIds([]);
    setEditZonasIds([]);
  };

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateUserAction({
        userId: editUserId,
        nombre: editNombre.trim(),
        apellido: editApellido.trim(),
        rol: editRol,
        sucursal_id: editSucursalId,
        sucursales_ids: editSucursalesIds.length > 0 ? editSucursalesIds : undefined,
        zonas_ids: editZonasIds.length > 0 ? editZonasIds : undefined,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Usuario actualizado exitosamente.',
        });
        setIsEditModalOpen(false);
        resetEditForm();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Error al actualizar usuario.',
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-neutral-900" />
            <span>Gestión de Cuentas y Usuarios</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Administra los accesos internos, roles y activación del personal de H.Motores
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Registrar Nuevo Usuario</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Usuarios</p>
            <p className="text-3xl font-bold text-neutral-900 mt-1">{totalUsers}</p>
          </div>
          <div className="w-11 h-11 rounded-xl border border-neutral-300 flex items-center justify-center text-neutral-900">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-900 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Activos</p>
            <p className="text-3xl font-bold text-white mt-1">{activeUsers}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Inactivos / Bloqueados</p>
            <p className="text-3xl font-bold text-neutral-400 mt-1">{inactiveUsers}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Feedback banner with Credential Display */}
      {feedback && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            feedback.type === 'success'
              ? 'bg-neutral-900 border-neutral-900 text-white'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-white shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2">
                <p className="font-bold text-base">{feedback.message}</p>

                {feedback.tempPassword && feedback.email && (
                  <div className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-2 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-neutral-300 block uppercase text-[10px]">Correo:</span>
                        <span className="text-white font-semibold text-sm">{feedback.email}</span>
                      </div>
                      <div>
                        <span className="text-neutral-300 block uppercase text-[10px]">Contraseña Provisoria:</span>
                        <span className="text-white font-bold text-base tracking-wider">{feedback.tempPassword}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-300 pt-1 font-sans border-t border-white/20">
                      💡 El usuario iniciará sesión en <strong>/login</strong> con esta contraseña provisoria y el sistema le solicitará de forma obligatoria establecer su propia contraseña permanente.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {feedback.tempPassword && feedback.email && (
                <button
                  onClick={() => handleCopyCredentials(feedback.email!, feedback.tempPassword!)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold rounded-xl text-xs transition-all cursor-pointer shrink-0"
                >
                  {copiedCreds ? (
                    <>
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Credenciales</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => setFeedback(null)}
                className="text-neutral-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Rol:
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-white border border-neutral-300 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="todos">Todos los roles</option>
            <option value="administrador">Administrador</option>
            <option value="jefe_local">Jefe de Local</option>
            <option value="ejecutivo">Ejecutivo</option>
            <option value="logistica">Logística</option>
            <option value="operaciones">Operaciones</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase font-semibold text-neutral-500 tracking-wider">
                <th className="py-3.5 px-4">Usuario</th>
                <th className="py-3.5 px-4">Correo</th>
                <th className="py-3.5 px-4">Rol</th>
                <th className="py-3.5 px-4">Sucursal</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Clave Inicial</th>
                <th className="py-3.5 px-4">Registro</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = roleLabels[user.rol] || {
                    label: user.rol,
                    color: 'bg-neutral-100 text-neutral-700 border-neutral-200',
                  };
                  const isMainAdmin = user.email.toLowerCase() === 'maic.hernandez.dev@gmail.com';

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-neutral-50 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center font-bold text-xs text-white uppercase">
                            {user.nombre.charAt(0)}
                            {user.apellido ? user.apellido.charAt(0) : ''}
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900">
                              <UsuarioNombreBoton usuarioId={user.id} nombre={`${user.nombre} ${user.apellido}`} muted />
                            </p>
                            {isMainAdmin && (
                              <span className="text-[10px] text-neutral-500 font-medium">
                                Administrador Principal
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-neutral-600 font-mono text-xs">
                        {user.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleConfig.color}`}
                        >
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Sucursal */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const mainSuc = user.sucursal_id
                            ? sucursales.find((s) => s.id === user.sucursal_id)
                            : undefined;
                          const extras = (user.sucursales ?? []).filter((s) => s.id !== user.sucursal_id);
                          const zonaNombres = (user.zonas ?? [])
                            .map((z) => zonas.find((z2) => z2.id === z.id)?.nombre)
                            .filter(Boolean) as string[];
                          return (
                            <div className="space-y-1.5">
                              {mainSuc ? (
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                                  <span className="text-xs font-medium text-neutral-700">{mainSuc.nombre}</span>
                                  {extras.length > 0 && (
                                    <span className="text-[10px] font-semibold text-neutral-400">
                                      +{extras.length} más
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-neutral-400">Sin asignar</span>
                              )}
                              {zonaNombres.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {zonaNombres.map((name) => (
                                    <span
                                      key={name}
                                      className="px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200 text-[10px] font-medium"
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {user.activo ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-900 text-white border border-neutral-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-neutral-500 border border-neutral-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Password setup status */}
                      <td className="py-3.5 px-4">
                        {user.requiere_cambio_clave ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-900 border border-neutral-300">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Pendiente cambio</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-500">
                            <Check className="w-3 h-3 text-neutral-900" />
                            <span>Definida</span>
                          </span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 text-xs text-neutral-500">
                        {new Date(user.created_at).toLocaleDateString('es-CL')}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {/* Edit user button */}
                        <button
                          onClick={() => openEditModal(user)}
                          title="Editar usuario"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Reset password button */}
                        <button
                          onClick={() => handleResetPassword(user.id, user.email)}
                          title="Generar nueva contraseña provisoria"
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        {/* Toggle active/inactive */}
                        <button
                          onClick={() => handleToggleStatus(user.id, user.activo, user.email)}
                          disabled={isMainAdmin}
                          title={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            user.activo
                              ? 'text-neutral-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                          }`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear Nuevo Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Registrar Nuevo Usuario</h2>
                  <p className="text-xs text-neutral-500">Creación de cuenta empresarial</p>
                </div>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. González"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              {/* Email with Domain Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Correo Electrónico *
                </label>
                <div className="flex rounded-xl overflow-hidden border border-neutral-300 bg-white focus-within:ring-2 focus-within:ring-neutral-900">
                  <input
                    type="text"
                    required
                    placeholder="nombre.apellido"
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                    className="flex-1 px-3 py-2 bg-transparent text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none"
                  />
                  <span className="px-2 py-2 text-neutral-400 text-sm font-semibold flex items-center">
                    @
                  </span>
                  <select
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value)}
                    className="px-3 py-2 bg-neutral-50 text-sm text-neutral-900 border-l border-neutral-300 focus:outline-none"
                  >
                    <option value="gmail.com">gmail.com (Pruebas)</option>
                    <option value="hmotores.cl">hmotores.cl (Corporativo)</option>
                  </select>
                </div>
              </div>

              {/* Rol */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Rol Asignado *
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="ejecutivo">Ejecutivo (Gestión de solicitudes/vehículos)</option>
                  <option value="jefe_local">Jefe de Local (Aprobación, priorización, entrega)</option>
                  <option value="logistica">Logística (Coordinación de traslados)</option>
                  <option value="operaciones">Operaciones (Ingreso/mantenimiento de vehículos)</option>
                  <option value="administrador">Administrador (Control total del sistema)</option>
                </select>
              </div>

              {/* Sucursal */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Sucursal Asignada *
                </label>
                <select
                  value={sucursalId ?? ''}
                  onChange={(e) => setSucursalId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="">Seleccionar sucursal...</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}{s.direccion ? ` - ${s.direccion}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <MultiCheckSelector
                title="Otras sucursales asignadas (multisede)"
                options={sucursales.filter((s) => s.id !== sucursalId).map((s) => ({ id: s.id, label: s.nombre ?? '' }))}
                selected={sucursalesIds}
                onToggle={(id) => setSucursalesIds((prev) => toggleId(prev, id))}
              />

              <MultiCheckSelector
                title="Zonas de logística territorial"
                options={zonas.map((z) => ({ id: z.id, label: z.nombre }))}
                selected={zonasIds}
                onToggle={(id) => setZonasIds((prev) => toggleId(prev, id))}
              />

              {/* Optional Custom Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Contraseña Provisoria (Opcional)</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Si se deja vacío, se auto-genera</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. ClaveProvisoria123"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              {/* Explanatory note */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-start gap-2.5 text-xs text-neutral-600">
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-neutral-900" />
                <span>
                  El usuario ingresará con su correo y contraseña provisoria a <strong>/login</strong>, y el sistema le solicitará automáticamente definir su propia contraseña permanente en su primer acceso.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-700 active:bg-black rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-900 flex items-center justify-center text-white">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Editar Usuario</h2>
                  <p className="text-xs text-neutral-500">Modificar datos de la cuenta</p>
                </div>
              </div>
              <button
                onClick={() => { setIsEditModalOpen(false); resetEditForm(); }}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={editApellido}
                    onChange={(e) => setEditApellido(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
              </div>

              {/* Rol */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Rol Asignado *
                </label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="ejecutivo">Ejecutivo (Gestión de solicitudes/vehículos)</option>
                  <option value="jefe_local">Jefe de Local (Aprobación, priorización, entrega)</option>
                  <option value="logistica">Logística (Coordinación de traslados)</option>
                  <option value="operaciones">Operaciones (Ingreso/mantenimiento de vehículos)</option>
                  <option value="administrador">Administrador (Control total del sistema)</option>
                </select>
              </div>

              {/* Sucursal */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Sucursal Asignada
                </label>
                <select
                  value={editSucursalId ?? ''}
                  onChange={(e) => setEditSucursalId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="">Seleccionar sucursal...</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}{s.direccion ? ` - ${s.direccion}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <MultiCheckSelector
                title="Otras sucursales asignadas (multisede)"
                options={sucursales.filter((s) => s.id !== editSucursalId).map((s) => ({ id: s.id, label: s.nombre ?? '' }))}
                selected={editSucursalesIds}
                onToggle={(id) => setEditSucursalesIds((prev) => toggleId(prev, id))}
              />

              <MultiCheckSelector
                title="Zonas de logística territorial"
                options={zonas.map((z) => ({ id: z.id, label: z.nombre }))}
                selected={editZonasIds}
                onToggle={(id) => setEditZonasIds((prev) => toggleId(prev, id))}
              />

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); resetEditForm(); }}
                  className="px-4 py-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-700 active:bg-black rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
