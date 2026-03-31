"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Market = "us" | "ca";
type DisplayCurrency = "usd" | "cad";
type RangeKey = "6h" | "12h" | "1d" | "1w" | "1m" | "6m" | "1y" | "5y";

type CandlePoint = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type StockDetailPayload = {
  provider: string;
  updatedAt: string;
  localTimezone: string;
  usdCadRate: number | null;
  range: RangeKey;
  rangeLabel: string;
  stock: {
    symbol: string;
    name: string;
    exchange: string;
    market: Market;
    currency: string;
    close: number;
    previousClose: number;
    change: number;
    percentChange: number;
    timestamp: number;
  };
  series: CandlePoint[];
};

const ranges: RangeKey[] = ["6h", "12h", "1d", "1w", "1m", "6m", "1y", "5y"];

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatQuoteTime(value: number) {
  return new Date(value * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Chart({
  points,
  sourceCurrency,
  displayCurrency,
  usdCadRate,
}: {
  points: CandlePoint[];
  sourceCurrency: string;
  displayCurrency: DisplayCurrency;
  usdCadRate: number | null;
}) {
  const convertedPoints = points.map((point) =>
    convertAmount(point.close, sourceCurrency, displayCurrency, usdCadRate)
  );

  if (convertedPoints.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
        No chart data available for this range.
      </div>
    );
  }

  const min = Math.min(...convertedPoints);
  const max = Math.max(...convertedPoints);
  const width = 900;
  const height = 320;
  const padding = 24;
  const stepX =
    convertedPoints.length > 1
      ? (width - padding * 2) / (convertedPoints.length - 1)
      : 0;

  const path = convertedPoints
    .map((value, index) => {
      const x = padding + index * stepX;
      const normalized = max === min ? 0.5 : (value - min) / (max - min);
      const y = height - padding - normalized * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
        <span>
          High:{" "}
          {formatMoney(max, displayCurrency === "usd" ? "USD" : "CAD", displayCurrency, usdCadRate)}
        </span>
        <span>
          Low:{" "}
          {formatMoney(min, displayCurrency === "usd" ? "USD" : "CAD", displayCurrency, usdCadRate)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full">
        <defs>
          <linearGradient id="stock-line" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <path
          d={path}
          fill="none"
          stroke="url(#stock-line)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

type StockMarketDetailPageProps = {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  market: Market;
};

export function StockMarketDetailPage({
  symbol,
  name,
  exchange,
  currency,
  market,
}: StockMarketDetailPageProps) {
  const [range, setRange] = useState<RangeKey>("1m");
  const [displayCurrency, setDisplayCurrency] =
    useState<DisplayCurrency>("usd");
  const [data, setData] = useState<StockDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDetails(nextRange: RangeKey, showRefreshState = false) {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const query = new URLSearchParams({
        symbol,
        range: nextRange,
        market,
        name: name ?? symbol,
        exchange: exchange ?? "",
        currency: currency ?? "USD",
      });

      const response = await fetch(`/api/stock-market/detail?${query.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as StockDetailPayload & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load stock details.");
      }

      setData(payload);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load stock details."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    async function syncDetails() {
      setLoading(true);
      setErrorMessage("");

      try {
        const query = new URLSearchParams({
          symbol,
          range,
          market,
          name: name ?? symbol,
          exchange: exchange ?? "",
          currency: currency ?? "USD",
        });

        const response = await fetch(`/api/stock-market/detail?${query.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as StockDetailPayload & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load stock details.");
        }

        setData(payload);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load stock details."
        );
      } finally {
        setLoading(false);
      }
    }

    void syncDetails();
  }, [currency, exchange, market, name, range, symbol]);

  const chartPoints = useMemo(() => data?.series ?? [], [data]);
  const sourceCurrency = data?.stock.currency ?? currency ?? "USD";
  const positive = (data?.stock.change ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/stock-market"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            Back to Stock Market
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
            {data?.stock.name ?? name ?? symbol}
          </h1>
          <p className="mt-2 text-zinc-500">
            {(data?.stock.symbol ?? symbol).toUpperCase()} •{" "}
            {data?.stock.exchange ?? exchange ?? "Listing"} •{" "}
            {market === "us" ? "US Market" : "Canada Market"}
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
            onClick={() => void loadDetails(range, true)}
            disabled={loading || refreshing}
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {data ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">Current Price</p>
            <h2 className="money-value mt-2 text-3xl font-semibold text-zinc-900">
              {formatMoney(
                data.stock.close,
                sourceCurrency,
                displayCurrency,
                data.usdCadRate
              )}
            </h2>
            <p
              className={`mt-2 text-sm font-medium ${
                positive ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {positive ? "+" : ""}
              {formatMoney(
                data.stock.change,
                sourceCurrency,
                displayCurrency,
                data.usdCadRate
              )}{" "}
              • {formatPercent(data.stock.percentChange)}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">Quote Timestamp</p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">
              {formatQuoteTime(data.stock.timestamp)}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Source quote time in {data.localTimezone}
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">Pulled Into BudgeX</p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">
              {formatDateTime(data.updatedAt)}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Provider: {data.provider}
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {ranges.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                range === option
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {option === "6h"
                ? "Last 6 Hours"
                : option === "12h"
                  ? "Last 12 Hours"
                  : option === "1d"
                    ? "1 Day"
                    : option === "1w"
                      ? "1 Week"
                      : option === "1m"
                        ? "1 Month"
                        : option === "6m"
                          ? "6 Months"
                          : option === "1y"
                            ? "1 Year"
                            : "5 Years"}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="h-[320px] animate-pulse rounded-3xl bg-zinc-100" />
          ) : (
            <Chart
              points={chartPoints}
              sourceCurrency={sourceCurrency}
              displayCurrency={displayCurrency}
              usdCadRate={data?.usdCadRate ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
