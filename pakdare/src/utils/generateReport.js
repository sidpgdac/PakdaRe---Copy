import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CATEGORIES, WARDS } from '../data/wardData';
import { timeAgo } from './dateHelper';

// BMC Brand Colors
const NAVY   = [8, 13, 31];
const BLUE   = [37, 99, 235];
const GOLD   = [245, 158, 11];
const GREEN  = [16, 185, 129];
const RED    = [239, 68, 68];
const ORANGE = [249, 115, 22];

const SEV_COLOR = { critical: RED, severe: ORANGE, moderate: [234, 179, 8], minor: GREEN };

function dataUrlToBase64(dataUrl) {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}

function getMimeType(dataUrl) {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return 'JPEG';
}

/**
 * generateReport(complaint)
 * Generates a multi-page PDF with:
 * - BMC header + complaint details
 * - Before (citizen) vs After (officer) photo side-by-side
 * - GPS coordinates, officer details, escalation timeline
 * - "Verified by GPS" watermark on resolved complaints
 */
export async function generateReport(complaint) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const MARGIN = 16;
  const CONTENT_W = PW - MARGIN * 2;

  const ward = WARDS.find(w => w.id === complaint.ward);
  const sevColor = SEV_COLOR[complaint.severity] || BLUE;

  // ── PAGE 1 ────────────────────────────────────────────────────────

  // Navy header bar
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, PW, 28, 'F');

  // Gold accent stripe
  pdf.setFillColor(...GOLD);
  pdf.rect(0, 28, PW, 2, 'F');

  // BMC Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.text('BMC Public Health Portal', MARGIN, 12);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(200, 210, 255);
  pdf.text('Brihanmumbai Municipal Corporation — Disease Surveillance System', MARGIN, 19);

  // Complaint ID + Ward badge (right side)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`Ward ${ward?.id || complaint.ward}`, PW - MARGIN - 28, 12, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(200, 210, 255);
  pdf.text(new Date().toLocaleString('en-IN'), PW - MARGIN, 19, { align: 'right' });

  let y = 38;

  // Complaint ID pill
  pdf.setFillColor(...NAVY);
  pdf.roundedRect(MARGIN, y, CONTENT_W, 12, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`Complaint ID: ${complaint.id}`, MARGIN + 6, y + 8);
  // Severity badge
  pdf.setFillColor(...sevColor);
  pdf.roundedRect(PW - MARGIN - 36, y + 2, 34, 8, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(complaint.severity?.toUpperCase() || 'MODERATE', PW - MARGIN - 19, y + 7, { align: 'center' });

  y += 18;

  // Section title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...NAVY);
  pdf.text('COMPLAINT DETAILS', MARGIN, y);
  pdf.setDrawColor(...GOLD);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y + 1.5, PW - MARGIN, y + 1.5);
  y += 7;

  // Details table
  autoTable(pdf, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [],
    body: [
      ['Location', complaint.location || '—'],
      ['Ward', `${ward?.name || complaint.ward} — ${ward?.area || ''} (${ward?.zone || ''} Zone)`],
      ['Category', CATEGORIES[complaint.category] || complaint.category],
      ['Severity', complaint.severity?.toUpperCase()],
      ['Status', complaint.status],
      ['Date Filed', new Date(complaint.time).toLocaleString('en-IN')],
      ['Assigned To', complaint.assignedTo || '—'],
      ['GPS Coordinates', complaint.lat ? `${complaint.lat}, ${complaint.lng}` : 'Not available'],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, fillColor: [240, 244, 255], textColor: NAVY },
      1: { cellWidth: CONTENT_W - 45 },
    },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    theme: 'plain',
  });

  y = pdf.lastAutoTable.finalY + 8;

  // Description
  if (complaint.desc) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...NAVY);
    pdf.text('DESCRIPTION', MARGIN, y);
    pdf.line(MARGIN, y + 1.5, PW - MARGIN, y + 1.5);
    y += 6;

    pdf.setFillColor(248, 250, 255);
    pdf.roundedRect(MARGIN, y, CONTENT_W, 16, 2, 2, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(60, 70, 90);
    const descLines = pdf.splitTextToSize(complaint.desc, CONTENT_W - 8);
    pdf.text(descLines.slice(0, 4), MARGIN + 4, y + 5);
    y += 20;
  }

  // ── BEFORE vs AFTER PHOTOS ────────────────────────────────────────
  const beforePhoto = complaint.photos?.[0];
  const afterPhoto  = complaint.resolutionPhoto;

  if (beforePhoto || afterPhoto) {
    if (y > PH - 90) { pdf.addPage(); y = MARGIN; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...NAVY);
    pdf.text('BEFORE & AFTER EVIDENCE', MARGIN, y);
    pdf.line(MARGIN, y + 1.5, PW - MARGIN, y + 1.5);
    y += 7;

    const photoW = (CONTENT_W - 8) / 2;
    const photoH = 58;

    // BEFORE
    pdf.setFillColor(239, 68, 68, 50);
    pdf.roundedRect(MARGIN, y, photoW, photoH + 10, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...RED);
    pdf.text('BEFORE (Citizen Report)', MARGIN + photoW / 2, y + 5, { align: 'center' });

    if (beforePhoto) {
      try {
        const b64 = dataUrlToBase64(beforePhoto);
        const mime = getMimeType(beforePhoto);
        pdf.addImage(b64, mime, MARGIN + 2, y + 8, photoW - 4, photoH - 6);
      } catch (_) {
        pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
        pdf.text('Photo not available', MARGIN + photoW / 2, y + photoH / 2, { align: 'center' });
      }
    } else {
      pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
      pdf.text('No photo attached', MARGIN + photoW / 2, y + photoH / 2, { align: 'center' });
    }

    // AFTER
    const afterX = MARGIN + photoW + 8;
    pdf.setFillColor(16, 185, 129, 50);
    pdf.roundedRect(afterX, y, photoW, photoH + 10, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...GREEN);
    pdf.text('AFTER (Officer Resolution)', afterX + photoW / 2, y + 5, { align: 'center' });

    if (afterPhoto) {
      try {
        const b64 = dataUrlToBase64(afterPhoto);
        const mime = getMimeType(afterPhoto);
        pdf.addImage(b64, mime, afterX + 2, y + 8, photoW - 4, photoH - 6);
      } catch (_) {
        pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
        pdf.text('Photo not available', afterX + photoW / 2, y + photoH / 2, { align: 'center' });
      }
    } else {
      pdf.setFontSize(8); pdf.setTextColor(150, 150, 150);
      pdf.text('Not yet resolved', afterX + photoW / 2, y + photoH / 2, { align: 'center' });
    }

    y += photoH + 16;
  }

  // ── RESOLUTION DETAILS ────────────────────────────────────────────
  if (complaint.resolved && complaint.resolvedAt) {
    if (y > PH - 50) { pdf.addPage(); y = MARGIN; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...NAVY);
    pdf.text('RESOLUTION DETAILS', MARGIN, y);
    pdf.line(MARGIN, y + 1.5, PW - MARGIN, y + 1.5);
    y += 6;

    autoTable(pdf, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [],
      body: [
        ['Resolved By', complaint.resolutionOfficer || complaint.assignedTo || '—'],
        ['Resolved At', new Date(complaint.resolvedAt).toLocaleString('en-IN')],
        ['GPS Verified', complaint.gpsVerified ? '✓ Yes — Officer was at site' : 'Not verified (no EXIF GPS in photo)'],
        ['Resolution GPS', complaint.resolutionGps ? `${complaint.resolutionGps.lat?.toFixed(5)}, ${complaint.resolutionGps.lng?.toFixed(5)}` : '—'],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45, fillColor: [240, 255, 248], textColor: [0, 100, 60] },
        1: { cellWidth: CONTENT_W - 45 },
      },
      theme: 'plain',
    });

    y = pdf.lastAutoTable.finalY + 6;
  }

  // ── ESCALATION TIMELINE ───────────────────────────────────────────
  if (complaint.escalations?.length > 0) {
    if (y > PH - 50) { pdf.addPage(); y = MARGIN; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...NAVY);
    pdf.text('ESCALATION TIMELINE', MARGIN, y);
    pdf.line(MARGIN, y + 1.5, PW - MARGIN, y + 1.5);
    y += 6;

    autoTable(pdf, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['#', 'Action / Escalation']],
      body: complaint.escalations.map((e, i) => [i + 1, e]),
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 255] },
      theme: 'striped',
      columnStyles: { 0: { cellWidth: 12 } },
    });

    y = pdf.lastAutoTable.finalY + 6;
  }

  // ── GPS VERIFIED WATERMARK ────────────────────────────────────────
  if (complaint.resolved && complaint.gpsVerified) {
    const pages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.setTextColor(16, 185, 129);
      pdf.setGState(new pdf.GState({ opacity: 0.07 }));
      pdf.text('VERIFIED BY GPS — BMC HEALTH PORTAL', PW / 2, PH / 2, {
        align: 'center', angle: 45,
      });
      pdf.setGState(new pdf.GState({ opacity: 1 }));
    }
  }

  // ── FOOTER ────────────────────────────────────────────────────────
  const pages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFillColor(...NAVY);
    pdf.rect(0, PH - 10, PW, 10, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(160, 180, 220);
    pdf.text(
      `BMC Public Health Portal | Generated: ${new Date().toLocaleString('en-IN')} | Page ${i} of ${pages}`,
      PW / 2, PH - 4, { align: 'center' }
    );
  }

  // Save
  const filename = `BMC_Report_${complaint.id}_${new Date().toISOString().slice(0,10)}.pdf`;
  pdf.save(filename);
  return filename;
}
