import { redirect } from "next/navigation";

export default function NewInterviewPage() {
  redirect("/interview?create=true");
}
