import { redirect } from "next/navigation";

export default function NewDocumentPage() {
  redirect("/documents?create=true");
}
