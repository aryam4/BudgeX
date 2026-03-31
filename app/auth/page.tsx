import { redirect } from "next/navigation";
import { AuthPage } from "@/components/pages/auth-page";
import { createClient } from "@/lib/supabase/server";

export default async function AuthRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6 flex items-center justify-center">
      <AuthPage />
    </div>
  );
}
