import { roundPoints, totalsFor } from '@uno/engine'
import type { RoundResult } from '@uno/engine'
import { useMessages } from '../i18n/messages'
import { Points } from './Points'

interface Props {
  names: string[]
  results: RoundResult[]
  target: number
}

export function ScoreTable({ names, results, target }: Props) {
  const t = useMessages()
  const totals = totalsFor(results, names.length)
  const best = Math.max(...totals)

  return (
    <div className="flex flex-col gap-1">
      <div className="max-h-[50dvh] overflow-y-auto">
        <table className="w-full table-fixed border-separate [border-spacing:0.25rem]">
          <thead>
            <tr>
              <th className="w-7" aria-label={t.round} />
              {names.map((name, seat) => {
                const leading = best > 0 && totals[seat] === best
                return (
                  <th
                    key={name}
                    scope="col"
                    className={`pixel-box bg-raised px-0.5 py-1.5 font-normal ${
                      leading ? 'shadow-[inset_0_0_0_2px_var(--gold)]' : ''
                    }`}
                  >
                    <span className="block truncate text-xs text-muted">{name}</span>
                    <span className="block font-pixel text-2xl leading-none tabular-nums">
                      {totals[seat]}
                    </span>
                    <span aria-hidden="true" className="mx-1 mt-1 block h-1 bg-line">
                      <span
                        className="block h-full bg-gold"
                        style={{ width: `${Math.min(100, (totals[seat] / target) * 100)}%` }}
                      />
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={index}>
                <th scope="row" className="p-0 font-pixel text-lg font-normal text-muted">
                  {index + 1}
                </th>
                {names.map((name, seat) => (
                  <td key={name} className="p-0">
                    <div
                      className={
                        index === results.length - 1 && result.winner === seat ? 'score-pop round-delta' : ''
                      }
                    >
                      <Points value={roundPoints(result, seat)} block />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">{t.goal(target)}</p>
    </div>
  )
}
