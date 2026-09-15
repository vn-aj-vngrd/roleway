import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <Button variant="outline" render={<Link href="/home" />}>
            <ArrowLeft />
            Back to app
          </Button>
          <Button variant="outline" render={<Link href="/" />}>
            Website
          </Button>
        </div>
      </header>
      <main id="main-content">{children}</main>
    </div>
  );
}
