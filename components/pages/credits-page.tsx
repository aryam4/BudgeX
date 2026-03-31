"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CreditAccount = {
  id: string;
  name: string;
  balance: number;
  credit_limit: number;
  due_date: string;
  created_at: string;
};

type CreditForm = {
  name: string;
  balance: string;
  creditLimit: string;
  dueDate: string;
};

const initialForm: CreditForm = {
  name: "",
  balance: "",
  creditLimit: "",
  dueDate: new Date().toISOString().slice(0, 10),
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

function getUtilization(balance: number, creditLimit: number) {
  if (creditLimit <= 0) return 0;
  return Math.min(Math.round((balance / creditLimit) * 100), 100);
}

function getSupabaseMessage(error: { code?: string; message: string }) {
  if (error.code === "42P01") {
    return "The credit_accounts table is missing. Run the SQL in supabase/schema.sql, then refresh this page.";
  }

  return error.message;
}

export function CreditsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [form, setForm] = useState<CreditForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const summary = useMemo(() => {
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const totalLimit = accounts.reduce(
      (sum, account) => sum + account.credit_limit,
      0
    );
    const utilization = totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0;

    return {
      totalBalance,
      totalLimit,
      utilization,
      accountCount: accounts.length,
    };
  }, [accounts]);

  useEffect(() => {
    async function loadAccounts() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Please sign in again to load your credit accounts.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("credit_accounts")
        .select("id, name, balance, credit_limit, due_date, created_at")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(getSupabaseMessage(error));
        setLoading(false);
        return;
      }

      setAccounts(
        (data ?? []).map((account) => ({
          ...account,
          balance: Number(account.balance),
          credit_limit: Number(account.credit_limit),
        }))
      );
      setLoading(false);
    }

    void loadAccounts();
  }, [supabase]);

  function updateForm(field: keyof CreditForm, value: string) {
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

    const balance = Number(form.balance);
    const creditLimit = Number(form.creditLimit);

    if (!form.name.trim()) {
      setSaving(false);
      setErrorMessage("Card or credit line name is required.");
      return;
    }

    if (balance < 0 || Number.isNaN(balance)) {
      setSaving(false);
      setErrorMessage("Enter a valid balance.");
      return;
    }

    if (!creditLimit || creditLimit <= 0 || Number.isNaN(creditLimit)) {
      setSaving(false);
      setErrorMessage("Credit limit must be greater than 0.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setErrorMessage("Please sign in again before saving a credit account.");
      return;
    }

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      balance,
      credit_limit: creditLimit,
      due_date: form.dueDate,
    };

    const { data, error } = await supabase
      .from("credit_accounts")
      .insert(payload)
      .select("id, name, balance, credit_limit, due_date, created_at")
      .single();

    if (error) {
      setSaving(false);
      setErrorMessage(getSupabaseMessage(error));
      return;
    }

    setAccounts((current) =>
      [...current, {
        ...data,
        balance: Number(data.balance),
        credit_limit: Number(data.credit_limit),
      }].sort((left, right) => left.due_date.localeCompare(right.due_date))
    );
    setForm({
      ...initialForm,
      dueDate: new Date().toISOString().slice(0, 10),
    });
    setMessage("Credit account saved.");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.from("credit_accounts").delete().eq("id", id);

    if (error) {
      setDeletingId(null);
      setErrorMessage(getSupabaseMessage(error));
      return;
    }

    setAccounts((current) => current.filter((account) => account.id !== id));
    setDeletingId(null);
    setMessage("Credit account removed.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Credits
        </h1>
        <p className="mt-2 text-zinc-500">
          Track your credit cards and balances with real Supabase data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Total Balance</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(summary.totalBalance)}
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Total Limit</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(summary.totalLimit)}
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Utilization</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
            {summary.utilization}%
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Accounts</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
            {summary.accountCount}
          </h2>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2 rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-zinc-900">Add Credit Account</h3>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Card or Credit Line Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="CIBC Visa"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Current Balance
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.balance}
                onChange={(event) => updateForm("balance", event.target.value)}
                placeholder="740"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Credit Limit
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.creditLimit}
                onChange={(event) =>
                  updateForm("creditLimit", event.target.value)
                }
                placeholder="2500"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => updateForm("dueDate", event.target.value)}
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none focus:border-zinc-400"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Credit Account"}
            </button>
          </form>

          {message ? (
            <p className="mt-4 text-sm text-emerald-700">{message}</p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </div>

        <div className="xl:col-span-3 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
              Loading credit accounts...
            </div>
          ) : null}

          {!loading && accounts.length === 0 && !errorMessage ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 shadow-sm">
              No credit accounts yet. Add your first card or credit line using the form.
            </div>
          ) : null}

          {accounts.map((account) => {
            const utilization = getUtilization(account.balance, account.credit_limit);

            return (
              <div key={account.id} className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-900">
                      {account.name}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Due on {formatDisplayDate(account.due_date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-left md:text-right">
                      <p className="money-value text-2xl font-semibold text-zinc-900">
                        {formatCurrency(account.balance)}
                      </p>
                      <p className="money-value text-sm text-zinc-500">
                        of {formatCurrency(account.credit_limit)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(account.id)}
                      disabled={deletingId === account.id}
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60"
                    >
                      {deletingId === account.id ? "Removing..." : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-sm text-zinc-600">
                    <span>Utilization</span>
                    <span>{utilization}%</span>
                  </div>

                  <div className="h-3 w-full rounded-full bg-zinc-200">
                    <div
                      className="h-3 rounded-full bg-zinc-900"
                      style={{ width: `${utilization}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
