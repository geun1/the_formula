import { Skeleton } from "@/components/ui";

export default function ArchiveLoading() {
  return (
    <div className="wrap">
      <div className="dir-wrap">
        <aside className="dir-nav">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </aside>

        <div>
          <div className="dir-main-head">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <article className="fcard" key={i}>
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="mt-3 h-5 w-3/4 rounded" />
                <Skeleton className="mt-2 h-12 w-full rounded" />
                <div className="fc-foot">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
