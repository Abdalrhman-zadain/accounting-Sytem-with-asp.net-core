"use client";

import type { ReactNode } from "react";

export type TableColumnType = "text" | "code" | "name" | "amount" | "side" | "action";

export function ReportingTable({
  headers,
  rows,
  emptyLabel,
  columnTypes = [],
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  emptyLabel: string;
  columnTypes?: TableColumnType[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th key={header} className={getTableHeaderClassName(columnTypes[index])}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-sm text-gray-500">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={getTableCellClassName(columnTypes[cellIndex])}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function getTableHeaderClassName(type: TableColumnType = "text") {
  const base = "whitespace-nowrap px-3 py-3 text-xs font-bold uppercase text-gray-500";

  switch (type) {
    case "amount":
      return `${base} min-w-[9rem] text-end tabular-nums`;
    case "code":
      return `${base} w-28 text-start`;
    case "name":
      return `${base} min-w-[14rem] text-start`;
    case "side":
      return `${base} w-24 text-center`;
    case "action":
      return `${base} w-28 text-center`;
    default:
      return `${base} text-start`;
  }
}

function getTableCellClassName(type: TableColumnType = "text") {
  const base = "whitespace-nowrap px-3 py-3 align-middle text-gray-700";

  switch (type) {
    case "amount":
      return `${base} text-end font-medium tabular-nums text-gray-900`;
    case "code":
      return `${base} text-start font-mono text-xs text-gray-700`;
    case "name":
      return `${base} text-start font-medium text-gray-800`;
    case "side":
      return `${base} text-center`;
    case "action":
      return `${base} text-center`;
    default:
      return `${base} text-start`;
  }
}
