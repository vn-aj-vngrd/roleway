import type { Page } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const usesAdminFixture = process.env.E2E_AUTH_MODE === "admin";

// This fixture authenticates only disposable test accounts. It does not exercise CAPTCHA/password login.
export async function authenticateFixture(email: string, page?: Page): Promise<SupabaseClient> {
  if (!email.startsWith("e2e-") || !email.endsWith("@roleway.test")) throw new Error("Only disposable E2E accounts are allowed.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const client = createServerClient(url, key, { cookies: {
    getAll: () => [],
    setAll: async (cookies) => {
      if (page) await page.context().addCookies(cookies.map(({name,value})=>({name,value,url:"http://localhost:3003",sameSite:"Lax" as const})));
    },
  } });
  const { error: authError } = await client.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: "magiclink" });
  if (authError) throw authError;
  return client;
}

export async function createFixtureAccount(email: string, password: string, page: Page) {
  if (!email.startsWith("e2e-") || !email.endsWith("@roleway.test")) throw new Error("Only disposable E2E accounts are allowed.");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  if(error) throw error;
  try { await authenticateFixture(email,page); }
  catch(error) { await admin.auth.admin.deleteUser(data.user.id); throw error; }
  return data.user.id;
}
