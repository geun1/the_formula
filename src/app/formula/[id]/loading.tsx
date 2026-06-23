import { Skeleton } from "@/components/ui";

export default function FormulaDetailLoading() {
  return (
    <div className="px-6 pt-32 pb-24">
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-52 w-full rounded-3xl md:h-64" />

        <div className="mt-6 flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        <Skeleton className="mt-4 h-10 w-4/5" />
        <Skeleton className="mt-3 h-6 w-3/5" />

        <Skeleton className="mt-6 h-16 w-64 rounded-2xl" />

        <div className="mt-10 space-y-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
