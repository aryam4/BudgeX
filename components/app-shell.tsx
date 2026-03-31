import { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AIChatWidget } from "@/components/ai-chat-widget";
import { SettingsEffects } from "@/components/settings-effects";
import { SiteTopbar } from "@/components/site-topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <SiteTopbar />
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <AppSidebar />
          <main>{children}</main>
        </div>
      </div>
      <SettingsEffects />
      <AIChatWidget />
    </div>
  );
}
