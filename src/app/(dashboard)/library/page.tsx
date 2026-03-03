import { Header } from "@/components/layout/header";

export default function LibraryPage() {
  return (
    <>
      <Header title="Content Library" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            Content library will be implemented in Phase 2
          </p>
        </div>
      </main>
    </>
  );
}
