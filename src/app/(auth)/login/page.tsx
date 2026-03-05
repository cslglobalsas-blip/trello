'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckSquare, ArrowRight, ArrowLeft, Eye, EyeOff } from "lucide-react";

type AuthMode = "login" | "signup" | "forgot";

export default function Auth() {
  const { session, loading } = useAuth();
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace('/')
    }
  }, [session, router])

  if (loading || session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Revisa tu correo para restablecer tu contraseña");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("¡Bienvenido de nuevo!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Revisa tu correo para confirmar.");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === "login"
    ? "Bienvenido de nuevo"
    : mode === "signup"
    ? "Crea tu cuenta"
    : "Recuperar contraseña";

  const description = mode === "login"
    ? "Inicia sesión en tu espacio de trabajo"
    : mode === "signup"
    ? "Comienza con TaskFlow gratis"
    : "Te enviaremos un enlace para restablecer tu contraseña";

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <CheckSquare className="h-10 w-10" />
            <h1 className="text-3xl font-bold">TaskFlow</h1>
          </div>
          <p className="text-xl font-medium mb-4">
            Gestiona el trabajo de tu equipo, sin esfuerzo.
          </p>
          <p className="text-primary-foreground/80">
            Tableros Kanban, seguimiento de tareas, calendarios y paneles — todo en un solo lugar para tu equipo.
          </p>
        </div>
      </div>

      {/* Panel derecho - formulario */}
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2 lg:hidden">
              <CheckSquare className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold">TaskFlow</span>
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  required
                />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === "login" && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? "Espera..."
                  : mode === "login"
                  ? "Iniciar sesión"
                  : mode === "signup"
                  ? "Crear cuenta"
                  : "Enviar enlace"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "forgot" ? (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Volver al inicio de sesión
                </button>
              ) : (
                <>
                  {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    className="font-medium text-primary hover:underline"
                  >
                    {mode === "login" ? "Registrarse" : "Iniciar sesión"}
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
