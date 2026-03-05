
Diagnóstico confirmado

- El problema sigue activo: se crea el registro en `projects`, pero falla la inserción en `project_members`.
- Evidencia actual en BD: existe un proyecto reciente huérfano (`0ea5b89e-6243-4798-93f7-cc753058cee8`, nombre `VIZAC`) sin fila de membresía del creador.
- Causa técnica probable: recursión indirecta de RLS al evaluar políticas de `project_members` que consultan `projects`, y `projects_select` vuelve a consultar `project_members`.

Plan de corrección

1) Corregir políticas RLS de `project_members` para eliminar dependencia recursiva
- Reemplazar `pm_insert` para que valide ownership con función `SECURITY DEFINER` existente:
  - `WITH CHECK (public.is_project_owner(project_id, auth.uid()))`
- Reemplazar `pm_delete` con la misma lógica:
  - `USING (public.is_project_owner(project_id, auth.uid()))`
- Con esto evitamos que `pm_insert/pm_delete` disparen `projects_select` durante su evaluación.

2) Limpiar datos huérfanos creados por el fallo
- Eliminar proyectos sin membresía del creador, empezando por el huérfano ya detectado:
  - `0ea5b89e-6243-4798-93f7-cc753058cee8`
- (Opcional seguro) limpiar huérfanos recientes con una query controlada por fecha/usuario.

3) Endurecer el flujo frontend para evitar huérfanos futuros
- En `useCreateProject`:
  - Si falla el insert en `project_members`, ejecutar rollback del `project` recién creado (best-effort).
  - Mostrar el error real de Supabase en el toast para diagnóstico rápido (en vez de mensaje genérico).

4) Verificación funcional (obligatoria)
- Probar crear proyecto desde UI (usuario autenticado).
- Validar en DB:
  - Existe fila en `projects`.
  - Existe fila correspondiente en `project_members` con `project_id` + `user_id` del creador.
- Validar que el proyecto aparece inmediatamente en sidebar y abre sin errores.
- Probar también agregar/quitar miembro para confirmar que `pm_delete` quedó estable.

Detalle técnico (SQL objetivo)

```sql
DROP POLICY IF EXISTS "pm_insert" ON public.project_members;
CREATE POLICY "pm_insert" ON public.project_members
FOR INSERT TO authenticated
WITH CHECK (public.is_project_owner(project_id, auth.uid()));

DROP POLICY IF EXISTS "pm_delete" ON public.project_members;
CREATE POLICY "pm_delete" ON public.project_members
FOR DELETE TO authenticated
USING (public.is_project_owner(project_id, auth.uid()));

-- limpieza puntual del huérfano detectado
DELETE FROM public.projects
WHERE id = '0ea5b89e-6243-4798-93f7-cc753058cee8';
```

Resultado esperado

- Crear proyecto vuelve a funcionar de forma consistente.
- Se elimina la recursión RLS en el flujo de membresía.
- No quedan proyectos “fantasma” por fallos parciales.
