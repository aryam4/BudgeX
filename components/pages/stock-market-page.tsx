"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Market = "us" | "ca";
type DisplayCurrency = "usd" | "cad";

type Quote = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  market: Market;
  close: number;
  previousClose: number;
  change: number;
  percentChange: number;
  timestamp: number;
};

type StockMarketPayload = {
  provider: string;
  updatedAt: string;
  localTimezone: string;
  caveat: string;
  usdCadRate: number | null;
  markets?: {
    us: Quote[];
    ca: Quote[];
  };
  searchResult?: Quote;
};

const importantStocksStorageKey = "budgex-important-stocks";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatQuoteTimestamp(value: number) {
  if (!value) {
    return "Latest quote time unavailable";
  }

  return new Date(value * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function convertAmount(
  value: number,
  sourceCurrency: string,
  displayCurrency: DisplayCurrency,
  usdCadRate: number | null
) {
  const source = sourceCurrency.toUpperCase();
  const target = displayCurrency === "usd" ? "USD" : "CAD";

  if (!usdCadRate || source === target) {
    return value;
  }

  if (source === "USD" && target === "CAD") {
    return value * usdCadRate;
  }

  if (source === "CAD" && target === "USD") {
    return value / usdCadRate;
  }

  return value;
}

function formatMoney(
  value: number,
  sourceCurrency: string,
  displayCurrency: DisplayCurrency,
  usdCadRate: number | null
) {
  const converted = convertAmount(
    value,
    sourceCurrency,
    displayCurrency,
    usdCadRate
  );
  const currency = displayCurrency === "usd" ? "USD" : "CAD";

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(converted);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getQuoteStatus(timestamp: number) {
  if (!timestamp) {
    return {
      label: "Latest Quote",
      classes: "bg-zinc-100 text-zinc-600",
    };
  }

  const quoteDate = new Date(timestamp * 1000);
  const now = new Date();
  const sameDay =
    quoteDate.getFullYear() === now.getFullYear() &&
    quoteDate.getMonth() === now.getMonth() &&
    quoteDate.getDate() === now.getDate();

  if (sameDay) {
    return {
      label: "Updated Today",
      classes: "bg-emerald-100 text-emerald-700",
    };
  }

  return {
    label: "Latest Quote",
    classes: "bg-zinc-100 text-zinc-600",
  };
}

function buildStockHref(quote: Quote) {
  const query = new URLSearchParams({
    name: quote.name,
    exchange: quote.exchange,
    currency: quote.currency,
    market: quote.market,
  });

  return `/stock-market/${encodeURIComponent(quote.symbol)}?${query.toString()}`;
}

function QuoteCard({
  quote,
  displayCurrency,
  usdCadRate,
}: {
  quote: Quote;
  displayCurrency: DisplayCurrency;
  usdCadRate: number | null;
}) {
  const positive = quote.change >= 0;
  const status = getQuoteStatus(quote.timestamp);
  const convertedChange = convertAmount(
    quote.change,
    quote.currency,
    displayCurrency,
    usdCadRate
  );

  return (
    <Link
      href={buildStockHref(quote)}
      className="block rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
            {quote.exchange}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-zinc-900">
            {quote.name}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">{quote.symbol}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.classes}`}>
          {status.label}
        </span>
      </div>

      <div className="mt-5">
        <p className="money-value text-2xl font-semibold text-zinc-900">
          {formatMoney(
            quote.close,
            quote.currency,
            displayCurrency,
            usdCadRate
          )}
        </p>
        <p
          className={`mt-2 text-sm font-medium ${
            positive ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {positive ? "+" : ""}
          {formatMoney(
            convertedChange,
            displayCurrency === "usd" ? "USD" : "CAD",
            displayCurrency,
            usdCadRate
          )}{" "}
          • {formatPercent(quote.percentChange)}
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Quote timestamp: {formatQuoteTimestamp(quote.timestamp)}
        </p>
      </div>
    </Link>
  );
}

export function StockMarketPage() {
  const [data, setData] = useState<StockMarketPayload | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market>("us");
  const [searchMarket, setSearchMarket] = useState<Market>("us");
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("usd");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchError, setSearchError] = useState("");
  const [importantStocks, setImportantStocks] = useState<Quote[]>([]);
  const [importantMessage, setImportantMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(importantStocksStorageKey);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Quote[];
      const initialStocks = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
      setImportantStocks(initialStocks);
      void refreshImportantStocks(initialStocks);
    } catch {
      setImportantStocks([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      importantStocksStorageKey,
      JSON.stringify(importantStocks.slice(0, 5))
    );
  }, [importantStocks]);

  async function loadMarketData(market: Market, showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const response = await fetch(`/api/stock-market?market=${market}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as StockMarketPayload & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load stock market data.");
      }

      setData(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load stock market data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function refreshImportantStocks(quotes: Quote[]) {
    if (quotes.length === 0) {
      return;
    }

    const refreshed = await Promise.all(
      quotes.map(async (quote) => {
        try {
          const response = await fetch(
            `/api/stock-market?q=${encodeURIComponent(quote.symbol)}&market=${quote.market}`,
            {
              cache: "no-store",
            }
          );
          const payload = (await response.json()) as StockMarketPayload & {
            error?: string;
          };

          return payload.searchResult && response.ok
            ? payload.searchResult
            : quote;
        } catch {
          return quote;
        }
      })
    );

    setImportantStocks(refreshed.slice(0, 5));
  }

  useEffect(() => {
    void loadMarketData(selectedMarket);
  }, [selectedMarket]);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!searchQuery.trim()) {
      setSearchError("Enter a company name or stock symbol to search.");
      return;
    }

    setSearching(true);
    setSearchError("");

    try {
      const response = await fetch(
        `/api/stock-market?q=${encodeURIComponent(
          searchQuery.trim()
        )}&market=${searchMarket}`,
        {
          cache: "no-store",
        }
      );

      const payload = (await response.json()) as StockMarketPayload & {
        error?: string;
      };

      if (!response.ok || !payload.searchResult) {
        throw new Error(payload.error || "Unable to find that stock.");
      }

      setSearchResult(payload.searchResult);
      if (payload.usdCadRate && !data?.usdCadRate) {
        setData((current) =>
          current
            ? { ...current, usdCadRate: payload.usdCadRate ?? current.usdCadRate }
            : current
        );
      }
    } catch (error) {
      setSearchResult(null);
      setSearchError(
        error instanceof Error ? error.message : "Unable to find that stock."
      );
    } finally {
      setSearching(false);
    }
  }

  function handleAddImportantStock() {
    if (!searchResult) {
      return;
    }

    setImportantMessage("");

    setImportantStocks((current) => {
      if (current.some((quote) => quote.symbol === searchResult.symbol)) {
        setImportantMessage("That stock is already in your Important 5.");
        return current;
      }

      if (current.length >= 5) {
        setImportantMessage("Your Important 5 is full. Remove one before adding another.");
        return current;
      }

      setImportantMessage(`${searchResult.symbol} added to your Important 5.`);
      return [...current, searchResult];
    });
  }

  function handleRemoveImportantStock(symbol: string) {
    setImportantStocks((current) =>
      current.filter((quote) => quote.symbol !== symbol)
    );
    setImportantMessage(`${symbol} removed from your Important 5.`);
  }

  const visibleQuotes = useMemo(() => {
    if (!data?.markets) {
      return [];
    }

    return selectedMarket === "us" ? data.markets.us : data.markets.ca;
  }, [data, selectedMarket]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Stock Market
          </h1>
          <p className="mt-2 max-w-3xl text-zinc-500">
            Search stocks, compare the US and Canadian market views, and open
            any stock for a deeper chart and quote breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2 rounded-full bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setDisplayCurrency("usd")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                displayCurrency === "usd"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700"
              }`}
            >
              US$
            </button>
            <button
              type="button"
              onClick={() => setDisplayCurrency("cad")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                displayCurrency === "cad"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700"
              }`}
            >
              CAD$
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadMarketData(selectedMarket, true)}
            disabled={loading || refreshing}
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh Quotes"}
          </button>
        </div>
      </div>

      {data?.updatedAt ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-zinc-500 uppercase">
                Pulled Into BudgeX
              </p>
              <p className="mt-2 text-sm text-zinc-700">
                {formatTimestamp(data.updatedAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-zinc-500 uppercase">
                Display Timezone
              </p>
              <p className="mt-2 text-sm text-zinc-700">{data.localTimezone}</p>
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-zinc-500 uppercase">
                Quote Source
              </p>
              <p className="mt-2 text-sm text-zinc-700">{data.provider}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Market View
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Switch between a US and Canada market watchlist.
              </p>
            </div>
            <div className="flex gap-2 rounded-full bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => setSelectedMarket("us")}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  selectedMarket === "us"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700"
                }`}
              >
                US Market
              </button>
              <button
                type="button"
                onClick={() => setSelectedMarket("ca")}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  selectedMarket === "ca"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700"
                }`}
              >
                Canada Market
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Search Stocks</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Search any US or Canadian stock by ticker or company name.
          </p>

          <div className="mt-5 flex gap-2 rounded-full bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setSearchMarket("us")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                searchMarket === "us" ? "bg-zinc-900 text-white" : "text-zinc-700"
              }`}
            >
              Search US
            </button>
            <button
              type="button"
              onClick={() => setSearchMarket("ca")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                searchMarket === "ca" ? "bg-zinc-900 text-white" : "text-zinc-700"
              }`}
            >
              Search Canada
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              searchMarket === "ca"
                ? "Try SHOP.TO or Royal Bank of Canada"
                : "Try AAPL or Microsoft"
            }
            className="mt-4 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={searching}
              className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search Stock"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResult(null);
                setSearchError("");
              }}
              className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Clear
            </button>
          </div>

          {searchError ? (
            <p className="mt-4 text-sm text-red-700">{searchError}</p>
          ) : null}
        </form>
      </div>

      {data?.caveat ? (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          {data.caveat}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {searchResult ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Search Result
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Click through to open the full stock detail page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAddImportantStock}
              className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Add To Important 5
            </button>
            {importantMessage ? (
              <p className="self-center text-sm text-zinc-600">
                {importantMessage}
              </p>
            ) : null}
          </div>
          <QuoteCard
            quote={searchResult}
            displayCurrency={displayCurrency}
            usdCadRate={data?.usdCadRate ?? null}
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              Important 5
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Save up to five important stocks of your choice into the market view.
            </p>
          </div>
          <p className="text-sm text-zinc-500">
            {importantStocks.length}/5 saved
          </p>
        </div>

        {importantStocks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
            Search for a stock and use `Add To Important 5` to pin it here.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {importantStocks.map((quote) => (
              <div key={`important-${quote.symbol}`} className="space-y-3">
                <QuoteCard
                  quote={quote}
                  displayCurrency={displayCurrency}
                  usdCadRate={data?.usdCadRate ?? null}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImportantStock(quote.symbol)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-3xl bg-white shadow-sm"
            />
          ))}
        </div>
      ) : null}

      {!loading && data ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              {selectedMarket === "us" ? "United States" : "Canada"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {selectedMarket === "us"
                ? "Real-time-friendly watchlist for large US names on a free key."
                : "Canadian market view with major names and TSX-friendly search support."}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleQuotes.map((quote) => (
              <QuoteCard
                key={`${selectedMarket}-${quote.symbol}`}
                quote={quote}
                displayCurrency={displayCurrency}
                usdCadRate={data.usdCadRate}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
