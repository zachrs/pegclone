import { Header } from "@/components/layout/header";

export default function AnalyticsPage() {
  return (
    <>
      <Header title="Analytics" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            Analytics dashboard will be implemented in Phase 5
          </p>
        </div>
      </main>
    </>
  );
}
