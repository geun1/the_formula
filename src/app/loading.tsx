/** 홈(아티클 피드) 로딩 스켈레톤 — journal-hero + TOP5 겹침 + feed-layout 골격. */
export default function HomeLoading() {
  return (
    <>
      {/* journal-hero 풀블리드 */}
      <div className="journal-hero">
        <div className="hero-overlay" />
        <div className="jh-text">
          <div className="jh-date">&nbsp;</div>
          <h1 className="jh-title">불러오는 중…</h1>
          <p className="jh-sub">잠시만 기다려 주세요.</p>
        </div>
      </div>

      <div className="wrap">
        {/* 인기 TOP 5 */}
        <div className="pop-wrap">
          <div className="sec">
            <h2>인기 글 TOP 5</h2>
            <span className="more">이번 주</span>
          </div>
          <div className="pop-slide">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="pop-card" aria-hidden />
            ))}
          </div>
        </div>

        {/* feed-layout */}
        <div className="feed-layout">
          <aside className="feed-cats">
            <div className="fc-cats-head">관심 카테고리</div>
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="cat">
                &nbsp;
              </span>
            ))}
          </aside>
          <div className="feed-main">
            <div className="feed-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <article key={i} className="feed-card" aria-hidden>
                  <div className="fcover cov-sage" />
                  <div className="fcb">
                    <div className="fc-src">&nbsp;</div>
                    <div className="fc-t">불러오는 중…</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
