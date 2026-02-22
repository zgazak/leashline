import Link from "next/link";
import { JsonLd, breadcrumbJsonLd } from "@/lib/structured-data";

interface BreadcrumbItem {
  name: string;
  href: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
      <JsonLd data={breadcrumbJsonLd(items)} />
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === items.length - 1 ? (
              <span className="text-gray-900 font-medium">{item.name}</span>
            ) : (
              <Link href={item.href} className="hover:text-blue-600 transition-colors">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
