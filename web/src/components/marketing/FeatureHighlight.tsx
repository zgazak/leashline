import Link from "next/link";

interface Props {
  icon: string;
  title: string;
  description: string;
  href?: string;
}

export default function FeatureHighlight({ icon, title, description, href }: Props) {
  const content = (
    <div className="rounded-xl border border-gray-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );

  if (href) {
    const isExternal = href.startsWith("http");
    if (isExternal) {
      return <a href={href} target="_blank" rel="noopener noreferrer" className="block">{content}</a>;
    }
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}
