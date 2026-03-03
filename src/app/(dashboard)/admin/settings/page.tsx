import { Header } from "@/components/layout/header";

export default function AdminSettingsPage() {
  return (
    <>
      <Header title="Organization Settings" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            Organization settings will be implemented in Phase 6
          </p>
        </div>
      </main>
    </>
  );
}
