"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData): Promise<void> {
  const businessName = String(formData.get("businessName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!businessName || !email || !password) {
    redirect(`/signup?error=${encodeURIComponent("All fields are required")}`);
  }

  const supabase = await createServerSupabaseClient();

  // Tenant + owner user + default agent config are provisioned by a DB
  // trigger reading business_name back out of this metadata (see
  // supabase/migrations/20260719000003_tenant_signup_trigger.sql) — it
  // fires when the auth.users row is created, so it works whether or
  // not the project requires email confirmation before a session exists.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { business_name: businessName } },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent("Check your email to confirm your account, then sign in.")}`,
    );
  }

  redirect("/inbox");
}
