import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto px-4 text-center">
        <p className="text-6xl mb-4">🐕</p>
        <h1 className="text-3xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-4 text-gray-600">
          Looks like this page wandered off. Even the best dogs stray sometimes.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/compare"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Compare Trackers
          </Link>
        </div>
      </div>
    </div>
  );
}
