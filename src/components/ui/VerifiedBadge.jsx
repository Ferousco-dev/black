export default function VerifiedBadge({ size = "md" }) {
  const isSmall = size === "sm";

  return (
    <span
      className={`verified-badge${isSmall ? " verified-badge-sm" : ""}`}
      title="Verified"
      aria-label="Verified account"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2.5l2.35 2.38 3.32-.48 1.22 3.14 3.06 1.37-1.37 3.06 1.37 3.06-3.06 1.37-1.22 3.14-3.32-.48L12 21.5l-2.35-2.38-3.32.48-1.22-3.14-3.06-1.37 1.37-3.06-1.37-3.06 3.06-1.37 1.22-3.14 3.32.48L12 2.5z"
          fill="currentColor"
        />
        <path
          d="M8.5 12.2l2.1 2.1 4.9-5"
          fill="none"
          stroke="var(--text-on-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="verified-badge-text">Verified</span>
    </span>
  );
}
