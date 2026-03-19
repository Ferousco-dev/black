import Skeleton from "./Skeleton";

export default function LoadingPage({ variant = "page", count = 4 }) {
  const items = Array.from({ length: count });

  if (variant === "feed") {
    return (
      <div className="loading-page skeleton-page">
        {items.map((_, idx) => (
          <div className="skeleton-card" key={`feed-${idx}`}>
            <div className="skeleton-row">
              <Skeleton className="skeleton-avatar" />
              <div className="skeleton-col">
                <Skeleton className="skeleton-line" style={{ width: "40%" }} />
                <Skeleton className="skeleton-line" style={{ width: "24%" }} />
              </div>
            </div>
            <Skeleton className="skeleton-line" style={{ width: "90%" }} />
            <Skeleton className="skeleton-line" style={{ width: "72%" }} />
            <Skeleton className="skeleton-rect" style={{ height: 140 }} />
            <div className="skeleton-row">
              <Skeleton className="skeleton-line" style={{ width: "12%" }} />
              <Skeleton className="skeleton-line" style={{ width: "12%" }} />
              <Skeleton className="skeleton-line" style={{ width: "12%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="loading-page skeleton-page">
        <Skeleton className="skeleton-line" style={{ width: "60%", height: 20 }} />
        <Skeleton className="skeleton-line" style={{ width: "45%" }} />
        <Skeleton className="skeleton-rect" style={{ height: 240 }} />
        <div className="skeleton-col">
          {items.map((_, idx) => (
            <Skeleton
              key={`detail-${idx}`}
              className="skeleton-line"
              style={{ width: `${90 - idx * 8}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="loading-page skeleton-page">
        {items.map((_, idx) => (
          <div className="skeleton-row" key={`list-${idx}`}>
            <Skeleton className="skeleton-avatar" />
            <div className="skeleton-col">
              <Skeleton className="skeleton-line" style={{ width: "55%" }} />
              <Skeleton className="skeleton-line" style={{ width: "35%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="loading-page skeleton-page skeleton-grid">
        {items.map((_, idx) => (
          <Skeleton
            key={`grid-${idx}`}
            className="skeleton-pill"
            style={{ width: `${22 + (idx % 4) * 8}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="loading-page skeleton-page">
        <Skeleton className="skeleton-line" style={{ width: "30%" }} />
        {items.map((_, idx) => (
          <Skeleton
            key={`table-${idx}`}
            className="skeleton-rect"
            style={{ height: 42 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="loading-page skeleton-page">
      {items.map((_, idx) => (
        <Skeleton
          key={`page-${idx}`}
          className="skeleton-line"
          style={{ width: `${80 - idx * 6}%` }}
        />
      ))}
    </div>
  );
}
