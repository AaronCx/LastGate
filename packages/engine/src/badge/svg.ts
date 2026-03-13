export interface BadgeOptions {
  label: string;
  message: string;
  color: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function measureText(text: string): number {
  // Approximate character width for Verdana 11px
  return text.length * 6.5 + 10;
}

export function generateBadgeSvg({ label, message, color }: BadgeOptions): string {
  const labelWidth = measureText(label);
  const messageWidth = measureText(message);
  const totalWidth = labelWidth + messageWidth;

  const escapedLabel = escapeXml(label);
  const escapedMessage = escapeXml(message);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapedLabel}: ${escapedMessage}">
  <title>${escapedLabel}: ${escapedMessage}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapedLabel}</text>
    <text x="${labelWidth / 2}" y="14">${escapedLabel}</text>
    <text x="${labelWidth + messageWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapedMessage}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${escapedMessage}</text>
  </g>
</svg>`;
}
