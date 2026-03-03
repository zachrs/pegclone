import { lookupMessage } from "@/lib/viewer/mock-data";
import { ViewerContent } from "./viewer-content";

export default async function PatientViewerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const message = lookupMessage(token);

  if (!message) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold text-gray-800">
            Link Not Found
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This link is invalid. Please check the URL or contact your
            provider.
          </p>
        </div>
      </main>
    );
  }

  if (message.expired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: message.org.primaryColor + "20" }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={message.org.primaryColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">
            This Link Has Expired
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This link is no longer active. Please contact your provider for a
            new link.
          </p>
          {message.org.phone && (
            <p className="mt-4 text-sm text-gray-600">
              Contact {message.org.name}:{" "}
              <a
                href={`tel:${message.org.phone}`}
                className="font-medium underline"
                style={{ color: message.org.primaryColor }}
              >
                {message.org.phone}
              </a>
            </p>
          )}
        </div>
      </main>
    );
  }

  return <ViewerContent message={message} />;
}
