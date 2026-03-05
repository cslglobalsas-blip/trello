import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { Home, Briefcase, CheckSquare, Users, LogOut, PanelLeftClose, PanelLeftOpen, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProjects, type Project } from "@/hooks/useProjects";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebarState } from "@/contexts/SidebarContext";
import { UserProfilePanel } from "@/components/UserProfilePanel";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useProjectOrder } from "@/hooks/useProjectOrder";
import { SortableProjectItem } from "@/components/sidebar/SortableProjectItem";

const navItems = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Mi Trabajo", url: "/my-work", icon: Briefcase },
];

function NavItem({ icon: Icon, label, active, onClick, collapsed }: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full py-2 px-1 rounded-lg transition-colors gap-1
          ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className={`text-[10px] leading-tight truncate w-full text-center ${active ? "font-semibold" : "font-medium"}`}>
          {label}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full py-2 px-3 rounded-lg transition-colors
        ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className={`text-sm truncate ${active ? "font-semibold" : "font-medium"}`}>
        {label}
      </span>
    </button>
  );
}

function ProjectDot({ name, color, active, onClick, collapsed, onEdit }: {
  name: string;
  color: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
  onEdit?: () => void;
}) {
  if (collapsed) {
    const content = (
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full py-2 px-1 rounded-lg transition-colors gap-1
          ${active ? "bg-primary/10" : "hover:bg-muted"}`}
      >
        <span className="h-[10px] w-[10px] rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className={`text-[10px] leading-tight truncate w-full text-center ${active ? "text-primary font-semibold" : "text-muted-foreground font-medium"}`}>
          {name}
        </span>
      </button>
    );
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{name}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="group flex items-center">
      <button
        onClick={onClick}
        className={`flex items-center gap-3 flex-1 py-2 px-3 rounded-lg transition-colors
          ${active ? "bg-primary/10" : "hover:bg-muted"}`}
      >
        <span className="h-[10px] w-[10px] rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className={`text-sm truncate ${active ? "text-primary font-semibold" : "text-muted-foreground font-medium"}`}>
          {name}
        </span>
      </button>
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { user, profile, role, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { data: projects } = useProjects();
  const { orderedProjects, reorder } = useProjectOrder(projects);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const { collapsed, toggle } = useSidebarState();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorder(active.id as string, over.id as string);
    }
  };

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  };

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-border bg-card transition-all duration-200
          ${collapsed ? "w-[80px]" : "w-[300px]"}`}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-border py-4 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CheckSquare className="h-4 w-4" />
            </div>
            {!collapsed && <span className="text-sm font-bold truncate">TaskFlow</span>}
          </div>
          <button
            onClick={toggle}
            className={`text-muted-foreground hover:text-foreground transition-colors ${collapsed ? "mt-2" : ""}`}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-2 py-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.title}
              icon={item.icon}
              label={item.title}
              active={isActive(item.url)}
              onClick={() => router.push(item.url)}
              collapsed={collapsed}
            />
          ))}

          {collapsed ? (
            <div className="flex flex-col items-center gap-1 my-1">
              <div className="h-px bg-border w-full mx-1" />
              <CreateProjectDialog />
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 my-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                Proyectos
              </span>
              <CreateProjectDialog />
            </div>
          )}

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedProjects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {orderedProjects.map((project) => (
                <SortableProjectItem key={project.id} id={project.id} collapsed={collapsed}>
                  <ProjectDot
                    name={project.name}
                    color={project.color}
                    active={pathname === `/projects/${project.id}`}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    collapsed={collapsed}
                    onEdit={() => setEditProject(project)}
                  />
                </SortableProjectItem>
              ))}
            </SortableContext>
          </DndContext>

          {isAdmin && (
            <>
              <div className="h-px bg-border mx-1 my-1" />
              <NavItem
                icon={Users}
                label="Miembros"
                active={pathname === "/admin/users"}
                onClick={() => router.push("/admin/users")}
                collapsed={collapsed}
              />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className={`flex border-t border-border py-3 ${collapsed ? "flex-col items-center gap-2" : "flex-col gap-2 px-3"}`}>
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors">
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Cerrar sesión</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => setProfileOpen(true)}>
                    <Avatar className="h-8 w-8">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{profile?.full_name || "Usuario"}</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <button
                onClick={signOut}
                className="flex items-center gap-3 w-full py-2 px-3 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Cerrar sesión</span>
              </button>
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-3 px-3 py-1 w-full rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate text-foreground">{profile?.full_name || "Usuario"}</span>
              </button>
            </>
          )}
        </div>
        <UserProfilePanel open={profileOpen} onOpenChange={setProfileOpen} />

        {editProject && (
          <EditProjectDialog
            project={editProject}
            open={!!editProject}
            onOpenChange={(open) => !open && setEditProject(null)}
          />
        )}
      </aside>
    </>
  );
}
