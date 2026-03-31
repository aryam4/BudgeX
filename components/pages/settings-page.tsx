"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SettingsSection =
  | "appearance"
  | "subscription"
  | "banking"
  | "categories"
  | "more";

type UserSettings = {
  user_id: string;
  dark_mode: boolean;
  font_size: "small" | "medium" | "large";
  notifications_enabled: boolean;
  lock_numericals: boolean;
  monetary_pin_hash: string;
  categories_json: string[];
  reminder_bill_payment: boolean;
  reminder_weekly_summary: boolean;
  reminder_budget_alerts: boolean;
  reminder_unusual_spending: boolean;
  widget_net_worth: boolean;
  widget_spending_breakdown: boolean;
  widget_investment_portfolio: boolean;
  widget_upcoming_bills: boolean;
};

const sections: Array<{ id: SettingsSection; label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "subscription", label: "Subscription" },
  { id: "banking", label: "Banking" },
  { id: "categories", label: "Categories" },
  { id: "more", label: "More" },
];

const categoryGroups = [
  {
    id: "entertainment",
    label: "Entertainment",
    items: ["Movies", "Music", "Games", "Streaming"],
  },
  {
    id: "food-drinks",
    label: "Food & Drinks",
    items: ["Groceries", "Restaurants", "Coffee", "Takeout"],
  },
  {
    id: "transport",
    label: "Transport",
    items: ["Fuel", "Transit", "Ride Share", "Parking"],
  },
  {
    id: "housing",
    label: "Housing",
    items: ["Rent", "Mortgage", "Utilities", "Internet"],
  },
  {
    id: "health",
    label: "Health",
    items: ["Pharmacy", "Doctor", "Gym", "Insurance"],
  },
];

const defaultSettings: Omit<UserSettings, "user_id"> = {
  dark_mode: false,
  font_size: "medium",
  notifications_enabled: true,
  lock_numericals: false,
  monetary_pin_hash: "",
  categories_json: categoryGroups.map((group) => group.id),
  reminder_bill_payment: false,
  reminder_weekly_summary: true,
  reminder_budget_alerts: true,
  reminder_unusual_spending: true,
  widget_net_worth: false,
  widget_spending_breakdown: true,
  widget_investment_portfolio: false,
  widget_upcoming_bills: false,
};

function Toggle({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-8 w-14 rounded-full transition-colors ${
        checked ? "bg-zinc-900" : "bg-zinc-300"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}

async function hashPin(pin: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toCsvCell(value: unknown) {
  const normalized =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : String(value);

  return `"${normalized.replaceAll('"', '""')}"`;
}

function toCsvRow(values: unknown[]) {
  return values.map(toCsvCell).join(",");
}

export function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("appearance");
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Please sign in again to load your settings.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_settings")
        .select(
          "user_id, dark_mode, font_size, notifications_enabled, lock_numericals, monetary_pin_hash, categories_json, reminder_bill_payment, reminder_weekly_summary, reminder_budget_alerts, reminder_unusual_spending, widget_net_worth, widget_spending_breakdown, widget_investment_portfolio, widget_upcoming_bills"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        setMessage(
          error.code === "42P01"
            ? "The user_settings table is missing. Run supabase/schema.sql, then refresh this page."
            : error.message
        );
        setLoading(false);
        return;
      }

      const loaded = data as UserSettings | null;

      if (loaded) {
        setSettings({
          dark_mode: loaded.dark_mode,
          font_size: loaded.font_size,
          notifications_enabled: loaded.notifications_enabled,
          lock_numericals: loaded.lock_numericals,
          monetary_pin_hash: loaded.monetary_pin_hash,
          categories_json:
            loaded.categories_json?.length > 0
              ? loaded.categories_json
              : defaultSettings.categories_json,
          reminder_bill_payment: loaded.reminder_bill_payment,
          reminder_weekly_summary: loaded.reminder_weekly_summary,
          reminder_budget_alerts: loaded.reminder_budget_alerts,
          reminder_unusual_spending: loaded.reminder_unusual_spending,
          widget_net_worth: loaded.widget_net_worth,
          widget_spending_breakdown: loaded.widget_spending_breakdown,
          widget_investment_portfolio: loaded.widget_investment_portfolio,
          widget_upcoming_bills: loaded.widget_upcoming_bills,
        });
        setHasPin(Boolean(loaded.monetary_pin_hash));
      } else {
        setSettings(defaultSettings);
        setHasPin(false);
      }

      setLoading(false);
    }

    void loadSettings();
  }, [supabase]);

  useEffect(() => {
    if (loading) {
      return;
    }

    document.documentElement.dataset.theme = settings.dark_mode
      ? "dark"
      : "light";
    document.documentElement.dataset.fontSize = settings.font_size;
    document.documentElement.dataset.hideMoney = settings.lock_numericals
      ? "true"
      : "false";
  }, [
    loading,
    settings.dark_mode,
    settings.font_size,
    settings.lock_numericals,
  ]);

  function updateSetting<K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleCategory(groupId: string) {
    setSettings((current) => ({
      ...current,
      categories_json: current.categories_json.includes(groupId)
        ? current.categories_json.filter((item) => item !== groupId)
        : [...current.categories_json, groupId],
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Please sign in again before saving settings.");
      return;
    }

    let monetaryPinHash = settings.monetary_pin_hash;

    if (pin || confirmPin) {
      if (!/^\d{4,6}$/.test(pin)) {
        setSaving(false);
        setMessage("PIN must be 4 to 6 digits.");
        return;
      }

      if (pin !== confirmPin) {
        setSaving(false);
        setMessage("PIN values do not match.");
        return;
      }

      monetaryPinHash = await hashPin(pin);
    }

    if (settings.lock_numericals && !monetaryPinHash) {
      setSaving(false);
      setMessage("Set a 4 to 6 digit PIN before turning on locked numericals.");
      return;
    }

    const payload = {
      user_id: user.id,
      ...settings,
      monetary_pin_hash: monetaryPinHash,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      setSaving(false);
      setMessage(
        error.code === "42P01"
          ? "The user_settings table is missing. Run supabase/schema.sql, then try again."
          : error.message
      );
      return;
    }

    setSettings((current) => ({
      ...current,
      monetary_pin_hash: monetaryPinHash,
    }));
    setHasPin(Boolean(monetaryPinHash));
    setPin("");
    setConfirmPin("");
    document.documentElement.dataset.theme = settings.dark_mode ? "dark" : "light";
    document.documentElement.dataset.fontSize = settings.font_size;
    document.documentElement.dataset.hideMoney = settings.lock_numericals
      ? "true"
      : "false";
    setMessage("Settings saved.");
    setSaving(false);
  }

  async function handleForgotPin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setMessage("No email is available for pin recovery.");
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      user.email,
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );

    if (resetError) {
      setMessage(resetError.message);
      return;
    }

    const { error: settingsError } = await supabase
      .from("user_settings")
      .update({
        monetary_pin_hash: "",
        lock_numericals: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (settingsError) {
      setMessage(settingsError.message);
      return;
    }

    setSettings((current) => ({
      ...current,
      lock_numericals: false,
      monetary_pin_hash: "",
    }));
    setHasPin(false);
    setPin("");
    setConfirmPin("");
    document.documentElement.dataset.hideMoney = "false";
    setMessage(
      "A recovery email has been sent and your numeric lock was cleared. You can set a new PIN after you return."
    );
  }

  async function handleExportCsv() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please sign in again before exporting data.");
      return;
    }

    const [transactionsResult, creditsResult, profileResult, budgetResult, settingsResult] =
      await Promise.all([
      supabase
        .from("transactions")
        .select("id, transaction_date, category, description, amount")
        .eq("user_id", user.id),
      supabase
        .from("credit_accounts")
        .select("id, name, balance, credit_limit, due_date")
        .eq("user_id", user.id),
      supabase
        .from("user_profiles")
        .select(
          "first_name, last_name, phone_country_code, phone_number, address_line_1, address_line_2, city, country, state_province, postal_code, home_address"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("budget_plans")
        .select("monthly_income, budget_style, goal, rows_json")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_settings")
        .select(
          "dark_mode, font_size, notifications_enabled, lock_numericals, categories_json, reminder_bill_payment, reminder_weekly_summary, reminder_budget_alerts, reminder_unusual_spending, widget_net_worth, widget_spending_breakdown, widget_investment_portfolio, widget_upcoming_bills"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const columns = [
      "record_type",
      "id",
      "date",
      "name",
      "category",
      "description",
      "amount",
      "balance",
      "credit_limit",
      "due_date",
      "first_name",
      "last_name",
      "phone_country_code",
      "phone_number",
      "address_line_1",
      "address_line_2",
      "city",
      "country",
      "state_province",
      "postal_code",
      "home_address",
      "monthly_income",
      "budget_style",
      "goal",
      "rows_json",
      "user_email",
      "dark_mode",
      "font_size",
      "notifications_enabled",
      "lock_numericals",
      "categories_json",
      "reminder_bill_payment",
      "reminder_weekly_summary",
      "reminder_budget_alerts",
      "reminder_unusual_spending",
      "widget_net_worth",
      "widget_spending_breakdown",
      "widget_investment_portfolio",
      "widget_upcoming_bills",
    ];

    const rows = [toCsvRow(columns)];

    for (const transaction of transactionsResult.data ?? []) {
      rows.push(
        toCsvRow([
          "transaction",
          transaction.id,
          transaction.transaction_date,
          "",
          transaction.category,
          transaction.description,
          transaction.amount,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ])
      );
    }

    for (const account of creditsResult.data ?? []) {
      rows.push(
        toCsvRow([
          "credit_account",
          account.id,
          "",
          account.name,
          "",
          "",
          "",
          account.balance,
          account.credit_limit,
          account.due_date,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ])
      );
    }

    if (profileResult.data) {
      rows.push(
        toCsvRow([
          "profile",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          profileResult.data.first_name,
          profileResult.data.last_name,
          profileResult.data.phone_country_code,
          profileResult.data.phone_number,
          profileResult.data.address_line_1,
          profileResult.data.address_line_2,
          profileResult.data.city,
          profileResult.data.country,
          profileResult.data.state_province,
          profileResult.data.postal_code,
          profileResult.data.home_address,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ])
      );
    }

    if (budgetResult.data) {
      rows.push(
        toCsvRow([
          "budget_plan",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          budgetResult.data.monthly_income,
          budgetResult.data.budget_style,
          budgetResult.data.goal,
          JSON.stringify(budgetResult.data.rows_json ?? []),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ])
      );
    }

    rows.push(
      toCsvRow([
        "account",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        user.email ?? "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ])
    );

    if (settingsResult.data) {
      rows.push(
        toCsvRow([
          "settings",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          settingsResult.data.dark_mode,
          settingsResult.data.font_size,
          settingsResult.data.notifications_enabled,
          settingsResult.data.lock_numericals,
          JSON.stringify(settingsResult.data.categories_json ?? []),
          settingsResult.data.reminder_bill_payment,
          settingsResult.data.reminder_weekly_summary,
          settingsResult.data.reminder_budget_alerts,
          settingsResult.data.reminder_unusual_spending,
          settingsResult.data.widget_net_worth,
          settingsResult.data.widget_spending_breakdown,
          settingsResult.data.widget_investment_portfolio,
          settingsResult.data.widget_upcoming_bills,
        ])
      );
    }

    const exportDate = new Date().toISOString().slice(0, 10);
    downloadCsv(`budgex-data-${exportDate}.csv`, rows.join("\n"));
    setMessage("CSV export generated.");
  }

  async function handleResetAllData() {
    const shouldReset = window.confirm(
      "This will delete your transactions, credit accounts, profile data, budgets, and settings. Do you want to continue?"
    );

    if (!shouldReset) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please sign in again before resetting data.");
      return;
    }

    const [
      transactionsError,
      creditsError,
      profileError,
      settingsError,
      budgetError,
    ] =
      await Promise.all([
        supabase.from("transactions").delete().eq("user_id", user.id),
        supabase.from("credit_accounts").delete().eq("user_id", user.id),
        supabase.from("user_profiles").delete().eq("user_id", user.id),
        supabase.from("user_settings").delete().eq("user_id", user.id),
        supabase.from("budget_plans").delete().eq("user_id", user.id),
      ]);

    const firstError =
      transactionsError.error ||
      creditsError.error ||
      profileError.error ||
      settingsError.error ||
      budgetError.error;

    if (firstError) {
      setMessage(firstError.message);
      return;
    }

    setSettings(defaultSettings);
    setPin("");
    setConfirmPin("");
    setHasPin(false);
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.fontSize = "medium";
    document.documentElement.dataset.hideMoney = "false";
    setMessage("All saved app data was reset.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Settings
        </h1>
        <p className="mt-2 text-zinc-500">
          Control how BudgeX looks, behaves, and grows with your account.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-3xl bg-white p-4 shadow-sm">
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        <form className="space-y-6" onSubmit={handleSave}>
          {activeSection === "appearance" ? (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900">
                Appearance
              </h2>
              <div className="mt-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-zinc-900">Dark Mode</p>
                    <p className="text-sm text-zinc-500">
                      Switch the dashboard into a darker theme.
                    </p>
                  </div>
                  <Toggle
                    checked={settings.dark_mode}
                    onToggle={() =>
                      updateSetting("dark_mode", !settings.dark_mode)
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Font Size
                  </label>
                  <select
                    value={settings.font_size}
                    onChange={(event) =>
                      updateSetting(
                        "font_size",
                        event.target.value as "small" | "medium" | "large"
                      )
                    }
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none focus:border-zinc-400"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-zinc-900">Notifications</p>
                    <p className="text-sm text-zinc-500">
                      Enable reminder and alert notifications.
                    </p>
                  </div>
                  <Toggle
                    checked={settings.notifications_enabled}
                    onToggle={() =>
                      updateSetting(
                        "notifications_enabled",
                        !settings.notifications_enabled
                      )
                    }
                  />
                </div>

                <div className="rounded-2xl border border-zinc-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-900">
                        Lock Numericals
                      </p>
                      <p className="text-sm text-zinc-500">
                        Hide monetary information throughout the app.
                      </p>
                    </div>
                    <Toggle
                      checked={settings.lock_numericals}
                      onToggle={() =>
                        updateSetting(
                          "lock_numericals",
                          !settings.lock_numericals
                        )
                      }
                    />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-700">
                        {hasPin ? "Change PIN" : "Set PIN"}
                      </label>
                      <input
                        value={pin}
                        onChange={(event) => setPin(event.target.value)}
                        type="password"
                        inputMode="numeric"
                        placeholder="4 to 6 digit PIN"
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-700">
                        Confirm PIN
                      </label>
                      <input
                        value={confirmPin}
                        onChange={(event) => setConfirmPin(event.target.value)}
                        type="password"
                        inputMode="numeric"
                        placeholder="Confirm PIN"
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleForgotPin}
                    className="mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    Forgot PIN?
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {activeSection === "subscription" ? (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900">
                Subscription
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-sm font-medium text-zinc-500">Basic</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">
                    $0/month
                  </p>
                  <p className="mt-3 text-sm text-zinc-600">
                    Core budgeting, transaction logging, credit tracking, and profile tools.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-sm font-medium text-zinc-500">Premium</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">
                    TBD
                  </p>
                  <p className="mt-3 text-sm text-zinc-600">
                    Planned upgrade tier for more automation, categories, and premium help.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <p className="text-sm font-medium text-zinc-500">Enterprise</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900">
                    TBD
                  </p>
                  <p className="mt-3 text-sm text-zinc-600">
                    Planned for team, business, or advisory use cases later on.
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full rounded-2xl border border-zinc-200">
                  <thead className="bg-zinc-50 text-left text-sm text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Feature</th>
                      <th className="px-4 py-3">Basic</th>
                      <th className="px-4 py-3">Premium</th>
                      <th className="px-4 py-3">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-zinc-700">
                    <tr className="border-t border-zinc-200">
                      <td className="px-4 py-3">Transactions</td>
                      <td className="px-4 py-3">Included</td>
                      <td className="px-4 py-3">Included</td>
                      <td className="px-4 py-3">Included</td>
                    </tr>
                    <tr className="border-t border-zinc-200">
                      <td className="px-4 py-3">Credit Tracking</td>
                      <td className="px-4 py-3">Included</td>
                      <td className="px-4 py-3">Included</td>
                      <td className="px-4 py-3">Included</td>
                    </tr>
                    <tr className="border-t border-zinc-200">
                      <td className="px-4 py-3">Custom Categories</td>
                      <td className="px-4 py-3">No</td>
                      <td className="px-4 py-3">Planned</td>
                      <td className="px-4 py-3">Planned</td>
                    </tr>
                    <tr className="border-t border-zinc-200">
                      <td className="px-4 py-3">Advanced Bank Sync</td>
                      <td className="px-4 py-3">No</td>
                      <td className="px-4 py-3">Planned</td>
                      <td className="px-4 py-3">Planned</td>
                    </tr>
                    <tr className="border-t border-zinc-200">
                      <td className="px-4 py-3">Team Access</td>
                      <td className="px-4 py-3">No</td>
                      <td className="px-4 py-3">No</td>
                      <td className="px-4 py-3">Planned</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeSection === "banking" ? (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900">Banking</h2>
              <p className="mt-3 text-zinc-600">
                This is where BudgeX can later connect Canadian bank accounts.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 p-5">
                  <p className="text-sm font-medium text-zinc-500">
                    Recommended
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-zinc-900">
                    Plaid
                  </h3>
                  <p className="mt-3 text-sm text-zinc-600">
                    Good option when you want a widely adopted banking API with
                    Canadian institution coverage and a mature developer ecosystem.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 p-5">
                  <p className="text-sm font-medium text-zinc-500">
                    Canada-focused alternative
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-zinc-900">
                    Flinks
                  </h3>
                  <p className="mt-3 text-sm text-zinc-600">
                    Strong option for Canadian connectivity and account aggregation
                    if you want a provider centered around Canadian banking flows.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-500">
                Bank connection is not wired yet. This section currently acts as
                the planning space for the future Canadian bank integration.
              </div>
            </div>
          ) : null}

          {activeSection === "categories" ? (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-900">
                Categories
              </h2>
              <p className="mt-3 text-zinc-600">
                Enable or disable the category groups available to the user.
              </p>

              <div className="mt-6 space-y-4">
                {categoryGroups.map((group) => {
                  const enabled = settings.categories_json.includes(group.id);

                  return (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-zinc-200 p-5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-900">
                            {group.label}
                          </h3>
                          <p className="mt-2 text-sm text-zinc-500">
                            {group.items.join(", ")}
                          </p>
                        </div>
                        <Toggle
                          checked={enabled}
                          onToggle={() => toggleCategory(group.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeSection === "more" ? (
            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Reminders
                </h2>
                <div className="mt-6 space-y-4">
                  {[
                    ["Bill Payment Reminders", "reminder_bill_payment"],
                    ["Weekly Summary", "reminder_weekly_summary"],
                    ["Budget Alerts", "reminder_budget_alerts"],
                    ["Unusual Spending", "reminder_unusual_spending"],
                  ].map(([label, key]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4"
                    >
                      <p className="font-medium text-zinc-900">{label}</p>
                      <Toggle
                        checked={settings[key as keyof typeof settings] as boolean}
                        onToggle={() =>
                          updateSetting(
                            key as keyof typeof settings,
                            !settings[key as keyof typeof settings]
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Dashboard Widgets
                </h2>
                <div className="mt-6 space-y-4">
                  {[
                    ["Net Worth", "widget_net_worth"],
                    ["Spending Breakdown", "widget_spending_breakdown"],
                    ["Investment Portfolio", "widget_investment_portfolio"],
                    ["Upcoming Bills", "widget_upcoming_bills"],
                  ].map(([label, key]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4"
                    >
                      <p className="font-medium text-zinc-900">{label}</p>
                      <Toggle
                        checked={settings[key as keyof typeof settings] as boolean}
                        onToggle={() =>
                          updateSetting(
                            key as keyof typeof settings,
                            !settings[key as keyof typeof settings]
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Data Tools
                </h2>
                <div className="mt-4 space-y-2 text-sm text-zinc-600">
                  <p>
                    Data tools only work on the currently signed-in account, so each
                    user exports and resets only their own BudgeX data.
                  </p>
                  <p>
                    Current export includes account email, profile, transactions,
                    credit accounts, budgets, and saved settings.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Export Data to CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAllData}
                    className="rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Reset All Data
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-zinc-900">FAQs</h2>
                <div className="mt-6 space-y-4 text-sm text-zinc-600">
                  <div>
                    <p className="font-medium text-zinc-900">
                      How do I connect my bank account?
                    </p>
                    <p className="mt-1">
                      Go to Settings &gt; Banking and choose the bank connectivity
                      provider BudgeX integrates in the future, then follow the
                      secure authentication flow.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">
                      Is my financial data secure?
                    </p>
                    <p className="mt-1">
                      BudgeX is designed to use secure account-level access and not
                      store bank credentials directly inside the app.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">
                      How do I export my transaction data?
                    </p>
                    <p className="mt-1">
                      Go to Settings &gt; More and click Export Data to CSV.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">
                      Can I create custom categories?
                    </p>
                    <p className="mt-1">
                      Custom categories are planned for future premium functionality.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Contact Support
                </h2>
                <p className="mt-3 text-sm text-zinc-600">
                  Reach out when you need help with your account, setup, or data.
                </p>
                <a
                  href="mailto:budgex.ai@gmail.com"
                  className="mt-4 inline-block rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Contact Support
                </a>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-zinc-500">
              {loading
                ? "Loading your settings..."
                : "Save to keep these preferences on your account."}
            </p>
            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
        </form>
      </div>
    </div>
  );
}
