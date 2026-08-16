import { z } from "zod";

export const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CREDENTIAL_ENCRYPTION_KEY: z.string().min(32),
  TRIGGER_SECRET_KEY: z.string().min(1).optional(),
});
