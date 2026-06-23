import { Skeleton, CardSkeleton } from "@/components/ui";

export default function ArticleLoading() {
  return (
    <div className="px-6 pt-32 pb-24">
      <div className="mx-auto max-w-3xl">
        {/* 커버 */}
        <Skeleton className="h-52 w-full rounded-3xl md:h-64" />

        {/* 메타 칩 */}
        <div className="mt-6 flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* 제목 */}
        <Skeleton className="mt-4 h-9 w-11/12" />
        <Skeleton className="mt-3 h-5 w-2/3" />

        {/* 작성자 미니카드 */}
        <Skeleton className="mt-6 h-16 w-56 rounded-2xl" />

        {/* 본문 */}
        <div className="mt-10 space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>

        {/* 액션 바 */}
        <Skeleton className="mt-10 h-10 w-48 rounded-full" />

        {/* 관련 아카이브 */}
        <div className="mt-14">
          <Skeleton className="h-7 w-64" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
