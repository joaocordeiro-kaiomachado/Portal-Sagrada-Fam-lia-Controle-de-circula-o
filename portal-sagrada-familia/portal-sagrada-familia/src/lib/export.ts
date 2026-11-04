import type { Authorization, ReportSummary } from '../types/database';
import { REASON_LABEL } from './constants';
import { formatCode, formatDate, formatDateTime, formatTime } from './format';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV no padrão do Excel brasileiro: separador ";" e BOM UTF-8 (acentos corretos). */
function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
}

export function exportCsv(records: Authorization[], summary: ReportSummary, start: string, end: string) {
  const rows: (string | number)[][] = [
    ['Portal Sagrada Família — Relatório de autorizações de saída'],
    [`Período: ${formatDate(start)} a ${formatDate(end)}`],
    [`Gerado em: ${formatDateTime(new Date().toISOString())}`],
    [],
    ['Registro', 'Data', 'Horário', 'Aluno(a)', 'Ano escolar', 'Turma', 'Motivo', 'Professor(a)', 'Observações'],
    ...records.map((a) => [
      formatCode(a.code),
      formatDate(a.authorization_date),
      formatTime(a.exit_time),
      a.student_name,
      a.school_year,
      a.class_group,
      REASON_LABEL[a.reason] ?? a.reason,
      a.teacher_name,
      a.notes ?? '',
    ]),
    [],
    ['Totais por dia'],
    ...summary.by_day.map((i) => [formatDate(i.label), i.total]),
    [],
    ['Totais por turma'],
    ...summary.by_class.map((i) => [i.label, i.total]),
    [],
    ['Totais por professor(a)'],
    ...summary.by_teacher.map((i) => [i.label, i.total]),
    [],
    ['Totais por motivo'],
    ...summary.by_reason.map((i) => [REASON_LABEL[i.label] ?? i.label, i.total]),
    [],
    ['Total geral', summary.total],
  ];
  download(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), `relatorio-saidas_${start}_a_${end}.csv`);
}

export async function exportPdf(records: Authorization[], summary: ReportSummary, start: string, end: string) {
  // Carregado sob demanda: deixa a abertura do portal mais rápida.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const brand: [number, number, number] = [23, 60, 108];
  const accent: [number, number, number] = [223, 156, 66];
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Cabeçalho
  doc.setFillColor(...brand);
  doc.roundedRect(M, 34, 30, 30, 6, 6, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.4);
  doc.lines([[0, -9], [7, -4], [7, 4], [0, 9]], M + 8, 57); // símbolo (prédio)
  doc.line(M + 5.5, 57, M + 24.5, 57);
  doc.lines([[0, -6], [6, 0], [0, 6]], M + 12, 57);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(82, 112, 143);
  doc.text('PORTAL SAGRADA FAMÍLIA', M + 40, 45, { charSpace: 1.2 });
  doc.setFontSize(11);
  doc.setTextColor(...brand);
  doc.text('Controle de circulação', M + 40, 59);

  doc.setFillColor(...accent);
  doc.roundedRect(M, 86, 3, 34, 1.5, 1.5, 'F');
  doc.setFontSize(17);
  doc.text('Relatório de autorizações de saída', M + 12, 100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(101, 120, 139);
  doc.text(
    `Período: ${formatDate(start)} a ${formatDate(end)}  ·  Total: ${summary.total}  ·  Gerado em ${formatDateTime(new Date().toISOString())}`,
    M + 12,
    116,
  );

  const tableStyle = {
    theme: 'grid' as const,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4, textColor: [15, 23, 42] as [number, number, number], lineColor: [231, 237, 243] as [number, number, number] },
    headStyles: { fillColor: brand, textColor: 255, fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: [247, 249, 251] as [number, number, number] },
    margin: { left: M, right: M },
  };

  const half = (W - M * 2 - 16) / 2;
  const y0 = 138;
  autoTable(doc, {
    ...tableStyle,
    startY: y0,
    head: [['Motivo', 'Total']],
    body: summary.by_reason.map((i) => [REASON_LABEL[i.label] ?? i.label, i.total]),
    tableWidth: half,
    margin: { left: M, right: M },
  });
  const afterReason = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    ...tableStyle,
    startY: y0,
    head: [['Turma', 'Total']],
    body: summary.by_class.map((i) => [i.label, i.total]),
    tableWidth: half,
    margin: { left: M + half + 16, right: M },
  });
  const afterClass = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const y1 = Math.max(afterReason, afterClass) + 18;
  autoTable(doc, {
    ...tableStyle,
    startY: y1,
    head: [['Professor(a)', 'Total']],
    body: summary.by_teacher.map((i) => [i.label, i.total]),
    tableWidth: half,
    margin: { left: M, right: M },
  });
  const afterTeacher = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    ...tableStyle,
    startY: y1,
    head: [['Dia', 'Total']],
    body: summary.by_day.map((i) => [formatDate(i.label), i.total]),
    tableWidth: half,
    margin: { left: M + half + 16, right: M },
  });
  const afterDay = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    ...tableStyle,
    startY: Math.max(afterTeacher, afterDay) + 24,
    head: [['Registro', 'Data', 'Hora', 'Aluno(a)', 'Turma', 'Motivo', 'Professor(a)', 'Observações']],
    body: records.map((a) => [
      formatCode(a.code).replace('Nº ', ''),
      formatDate(a.authorization_date),
      formatTime(a.exit_time),
      a.student_name,
      `${a.school_year} ${a.class_group}`,
      REASON_LABEL[a.reason] ?? a.reason,
      a.teacher_name,
      a.notes ?? '',
    ]),
    styles: { ...tableStyle.styles, fontSize: 7.5 },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 52 }, 2: { cellWidth: 32 }, 7: { cellWidth: 90 } },
  });

  // Rodapé com numeração de páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(113, 134, 154);
    const H = doc.internal.pageSize.getHeight();
    doc.text('Uso interno — contém dados pessoais de estudantes (LGPD). Não compartilhar fora da escola.', M, H - 22);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 22, { align: 'right' });
  }

  doc.save(`relatorio-saidas_${start}_a_${end}.pdf`);
}
