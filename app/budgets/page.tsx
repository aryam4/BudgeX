import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BudgetsPage } from "@/components/pages/budgets-page";
import { createClient } from "@/lib/supabase/server";

export default async function BudgetsRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <AppShell>
      <BudgetsPage />
    </AppShell>
  );
}
