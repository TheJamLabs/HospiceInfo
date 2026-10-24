import { siteConfig } from './siteConfig';

export interface FeedbackPoint {
  id: string;
  name: string;
  postcode: string | null;
  hospiceName: string | null;
}

// Builds a mailto: link that prefills the point's identifying details so the
// operator can act without a form. The user types the disagreement in their
// own mail client — no endpoint, no data collection (ADR-0009).
export function feedbackMailto(point: FeedbackPoint): string {
  const subject = `Correction request: ${point.name}${
    point.postcode ? ` (${point.postcode})` : ''
  }`;
  const lines = [`Point: ${point.name}`, `Point ID: ${point.id}`];
  if (point.postcode) lines.push(`Postcode: ${point.postcode}`);
  if (point.hospiceName) lines.push(`Assigned hospice: ${point.hospiceName}`);
  lines.push('', 'What is wrong with this data?', '');
  return `mailto:${siteConfig.contactEmail}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(lines.join('\n'))}`;
}
