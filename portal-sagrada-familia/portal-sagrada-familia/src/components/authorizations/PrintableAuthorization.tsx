import { createPortal } from 'react-dom';
import type { Authorization } from '../../types/database';
import { REASON_LABEL } from '../../lib/constants';
import { formatCode, formatDate, formatDateTime, formatTime } from '../../lib/format';

/** Documento de autorização em A4, usado apenas na impressão. */
export function PrintableAuthorization({ item }: { item: Authorization }) {
  const rows: [string, string][] = [
    ['Aluno(a)', item.student_name],
    ['Ano escolar / turma', `${item.school_year} — Turma ${item.class_group}`],
    ['Data', formatDate(item.authorization_date)],
    ['Horário da saída', formatTime(item.exit_time)],
    ['Motivo da saída', REASON_LABEL[item.reason] ?? item.reason],
    ['Professor(a) responsável', item.teacher_name],
  ];

  return createPortal(
    <div id="print-root" className="hidden print:block">
      <article className="print-sheet mx-auto font-sans text-[#0f172a]">
        <header className="flex items-center justify-between border-b-2 border-[#173c6c] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#173c6c] text-white" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
              <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 19.5V8.7L12 4l8 4.7v10.8" />
                <path d="M2.5 20h19M8 20v-6h8v6M8 10h.01M12 10h.01M16 10h.01" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#52708f] uppercase">Portal Sagrada Família</p>
              <p className="text-[15px] font-semibold text-[#173c6c]">Controle de circulação</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#65788b]">Registro</p>
            <p className="text-lg font-bold text-[#173c6c]">{formatCode(item.code)}</p>
          </div>
        </header>

        <h1 className="mt-8 text-[24px] font-bold tracking-[-0.02em] text-[#173c6c]">Autorização para saída de sala de aula</h1>

        <table className="mt-6 w-full border-collapse text-[14px]">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-[#d4dfeb]">
                <th className="w-[38%] py-3 pr-4 text-left font-semibold text-[#334e68]">{k}</th>
                <td className="py-3 font-medium">{v}</td>
              </tr>
            ))}
            <tr className="border-b border-[#d4dfeb]">
              <th className="py-3 pr-4 text-left align-top font-semibold text-[#334e68]">Observações</th>
              <td className="py-3 whitespace-pre-wrap">{item.notes || '—'}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-20 grid grid-cols-2 gap-14 text-center text-[12px] text-[#405a73]">
          <div className="border-t border-[#334e68] pt-2">Assinatura do(a) professor(a)</div>
          <div className="border-t border-[#334e68] pt-2">Visto da coordenação / setor</div>
        </div>

        <footer className="mt-16 border-t border-[#e7edf3] pt-3 text-[10.5px] leading-4 text-[#71869a]">
          Registrado em {formatDateTime(item.created_at)}. Documento de uso interno da escola. Contém dados pessoais de
          estudante — não compartilhar fora da escola (LGPD, Lei nº 13.709/2018).
        </footer>
      </article>
    </div>,
    document.body,
  );
}
