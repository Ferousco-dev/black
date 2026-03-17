import { forwardRef } from "react";
import "./AdminGrowthCard.css";

const AdminGrowthCard = forwardRef(function AdminGrowthCard(
  { totalUsers = 0, totalPosts = 0, totalComments = 0, activeUsers = 0 },
  ref
) {
  return (
    <div ref={ref} className="admin-growth-card">
      <div className="admin-growth-header">
        <div className="admin-growth-brand">
          <span>●</span>
          <span>Chronicles</span>
        </div>
        <div className="admin-growth-title">Growth Snapshot</div>
      </div>

      <div className="admin-growth-main">
        <div className="admin-growth-stat">
          <div className="admin-growth-number">{totalUsers}</div>
          <div className="admin-growth-label">Total users</div>
        </div>
        <div className="admin-growth-stat">
          <div className="admin-growth-number">{activeUsers}</div>
          <div className="admin-growth-label">Active users (7d)</div>
        </div>
        <div className="admin-growth-stat">
          <div className="admin-growth-number">{totalPosts}</div>
          <div className="admin-growth-label">Total posts</div>
        </div>
        <div className="admin-growth-stat">
          <div className="admin-growth-number">{totalComments}</div>
          <div className="admin-growth-label">Total comments</div>
        </div>
      </div>

      <div className="admin-growth-footer">
        <span>Admin analytics</span>
        <span className="admin-growth-watermark">Chronicles</span>
      </div>
    </div>
  );
});

export default AdminGrowthCard;
