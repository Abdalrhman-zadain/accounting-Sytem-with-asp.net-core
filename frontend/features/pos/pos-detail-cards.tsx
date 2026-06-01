"use client";

import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

export function DetailedTableCard({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <Card className="rounded-[28px] border-[#d7ddd8] bg-white p-6">
      <div className="text-lg font-black text-[#233329]">{title}</div>
      {rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#e1e7e2] text-left text-[#6d7b73]">
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2 font-bold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-b border-[#f0f3f0]">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="px-3 py-3 text-[#233329]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-[18px] border border-dashed border-[#d7ddd8] bg-[#fafcf9] px-4 py-4 text-sm text-[#64736b]">
          No report rows available.
        </div>
      )}
    </Card>
  );
}

export function DetailTile({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-[#e1e7e2] bg-white",
        compact ? "px-3 py-3" : "px-4 py-4",
      )}
    >
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#718178]">
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-[#233329]">{value}</div>
    </div>
  );
}
