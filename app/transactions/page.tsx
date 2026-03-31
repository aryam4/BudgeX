import { redirect } from "next/navigation";
import { TransactionsPage } from "@/components/pages/transactions-page";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return <AppShell><TransactionsPage /></AppShell>;
}
