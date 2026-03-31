"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type UserSettings = {
  dark_mode: boolean;
  font_size: "small" | "medium" | "large";
  lock_numericals: boolean;
};

export function SettingsEffects() {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function applySettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        document.documentElement.dataset.theme = "light";
        document.documentElement.dataset.fontSize = "medium";
        document.documentElement.dataset.hideMoney = "false";
        return;
      }

      const { data } = await supabase
        .from("user_settings")
        .select("dark_mode, font_size, lock_numericals")
        .eq("user_id", user.id)
        .maybeSingle();

      const settings = data as UserSettings | null;

      document.documentElement.dataset.theme = settings?.dark_mode
        ? "dark"
        : "light";
      document.documentElement.dataset.fontSize =
        settings?.font_size ?? "medium";
      document.documentElement.dataset.hideMoney = settings?.lock_numericals
        ? "true"
        : "false";
    }

    void applySettings();
  }, [supabase]);

  return null;
}
