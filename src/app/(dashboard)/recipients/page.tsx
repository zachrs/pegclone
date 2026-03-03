import { Header } from "@/components/layout/header";

export default function RecipientsPage() {
  return (
    <>
      <Header title="Recipients" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            Recipient history will be implemented in Phase 4
          </p>
        </div>
      </main>
    </>
  );
}
