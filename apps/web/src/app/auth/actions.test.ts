import { beforeEach, expect, it, vi } from "vitest";
const reset = vi.hoisted(() => vi.fn());
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(url);}}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{resetPasswordForEmail:reset}})}));
import { requestPasswordReset } from "./actions";
beforeEach(()=>{vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://roleway.example");reset.mockReset();});
it("does not claim delivery when the recovery provider rejects the request",async()=>{
 reset.mockResolvedValue({error:{code:"captcha_failed"}});
 const form=new FormData();form.set("email","fixture@example.com");form.set("captchaToken","fixture-token");
 await expect(requestPasswordReset(form)).rejects.toThrow("/forgot-password?error=");
});
it("acknowledges an accepted recovery request without revealing account existence",async()=>{
 reset.mockResolvedValue({error:null});
 const form=new FormData();form.set("email","fixture@example.com");form.set("captchaToken","fixture-token");
 await expect(requestPasswordReset(form)).rejects.toThrow("/forgot-password?sent=true");
});
