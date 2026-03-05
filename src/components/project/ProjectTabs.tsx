import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjectColumns } from "@/hooks/useProjectColumns";
import { useTasks } from "@/hooks/useTasks";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import { useSubtaskCounts } from "@/hooks/useSubtaskCounts";
import { useCreateDocument, type Document } from "@/hooks/useDocuments";
import type { Project } from "@/hooks/useProjects";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "./KanbanBoard";
import { ListView } from "./ListView";
import { CalendarView } from "./CalendarView";
import { DashboardView } from "./DashboardView";
import { GanttView } from "./GanttView";
import { DocsListView } from "./DocsListView";
import { DocEditorView } from "./DocEditorView";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { ManageColumnsDialog } from "./ManageColumnsDialog";
import { ManageMembersDialog } from "./ManageMembersDialog";
import { ManageLabelsDialog } from "./ManageLabelsDialog";
import { Plus, Settings, Users, LayoutGrid, List, CalendarDays, BarChart3, FileText, GanttChart, Tag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  project: Project;
}

export function ProjectTabs({ project }: Props) {
  const { user } = useAuth();
  const { data: columns = [], isLoading: colLoading } = useProjectColumns(project.id);
  const { data: tasks = [], isLoading: taskLoading } = useTasks(project.id);
  const { data: members = [] } = useProjectMembers(project.id);
  const { data: subtaskCounts } = useSubtaskCounts(project.id);
  const createDocument = useCreateDocument();

  const isOwner = project.created_by === user?.id;
  const isMember = members.some((m) => m.user_id === user?.id);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDefaultStatus, setTaskDefaultStatus] = useState("");
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [labelsDialogOpen, setLabelsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<import("@/hooks/useTasks").Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  function handleTaskClick(task: import("@/hooks/useTasks").Task) {
    // Use latest version from tasks array
    const fresh = tasks.find((t) => t.id === task.id) || task;
    setSelectedTask(fresh);
    setDetailOpen(true);
  }

  const taskCountByColumn = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((t) => { map[t.status] = (map[t.status] || 0) + 1; });
    return map;
  }, [tasks]);

  function handleAddTask(status: string) {
    setTaskDefaultStatus(status);
    setTaskDialogOpen(true);
  }

  if (colLoading || taskLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div>
      <Tabs defaultValue="kanban">
        <div className="sticky top-0 z-40 bg-background border-b -mx-6 px-6 md:static md:border-b-0 md:mx-0 md:px-0 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList className="overflow-x-auto scrollbar-hide whitespace-nowrap w-full md:w-auto">
              <TabsTrigger value="kanban" className="gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Kanban</TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5"><List className="h-3.5 w-3.5" />Lista</TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Calendario</TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Dashboard</TabsTrigger>
              <TabsTrigger value="gantt" className="gap-1.5"><GanttChart className="h-3.5 w-3.5" />Gantt</TabsTrigger>
              <TabsTrigger value="docs" className="gap-1.5" onClick={() => setEditingDoc(null)}><FileText className="h-3.5 w-3.5" />Docs</TabsTrigger>
            </TabsList>
            <div className="hidden md:flex items-center gap-2">
              {isOwner && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setMembersDialogOpen(true)}>
                    <Users className="h-3.5 w-3.5 mr-1" />Miembros
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLabelsDialogOpen(true)}>
                    <Tag className="h-3.5 w-3.5 mr-1" />Etiquetas
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setColumnsDialogOpen(true)}>
                    <Settings className="h-3.5 w-3.5 mr-1" />Fases
                  </Button>
                </>
              )}
              {isMember && (
                <Button size="sm" onClick={() => handleAddTask(columns[0]?.name || "")}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Nueva Tarea
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4 md:hidden flex-wrap">
          {isOwner && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMembersDialogOpen(true)}>
                <Users className="h-3.5 w-3.5 mr-1" />Miembros
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLabelsDialogOpen(true)}>
                <Tag className="h-3.5 w-3.5 mr-1" />Etiquetas
              </Button>
              <Button variant="outline" size="sm" onClick={() => setColumnsDialogOpen(true)}>
                <Settings className="h-3.5 w-3.5 mr-1" />Fases
              </Button>
            </>
          )}
          {isMember && (
            <Button size="sm" onClick={() => handleAddTask(columns[0]?.name || "")}>
              <Plus className="h-3.5 w-3.5 mr-1" />Nueva Tarea
            </Button>
          )}
        </div>

        <TabsContent value="kanban">
          <KanbanBoard columns={columns} tasks={tasks} projectId={project.id} isMember={isMember} onAddTask={handleAddTask} onTaskClick={handleTaskClick} subtaskCounts={subtaskCounts} projectOwnerId={project.created_by} currentUserId={user?.id} />
        </TabsContent>
        <TabsContent value="list">
          <ListView tasks={tasks} columns={columns} projectId={project.id} onTaskClick={handleTaskClick} isMember={isMember} onAddTask={handleAddTask} projectOwnerId={project.created_by} currentUserId={user?.id} />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView tasks={tasks} />
        </TabsContent>
        <TabsContent value="dashboard">
          <DashboardView tasks={tasks} columns={columns} members={members} />
        </TabsContent>
        <TabsContent value="gantt">
          <GanttView tasks={tasks} columns={columns} members={members} onTaskClick={handleTaskClick} />
        </TabsContent>
        <TabsContent value="docs">
          {editingDoc ? (
            <DocEditorView document={editingDoc} onBack={() => setEditingDoc(null)} />
          ) : (
            <DocsListView
              projectId={project.id}
              projectOwnerId={project.created_by}
              isMember={isMember}
              onOpenDoc={(doc) => setEditingDoc(doc)}
              onNewDoc={() => {
                createDocument.mutate({ projectId: project.id }, {
                  onSuccess: (doc) => setEditingDoc(doc as Document),
                });
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={project.id}
        columns={columns}
        members={members}
        defaultStatus={taskDefaultStatus}
        projectName={project.name}
      />
      {isOwner && (
        <>
          <ManageColumnsDialog open={columnsDialogOpen} onOpenChange={setColumnsDialogOpen} columns={columns} projectId={project.id} taskCountByColumn={taskCountByColumn} />
          <ManageMembersDialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen} members={members} projectId={project.id} ownerId={project.created_by} />
          <ManageLabelsDialog open={labelsDialogOpen} onOpenChange={setLabelsDialogOpen} projectId={project.id} />
        </>
      )}
      <TaskDetailPanel
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        columns={columns}
        members={members}
        projectOwnerId={project.created_by}
        projectName={project.name}
        projectId={project.id}
        onManageLabels={() => setLabelsDialogOpen(true)}
      />
    </div>
  );
}
