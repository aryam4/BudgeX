export function AIPlannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          AI Planner
        </h1>
        <p className="mt-2 text-zinc-500">
          Use AI to build a realistic monthly budget.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-2 rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-zinc-900">AI Budget Coach</h3>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Monthly Income
              </label>
              <input
                type="text"
                placeholder="0"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Fixed Expenses
              </label>
              <input
                type="text"
                placeholder="Rent 0, Phone 0, Internet 0"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Financial Goal
              </label>
              <input
                type="text"
                placeholder="Save 0 per month"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Extra Context
              </label>
              <textarea
                placeholder="Describe what you want help planning."
                className="min-h-[140px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
              />
            </div>

            <button className="w-full rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800">
              Generate Budget Plan
            </button>
          </div>
        </div>

        <div className="xl:col-span-3 rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-zinc-900">
            Suggested Monthly Plan
          </h3>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-dashed border-zinc-300 p-6">
              <h4 className="font-medium text-zinc-900">Recommended breakdown</h4>
              <p className="mt-3 text-zinc-500">
                Your plan will appear here after you add your income, expenses,
                and goal.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-zinc-300 p-6">
              <h4 className="font-medium text-zinc-900">Planning Notes</h4>
              <p className="mt-3 text-zinc-500">
                Use this space later for automated suggestions, categories, and
                next-step guidance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
