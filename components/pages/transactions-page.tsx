"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Transaction = {
  id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
  created_at: string;
};

type TransactionForm = {
  amount: string;
  category: string;
  description: string;
  transactionDate: string;
};

const initialForm: TransactionForm = {
  amount: "",
  category: "",
  description: "",
  transactionDate: new Date().toISOString().slice(0, 10),
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDisplayDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getSupabaseMessage(error: { code?: string; message: string }) {
  if (error.code === "42P01") {
    return "The transactions table is missing. Run the SQL in supabase/schema.sql, then refresh this page.";
  }

  return error.message;
}

export function TransactionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState<TransactionForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const summary = useMemo(() => {
    const totalSpent = transactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0
    );

    const latestDate = transactions[0]?.transaction_date;

    return {
      totalSpent,
      count: transactions.length,
      latestDate: latestDate ? formatDisplayDate(latestDate) : "No entries yet",
    };
  }, [transactions]);

  useEffect(() => {
    async function loadTransactions() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Please sign in again to load your transactions.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, category, description, transaction_date, created_at")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(getSupabaseMessage(error));
        setLoading(false);
        return;
      }

      setTransactions(
        (data ?? []).map((transaction) => ({
          ...transaction,
          amount: Number(transaction.amount),
        }))
      );
      setLoading(false);
    }

    void loadTransactions();
  }, [supabase]);

  function updateForm(field: keyof TransactionForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const amount = Number(form.amount);

    if (!amount || amount <= 0) {
      setSaving(false);
      setErrorMessage("Enter an amount greater than 0.");
      return;
    }

    if (!form.category.trim() || !form.description.trim()) {
      setSaving(false);
      setErrorMessage("Category and description are required.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setErrorMessage("Please sign in again before saving a transaction.");
      return;
    }

    const payload = {
      user_id: user.id,
      amount,
      category: form.category.trim(),
      description: form.description.trim(),
      transaction_date: form.transactionDate,
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert(payload)
      .select("id, amount, category, description, transaction_date, created_at")
      .single();

    if (error) {
      setSaving(false);
      setErrorMessage(getSupabaseMessage(error));
      return;
    }

    setTransactions((current) => [
      {
        ...data,
        amount: Number(data.amount),
      },
      ...current,
    ]);
    setForm({
      ...initialForm,
      transactionDate: new Date().toISOString().slice(0, 10),
    });
    setMessage("Transaction saved.");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      setDeletingId(null);
      setErrorMessage(getSupabaseMessage(error));
      return;
    }

    setTransactions((current) =>
      current.filter((transaction) => transaction.id !== id)
    );
    setDeletingId(null);
    setMessage("Transaction removed.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Transactions
        </h1>
        <p className="mt-2 text-zinc-500">
          Save expenses to Supabase and review them in one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Total Logged</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(summary.totalSpent)}
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Transactions</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
            {summary.count}
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Latest Entry</p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-900">
            {summary.latestDate}
          </h2>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2 rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-zinc-900">Add Transaction</h3>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => updateForm("amount", event.target.value)}
                placeholder="82.45"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Category
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                placeholder="Groceries"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                placeholder="Walmart"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Date
              </label>
              <input
                type="date"
                value={form.transactionDate}
                onChange={(event) =>
                  updateForm("transactionDate", event.target.value)
                }
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none focus:border-zinc-400"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Transaction"}
            </button>
          </form>

          {message ? (
            <p className="mt-4 text-sm text-emerald-700">{message}</p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </div>

        <div className="xl:col-span-3 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-zinc-900">
              All Transactions
            </h3>
            <p className="text-sm text-zinc-500">Newest first</p>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-500">
              Loading transactions...
            </div>
          ) : null}

          {!loading && transactions.length === 0 && !errorMessage ? (
            <div className="mt-5 rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
              No transactions yet. Add your first expense using the form.
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {transaction.category} •{" "}
                    {formatDisplayDate(transaction.transaction_date)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="money-value font-semibold text-zinc-900">
                    {formatCurrency(transaction.amount)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(transaction.id)}
                    disabled={deletingId === transaction.id}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60"
                  >
                    {deletingId === transaction.id ? "Removing..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
