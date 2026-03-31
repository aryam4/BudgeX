"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserProfile = {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  phone_country_code: string;
  phone_number: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  country: string;
  state_province: string;
  postal_code: string;
  home_address: string;
};

type ProfileForm = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  stateProvince: string;
  postalCode: string;
};

function getRegionFieldCopy(country: string) {
  const normalizedCountry = country.trim().toLowerCase();

  if (normalizedCountry === "canada") {
    return {
      label: "Province",
      placeholder: "British Columbia",
    };
  }

  if (
    normalizedCountry === "united states" ||
    normalizedCountry === "usa" ||
    normalizedCountry === "us"
  ) {
    return {
      label: "State",
      placeholder: "Washington",
    };
  }

  return {
    label: "State / Province",
    placeholder: "Enter your region",
  };
}

function composeHomeAddress(form: Pick<
  ProfileForm,
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "stateProvince"
  | "country"
  | "postalCode"
>) {
  return [
    form.addressLine1.trim(),
    form.addressLine2.trim(),
    [form.city.trim(), form.stateProvince.trim(), form.postalCode.trim()]
      .filter(Boolean)
      .join(", "),
    form.country.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

function getNameParts(userMetadata: Record<string, unknown>) {
  const firstName =
    typeof userMetadata.first_name === "string"
      ? userMetadata.first_name
      : typeof userMetadata.given_name === "string"
        ? userMetadata.given_name
        : "";

  const lastName =
    typeof userMetadata.last_name === "string"
      ? userMetadata.last_name
      : typeof userMetadata.family_name === "string"
        ? userMetadata.family_name
        : "";

  if (firstName || lastName) {
    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };
  }

  const fullName =
    typeof userMetadata.full_name === "string"
      ? userMetadata.full_name.trim()
      : typeof userMetadata.name === "string"
        ? userMetadata.name.trim()
        : "";

  if (!fullName) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const [derivedFirstName, ...rest] = fullName.split(" ");

  return {
    firstName: derivedFirstName ?? "",
    lastName: rest.join(" "),
  };
}

export function ProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    email: "",
    phoneCountryCode: "",
    phoneNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "",
    stateProvince: "",
    postalCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Please sign in again to load your profile.");
        setLoading(false);
        return;
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const nameParts = getNameParts(metadata);
      const metadataDateOfBirth =
        typeof metadata.date_of_birth === "string" ? metadata.date_of_birth : "";

      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "user_id, first_name, last_name, date_of_birth, phone_country_code, phone_number, address_line_1, address_line_2, city, country, state_province, postal_code, home_address"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        setMessage(
          error.code === "42P01"
            ? "The user_profiles table is missing. Run supabase/schema.sql, then refresh this page."
            : error.message
        );
        setLoading(false);
        return;
      }

      const profile = data as UserProfile | null;

      setForm({
        firstName: profile?.first_name || nameParts.firstName,
        lastName: profile?.last_name || nameParts.lastName,
        dateOfBirth: profile?.date_of_birth || metadataDateOfBirth,
        email: user.email ?? "",
        phoneCountryCode: profile?.phone_country_code ?? "",
        phoneNumber: profile?.phone_number ?? "",
        addressLine1: profile?.address_line_1 || profile?.home_address || "",
        addressLine2: profile?.address_line_2 ?? "",
        city: profile?.city ?? "",
        country: profile?.country ?? "",
        stateProvince: profile?.state_province ?? "",
        postalCode: profile?.postal_code ?? "",
      });
      setLoading(false);
    }

    void loadProfile();
  }, [supabase]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setMessage("Please sign in again before saving changes.");
      return;
    }

    if (!form.email.trim()) {
      setSaving(false);
      setMessage("Email is required.");
      return;
    }

    if (!form.phoneCountryCode.trim() || !form.phoneNumber.trim()) {
      setSaving(false);
      setMessage("Phone country code and phone number are required.");
      return;
    }

    if (
      !form.addressLine1.trim() ||
      !form.city.trim() ||
      !form.country.trim() ||
      !form.stateProvince.trim() ||
      !form.postalCode.trim()
    ) {
      setSaving(false);
      setMessage(
        "Street address, city, country, state or province, and zip or postal code are required."
      );
      return;
    }

    const profilePayload = {
      user_id: user.id,
      first_name: form.firstName,
      last_name: form.lastName,
      date_of_birth: form.dateOfBirth || null,
      phone_country_code: form.phoneCountryCode.trim(),
      phone_number: form.phoneNumber.trim(),
      address_line_1: form.addressLine1.trim(),
      address_line_2: form.addressLine2.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      state_province: form.stateProvince.trim(),
      postal_code: form.postalCode.trim(),
      home_address: composeHomeAddress(form),
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(profilePayload, { onConflict: "user_id" });

    if (profileError) {
      setSaving(false);
      setMessage(
        profileError.code === "42P01"
          ? "The user_profiles table is missing. Run supabase/schema.sql, then try again."
          : profileError.message
      );
      return;
    }

    if (user.email !== form.email.trim()) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: form.email.trim(),
      });

      if (emailError) {
        setSaving(false);
        setMessage(emailError.message);
        return;
      }

      setMessage(
        "Profile saved. Check your email to confirm the address change if confirmation is enabled."
      );
      setSaving(false);
      return;
    }

    setMessage("Profile saved.");
    setSaving(false);
  }

  const regionFieldCopy = getRegionFieldCopy(form.country);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Profile
        </h1>
        <p className="mt-2 text-zinc-500">
          Manage your personal details and keep your contact information current.
        </p>
      </div>

      <form
        className="rounded-3xl bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              First Name
            </label>
            <input
              value={form.firstName}
              disabled
              type="text"
              className="w-full cursor-not-allowed rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-zinc-700 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Last Name
            </label>
            <input
              value={form.lastName}
              disabled
              type="text"
              className="w-full cursor-not-allowed rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-zinc-700 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Date of Birth
            </label>
            <input
              value={form.dateOfBirth}
              disabled
              type="date"
              className="w-full cursor-not-allowed rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-zinc-700 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              type="email"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Country Code
            </label>
            <input
              value={form.phoneCountryCode}
              onChange={(event) =>
                updateField("phoneCountryCode", event.target.value)
              }
              type="text"
              placeholder="+1"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Phone Number
            </label>
            <input
              value={form.phoneNumber}
              onChange={(event) => updateField("phoneNumber", event.target.value)}
              type="tel"
              placeholder="6045551234"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Street Address Line 1
            </label>
            <input
              value={form.addressLine1}
              onChange={(event) => updateField("addressLine1", event.target.value)}
              type="text"
              placeholder="123 Main Street"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Street Address Line 2
            </label>
            <input
              value={form.addressLine2}
              onChange={(event) => updateField("addressLine2", event.target.value)}
              type="text"
              placeholder="Apartment, suite, unit, building"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              City
            </label>
            <input
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              type="text"
              placeholder="Vancouver"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Country
            </label>
            <input
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              type="text"
              placeholder="Canada"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              {regionFieldCopy.label}
            </label>
            <input
              value={form.stateProvince}
              onChange={(event) => updateField("stateProvince", event.target.value)}
              type="text"
              placeholder={regionFieldCopy.placeholder}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Zip / Postal Code
            </label>
            <input
              value={form.postalCode}
              onChange={(event) => updateField("postalCode", event.target.value)}
              type="text"
              placeholder="V6B 1A1"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-zinc-500">
            First name, last name, and DOB are locked from editing.
          </p>

          <button
            type="submit"
            disabled={loading || saving}
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Loading..." : saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {message ? (
          <p className="mt-4 text-sm text-zinc-600">{message}</p>
        ) : null}
      </form>
    </div>
  );
}
