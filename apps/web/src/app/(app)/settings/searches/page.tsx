import { permanentRedirect } from "next/navigation";

export default async function LegacyWorkspaceSettingsPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const next = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => next.append(key, item));
    else if (value !== undefined) next.set(key, value);
  });
  permanentRedirect(`/settings/workspaces${next.size ? `?${next.toString()}` : ""}`);
}
