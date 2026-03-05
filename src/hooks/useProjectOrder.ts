import { useState, useEffect, useCallback } from "react";
import type { Project } from "@/hooks/useProjects";

const STORAGE_KEY = "project-order";

function getStoredOrder(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredOrder(order: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function useProjectOrder(projects: Project[] | undefined) {
  const [orderedIds, setOrderedIds] = useState<string[]>(getStoredOrder);

  useEffect(() => {
    if (!projects?.length) return;
    const projectIds = projects.map((p) => p.id);
    const stored = getStoredOrder();
    // Keep only ids that still exist, then append any new ones
    const validStored = stored.filter((id) => projectIds.includes(id));
    const newIds = projectIds.filter((id) => !validStored.includes(id));
    const merged = [...validStored, ...newIds];
    setOrderedIds(merged);
    setStoredOrder(merged);
  }, [projects]);

  const reorder = useCallback(
    (activeId: string, overId: string) => {
      setOrderedIds((prev) => {
        const oldIndex = prev.indexOf(activeId);
        const newIndex = prev.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const next = [...prev];
        next.splice(oldIndex, 1);
        next.splice(newIndex, 0, activeId);
        setStoredOrder(next);
        return next;
      });
    },
    []
  );

  const orderedProjects = projects
    ? orderedIds
        .map((id) => projects.find((p) => p.id === id))
        .filter(Boolean) as Project[]
    : [];

  return { orderedProjects, reorder };
}
