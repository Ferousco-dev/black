import { forwardRef, useMemo } from 'react';
import './ShareCard.css';

const hexToRgb = (hex) => {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const getLuminance = ({ r, g, b }) => {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
};

const getTextColors = (from, to) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const avg = { r: (a.r + b.r) / 2, g: (a.g + b.g) / 2, b: (a.b + b.b) / 2 };
  const lum = getLuminance(avg);
  const isLight = lum > 0.62;
  return {
    primary: isLight ? '#0b1020' : '#f8fafc',
    secondary: isLight ? 'rgba(11,16,32,0.75)' : 'rgba(248,250,252,0.78)',
    watermark: isLight ? 'rgba(11,16,32,0.45)' : 'rgba(248,250,252,0.5)',
    wave: isLight ? 'rgba(11,16,32,0.12)' : 'rgba(248,250,252,0.16)',
  };
};

const ShareCard = forwardRef(function ShareCard(
  { title, excerpt, author, meta, gradient, brand = 'Chronicles', size = 'export', animate = true },
  ref
) {
  const colors = useMemo(() => getTextColors(gradient.from, gradient.to), [gradient]);

  return (
    <div
      ref={ref}
      className={`share-card share-card-${size} ${animate ? 'share-card-animate' : ''}`}
      style={{ backgroundImage: gradient.css, color: colors.primary }}
    >
      <div className="share-card-glass" aria-hidden="true" />
      <div className="share-card-content">
        <div className="share-card-top" style={{ color: colors.secondary }}>
          <span className="share-card-dot">●</span>
          <span className="share-card-brand">{brand}</span>
        </div>
        <div className="share-card-main">
          <h2 className="share-card-title" style={{ color: colors.primary }}>{title}</h2>
          <p className="share-card-excerpt" style={{ color: colors.secondary }}>{excerpt}</p>
        </div>
        <div className="share-card-footer">
          <div className="share-card-author" style={{ color: colors.primary }}>{author}</div>
          <div className="share-card-meta" style={{ color: colors.secondary }}>{meta}</div>
          <div className="share-card-watermark" style={{ color: colors.watermark }}>
            <span className="share-card-dot">●</span>
            <span>{brand}</span>
          </div>
        </div>
      </div>
      <svg className="share-card-wave" viewBox="0 0 1200 220" preserveAspectRatio="none">
        <path
          d="M0 160C160 120 320 200 480 190C640 180 800 90 960 100C1080 108 1140 150 1200 170V220H0V160Z"
          fill={colors.wave}
        />
      </svg>
    </div>
  );
});

export default ShareCard;
