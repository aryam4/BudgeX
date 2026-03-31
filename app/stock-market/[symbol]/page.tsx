import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StockMarketDetailPage } from "@/components/pages/stock-market-detail-page";
import { createClient } from "@/lib/supabase/server";

type StockMarketDetailRouteProps = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{
    name?: string;
    exchange?: string;
    currency?: string;
    market?: string;
  }>;
};

export default async function StockMarketDetailRoute({
  params,
  searchParams,
}: StockMarketDetailRouteProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { symbol } = await params;
  const query = await searchParams;

  return (
    <AppShell>
      <StockMarketDetailPage
        symbol={decodeURIComponent(symbol)}
        name={query.name}
        exchange={query.exchange}
        currency={query.currency}
        market={query.market === "ca" ? "ca" : "us"}
      />
    </AppShell>
  );
}
