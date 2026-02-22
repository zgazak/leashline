import { type Competitor, leashline } from "@/lib/competitors";

interface Props {
  competitors: Competitor[];
  /** Which rows to show. Defaults to all. */
  rows?: (keyof typeof rowLabels)[];
}

const rowLabels = {
  technology: "Technology",
  hardwareCost: "Hardware Cost",
  monthlyCost: "Monthly Fee",
  annualCost: "Annual Fee",
  range: "Range",
  cellRequired: "Cell Service Required",
  subscription: "Subscription Required",
  multiDog: "Multi-Dog",
  geofencing: "Geofencing",
  batteryLife: "Battery Life",
} as const;

const defaultRows = Object.keys(rowLabels) as (keyof typeof rowLabels)[];

function CellValue({ value }: { value: unknown }) {
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-green-600" : "text-red-500"}>
        {value ? "✓" : "✗"}
      </span>
    );
  }
  return <>{value ?? "—"}</>;
}

export default function ComparisonTable({ competitors, rows }: Props) {
  const visibleRows = rows ?? defaultRows;
  const trackers = [leashline, ...competitors];

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="sticky left-0 bg-white z-10 text-left py-3 px-3 font-medium text-gray-500">
              &nbsp;
            </th>
            {trackers.map((t) => (
              <th
                key={t.slug}
                className={`py-3 px-3 text-center font-semibold ${
                  t.slug === "leashline"
                    ? "bg-blue-50 text-blue-900"
                    : "text-gray-900"
                }`}
              >
                {t.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row} className="border-b border-gray-100">
              <td className="sticky left-0 bg-white z-10 py-3 px-3 font-medium text-gray-700 whitespace-nowrap">
                {rowLabels[row]}
              </td>
              {trackers.map((t) => (
                <td
                  key={t.slug}
                  className={`py-3 px-3 text-center ${
                    t.slug === "leashline" ? "bg-blue-50 font-medium" : ""
                  }`}
                >
                  <CellValue value={t[row]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
