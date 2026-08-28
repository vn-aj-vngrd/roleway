import { redirect } from "next/navigation";

export default function NewJobPage() {
  redirect("/inbox?create=true");
}
