"use client";

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQAccordion({ items }: { items: FAQItem[] }) {
  return (
    <div>
      <div className="divide-y divide-gray-200">
        {items.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="flex cursor-pointer items-center justify-between text-left font-medium text-gray-900">
              {item.question}
              <svg
                className="ml-4 h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </summary>
            <p className="mt-3 text-gray-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
