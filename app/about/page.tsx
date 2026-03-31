import { AppShell } from "@/components/app-shell";

export default function AboutPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            About BudgeX
          </h1>
          <p className="mt-2 text-zinc-500">
            BudgeX is a simple finance workspace designed to help people track
            spending, manage credit, and stay closer to their monthly goals.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">
            What BudgeX Does
          </h2>
          <p className="mt-4 text-zinc-600">
            BudgeX brings transactions, budgets, credits, and planning into one
            place so users can understand where their money is going and decide
            what to improve next.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">
            Founder
          </h2>
          <p className="mt-4 text-zinc-600">
            Aryam Dwivedi
          </p>
          <p className="mt-2 text-zinc-500">
            Aryam Dwivedi is the Founder of BudgeX, an AI powered personal
            finance startup designed to help people take control of their money
            with more clarity and confidence. By combining budgeting tools, net
            worth tracking, subscription analysis, and smart financial
            planning, Aryam is building BudgeX to make financial management
            simpler, more intuitive, and more useful for modern users. With a
            background in engineering and a strong interest in technology and
            business, he is focused on creating practical solutions that turn
            financial data into better decisions.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
