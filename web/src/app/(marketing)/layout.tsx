import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import { JsonLd, organizationJsonLd } from "@/lib/structured-data";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd data={organizationJsonLd()} />

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
              <h3 className="font-semibold text-gray-900 mb-3">Get Started</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/sign-up" className="hover:text-gray-900 transition-colors">Sign Up</Link></li>
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
