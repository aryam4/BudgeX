"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type BudgetType = "Fixed" | "Variable" | "Savings" | "Debt";

type BudgetRow = {
  id: string;
  category: string;
  type: BudgetType;
  planned: number;
  actual: number;
  notes: string;
};

type StoredBudgetPlan = {
  monthly_income: number | string;
  budget_style: string;
  goal: string;
  rows_json: unknown;
};

const budgetStyles = [
  { value: "custom", label: "Custom category budget" },
  { value: "zero-based", label: "Zero based budget" },
  { value: "50-30-20", label: "50 30 20 style" },
  { value: "savings-first", label: "Savings first" },
  { value: "debt-payoff", label: "Debt payoff focused" },
];

function createBudgetRow(): BudgetRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: "",
    type: "Variable",
    planned: 0,
    actual: 0,
    notes: "",
  };
}

function normalizeBudgetType(value: unknown): BudgetType {
  if (
    value === "Fixed" ||
    value === "Variable" ||
    value === "Savings" ||
    value === "Debt"
  ) {
    return value;
  }

  return "Variable";
}

function normalizeBudgetRows(value: unknown): BudgetRow[] {
  if (!Array.isArray(value)) {
    return [createBudgetRow()];
  }

  const normalized = value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const row = entry as Record<string, unknown>;

      return {
        id:
          typeof row.id === "string" && row.id.trim()
            ? row.id
            : `stored-row-${index}`,
        category: typeof row.category === "string" ? row.category : "",
        type: normalizeBudgetType(row.type),
        planned:
          typeof row.planned === "number"
            ? row.planned
            : Number(row.planned) || 0,
        actual:
          typeof row.actual === "number" ? row.actual : Number(row.actual) || 0,
        notes: typeof row.notes === "string" ? row.notes : "",
      } satisfies BudgetRow;
    })
    .filter((row): row is BudgetRow => Boolean(row));

  return normalized.length > 0 ? normalized : [createBudgetRow()];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getSupabaseMessage(error: { code?: string; message: string }) {
  if (error.code === "42P01") {
    return "The budget_plans table is missing. Run the SQL in supabase/schema.sql, then refresh this page.";
  }

  return error.message;
}

function getStatus(planned: number, actual: number) {
  if (planned === 0 && actual === 0) return "Not started";
  if (actual > planned) return "Over";
  if (actual === planned && planned > 0) return "On track";
  if (planned > 0 && actual >= planned * 0.8) return "Watch";
  return "Good";
}

function getStatusColor(status: string) {
  if (status === "Over") return "text-red-600 bg-red-50";
  if (status === "Watch") return "text-amber-600 bg-amber-50";
  if (status === "On track") return "text-blue-600 bg-blue-50";
  return "text-emerald-600 bg-emerald-50";
}

export function BudgetsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [monthlyIncome, setMonthlyIncome] = useState("0");
  const [budgetStyle, setBudgetStyle] = useState("custom");
  const [goal, setGoal] = useState("");
  const [rows, setRows] = useState<BudgetRow[]>([createBudgetRow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const income = Number(monthlyIncome) || 0;

  const totals = useMemo(() => {
    const totalPlanned = rows.reduce((sum, row) => sum + row.planned, 0);
    const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);

    const fixedTotal = rows
      .filter((row) => row.type === "Fixed")
      .reduce((sum, row) => sum + row.planned, 0);

    const variableTotal = rows
      .filter((row) => row.type === "Variable")
      .reduce((sum, row) => sum + row.planned, 0);

    const savingsTotal = rows
      .filter((row) => row.type === "Savings")
      .reduce((sum, row) => sum + row.planned, 0);

    const debtTotal = rows
      .filter((row) => row.type === "Debt")
      .reduce((sum, row) => sum + row.planned, 0);

    const overBudgetCount = rows.filter((row) => row.actual > row.planned).length;

    return {
      totalPlanned,
      totalActual,
      fixedTotal,
      variableTotal,
      savingsTotal,
      debtTotal,
      overBudgetCount,
      projectedLeftover: income - totalPlanned,
      actualLeftover: income - totalActual,
    };
  }, [income, rows]);

  const chartData = useMemo(() => {
    const meaningfulRows = rows.filter(
      (row) =>
        row.category.trim() ||
        row.notes.trim() ||
        row.planned > 0 ||
        row.actual > 0
    );

    const totalActual =
      meaningfulRows.reduce((sum, row) => sum + row.actual, 0) || 1;

    return meaningfulRows.map((row) => ({
      ...row,
      percent: Math.round((row.actual / totalActual) * 100),
    }));
  }, [rows]);

  useEffect(() => {
    async function loadBudget() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage("Please sign in again to load your budget.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("budget_plans")
        .select("monthly_income, budget_style, goal, rows_json")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        setErrorMessage(getSupabaseMessage(error));
        setLoading(false);
        return;
      }

      const plan = data as StoredBudgetPlan | null;

      if (!plan) {
        setMonthlyIncome("0");
        setBudgetStyle("custom");
        setGoal("");
        setRows([createBudgetRow()]);
        setLoading(false);
        return;
      }

      setMonthlyIncome(String(Number(plan.monthly_income) || 0));
      setBudgetStyle(plan.budget_style || "custom");
      setGoal(plan.goal || "");
      setRows(normalizeBudgetRows(plan.rows_json));
      setLoading(false);
    }

    void loadBudget();
  }, [supabase]);

  function updateRow(id: string, field: keyof BudgetRow, value: string) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        if (field === "planned" || field === "actual") {
          return {
            ...row,
            [field]: Number(value) || 0,
          };
        }

        if (field === "type") {
          return {
            ...row,
            type: normalizeBudgetType(value),
          };
        }

        return {
          ...row,
          [field]: value,
        };
      })
    );
  }

  function addRow() {
    setRows((current) => [...current, createBudgetRow()]);
  }

  function removeRow(id: string) {
    setRows((current) => {
      const next = current.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createBudgetRow()];
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const parsedIncome = Number(monthlyIncome);

    if (Number.isNaN(parsedIncome) || parsedIncome < 0) {
      setSaving(false);
      setErrorMessage("Monthly income must be 0 or greater.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setErrorMessage("Please sign in again before saving your budget.");
      return;
    }

    const normalizedRows = rows.map((row) => ({
      id: row.id,
      category: row.category.trim(),
      type: row.type,
      planned: row.planned,
      actual: row.actual,
      notes: row.notes.trim(),
    }));

    const rowsToPersist = normalizedRows.filter(
      (row) =>
        row.category ||
        row.notes ||
        row.planned > 0 ||
        row.actual > 0
    );

    const payload = {
      user_id: user.id,
      monthly_income: parsedIncome,
      budget_style: budgetStyle,
      goal: goal.trim(),
      rows_json: rowsToPersist,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("budget_plans")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      setSaving(false);
      setErrorMessage(getSupabaseMessage(error));
      return;
    }

    setMonthlyIncome(String(parsedIncome));
    setGoal(goal.trim());
    setRows(rowsToPersist.length > 0 ? rowsToPersist : [createBudgetRow()]);
    setMessage("Budget saved.");
    setSaving(false);
  }

  const chartShades = [
    "bg-zinc-900",
    "bg-zinc-700",
    "bg-zinc-600",
    "bg-zinc-500",
    "bg-zinc-400",
    "bg-zinc-300",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Budgets
          </h1>
          <p className="mt-2 text-zinc-500">
            Build your budget, save it to Supabase, and track category performance
            over time.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Loading..." : saving ? "Saving..." : "Save Budget"}
        </button>
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Monthly Income</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(income)}
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Planned Budget</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(totals.totalPlanned)}
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Actual Spend</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(totals.totalActual)}
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Actual Leftover</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(totals.actualLeftover)}
          </h2>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-zinc-900">Budget Setup</h3>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Monthly Income
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyIncome}
                  onChange={(event) => setMonthlyIncome(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Budget Style
                </label>
                <select
                  value={budgetStyle}
                  onChange={(event) => setBudgetStyle(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none focus:border-zinc-400"
                >
                  {budgetStyles.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Main Goal
                </label>
                <textarea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="Set your savings or spending goal"
                  className="min-h-[110px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-zinc-900">Budget Guide</h3>

            <div className="mt-4 space-y-3 text-sm text-zinc-600">
              <p>
                Start with income, then add your biggest fixed costs like rent,
                insurance, utilities, and debt minimums.
              </p>
              <p>
                Add flexible categories like groceries, transport, dining, and
                shopping next. These are usually the easiest to adjust.
              </p>
              <p>
                Keep savings and debt payoff visible as their own categories so
                your budget reflects your real priorities.
              </p>
              <p>
                Save the budget when you update it so your dashboard and future
                planning can build from the latest version.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-zinc-900">
              Budget Summary
            </h3>

            <div className="mt-4 space-y-3 text-sm text-zinc-600">
              <div className="flex items-center justify-between">
                <span>Fixed Expenses</span>
                <span className="money-value font-medium text-zinc-900">
                  {formatCurrency(totals.fixedTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Variable Expenses</span>
                <span className="money-value font-medium text-zinc-900">
                  {formatCurrency(totals.variableTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Savings Goals</span>
                <span className="money-value font-medium text-zinc-900">
                  {formatCurrency(totals.savingsTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Debt Payments</span>
                <span className="money-value font-medium text-zinc-900">
                  {formatCurrency(totals.debtTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Projected Leftover</span>
                <span className="money-value font-medium text-zinc-900">
                  {formatCurrency(totals.projectedLeftover)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Over Budget Categories</span>
                <span className="font-medium text-zinc-900">
                  {totals.overBudgetCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">
                  Custom Budget Table
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Add your own categories, save them, and come back to edit them
                  whenever you want.
                </p>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Add Category
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-zinc-500">
                    <th className="px-3">Category</th>
                    <th className="px-3">Type</th>
                    <th className="px-3">Planned</th>
                    <th className="px-3">Actual</th>
                    <th className="px-3">Difference</th>
                    <th className="px-3">% Used</th>
                    <th className="px-3">Status</th>
                    <th className="px-3">Notes</th>
                    <th className="px-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const difference = row.planned - row.actual;
                    const percentUsed =
                      row.planned > 0
                        ? Math.round((row.actual / row.planned) * 100)
                        : 0;
                    const status = getStatus(row.planned, row.actual);

                    return (
                      <tr key={row.id} className="rounded-2xl bg-zinc-50">
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={row.category}
                            onChange={(event) =>
                              updateRow(row.id, "category", event.target.value)
                            }
                            placeholder="Category"
                            className="w-36 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <select
                            value={row.type}
                            onChange={(event) =>
                              updateRow(row.id, "type", event.target.value)
                            }
                            className="w-28 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                          >
                            <option value="Fixed">Fixed</option>
                            <option value="Variable">Variable</option>
                            <option value="Savings">Savings</option>
                            <option value="Debt">Debt</option>
                          </select>
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.planned}
                            onChange={(event) =>
                              updateRow(row.id, "planned", event.target.value)
                            }
                            className="w-24 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.actual}
                            onChange={(event) =>
                              updateRow(row.id, "actual", event.target.value)
                            }
                            className="w-24 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                          />
                        </td>

                        <td className="money-value px-3 py-3 text-sm font-medium text-zinc-900">
                          {difference >= 0
                            ? formatCurrency(difference)
                            : `-${formatCurrency(Math.abs(difference))}`}
                        </td>

                        <td className="px-3 py-3 text-sm text-zinc-700">
                          {percentUsed}%
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(event) =>
                              updateRow(row.id, "notes", event.target.value)
                            }
                            placeholder="Notes"
                            className="w-40 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-zinc-900">
              Spending Breakdown
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              A quick visual of where your actual budget usage is currently going.
            </p>

            {chartData.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">
                Add categories and actual values to see the breakdown populate.
              </p>
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
                <div className="flex items-center justify-center">
                  <div
                    className="h-52 w-52 rounded-full border-8 border-zinc-200"
                    style={{
                      background: `conic-gradient(${chartData
                        .map((row, index) => {
                          const start = chartData
                            .slice(0, index)
                            .reduce((sum, entry) => sum + entry.percent, 0);
                          const end = start + row.percent;
                          const colors = [
                            "#18181b",
                            "#3f3f46",
                            "#52525b",
                            "#71717a",
                            "#a1a1aa",
                            "#d4d4d8",
                          ];
                          return `${colors[index % colors.length]} ${start}% ${end}%`;
                        })
                        .join(", ")})`,
                    }}
                  />
                </div>

                <div className="space-y-3">
                  {chartData.map((row, index) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-full ${
                            chartShades[index % chartShades.length]
                          }`}
                        />
                        <div>
                          <p className="font-medium text-zinc-900">
                            {row.category || "Untitled"}
                          </p>
                          <p className="text-sm text-zinc-500">{row.type}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="money-value font-medium text-zinc-900">
                          {formatCurrency(row.actual)}
                        </p>
                        <p className="text-sm text-zinc-500">{row.percent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-zinc-900">
              Helpful Budget Metrics
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Savings Rate</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  {income > 0
                    ? `${Math.round((totals.savingsTotal / income) * 100)}%`
                    : "0%"}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Fixed Expense Ratio</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  {income > 0
                    ? `${Math.round((totals.fixedTotal / income) * 100)}%`
                    : "0%"}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Variable Expense Ratio</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  {income > 0
                    ? `${Math.round((totals.variableTotal / income) * 100)}%`
                    : "0%"}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Debt Payment Ratio</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  {income > 0
                    ? `${Math.round((totals.debtTotal / income) * 100)}%`
                    : "0%"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
