import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { DashboardPage } from "@/components/pages/dashboard-page";

type DashboardTransaction = {
  id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
};

type DashboardBudgetRow = {
  actual?: number;
};

export default async function DashboardRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const monthStart = new Date();
  monthStart.setDate(1);

  const monthStartString = monthStart.toISOString().slice(0, 10);

  const [
    monthlyTransactionsResult,
    recentTransactionsResult,
    creditAccountsResult,
    budgetPlanResult,
  ] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount, transaction_date")
        .eq("user_id", user.id)
        .gte("transaction_date", monthStartString),
      supabase
        .from("transactions")
        .select("id, amount, category, description, transaction_date")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("credit_accounts")
        .select("balance")
        .eq("user_id", user.id),
      supabase
        .from("budget_plans")
        .select("monthly_income, rows_json")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const transactionsSetupMessage =
    monthlyTransactionsResult.error?.code === "42P01" ||
    recentTransactionsResult.error?.code === "42P01"
      ? "Transactions table not created yet. Run supabase/schema.sql in Supabase to start populating this dashboard."
      : monthlyTransactionsResult.error?.message || recentTransactionsResult.error?.message;

  const creditsSetupMessage =
    creditAccountsResult.error?.code === "42P01"
      ? "Credit accounts table not created yet. Run supabase/schema.sql in Supabase to start tracking credit balances."
      : creditAccountsResult.error?.message;

  const budgetSetupMessage =
    budgetPlanResult.error?.code === "42P01"
      ? "Budget plans table not created yet. Run supabase/schema.sql in Supabase to start tracking your saved budget."
      : budgetPlanResult.error?.message ||
        (!budgetPlanResult.data
          ? "Save a budget to see your remaining amount here."
          : undefined);

  const monthlySpending = transactionsSetupMessage
    ? 0
    : (monthlyTransactionsResult.data ?? []).reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0
      );

  const transactionsThisMonth = transactionsSetupMessage
    ? 0
    : (monthlyTransactionsResult.data ?? []).length;

  const recentTransactions: DashboardTransaction[] = transactionsSetupMessage
    ? []
    : (recentTransactionsResult.data ?? []).map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      }));

  const totalCreditBalance = creditsSetupMessage
    ? 0
    : (creditAccountsResult.data ?? []).reduce(
        (sum, account) => sum + Number(account.balance),
        0
      );

  const budgetRows = Array.isArray(budgetPlanResult.data?.rows_json)
    ? (budgetPlanResult.data?.rows_json as DashboardBudgetRow[])
    : [];

  const budgetActualTotal = budgetRows.reduce(
    (sum, row) => sum + Number(row.actual ?? 0),
    0
  );

  const budgetLeft = budgetSetupMessage
    ? 0
    : Number(budgetPlanResult.data?.monthly_income ?? 0) - budgetActualTotal;

  return (
    <AppShell>
      <DashboardPage
        monthlySpending={monthlySpending}
        totalCreditBalance={totalCreditBalance}
        budgetLeft={budgetLeft}
        transactionsThisMonth={transactionsThisMonth}
        recentTransactions={recentTransactions}
        transactionsSetupMessage={transactionsSetupMessage}
        creditsSetupMessage={creditsSetupMessage}
        budgetSetupMessage={budgetSetupMessage}
      />
    </AppShell>
  );
}
