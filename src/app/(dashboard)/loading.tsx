import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-14 items-center gap-4 border-b px-4">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
