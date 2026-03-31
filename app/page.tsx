import Image from "next/image";
import Link from "next/link";
import { HomeContactForm } from "@/components/home-contact-form";
import { SiteTopbar } from "@/components/site-topbar";

export default function HomePage() {
  return (
    <div className="bg-zinc-950 text-white">
      <section className="relative min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center brightness-[0.42]"
          style={{ backgroundImage: "url('/budget-sheet-hero.svg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/80" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-6">
          <SiteTopbar />

          <div className="flex flex-1 items-center">
            <div className="max-w-4xl">
              <Image
                src="/budgex-wordmark-clean.png"
                alt="BudgeX wordmark"
                width={1200}
                height={500}
                priority
                className="-ml-3 block h-auto w-[320px] object-contain drop-shadow-[0_0_34px_rgba(255,255,255,0.18)] md:-ml-4 md:w-[540px]"
              />
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-7xl">
                Budget with clarity. Track every move with confidence.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-200">
                BudgeX helps users organize transactions, monitor credit, build
                budgets, and stay focused on real financial goals from one clean
                workspace.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth"
                  className="rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
                >
                  Get Started
                </Link>
                <a
                  href="#about"
                  className="rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-zinc-950 px-4 py-20 md:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
              About BudgeX
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              A focused financial workspace for everyday decisions.
            </h2>
            <p className="mt-4 text-zinc-300">
              BudgeX is built to help users stay organized across budgeting,
              spending, credit tracking, and planning. The goal is to make money
              decisions feel more visible, structured, and manageable.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
              Founder
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              Aryam Dwivedi
            </h2>
            <p className="mt-4 text-zinc-300">
              Founder information can be expanded here later with the story,
              mission, and background behind BudgeX.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-zinc-900 px-4 py-20 md:px-6">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
            Contact Us
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-white">
            Reach out when you are ready.
          </h2>
          <p className="mt-4 text-zinc-300">
            This form opens your email app with the details prefilled so support
            requests are ready to send right away.
          </p>
          <HomeContactForm />
        </div>
      </section>
    </div>
  );
}
