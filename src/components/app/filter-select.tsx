"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all";

/** A select that writes its value to the URL query string. */
export function FilterSelect({
  param,
  placeholder,
  value,
  options,
}: {
  param: string;
  placeholder: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <Select
      value={value ?? ALL}
      onValueChange={(v) => {
        const next = new URLSearchParams(params.toString());
        if (v === ALL) next.delete(param);
        else next.set(param, v);
        next.delete("page");
        router.push(`${pathname}${next.size ? `?${next}` : ""}`);
      }}
    >
      <SelectTrigger className="h-9 min-w-40 rounded-full bg-card">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
