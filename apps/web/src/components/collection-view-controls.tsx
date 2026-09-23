"use client";

import { ListFilter, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CountBadge } from "@/components/ui-primitives";

export type CollectionFilterGroup = {
  key: string;
  label: string;
  defaultValue: string;
  options: readonly { value: string; label: string }[];
};

export type CollectionSortOption = { value: string; label: string };

type CollectionPreferences = {
  filters: Record<string, string>;
  sort: string;
  query: string;
};

type CollectionViewControlsProps = {
  page: string;
  filterGroups: readonly CollectionFilterGroup[];
  values: Record<string, string>;
  sort: string;
  defaultSort: string;
  sortOptions: readonly CollectionSortOption[];
  search?: { key: string; value: string; placeholder: string };
  layoutLabel?: string;
};

export function CollectionViewControls({
  page,
  filterGroups,
  values,
  sort,
  defaultSort,
  sortOptions,
  search,
  layoutLabel = "List",
}: CollectionViewControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const filterRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const storageKey = `roleway:collection-preferences:${page}:v1`;

  const currentPreferences = useCallback(
    (): CollectionPreferences => ({
      filters: Object.fromEntries(
        filterGroups.map((group) => [
          group.key,
          values[group.key] ?? group.defaultValue,
        ]),
      ),
      sort,
      query: search?.value ?? "",
    }),
    [filterGroups, search?.value, sort, values],
  );

  useEffect(() => {
    const relevantKeys = [
      ...filterGroups.map((group) => group.key),
      ...(search ? [search.key] : []),
      "sort",
    ];
    if (relevantKeys.some((key) => searchParams.has(key))) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentPreferences()));
      } catch {
        /* Keep URL-backed controls usable without storage. */
      }
      return;
    }
    try {
      const stored = JSON.parse(
        localStorage.getItem(storageKey) ?? "null",
      ) as Partial<CollectionPreferences> | null;
      if (!stored) return;
      const next = new URLSearchParams(searchParams.toString());
      for (const group of filterGroups) {
        const value = stored.filters?.[group.key];
        if (
          value &&
          group.options.some((option) => option.value === value) &&
          value !== group.defaultValue
        )
          next.set(group.key, value);
      }
      if (
        stored.sort &&
        sortOptions.some((option) => option.value === stored.sort) &&
        stored.sort !== defaultSort
      )
        next.set("sort", stored.sort);
      if (search && stored.query)
        next.set(search.key, stored.query.slice(0, 120));
      if (next.toString() !== searchParams.toString())
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [
    currentPreferences,
    defaultSort,
    filterGroups,
    pathname,
    router,
    search,
    searchParams,
    sortOptions,
    storageKey,
  ]);

  useEffect(() => {
    if (!filterOpen && !displayOpen) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!filterRef.current?.contains(target)) setFilterOpen(false);
      if (!displayRef.current?.contains(target)) setDisplayOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFilterOpen(false);
      setDisplayOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [displayOpen, filterOpen]);

  const navigate = (preferences: CollectionPreferences) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      /* URL remains the source of truth. */
    }
    const next = new URLSearchParams(searchParams.toString());
    for (const group of filterGroups) {
      const value = preferences.filters[group.key] ?? group.defaultValue;
      if (value === group.defaultValue) next.delete(group.key);
      else next.set(group.key, value);
    }
    if (preferences.sort === defaultSort) next.delete("sort");
    else next.set("sort", preferences.sort);
    if (search) {
      if (preferences.query.trim())
        next.set(search.key, preferences.query.trim());
      else next.delete(search.key);
    }
    startTransition(() =>
      router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, {
        scroll: false,
      }),
    );
  };

  const setFilter = (key: string, value: string) =>
    navigate({
      ...currentPreferences(),
      filters: { ...currentPreferences().filters, [key]: value },
    });
  const activeFilterCount =
    filterGroups.filter(
      (group) =>
        (values[group.key] ?? group.defaultValue) !== group.defaultValue,
    ).length + Number(Boolean(search?.value.trim()));

  return (
    <div
      className="collection-view-controls"
      aria-label="Filter and display options"
      aria-busy={isPending || undefined}
    >
      <div className="pipeline-filter-menu" ref={filterRef}>
        <button
          type="button"
          className={`pipeline-control-button ${activeFilterCount ? "active" : ""}`}
          aria-label={`Filter ${page}`}
          data-tooltip="Filter"
          aria-haspopup="dialog"
          aria-expanded={filterOpen}
          onClick={() => {
            setFilterOpen((open) => !open);
            setDisplayOpen(false);
          }}
        >
          <ListFilter aria-hidden="true" />
          {activeFilterCount ? (
            <CountBadge
              className="pipeline-control-count"
              tone="accent"
              label={`${activeFilterCount} active filters`}
              value={activeFilterCount}
            />
          ) : null}
        </button>
        {filterOpen ? (
          <div
            className="pipeline-popover pipeline-filter-popover collection-filter-popover floating-panel"
            role="dialog"
            aria-label={`Filter ${page}`}
          >
            {search ? (
              <form
                className="pipeline-popover-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  navigate({
                    ...currentPreferences(),
                    query: String(data.get("query") ?? ""),
                  });
                  setFilterOpen(false);
                }}
              >
                <Search aria-hidden="true" />
                <label
                  className="sr-only"
                  htmlFor={`${page}-collection-search`}
                >
                  Search {page}
                </label>
                <input
                  id={`${page}-collection-search`}
                  name="query"
                  defaultValue={search.value}
                  placeholder={search.placeholder}
                />
                <button className="sr-only" type="submit">
                  Search
                </button>
              </form>
            ) : null}
            {filterGroups.map((group) => (
              <section key={group.key}>
                <span>{group.label}</span>
                <div>
                  {group.options.map((option) => (
                    <button
                      type="button"
                      className={
                        (values[group.key] ?? group.defaultValue) ===
                        option.value
                          ? "active"
                          : ""
                      }
                      key={option.value}
                      onClick={() => setFilter(group.key, option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {activeFilterCount ? (
              <button
                type="button"
                className="pipeline-clear-filters"
                onClick={() => {
                  navigate({
                    filters: Object.fromEntries(
                      filterGroups.map((group) => [
                        group.key,
                        group.defaultValue,
                      ]),
                    ),
                    sort,
                    query: "",
                  });
                  setFilterOpen(false);
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="pipeline-display-menu" ref={displayRef}>
        <button
          type="button"
          className="pipeline-control-button"
          aria-label={`${page} display options`}
          data-tooltip="Display"
          aria-haspopup="dialog"
          aria-expanded={displayOpen}
          onClick={() => {
            setDisplayOpen((open) => !open);
            setFilterOpen(false);
          }}
        >
          <SlidersHorizontal aria-hidden="true" />
        </button>
        {displayOpen ? (
          <div
            className="pipeline-popover pipeline-display-popover collection-display-popover floating-panel"
            role="dialog"
            aria-label={`${page} display options`}
          >
            <div className="pipeline-display-note">
              <span>Layout</span>
              <strong>{layoutLabel}</strong>
            </div>
            <section>
              <span>Sort by</span>
              <div>
                {sortOptions.map((option) => (
                  <button
                    type="button"
                    className={sort === option.value ? "active" : ""}
                    key={option.value}
                    onClick={() => {
                      navigate({ ...currentPreferences(), sort: option.value });
                      setDisplayOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
