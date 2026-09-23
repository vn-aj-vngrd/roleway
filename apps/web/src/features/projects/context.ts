import { cache } from "react";
import { requireUser } from "@/lib/supabase/server";

export type SearchProject = {
  id: string;
  name: string;
  ticket_key: string;
  icon_type: "icon" | "emoji";
  icon_value: string;
  icon_color: string;
  description: string;
  objective: string;
  status: "active" | "paused" | "archived";
  target_titles: string[];
  industries: string[];
  preferred_technologies: string[];
  employment_types: string[];
  locations: string[];
  remote_preference: "required" | "preferred" | "flexible";
  minimum_compensation: number | null;
  currency: string;
  seniority: string[];
  company_sizes: string[];
  deal_breakers: string[];
  preferred_companies: string[];
  excluded_companies: string[];
  search_keywords: string[];
  weekly_application_goal: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

type SearchProfile = {
  full_name: string;
  headline: string;
  onboarding_completed: boolean;
  tour_completed: boolean;
  active_project_id: string | null;
};

/**
 * Resolves authentication and the active Workspace once per server render.
 * Pages query through the returned project id; RLS remains the ownership backstop.
 */
export const requireSearchContext = cache(async () => {
  const auth = await requireUser();
  if (!auth) return null;

  const [profileResult, projectsResult, favoritesResult] = await Promise.all([
    auth.supabase
      .from("profiles")
      .select("full_name, headline, onboarding_completed, tour_completed, active_project_id")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    auth.supabase
      .from("search_projects")
      .select("id, name, ticket_key, icon_type, icon_value, icon_color, description, objective, status, target_titles, industries, preferred_technologies, employment_types, locations, remote_preference, minimum_compensation, currency, seniority, company_sizes, deal_breakers, preferred_companies, excluded_companies, search_keywords, weekly_application_goal, created_at, updated_at")
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    auth.supabase
      .from("search_projects")
      .select("id, is_favorite")
      .neq("status", "archived"),
  ]);

  if (profileResult.error) throw new Error("Your Roleway profile could not be loaded.");
  if (projectsResult.error) throw new Error("Your workspaces could not be loaded.");

  const profile = profileResult.data as SearchProfile | null;
  const favoriteIds = new Set((favoritesResult.data ?? []).filter((item) => item.is_favorite).map((item) => item.id));
  const projects = ((projectsResult.data ?? []) as Omit<SearchProject, "is_favorite">[])
    .map((project) => ({ ...project, is_favorite: favoriteIds.has(project.id) }))
    .sort((left, right) => Number(right.is_favorite) - Number(left.is_favorite) || Date.parse(right.updated_at) - Date.parse(left.updated_at));
  const project = projects.find((item) => item.id === profile?.active_project_id)
    ?? projects.find((item) => item.status === "active")
    ?? projects[0]
    ?? null;

  return { ...auth, profile, projects, project };
});
