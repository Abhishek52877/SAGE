import React from 'react';

/** @typedef {'dots'|'diagonal-stripes'|'grid'|'horizontal-lines'|'vertical-lines'|'checkerboard'} BGVariantType */
/** @typedef {'fade-center'|'fade-edges'|'fade-top'|'fade-bottom'|'fade-left'|'fade-right'|'fade-x'|'fade-y'|'none'} BGMaskType */

function getMaskStyle(mask) {
  const g = {
    'fade-edges': 'radial-gradient(ellipse at center, black 0%, transparent 72%)',
    'fade-center': 'radial-gradient(ellipse at center, transparent 35%, black 100%)',
    'fade-top': 'linear-gradient(to bottom, transparent, black)',
    'fade-bottom': 'linear-gradient(to bottom, black, transparent)',
    'fade-left': 'linear-gradient(to right, transparent, black)',
    'fade-right': 'linear-gradient(to right, black, transparent)',
    'fade-x': 'linear-gradient(to right, transparent, black, transparent)',
    'fade-y': 'linear-gradient(to bottom, transparent, black, transparent)',
    none: '',
  }[mask || 'none'];
  if (!g) return {};
  return {
    WebkitMaskImage: g,
    maskImage: g,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  };
}

function getBgImage(variant, fill, size) {
  switch (variant) {
    case 'dots':
      return `radial-gradient(${fill} 1px, transparent 1px)`;
    case 'grid':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px), linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
    case 'diagonal-stripes':
      return `repeating-linear-gradient(45deg, ${fill}, ${fill} 1px, transparent 1px, transparent ${size}px)`;
    case 'horizontal-lines':
      return `linear-gradient(to bottom, ${fill} 1px, transparent 1px)`;
    case 'vertical-lines':
      return `linear-gradient(to right, ${fill} 1px, transparent 1px)`;
    case 'checkerboard':
      return `linear-gradient(45deg, ${fill} 25%, transparent 25%), linear-gradient(-45deg, ${fill} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${fill} 75%), linear-gradient(-45deg, transparent 75%, ${fill} 75%)`;
    default:
      return undefined;
  }
}

/**
 * Subtle geometric background (dashboard only). No Tailwind — matches SAGE Vite setup.
 */
export function BGPattern({
  variant = 'grid',
  mask = 'none',
  size = 24,
  fill = 'rgba(255, 255, 255, 0.06)',
  className = '',
  style,
  ...props
}) {
  const bgSize = `${size}px ${size}px`;
  const backgroundImage = getBgImage(variant, fill, size);
  const maskStyle = getMaskStyle(mask);

  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        backgroundImage,
        backgroundSize: variant === 'checkerboard' ? `${size * 2}px ${size * 2}px` : bgSize,
        ...maskStyle,
        ...style,
      }}
      {...props}
    />
  );
}

BGPattern.displayName = 'BGPattern';
