import { Header } from "@/components/layout/header";

export default function AdminUsersPage() {
  return (
    <>
      <Header title="User Management" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-center h-64 rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            User management will be implemented in Phase 6
          </p>
        </div>
      </main>
    </>
  );
}
