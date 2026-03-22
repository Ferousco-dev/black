export default function VerifiedBadge({ size = "md" }) {
  const isSmall = size === "sm";

  return (
    <span
      className={`verified-badge${isSmall ? " verified-badge-sm" : ""}`}
      title="Verified"
      aria-label="Verified account"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M8.5 12.4l2.2 2.2 4.8-5.2"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
