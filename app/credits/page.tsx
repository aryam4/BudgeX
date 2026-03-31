import { redirect } from "next/navigation";
import { CreditsPage } from "@/components/pages/credits-page";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function CreditsRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return <AppShell><CreditsPage /></AppShell>;
}
