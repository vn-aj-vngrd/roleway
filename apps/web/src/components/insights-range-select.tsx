"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SelectField } from "@/components/form-controls";

type RangeOption = {
  value: string;
  label: string;
};

export function InsightsRangeSelect({
  range,
  options,
}: {
  range: string;
  options: RangeOption[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(range);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setValue(range), [range]);

  return (
    <div className="insights-range-select" aria-busy={isPending || undefined}>
      <SelectField
        id="insights-range"
        name=""
        ariaLabel="Insight timeline"
        value={value}
        options={options}
        onValueChange={(nextRange) => {
          setValue(nextRange);
          startTransition(() => {
            router.replace(`/insights?range=${nextRange}`, { scroll: false });
          });
        }}
      />
    </div>
  );
}
