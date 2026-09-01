import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import "@/app/auth.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-minimal" id="main-content">
      <section className="auth-minimal-center">
        <Link href="/" className="auth-minimal-logo" aria-label="Roleway home">
          <LogoMark size={40} tile />
        </Link>
        {children}
      </section>
    </main>
  );
}
