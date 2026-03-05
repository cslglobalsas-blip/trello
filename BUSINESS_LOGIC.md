# BUSINESS_LOGIC.md - LexAgenda

> Generado por SaaS Factory | Fecha: 2024-12-20

## 1. Problema de Negocio

**Dolor:** Los bufetes de abogados gestionan citas manualmente por WhatsApp/teléfono, perdiendo tiempo y clientes. No tienen visibilidad de disponibilidad, los clientes cancelan sin aviso, y no hay métricas de rendimiento.

**Costo actual:**
- ~2 horas diarias coordinando citas manualmente
- ~20% de citas perdidas por falta de recordatorios
- Pérdida de leads por respuesta lenta
- Sin métricas de productividad por abogado

## 2. Solución

**Propuesta de valor:** Una plataforma de agendamiento de citas legales que permite a clientes reservar consultas online con abogados según su especialidad y disponibilidad.

**Flujo principal (Happy Path):**
1. Cliente entra a la plataforma, selecciona tipo de consulta
2. Sistema muestra abogados disponibles filtrados por especialidad
3. Cliente selecciona abogado, fecha y hora disponible
4. Sistema crea la cita y envía confirmación por email
5. Abogado ve la cita en su dashboard
6. Sistema envía recordatorio 24h antes
7. Abogado marca cita como completada y agrega notas

## 3. Usuario Objetivo

**Roles:**
- **Admin del Bufete**: Gestiona abogados, configura horarios, ve reportes
- **Abogado**: Gestiona su agenda personal, actualiza disponibilidad
- **Cliente**: Agenda citas, ve historial, recibe recordatorios

**Contexto:** Bufetes pequeños/medianos (1-20 abogados) que quieren profesionalizar su gestión de citas.

## 4. Arquitectura de Datos

**Input:**
- Datos del cliente (nombre, email, teléfono)
- Tipo de consulta legal
- Preferencia de abogado/especialidad
- Fecha y hora deseada
- Notas adicionales del cliente

**Output:**
- Confirmación de cita (email)
- Recordatorios automáticos (24h antes)
- Dashboard con citas del día/semana
- Métricas y reportes
- Historial de citas

**Storage (Supabase tables):**

```sql
-- Ya existe
profiles (id, email, full_name, avatar_url, created_at, updated_at)

-- Por crear
lawyers (
  id uuid primary key,
  user_id uuid references profiles(id),
  specialty text not null,
  bio text,
  experience_years int,
  hourly_rate decimal,
  rating decimal,
  is_active boolean default true,
  created_at timestamptz default now()
)

appointment_types (
  id uuid primary key,
  name text not null,
  description text,
  duration_minutes int default 60,
  price decimal,
  created_at timestamptz default now()
)

availability (
  id uuid primary key,
  lawyer_id uuid references lawyers(id),
  day_of_week int, -- 0=domingo, 1=lunes...
  start_time time,
  end_time time,
  is_available boolean default true
)

appointments (
  id uuid primary key,
  client_id uuid references profiles(id),
  lawyer_id uuid references lawyers(id),
  appointment_type_id uuid references appointment_types(id),
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  status text default 'pending', -- pending, confirmed, completed, cancelled
  notes text,
  client_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

clients (
  id uuid primary key,
  user_id uuid references profiles(id),
  phone text,
  address text,
  created_at timestamptz default now()
)
```

## 5. KPI de Éxito

**Métrica principal:** Permitir que un cliente agende una cita en menos de 2 minutos, con visibilidad completa de la agenda para el abogado.

**Métricas secundarias:**
- Tasa de confirmación de citas > 80%
- Reducción de no-shows con recordatorios
- Tiempo promedio de respuesta < 5 segundos

## 6. Especificación Técnica

### Features a Implementar (Feature-First)

```
src/features/
├── auth/              # Autenticación (YA IMPLEMENTADO)
├── lawyers/           # CRUD abogados, perfiles, especialidades
├── appointments/      # Gestión de citas, calendario
├── availability/      # Horarios y disponibilidad
├── clients/           # Gestión de clientes
├── booking/           # Flujo de reserva para clientes
├── notifications/     # Recordatorios y emails
└── dashboard/         # Métricas y reportes
```

### Stack Confirmado
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind 3.4
- **Backend:** Supabase (Auth + Database + Storage)
- **Validación:** Zod
- **State:** Zustand (si necesario)
- **MCPs:** Next.js DevTools + Playwright + Supabase

### Fases de Implementación (Blueprint)

1. [x] Auth base (COMPLETADO)
2. [ ] Fase 2: Base de datos (tablas y RLS)
3. [ ] Fase 3: Feature Lawyers (CRUD abogados)
4. [ ] Fase 4: Feature Availability (horarios)
5. [ ] Fase 5: Feature Appointments (citas)
6. [ ] Fase 6: Feature Booking (flujo cliente)
7. [ ] Fase 7: Dashboard y métricas
8. [ ] Fase 8: Notificaciones
