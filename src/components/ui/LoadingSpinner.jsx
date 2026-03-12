export default function LoadingSpinner({ size = 28, fullPage = false }) {
  const spinner = <span className="spinner" style={{ width: size, height: size }} />;
  if (fullPage) return <div className="loading-page">{spinner}</div>;
  return spinner;
}
