import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { WorkspaceSkeleton } from "./workspace-loading";

describe("Workspace loading routes", () => {
  it("starts Opportunities in List, matching the product default before preferences load", () => {
    const html = renderToStaticMarkup(createElement(WorkspaceSkeleton, { pathname: "/opportunities" }));
    expect(html).toContain('data-skeleton-view="list"');
    expect(html).not.toContain('data-skeleton-view="board"');
  });

  it.each([
    ["/home", "home-v2-header"],
    ["/inbox", "inbox-review-shell"],
    ["/agent", "agent-native-workplane"],
    ["/contacts", "contacts-page"],
    ["/interview", "interview-index-layout"],
    ["/documents", "documents-index-layout"],
    ["/opportunities/record", "linear-ticket"],
    ["/documents/record", "document-editor"],
    ["/interview/record", "interview-workspace-form"],
    ["/documents/new", "modal-create-form"],
    ["/settings/profile", "settings-group"],
    ["/settings/workspaces", "skeleton-list"],
    ["/settings/billing", "skeleton-plan-options"],
    ["/insights", "insights-layout"],
    ["/notifications", "notifications-layout"],
  ])("uses the matching work plane for %s without interactive placeholders", (pathname, expectedClass) => {
    const html = renderToStaticMarkup(createElement(WorkspaceSkeleton, { pathname }));
    expect(html).toContain(expectedClass);
    expect(html).toContain('role="status"');
    expect(html).not.toMatch(/<(button|input|textarea|select|a)\b/);
  });
});
