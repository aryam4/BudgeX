import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Market = "us" | "ca";

type WatchlistSymbol = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  market: Market;
};

type SearchResult = {
  description?: string;
  displaySymbol?: string;
  symbol?: string;
  type?: string;
};

type SearchResponse = {
  count?: number;
  result?: SearchResult[];
  error?: string;
};

type QuoteResponse = {
  c?: number;
  d?: number;
  dp?: number;
  pc?: number;
  t?: number;
  error?: string;
};

type ExchangeRateResponse = {
  rates?: {
    CAD?: number;
  };
};

const watchlist: WatchlistSymbol[] = [
  {
    symbol: "AAPL",
    name: "Apple",
    exchange: "NASDAQ",
    currency: "USD",
    market: "us",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    exchange: "NASDAQ",
    currency: "USD",
    market: "us",
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    exchange: "NASDAQ",
    currency: "USD",
    market: "us",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    exchange: "NASDAQ",
    currency: "USD",
    market: "us",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    exchange: "NASDAQ",
    currency: "USD",
    market: "us",
  },
  {
    symbol: "RY",
    name: "Royal Bank of Canada",
    exchange: "NYSE",
    currency: "USD",
    market: "ca",
  },
  {
    symbol: "TD",
    name: "TD Bank",
    exchange: "NYSE",
    currency: "USD",
    market: "ca",
  },
  {
    symbol: "ENB",
    name: "Enbridge",
    exchange: "NYSE",
    currency: "USD",
    market: "ca",
  },
  {
    symbol: "BNS",
    name: "Scotiabank",
    exchange: "NYSE",
    currency: "USD",
    market: "ca",
  },
  {
    symbol: "TRP",
    name: "TC Energy",
    exchange: "NYSE",
    currency: "USD",
    market: "ca",
  },
];

function inferMarketFromSymbol(symbol: string) {
  return symbol.includes(".TO") ? "ca" : "us";
}

function inferExchangeFromSymbol(symbol: string, market: Market) {
  if (symbol.includes(".TO")) {
    return "TSX";
  }

  return market === "ca" ? "NYSE or NASDAQ" : "US Listing";
}

function inferCurrencyFromSymbol(symbol: string, market: Market) {
  if (symbol.includes(".TO")) {
    return "CAD";
  }

  return market === "ca" ? "USD" : "USD";
}

async function fetchQuote(
  apiKey: string,
  item: Pick<WatchlistSymbol, "symbol" | "name" | "exchange" | "currency" | "market">
) {
  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", item.symbol);
  url.searchParams.set("token", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const data = (await response.json()) as QuoteResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error || `Unable to load ${item.symbol}.`);
  }

  return {
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchange,
    currency: item.currency,
    market: item.market,
    close: Number(data.c ?? 0),
    previousClose: Number(data.pc ?? 0),
    change: Number(data.d ?? 0),
    percentChange: Number(data.dp ?? 0),
    timestamp: Number(data.t ?? 0),
  };
}

async function searchSymbol(apiKey: string, query: string, market: Market) {
  const url = new URL("https://finnhub.io/api/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("token", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const data = (await response.json()) as SearchResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error || "Unable to search for that symbol.");
  }

  const candidates = (data.result ?? []).filter((result) => {
    const symbol = (result.symbol ?? "").toUpperCase();
    const description = result.description ?? "";

    if (!symbol) {
      return false;
    }

    if (market === "ca") {
      return symbol.endsWith(".TO") || /canada|toronto/i.test(description);
    }

    return !symbol.includes(".") || symbol.endsWith(".US");
  });

  const preferred =
    candidates.find((result) =>
      (result.symbol ?? "").toUpperCase() === query.trim().toUpperCase()
    ) ?? candidates[0];

  if (!preferred?.symbol) {
    throw new Error(
      market === "ca"
        ? "No Canadian stock match was found. Try a TSX ticker like SHOP.TO or a company name."
        : "No US stock match was found. Try a ticker like AAPL or a company name."
    );
  }

  const symbol = preferred.symbol.toUpperCase();
  const resolvedMarket = inferMarketFromSymbol(symbol);

  return fetchQuote(apiKey, {
    symbol,
    name: preferred.description || preferred.displaySymbol || symbol,
    exchange: inferExchangeFromSymbol(symbol, resolvedMarket),
    currency: inferCurrencyFromSymbol(symbol, resolvedMarket),
    market: resolvedMarket,
  });
}

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
      {
        error:
          "Missing FINNHUB_API_KEY. Add it to .env.local to enable the stock market page.",
      },
      { status: 500 }
    );
  }

  try {
    const requestUrl = new URL(request.url);
    const query = requestUrl.searchParams.get("q")?.trim() ?? "";
    const marketParam = requestUrl.searchParams.get("market");
    const market: Market = marketParam === "ca" ? "ca" : "us";
    const usdCadRate = await fetchUsdCadRate();

    if (query) {
      const searchQuote = await searchSymbol(apiKey, query, market);

      return NextResponse.json({
        provider: "Finnhub",
        updatedAt: new Date().toISOString(),
        localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        usdCadRate,
        caveat:
          market === "ca"
            ? "Canadian searches work best with TSX symbols like SHOP.TO, RY.TO, or by entering the company name."
            : "US searches work best with direct tickers like AAPL, MSFT, or NVDA.",
        searchResult: searchQuote,
      });
    }

    const quotes = await Promise.all(watchlist.map((item) => fetchQuote(apiKey, item)));

    return NextResponse.json({
      provider: "Finnhub",
      updatedAt: new Date().toISOString(),
      localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      usdCadRate,
      caveat:
        "This Finnhub setup supports a searchable US and Canada view. Canada searches work best with TSX symbols ending in .TO.",
      markets: {
        us: quotes.filter((quote) => quote.market === "us"),
        ca: quotes.filter((quote) => quote.market === "ca"),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load stock market data right now.",
      },
      { status: 500 }
    );
  }
}
