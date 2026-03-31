"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(
    "Open the password reset link from your email, then set a new password here."
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMessage("Recovery verified. Enter your new password below.");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    if (!password || password !== confirmPassword) {
      setMessage("Passwords must match.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated. Redirecting to sign in...");
    setLoading(false);
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        Reset Password
      </h1>
      <p className="mt-2 text-sm text-zinc-500">{message}</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            New Password
          </label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Enter new password"
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Confirm Password
          </label>
          <input
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            type="password"
            placeholder="Confirm new password"
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>

      <Link
        href="/auth"
        className="mt-6 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        Back to sign in
      </Link>
    </div>
  );
}
