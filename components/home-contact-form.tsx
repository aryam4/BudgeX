"use client";

import { FormEvent, useState } from "react";

type ContactFormState = {
  name: string;
  phone: string;
  email: string;
  reason: string;
};

const initialState: ContactFormState = {
  name: "",
  phone: "",
  email: "",
  reason: "",
};

export function HomeContactForm() {
  const [form, setForm] = useState(initialState);
  const [message, setMessage] = useState("");

  function updateField<K extends keyof ContactFormState>(
    key: K,
    value: ContactFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.name || !form.phone || !form.email || !form.reason) {
      setMessage("Please fill in all contact fields before submitting.");
      return;
    }

    const subject = encodeURIComponent(`BudgeX contact request from ${form.name}`);
    const body = encodeURIComponent(
      [
        `Name: ${form.name}`,
        `Phone Number: ${form.phone}`,
        `Email: ${form.email}`,
        "",
        "Reason for message:",
        form.reason,
      ].join("\n")
    );

    window.location.href = `mailto:support@budgex.app?subject=${subject}&body=${body}`;
    setMessage("Your email app should open now with your message ready to send.");
    setForm(initialState);
  }

  return (
    <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Name"
        value={form.name}
        onChange={(event) => updateField("name", event.target.value)}
        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-zinc-400 outline-none focus:border-white/30"
        required
      />
      <input
        type="tel"
        placeholder="Phone Number"
        value={form.phone}
        onChange={(event) => updateField("phone", event.target.value)}
        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-zinc-400 outline-none focus:border-white/30"
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(event) => updateField("email", event.target.value)}
        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-zinc-400 outline-none focus:border-white/30 md:col-span-2"
        required
      />
      <textarea
        placeholder="Reason for message"
        value={form.reason}
        onChange={(event) => updateField("reason", event.target.value)}
        className="min-h-[160px] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-zinc-400 outline-none focus:border-white/30 md:col-span-2"
        required
      />
      <button
        type="submit"
        className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 md:w-fit"
      >
        Email Support
      </button>
      {message ? (
        <p className="text-sm text-zinc-300 md:col-span-2">{message}</p>
      ) : null}
    </form>
  );
}
