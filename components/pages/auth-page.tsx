"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { BudgeXLogo } from "@/components/budgex-logo";
import { createClient } from "@/lib/supabase/client";

export function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [providerLoading, setProviderLoading] = useState<
    "google" | "apple" | null
  >(null);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "oauth") {
      setMessage("OAuth sign-in could not be completed. Please try again.");
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailLoading(true);
    setMessage("");

    const supabase = createClient();

    try {
      if (mode === "signup") {
        if (!firstName.trim() || !lastName.trim()) {
          setMessage("First name and last name are required.");
          return;
        }

        if (!dateOfBirth) {
          setMessage("Date of birth is required.");
          return;
        }

        if (password !== confirmPassword) {
          setMessage("Passwords do not match.");
          return;
        }

        const normalizedFirstName = firstName.trim();
        const normalizedLastName = lastName.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: normalizedFirstName,
              last_name: normalizedLastName,
              full_name: `${normalizedFirstName} ${normalizedLastName}`.trim(),
              date_of_birth: dateOfBirth,
            },
          },
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (data.session?.user) {
          const { error: profileError } = await supabase
            .from("user_profiles")
            .upsert(
              {
                user_id: data.session.user.id,
                first_name: normalizedFirstName,
                last_name: normalizedLastName,
                date_of_birth: dateOfBirth,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );

          if (profileError && profileError.code !== "42P01") {
            setMessage(profileError.message);
            return;
          }
        }

        setMessage(
          "Account created. Check your email if confirmation is enabled."
        );
        setFirstName("");
        setLastName("");
        setDateOfBirth("");
        setPassword("");
        setConfirmPassword("");
        setMode("signin");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setProviderLoading(provider);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setMessage(error.message);
      setProviderLoading(null);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setMessage("Enter your email first, then tap Forgot password.");
      return;
    }

    setResetLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setMessage(error.message);
      setResetLoading(false);
      return;
    }

    setMessage("Password reset link sent. Check your email.");
    setResetLoading(false);
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
      <div className="mb-6">
        <BudgeXLogo
          imageClassName="rounded-2xl"
          size={84}
          subtitle="Your smarter budgeting workspace"
        />
      </div>

      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        {mode === "signin" ? "Sign In" : "Create Account"}
      </h1>
      <p className="mt-2 text-zinc-500">
        Use Supabase Auth to access BudgeX.
      </p>

      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={providerLoading !== null || emailLoading}
          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          {providerLoading === "google"
            ? "Connecting to Google..."
            : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={() => handleOAuth("apple")}
          disabled={providerLoading !== null || emailLoading}
          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          {providerLoading === "apple"
            ? "Connecting to Apple..."
            : "Continue with Apple"}
        </button>

        <p className="text-xs text-zinc-500">
          Google and Apple sign-in also need to be enabled in Supabase Auth with
          the correct callback URL before they will work end to end.
        </p>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
          Or use email
        </span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-2xl px-4 py-2 text-sm font-medium ${
            mode === "signin" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-2xl px-4 py-2 text-sm font-medium ${
            mode === "signup" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700"
          }`}
        >
          Sign Up
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  First Name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  type="text"
                  placeholder="Aryam"
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Last Name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  type="text"
                  placeholder="Dwivedi"
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Date of Birth
              </label>
              <input
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                type="date"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none focus:border-zinc-400"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Password
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Enter password"
            className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
          />
        </div>

        {mode === "signup" ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Confirm Password
            </label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="Confirm password"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>
        ) : null}

        {mode === "signin" ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetLoading || emailLoading || providerLoading !== null}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-60"
            >
              {resetLoading ? "Sending reset link..." : "Forgot password?"}
            </button>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={emailLoading || providerLoading !== null}
          className="w-full rounded-2xl bg-zinc-900 px-4 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {emailLoading
            ? "Please wait..."
            : mode === "signin"
              ? "Sign In with Email"
              : "Create Account with Email"}
        </button>

        {message && <p className="text-sm text-zinc-600">{message}</p>}
      </form>
    </div>
  );
}
