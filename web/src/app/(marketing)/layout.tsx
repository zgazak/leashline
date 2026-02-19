import Link from "next/link";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Leashline
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Leashline. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
