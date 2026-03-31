import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SettingsPage } from "@/components/pages/settings-page";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <AppShell>
      <SettingsPage />
    </AppShell>
  );
}
