import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StockMarketPage } from "@/components/pages/stock-market-page";
import { createClient } from "@/lib/supabase/server";

export default async function StockMarketRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <AppShell>
      <StockMarketPage />
    </AppShell>
  );
}
