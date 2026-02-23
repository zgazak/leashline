import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import { JsonLd, organizationJsonLd, webSiteJsonLd } from "@/lib/structured-data";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webSiteJsonLd()} />

      <header className="border-b border-gray-200 bg-white">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Leashline
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/how-it-works"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/compare"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Compare
            </Link>
            <a
              href="https://github.com/zgazak/leashline"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-block text-sm text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            <AuthNav />
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Product</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/how-it-works" className="hover:text-gray-900 transition-colors">How It Works</Link></li>
                <li><Link href="/no-subscription-dog-tracker" className="hover:text-gray-900 transition-colors">No Subscription</Link></li>
                <li><Link href="/dog-tracker-without-cell-service" className="hover:text-gray-900 transition-colors">No Cell Service</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Compare</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/compare" className="hover:text-gray-900 transition-colors">All Trackers</Link></li>
                <li><Link href="/compare/vs-fi" className="hover:text-gray-900 transition-colors">vs Fi</Link></li>
                <li><Link href="/compare/vs-halo" className="hover:text-gray-900 transition-colors">vs Halo</Link></li>
                <li><Link href="/compare/vs-whistle" className="hover:text-gray-900 transition-colors">vs Whistle</Link></li>
                <li><Link href="/compare/vs-tractive" className="hover:text-gray-900 transition-colors">vs Tractive</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Community</h3>
              <ul className="space-y-2 text-gray-600">
                <li><a href="https://github.com/zgazak/leashline" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">GitHub</a></li>
                <li><a href="mailto:zach@leashline.io" className="hover:text-gray-900 transition-colors">zach@leashline.io</a></li>
                <li><Link href="/sign-up" className="hover:text-gray-900 transition-colors">Join the Beta</Link></li>
                <li><Link href="/sign-in" className="hover:text-gray-900 transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Leashline. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
