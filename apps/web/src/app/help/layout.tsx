import "./help-center.css";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="help-site">
      <header className="help-header">
        <Link href="/help" className="help-brand">
          <LogoMark tile size={24} />
          Roleway help
        </Link>
        <div className="action-row">
          <Link href="/home" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft />
            Back to app
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Website
          </Link>
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
