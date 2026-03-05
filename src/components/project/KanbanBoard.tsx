import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import type { ProjectColumn } from "@/hooks/useProjectColumns";
import type { Task } from "@/hooks/useTasks";
import { useDeleteTask } from "@/hooks/useTasks";
import type { SubtaskCounts } from "@/hooks/useSubtaskCounts";
import { useLabels, useTaskLabelsForProject } from "@/hooks/useLabels";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";

interface Props {
  columns: ProjectColumn[];
  tasks: Task[];
  projectId: string;
  isMember: boolean;
  onAddTask: (status: string) => void;
  onTaskClick?: (task: Task) => void;
  subtaskCounts?: SubtaskCounts;
  projectOwnerId?: string;
  currentUserId?: string;
}

function buildTasksByColumn(columns: ProjectColumn[], tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  columns.forEach((c) => (map[c.name] = []));
  tasks.forEach((t) => {
    if (map[t.status]) map[t.status].push(t);
    else if (columns.length > 0) map[columns[0].name]?.push(t);
  });
  Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position));
  return map;
}

function findColumnOfTask(tasksByCol: Record<string, Task[]>, taskId: string): string | null {
  for (const [col, colTasks] of Object.entries(tasksByCol)) {
    if (colTasks.some((t) => t.id === taskId)) return col;
  }
  return null;
}

export function KanbanBoard({ columns, tasks, projectId, isMember, onAddTask, onTaskClick, subtaskCounts, projectOwnerId, currentUserId }: Props) {
  const deleteTask = useDeleteTask();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: labelsData = [] } = useLabels(projectId);
  const { data: taskLabelsData = [] } = useTaskLabelsForProject(projectId);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const serverTasksByColumn = useMemo(() => buildTasksByColumn(columns, tasks), [columns, tasks]);
  const [dragTasksByColumn, setDragTasksByColumn] = useState<Record<string, Task[]> | null>(null);

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { distance: 5 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  const displayTasksByColumn = dragTasksByColumn ?? serverTasksByColumn;

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const task = tasks.find((t) => t.id === e.active.id);
    if (task) {
      setActiveTask(task);
      setDragTasksByColumn(buildTasksByColumn(columns, tasks));
    }
  }, [tasks, columns]);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setDragTasksByColumn((prev) => {
      if (!prev) return prev;
      const sourceCol = findColumnOfTask(prev, activeId);
      if (!sourceCol) return prev;

      let targetCol: string | null = null;
      if (over.data?.current?.type === "task") {
        targetCol = findColumnOfTask(prev, overId);
      } else if (over.data?.current?.type === "column") {
        targetCol = over.data.current.column.name;
      } else {
        targetCol = columns.some((c) => c.name === overId) ? overId : null;
      }

      if (!targetCol || sourceCol === targetCol) return prev;

      const sourceItems = [...prev[sourceCol]];
      const targetItems = [...prev[targetCol]];
      const taskIndex = sourceItems.findIndex((t) => t.id === activeId);
      if (taskIndex === -1) return prev;

      const [movedTask] = sourceItems.splice(taskIndex, 1);
      const overIndex = targetItems.findIndex((t) => t.id === overId);
      const insertIndex = overIndex >= 0 ? overIndex : targetItems.length;
      targetItems.splice(insertIndex, 0, { ...movedTask, status: targetCol });

      return { ...prev, [sourceCol]: sourceItems, [targetCol]: targetItems };
    });
  }, [columns]);

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    const { active, over } = e;

    const cleanup = () => {
      setActiveTask(null);
      setDragTasksByColumn(null);
    };

    if (!over || !dragTasksByColumn) {
      cleanup();
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const col = findColumnOfTask(dragTasksByColumn, activeId);

    if (!col) {
      cleanup();
      return;
    }

    let items = [...dragTasksByColumn[col]];
    const oldIdx = items.findIndex((t) => t.id === activeId);
    const overIsTask = over.data?.current?.type === "task";
    const newIdx = overIsTask
      ? items.findIndex((t) => t.id === overId)
      : items.length - 1;

    if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
      items = arrayMove(items, oldIdx, newIdx);
    }

    const finalIdx = items.findIndex((t) => t.id === activeId);
    const original = tasks.find((t) => t.id === activeId);

    if (original && (original.status !== col || original.position !== finalIdx)) {
      console.log("DragEnd persist:", { taskId: activeId, newStatus: col, newPosition: finalIdx });

      const { error } = await supabase
        .from("tasks")
        .update({ status: col, position: finalIdx })
        .eq("id", activeId);

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        queryClient.invalidateQueries({ queryKey: ["my_tasks"] });
        queryClient.invalidateQueries({ queryKey: ["delegated_tasks"] });
      } else {
        console.error("Error updating task on drag:", error);
      }
    }

    cleanup();
  }, [dragTasksByColumn, tasks, projectId, queryClient]);

  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
    setDragTasksByColumn(null);
  }, []);

  const handleCompleteTask = useCallback(async (task: Task) => {
    const finalCol = columns.find((c) => c.is_final === true);
    if (!finalCol) return;
    if (task.status === finalCol.name) return;

    const { error } = await supabase
      .from("tasks")
      .update({ status: finalCol.name })
      .eq("id", task.id);

    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["delegated_tasks"] });
      toast({ title: "Tarea completada ✓" });
    } else {
      console.error("Error completing task:", error);
    }
  }, [columns, projectId, queryClient, toast]);

  const handleDeleteTask = useCallback((task: Task) => {
    deleteTask.mutate({ id: task.id, project_id: projectId });
  }, [deleteTask, projectId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-5 overflow-x-auto pb-4 min-h-[400px]">
        {columns.map((col) => (
          <KanbanColumn key={col.id} column={col} tasks={displayTasksByColumn[col.name] || []} onAddTask={onAddTask} isMember={isMember} onTaskClick={onTaskClick} subtaskCounts={subtaskCounts} projectId={projectId} columns={columns} projectOwnerId={projectOwnerId} currentUserId={currentUserId} onCompleteTask={handleCompleteTask} onDeleteTask={handleDeleteTask} labels={labelsData} taskLabels={taskLabelsData} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} subtaskCounts={subtaskCounts?.[activeTask.id]} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
