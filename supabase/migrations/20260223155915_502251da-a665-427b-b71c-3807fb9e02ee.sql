-- Corregir datos existentes: marcar Completado como columna final
UPDATE project_columns SET is_final = true
WHERE name = 'Completado' AND is_final = false;

-- Asegurar que el trigger cree columnas correctamente en proyectos nuevos
CREATE OR REPLACE FUNCTION create_default_project_columns()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_columns (project_id, name, color, position, is_final) VALUES
    (NEW.id, 'Por Hacer',    '#94A3B8', 0, false),
    (NEW.id, 'En Progreso',  '#3B82F6', 1, false),
    (NEW.id, 'En Revision',  '#F59E0B', 2, false),
    (NEW.id, 'Completado',   '#10B981', 3, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;