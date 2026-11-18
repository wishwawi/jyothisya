import type { ReportDocument } from "../api/contracts";

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
/** Only structured text is accepted; never execute HTML supplied by an API/user. */
export function reportHtml(report: ReportDocument) {
  const e = escapeHtml;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${e(report.title)}</title>
  <style>
  @page { size: A4; margin: 20mm; }
  body { color: #201e1d; font: 12pt/1.55 Georgia, serif; max-width: 720px; margin: auto; }
  h1 { font-size: 28pt; margin-bottom: 8px; } h2 { font-size: 18pt; margin-top: 28px; break-after: avoid; }
  p { white-space: pre-wrap; overflow-wrap: anywhere; orphans: 3; widows: 3; }
  .meta { font: 10pt/1.6 Helvetica, sans-serif; color: #645c50; }
  .notice { border: 1px solid #d4c6af; padding: 12px; font: 10pt/1.5 Helvetica, sans-serif; }
  footer { margin-top: 28px; border-top: 1px solid #d4c6af; padding-top: 10px; font-size: 9pt; }
  </style></head><body>
  <h1>${e(report.title)}</h1><h2>${e(report.profile.name)}</h2>
  <p class="meta">Birth: ${e(report.profile.dob)} · ${e(report.profile.time)} · ${e(report.profile.place)}
  Profile revision ${report.profile.revision} · Generated ${e(report.createdAt)} · Language: English</p>
  <p class="notice">${e(report.basis.method)}\n${e(report.basis.notice)}</p>
  ${report.sections.map((s) => `<section><h2>${e(s.title)}</h2>${s.paragraphs.map((p) => `<p>${e(p)}</p>`).join("")}</section>`).join("")}
  <footer>Report ${e(report.id)} · Chart basis ${e(report.chartSnapshotId)}<br>Traditional interpretations are not guarantees. Journal outcomes are self-reported. This document preserves the data at creation time.</footer>
  </body></html>`;
}
