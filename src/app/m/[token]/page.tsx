export default async function PatientViewerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-center text-muted-foreground">
            Patient viewer for token <code className="text-xs">{token.slice(0, 8)}...</code> will be implemented in Phase 4
          </p>
        </div>
      </div>
    </main>
  );
}
