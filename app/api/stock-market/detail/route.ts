import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RangeKey = "6h" | "12h" | "1d" | "1w" | "1m" | "6m" | "1y" | "5y";

type QuoteResponse = {
  c?: number;
  d?: number;
  dp?: number;
  pc?: number;
  t?: number;
  error?: string;
};

type CandleResponse = {
  c?: number[];
  h?: number[];
  l?: number[];
  o?: number[];
  s?: string;
  t?: number[];
  v?: number[];
};

type ExchangeRateResponse = {
  rates?: {
    CAD?: number;
  };
};

const rangeConfig: Record<
  RangeKey,
  { label: string; resolution: string; seconds: number }
> = {
  "6h": { label: "Last 6 Hours", resolution: "15", seconds: 6 * 60 * 60 },
  "12h": { label: "Last 12 Hours", resolution: "30", seconds: 12 * 60 * 60 },
  "1d": { label: "1 Day", resolution: "60", seconds: 24 * 60 * 60 },
  "1w": { label: "1 Week", resolution: "60", seconds: 7 * 24 * 60 * 60 },
  "1m": { label: "1 Month", resolution: "D", seconds: 30 * 24 * 60 * 60 },
  "6m": { label: "6 Months", resolution: "W", seconds: 182 * 24 * 60 * 60 },
  "1y": { label: "1 Year", resolution: "W", seconds: 365 * 24 * 60 * 60 },
  "5y": { label: "5 Years", resolution: "M", seconds: 5 * 365 * 24 * 60 * 60 },
};

async function fetchUsdCadRate() {
  try {
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=CAD",
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as ExchangeRateResponse;
    return Number(data.rates?.CAD ?? 0) || null;
  } catch {
    return null;
  }
}

async function fetchQuote(apiKey: string, symbol: string) {
  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const data = (await response.json()) as QuoteResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error || `Unable to load ${symbol}.`);
  }

  return {
    close: Number(data.c ?? 0),
    previousClose: Number(data.pc ?? 0),
    change: Number(data.d ?? 0),
    percentChange: Number(data.dp ?? 0),
    timestamp: Number(data.t ?? 0),
  };
}

async function fetchCandles(
  apiKey: string,
  symbol: string,
  range: RangeKey
) {
  const config = rangeConfig[range];
  const to = Math.floor(Date.now() / 1000);
  const from = to - config.seconds;
  const url = new URL("https://finnhub.io/api/v1/stock/candle");

  url.searchParams.set("symbol", symbol);
  url.searchParams.set("resolution", config.resolution);
  url.searchParams.set("from", String(from));
  url.searchParams.set("to", String(to));
  url.searchParams.set("token", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });
  const data = (await response.json()) as CandleResponse;

  if (!response.ok || data.s !== "ok") {
    throw new Error(`No chart data available for ${symbol} in this range.`);
  }

  return (data.t ?? []).map((time, index) => ({
    timestamp: time,
    open: Number(data.o?.[index] ?? 0),
    high: Number(data.h?.[index] ?? 0),
    low: Number(data.l?.[index] ?? 0),
    close: Number(data.c?.[index] ?? 0),
    volume: Number(data.v?.[index] ?? 0),
  }));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing FINNHUB_API_KEY." },
      { status: 500 }
    );
  }

  const requestUrl = new URL(request.url);
  const symbol = requestUrl.searchParams.get("symbol")?.trim().toUpperCase();
  const rangeParam = requestUrl.searchParams.get("range") as RangeKey | null;
  const range = rangeParam && rangeConfig[rangeParam] ? rangeParam : "1m";
  const market = requestUrl.searchParams.get("market") === "ca" ? "ca" : "us";
  const name = requestUrl.searchParams.get("name")?.trim() || symbol || "";
  const exchange =
    requestUrl.searchParams.get("exchange")?.trim() ||
    (symbol?.includes(".TO") ? "TSX" : market === "ca" ? "Canadian Listing" : "US Listing");
  const baseCurrency =
    requestUrl.searchParams.get("currency")?.trim().toUpperCase() ||
    (symbol?.includes(".TO") ? "CAD" : "USD");

  if (!symbol) {
    return NextResponse.json(
      { error: "Missing stock symbol." },
      { status: 400 }
    );
  }

  try {
    const [quote, candles, usdCadRate] = await Promise.all([
      fetchQuote(apiKey, symbol),
      fetchCandles(apiKey, symbol, range),
      fetchUsdCadRate(),
    ]);

    return NextResponse.json({
      provider: "Finnhub",
      updatedAt: new Date().toISOString(),
      localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      usdCadRate,
      range,
      rangeLabel: rangeConfig[range].label,
      stock: {
        symbol,
        name,
        exchange,
        market,
        currency: baseCurrency,
        ...quote,
      },
      series: candles,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load stock details right now.",
      },
      { status: 500 }
    );
  }
}
