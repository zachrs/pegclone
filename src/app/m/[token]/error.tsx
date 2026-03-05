"use client";

export default function ViewerError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-800">
          Something Went Wrong
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          We&apos;re having trouble loading this page. Please try again in a
          moment, or contact your provider for a new link.
        </p>
      </div>
    </main>
  );
}
