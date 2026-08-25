import Link from "next/link";
import { LogoMark } from "@/components/logo";
import "@/app/auth.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-minimal" id="main-content">
      <header className="auth-minimal-header">
        <Link href="/" className="auth-minimal-logo" aria-label="Roleway home">
          <LogoMark size={26} tile />
          <span>Roleway</span>
        </Link>
      </header>
      <section className="auth-minimal-center">{children}</section>
    </main>
  );
}
