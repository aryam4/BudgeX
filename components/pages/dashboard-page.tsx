type DashboardTransaction = {
  id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
};

type DashboardPageProps = {
  monthlySpending: number;
  totalCreditBalance: number;
  budgetLeft: number;
  transactionsThisMonth: number;
  recentTransactions: DashboardTransaction[];
  transactionsSetupMessage?: string;
  creditsSetupMessage?: string;
  budgetSetupMessage?: string;
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

export function DashboardPage({
  monthlySpending,
  totalCreditBalance,
  budgetLeft,
  transactionsThisMonth,
  recentTransactions,
  transactionsSetupMessage,
  creditsSetupMessage,
  budgetSetupMessage,
}: DashboardPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-2 text-zinc-500">
          Your simple money snapshot for this month.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Monthly Spending</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(monthlySpending)}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Based on your saved transactions this month.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Transactions This Month</p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
            {transactionsThisMonth}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            A quick pulse on your logged activity.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Credit Balance</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(totalCreditBalance)}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            {creditsSetupMessage
              ? creditsSetupMessage
              : "Based on your saved credit accounts."}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Budget Left</p>
          <h2 className="money-value mt-2 text-2xl font-semibold text-zinc-900">
            {formatCurrency(budgetLeft)}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            {budgetSetupMessage
              ? budgetSetupMessage
              : "Based on your saved budget actuals and monthly income."}
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-zinc-900">Recent Activity</h3>

        {transactionsSetupMessage ? (
          <p className="mt-3 text-sm text-amber-700">{transactionsSetupMessage}</p>
        ) : null}

        {!transactionsSetupMessage && recentTransactions.length === 0 ? (
          <p className="mt-3 text-zinc-500">
            No transactions yet. Add your first expense on the transactions page
            and it will appear here.
          </p>
        ) : null}

        {!transactionsSetupMessage && recentTransactions.length > 0 ? (
          <div className="mt-5 space-y-3">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 md:flex-row md:items-center md:justify-between"
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

                <div className="money-value text-lg font-semibold text-zinc-900">
                  {formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
