'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { AppSidebar } from "@/components/AppSidebar"
import { SidebarProvider, useSidebarState } from "@/contexts/SidebarContext"
import { NotificationBell } from "@/components/NotificationBell"
import { FloatingAssistantButton } from "@/components/ai-assistant/FloatingAssistantButton"
import { MobileBottomNav } from "@/components/MobileBottomNav"

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const { collapsed } = useSidebarState()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, session, router])

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden md:flex">
        <AppSidebar />
      </div>
      <div className={`flex-1 flex flex-col transition-all duration-200 ${collapsed ? "md:ml-[80px]" : "md:ml-[300px]"}`}>
        <header className="flex h-12 items-center justify-end border-b px-6">
          <NotificationBell />
        </header>
        <main className="flex-1 p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <FloatingAssistantButton />
      <MobileBottomNav />
    </div>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  )
}
