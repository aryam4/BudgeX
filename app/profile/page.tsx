import { redirect } from "next/navigation";
import { ProfilePage } from "@/components/pages/profile-page";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return <AppShell><ProfilePage /></AppShell>;
}
