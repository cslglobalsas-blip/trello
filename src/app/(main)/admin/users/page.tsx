'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUsers, type UserWithDetails } from "@/hooks/useUsers";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Settings, UserPlus, Shield, ShieldOff, Users, Trash2, Pencil, CheckCircle, Mail } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { EditUserDialog } from "@/components/EditUserDialog";

export default function UsersPage() {
  const { isAdmin, user } = useAuth();
  const router = useRouter();
  const { data: users, isLoading, updateRole, inviteUser, toggleActive, deleteUser, updateProfile } = useUsers();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserWithDetails | null>(null);
  const [editTarget, setEditTarget] = useState<UserWithDetails | null>(null);
  const [activateTarget, setActivateTarget] = useState<UserWithDetails | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserWithDetails | null>(null);
  const [resendTarget, setResendTarget] = useState<UserWithDetails | null>(null);

  if (!isAdmin) {
    router.replace('/')
    return null
  }

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await inviteUser.mutateAsync({ email: inviteEmail, role: inviteRole, full_name: inviteName || undefined });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      setInviteName("");
    } finally {
      setInviting(false);
    }
  };

  const getInitials = (name: string | null) =>
    (name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const getStatus = (u: UserWithDetails) => {
    if (!u.is_active) return "inactive";
    if (!u.last_seen) return "pending";
    return "active";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input
                  placeholder="Nombre completo (opcional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Miembro</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting ? "Enviando..." : "Enviar invitación"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nombre completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Proyectos</TableHead>
                <TableHead>Fecha de registro</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-28">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => {
                const status = getStatus(u);
                const isSelf = u.user_id === user?.id;
                return (
                  <TableRow key={u.user_id} className={!u.is_active ? "opacity-60" : ""}>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name || "Avatar"} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(u.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => updateRole.mutate({ userId: u.user_id, newRole: v as "admin" | "member" })}
                        disabled={isSelf}
                      >
                        <SelectTrigger className="h-8 w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Miembro</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">{u.project_count}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {u.project_names.length ? u.project_names.join(", ") : "Sin proyectos"}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(u.created_at), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.last_seen ? format(new Date(u.last_seen), "dd MMM yyyy", { locale: es }) : "Nunca"}
                    </TableCell>
                    <TableCell>
                    {status === "inactive" && (
                        <Badge variant="secondary" className="text-muted-foreground">Inactivo</Badge>
                      )}
                      {status === "pending" && (
                        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Pendiente</Badge>
                      )}
                      {status === "active" && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Activo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isSelf && (
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditTarget(u)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar usuario</TooltipContent>
                          </Tooltip>
                          {status === "pending" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setResendTarget(u)}
                                >
                                  <Mail className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reenviar invitación</TooltipContent>
                            </Tooltip>
                          )}
                          {status !== "active" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setActivateTarget(u)}
                                >
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Activar usuario</TooltipContent>
                            </Tooltip>
                          )}
                          {status === "active" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setDeactivateTarget(u)}
                                >
                                  <ShieldOff className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Desactivar usuario</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDeleteTarget(u)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar usuario</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que deseas eliminar a {deleteTarget?.full_name || deleteTarget?.email || "este usuario"}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteUser.mutate({ userId: deleteTarget.user_id });
                  setDeleteTarget(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!activateTarget} onOpenChange={(open) => !open && setActivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Activar a {activateTarget?.full_name || activateTarget?.email || "este usuario"}? Podrá acceder a TaskFlow inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (activateTarget) {
                  toggleActive.mutate({ userId: activateTarget.user_id, activate: true });
                  setActivateTarget(null);
                }
              }}
            >
              Activar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desactivar a {deactivateTarget?.full_name || deactivateTarget?.email || "este usuario"}? No podrá acceder a TaskFlow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deactivateTarget) {
                  toggleActive.mutate({ userId: deactivateTarget.user_id, activate: false });
                  setDeactivateTarget(null);
                }
              }}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resendTarget} onOpenChange={(open) => !open && setResendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar invitación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Reenviar invitación a {resendTarget?.email || "este usuario"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (resendTarget) {
                  inviteUser.mutate({ email: resendTarget.email!, role: resendTarget.role });
                  setResendTarget(null);
                }
              }}
            >
              Reenviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditUserDialog
        user={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={async (params) => {
          await updateProfile.mutateAsync(params);
        }}
        onToggleActive={async (params) => {
          await toggleActive.mutateAsync(params);
        }}
      />
    </div>
  );
}
