import { Eye, Printer } from 'lucide-react';
import type { Authorization } from '../../types/database';
import { IconButton } from '../ui/Button';
import { ReasonBadge } from '../ui/Misc';
import { formatCode, formatDate, formatTime } from '../../lib/format';

interface Props {
  rows: Authorization[];
  onOpen: (a: Authorization) => void;
  onPrint?: (a: Authorization) => void;
  compact?: boolean;
}

export function AuthorizationTable({ rows, onOpen, onPrint, compact }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-left text-[14px] ${compact ? 'min-w-[620px]' : 'min-w-[860px]'}`}>
        <thead>
          <tr className="border-b border-divider bg-[#fbfcfd] text-[11.5px] font-bold tracking-[0.06em] text-muted uppercase">
            <th className="py-3 pr-3 pl-7 font-bold">Data e hora</th>
            <th className="px-3 py-3 font-bold">Aluno(a)</th>
            <th className="px-3 py-3 font-bold">Turma</th>
            <th className="px-3 py-3 font-bold">Motivo</th>
            {!compact && <th className="px-3 py-3 font-bold">Professor(a)</th>}
            <th className="py-3 pr-7 pl-3 text-right font-bold">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr
              key={a.id}
              onClick={() => onOpen(a)}
              className="cursor-pointer border-b border-divider/80 transition last:border-b-0 hover:bg-[#f6f9fc]"
            >
              <td className="py-3.5 pr-3 pl-7 whitespace-nowrap">
                <span className="font-semibold text-ink">{formatDate(a.authorization_date)}</span>
                <span className="ml-2 rounded-md bg-canvas px-1.5 py-0.5 text-[12.5px] font-semibold text-label tabular-nums">
                  {formatTime(a.exit_time)}
                </span>
              </td>
              <td className="max-w-[320px] px-3 py-3.5">
                <p className="truncate font-semibold text-[#0f172a]" title={a.student_name}>
                  {a.student_name}
                </p>
                <p className="text-[12px] text-faint">{formatCode(a.code)}</p>
              </td>
              <td className="px-3 py-3.5 whitespace-nowrap text-body">
                {a.school_year} <span className="font-bold text-ink">{a.class_group}</span>
              </td>
              <td className="px-3 py-3.5">
                <ReasonBadge reason={a.reason} />
              </td>
              {!compact && (
                <td className="max-w-[240px] truncate px-3 py-3.5 text-body" title={a.teacher_name}>
                  {a.teacher_name}
                </td>
              )}
              <td className="py-3.5 pr-7 pl-3">
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <IconButton label="Ver detalhes" onClick={() => onOpen(a)}>
                    <Eye className="h-[18px] w-[18px]" />
                  </IconButton>
                  {onPrint && (
                    <IconButton label="Imprimir autorização" onClick={() => onPrint(a)}>
                      <Printer className="h-[18px] w-[18px]" />
                    </IconButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
