import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, CheckSquare, FolderKanban, Bell, User, CheckCheck, ClipboardList } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useNotifications, useUnreadCount, useMarkAllRead, useMarkRead, type Notification } from "@/hooks/useNotifications";
import { useProjects } from "@/hooks/useProjects";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserProfilePanel } from "@/components/UserProfilePanel";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const { data: projects = [] } = useProjects();
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const handleNotifClick = (n: Notification) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.project_id) {
      router.push(`/projects/${n.project_id}`);
      setNotifOpen(false);
    }
  };

  const tabClass = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 ${active ? "text-[#0052CC]" : "text-muted-foreground"}`;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-end justify-around border-t bg-background md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <button onClick={() => router.push("/")} className={tabClass(isActive("/"))}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-tight">Inicio</span>
        </button>

        <button onClick={() => router.push("/my-work")} className={tabClass(isActive("/my-work"))}>
          <CheckSquare className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-tight">Mis Tareas</span>
        </button>

        {/* Projects tab with popover */}
        <Popover open={projectsOpen} onOpenChange={setProjectsOpen}>
          <PopoverTrigger asChild>
            <button className={`${tabClass(isActive("/projects"))} relative`}>
              <FolderKanban className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-tight">Proyectos</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-72 p-0 mb-2">
            <div className="border-b px-4 py-3">
              <h4 className="text-sm font-semibold">Proyectos</h4>
            </div>
            <div className="relative">
              <div className="max-h-[60vh] overflow-y-auto scroll-smooth">
                {projects.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No tienes proyectos</p>
                ) : (
                  <div className="divide-y">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { router.push(`/projects/${p.id}`); setProjectsOpen(false); }}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${pathname === `/projects/${p.id}` ? "bg-muted" : ""}`}
                      >
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-sm font-medium truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {projects.length > 5 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-popover to-transparent" />
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Notifications tab with popover */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button className={`${tabClass(false)} relative`}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 left-1/2 translate-x-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              <span className="text-[10px] font-medium leading-tight">Notificaciones</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-80 p-0 mb-2">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h4 className="text-sm font-semibold">Notificaciones</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs text-muted-foreground" onClick={() => markAllRead.mutate()}>
                  <CheckCheck className="mr-1 h-3 w-3" />
                  Marcar todo leído
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-64">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No tienes notificaciones</p>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <button key={n.id} onClick={() => handleNotifClick(n)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${!n.is_read ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
                    >
                      <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                      {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <button onClick={() => setProfileOpen(true)} className={tabClass(false)}>
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-tight">Perfil</span>
        </button>
      </nav>
      <UserProfilePanel open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
