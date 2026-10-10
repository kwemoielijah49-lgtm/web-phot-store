import React from 'react';

interface VaultLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark' | 'compact';
  color?: string; // Dark fill color (defaults to #252723)
  textColor?: string;
  subtextColor?: string;
  showSubtitle?: boolean;
}

/**
 * Vault Monogram and Typography Logo
 * Faithfully incorporates the user's Black & White Minimalist Monogram:
 * - Solid circular dark emblem with crisp negative-space "V"
 * - Seamless continuation into "ault"
 * - Subtitle "photography" positioned directly below
 */
export const VaultLogo: React.FC<VaultLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  color = '#252723',
  textColor = '#252723',
  subtextColor = '#696B65',
  showSubtitle = true,
}) => {
  // Size presets for emblem circle diameter
  const sizeMap = {
    sm: { height: 28, circleSize: 26, fontSize: 22, subFontSize: 7.5 },
    md: { height: 38, circleSize: 34, fontSize: 30, subFontSize: 9.5 },
    lg: { height: 50, circleSize: 44, fontSize: 38, subFontSize: 12 },
    xl: { height: 72, circleSize: 64, fontSize: 56, subFontSize: 17 },
  };

  const currentSize = sizeMap[size];

  // Standalone Monogram Mark (Circle with cutout V)
  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        style={{ width: currentSize.circleSize, height: currentSize.circleSize }}
        aria-label="Vault Logo Mark"
      >
        {/* Solid Dark Circular Emblem */}
        <circle cx="50" cy="50" r="48" fill={color} />
        {/* Crisp White "V" Monogram Cutout */}
        <path
          d="M26 21H42.5L50.5 56L58.5 21H75L59.5 77H41.5L26 21Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  // Full Brand Logo with "Vault" and "photography"
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <svg
        viewBox="0 0 240 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 h-auto"
        style={{ height: currentSize.height, width: 'auto' }}
        aria-label="Vault Photography"
      >
        {/* Left: Circular Monogram Emblem */}
        <g transform="translate(6, 6)">
          {/* Circular dark disc */}
          <circle cx="42" cy="42" r="42" fill={color} />
          {/* White 'V' glyph intersecting the circular field */}
          <path
            d="M22 17H36.5L43.8 48.5L51.2 17H65.5L52 67H35.8L22 17Z"
            fill="#FFFFFF"
          />
        </g>

        {/* Right: "ault" Bold Typography continuation */}
        <text
          x="96"
          y="56"
          fill={textColor}
          style={{
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
            fontWeight: 800,
            fontSize: '49px',
            letterSpacing: '-0.035em',
          }}
        >
          ault
        </text>

        {/* Subtitle: "photography" */}
        {showSubtitle && variant !== 'compact' && (
          <text
            x="98"
            y="76"
            fill={subtextColor}
            style={{
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
              fontWeight: 600,
              fontSize: '15px',
              letterSpacing: '0.04em',
            }}
          >
            photography
          </text>
        )}
      </svg>
    </div>
  );
};
