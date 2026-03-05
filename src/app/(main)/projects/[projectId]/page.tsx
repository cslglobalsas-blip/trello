'use client'

import { useParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectTabs } from "@/components/project/ProjectTabs";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const { data: projects, isLoading } = useProjects();
  const project = projects?.find((p) => p.id === params.projectId);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-foreground">Proyecto no encontrado</h1>
        <p className="text-muted-foreground mt-2">El proyecto no existe o no tienes acceso.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
      </div>
      {project.description && (
        <p className="text-muted-foreground mb-6">{project.description}</p>
      )}
      <ProjectTabs project={project} />
    </div>
  );
}
