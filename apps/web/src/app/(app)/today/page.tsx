import { permanentRedirect } from "next/navigation";

export default function LegacyTodayRoute() {
  permanentRedirect("/home");
}
