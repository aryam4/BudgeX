"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const starterMessage: ChatMessage = {
  role: "assistant",
  content:
    "Hi, I’m your BudgeX helper. Ask me for quick help with budgets, spending, credit tracking, or how to use this page.",
};

function getPageLabel(pathname: string) {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/transactions") return "transactions";
  if (pathname === "/credits") return "credits";
  if (pathname === "/budgets") return "budgets";
  if (pathname === "/ai-planner") return "ai planner";
  if (pathname === "/profile") return "profile";
  return "BudgeX";
}

function getLocalReply(input: string, pathname: string) {
  const normalized = input.toLowerCase();
  const pageLabel = getPageLabel(pathname);

  if (
    normalized.includes("hello") ||
    normalized.includes("hi") ||
    normalized.includes("hey")
  ) {
    return `You’re on the ${pageLabel} page. I can help explain what this page does, suggest next budgeting steps, or answer quick money-tracking questions.`;
  }

  if (normalized.includes("budget")) {
    if (pathname === "/budgets") {
      return "Start by setting your monthly income, then fill in fixed costs first, variable spending second, and savings goals after that. A good quick check is whether your planned total leaves some room for savings and unexpected expenses.";
    }

    return "A simple budget usually works best when you separate fixed costs, variable spending, savings, and debt payments. If you want, head to the Budgets page and start by entering income and your biggest monthly costs first.";
  }

  if (
    normalized.includes("transaction") ||
    normalized.includes("expense") ||
    normalized.includes("spending")
  ) {
    if (pathname === "/transactions") {
      return "Use this page to log each expense with an amount, category, description, and date. Once saved, your latest transactions also feed the dashboard so you can quickly see monthly spending.";
    }

    return "Transactions are the foundation of BudgeX. Add expenses on the Transactions page first, then the dashboard can reflect real monthly spending and recent activity.";
  }

  if (
    normalized.includes("credit") ||
    normalized.includes("card") ||
    normalized.includes("utilization")
  ) {
    if (pathname === "/credits") {
      return "On the Credits page, add each card with its balance, limit, and due date. The most useful quick metric is utilization: lower utilization is generally healthier than carrying a high share of your limit.";
    }

    return "Credit tracking helps you watch balances, limits, and utilization. If you add your accounts on the Credits page, the dashboard can summarize your total credit balance.";
  }

  if (normalized.includes("dashboard")) {
    return "The dashboard gives a quick snapshot of monthly spending, recent transactions, and credit totals. It becomes more useful as you add real transactions and credit accounts.";
  }

  if (
    normalized.includes("ai planner") ||
    normalized.includes("plan") ||
    normalized.includes("goal")
  ) {
    return "The AI Planner page is best used after you know your income, major fixed costs, and one clear goal like saving more or reducing shopping. Even without live AI, that page is a good place to sketch a realistic spending plan.";
  }

  if (
    normalized.includes("save") ||
    normalized.includes("saving") ||
    normalized.includes("emergency fund")
  ) {
    return "A simple way to build savings is to treat it like a fixed bill. Set a target amount, move it right after payday if possible, and keep it visible in your budget so it is not an afterthought.";
  }

  if (
    normalized.includes("help") ||
    normalized.includes("how") ||
    normalized.includes("what can you do")
  ) {
    return `I can help with page guidance, budgeting tips, spending organization, and credit tracking basics. Right now you’re on the ${pageLabel} page, so I can also explain what to do here next.`;
  }

  return `For a quick next step on the ${pageLabel} page, focus on entering real data first, then use the dashboard to review patterns. If you ask about budgets, transactions, credits, or savings, I can give more specific guidance.`;
}

export function AIChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = input.trim();

    if (!trimmedInput || loading) {
      return;
    }

    const nextMessages = [
      ...messages,
      {
        role: "user" as const,
        content: trimmedInput,
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const reply = getLocalReply(trimmedInput, pathname);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply,
        },
      ]);
      setLoading(false);
    }, 250);
  }

  function handleReset() {
    setMessages([starterMessage]);
    setInput("");
  }

  return (
    <>
      {isOpen ? (
        <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-3xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                BudgeX Assistant
              </h3>
              <p className="text-xs text-zinc-500">
                Free built-in help while you use the app
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[24rem] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl px-4 py-3 text-sm ${
                  message.role === "assistant"
                    ? "bg-zinc-100 text-zinc-800"
                    : "ml-8 bg-zinc-900 text-white"
                }`}
              >
                {message.content}
              </div>
            ))}

            {loading ? (
              <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500">
                Thinking...
              </div>
            ) : null}

          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-zinc-200 px-4 py-4"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask for quick budgeting help..."
              className="min-h-[96px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                No API key needed for this version.
              </p>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-zinc-800"
      >
        Ask BudgeX AI
      </button>
    </>
  );
}
