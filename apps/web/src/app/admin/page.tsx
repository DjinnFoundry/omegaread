import { redirect } from 'next/navigation';
import { getCurrentAdmin, loginAdmin, logoutAdmin } from '@/server/admin-auth';
import { obtenerAdminDashboard, type AdminDashboardData } from '@/server/actions/admin-actions';

const COHORT_COLORS = ['#0F766E', '#B45309', '#B91C1C', '#1D4ED8'];

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatUsd(value: number | null): string {
  if (value === null) return 'No configurado';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 1 ? 2 : 4,
    maximumFractionDigits: 6,
  }).format(value);
}

function percentage(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(1)}%`;
}

function retentionCellClass(rate: number | null): string {
  if (rate === null) return 'bg-neutro/10 text-texto-suave';
  if (rate >= 45) return 'bg-acierto/20 text-bosque';
  if (rate >= 25) return 'bg-amarillo/25 text-texto';
  return 'bg-coral/20 text-coral';
}

function StoriesBarChart({ data }: { data: AdminDashboardData['storiesByDay'] }) {
  const total = data.reduce((acc, item) => acc + item.stories, 0);
  const maxStories = Math.max(1, ...data.map((item) => item.stories));
  const allZero = total === 0;
  const tickIndexes = new Set([0, Math.floor(data.length / 2), data.length - 1]);

  return (
    <div className="rounded-3xl border border-neutro/20 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-texto">Historias generadas por dia (30 dias)</h3>
        <span className="font-datos text-xs text-texto-suave">
          Total 30 dias: <span className="font-semibold text-texto">{total}</span>
        </span>
      </div>

      {allZero ? (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-fondo/70">
          <p className="text-sm text-texto-suave">Sin historias en los ultimos 30 dias</p>
        </div>
      ) : (
        <div className="flex h-40 items-end gap-1 rounded-2xl bg-fondo/70 px-3 py-2">
          {data.map((item, idx) => (
            <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center justify-end">
              {item.stories > 0 && (
                <span className="mb-0.5 text-[9px] font-semibold leading-none text-turquesa">
                  {item.stories}
                </span>
              )}
              <div
                className="w-full rounded-t-md bg-turquesa/80"
                style={{
                  height: item.stories === 0 ? '2px' : `${Math.max(8, (item.stories / maxStories) * 100)}%`,
                  opacity: item.stories === 0 ? 0.15 : 1,
                }}
                title={`${item.date}: ${item.stories} historias, ${item.totalTokens} tokens`}
              />
              <span className="mt-1 text-[10px] text-texto-suave">
                {tickIndexes.has(idx) ? formatShortDate(item.date) : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompletionRateChart({ data }: { data: AdminDashboardData['completionByDay'] }) {
  const rates = data
    .map((item) => item.completionRate)
    .filter((value): value is number => value !== null);

  if (rates.length === 0) {
    return (
      <div className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-texto">% completitud diario</h3>
        <p className="mt-2 text-sm text-texto-suave">
          Aun no hay dias con historias generadas para calcular completitud.
        </p>
      </div>
    );
  }

  const width = 760;
  const height = 260;
  const left = 44;
  const right = 18;
  const top = 20;
  const bottom = 34;
  const maxRate = Math.max(100, ...rates);
  const yTicks = [0, 25, 50, 75, 100].filter((tick) => tick <= maxRate);
  if (!yTicks.includes(maxRate)) yTicks.push(maxRate);

  const spanX = Math.max(1, data.length - 1);
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const toX = (idx: number) => left + (idx / spanX) * chartWidth;
  const toY = (value: number) => top + ((maxRate - value) / maxRate) * chartHeight;
  const xTickIndexes = new Set([0, Math.floor(data.length / 2), data.length - 1]);

  const connectedPoints = data
    .map((point, idx) => (point.completionRate !== null ? `${toX(idx)},${toY(point.completionRate)}` : null))
    .filter((p): p is string => p !== null)
    .join(' ');

  return (
    <div className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-texto">% completitud diario</h3>
        <span className="text-xs text-texto-suave">
          Formula: lecturas completadas / historias generadas
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                {Math.round(tick)}%
              </text>
            </g>
          );
        })}

        {connectedPoints && (
          <polyline
            fill="none"
            stroke="#0F766E"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={connectedPoints}
          />
        )}

        {data.map((point, idx) => {
          if (point.completionRate === null) return null;
          return (
            <circle
              key={point.date}
              cx={toX(idx)}
              cy={toY(point.completionRate)}
              r="3.5"
              fill="#0F766E"
            />
          );
        })}

        {data.map((point, idx) => {
          if (!xTickIndexes.has(idx)) return null;
          return (
            <text
              key={`tick-${point.date}`}
              x={toX(idx)}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {formatShortDate(point.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function RetentionByCohortTable({ data }: { data: AdminDashboardData['retentionByCohort'] }) {
  const cohorts = data.cohorts.slice(0, 8);

  if (cohorts.length === 0) {
    return (
      <div className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-texto">Retencion por cohorte (guiding star)</h3>
        <p className="mt-2 text-sm text-texto-suave">
          Aun no hay datos para calcular retencion D1/D7/D30.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-texto">Retencion por cohorte (guiding star)</h3>
        <p className="mt-1 text-xs text-texto-suave">
          Ancla: primera lectura completada. Cohorte: mes de registro.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutro/20 text-left text-xs uppercase text-texto-suave">
              <th className="py-2">Cohorte</th>
              <th className="py-2">Ninos</th>
              <th className="py-2">Activados</th>
              <th className="py-2">D1</th>
              <th className="py-2">D7</th>
              <th className="py-2">D30</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort.cohort} className="border-b border-neutro/10">
                <td className="py-2 font-semibold text-texto">{cohort.cohort}</td>
                <td className="py-2 text-texto">{cohort.students}</td>
                <td className="py-2 text-texto">
                  {cohort.activatedStudents}
                  <span className="ml-1 text-xs text-texto-suave">
                    ({cohort.students > 0 ? Math.round((cohort.activatedStudents / cohort.students) * 100) : 0}%)
                  </span>
                </td>
                <td className="py-2">
                  <span className={`inline-flex rounded-xl px-2 py-1 text-xs font-semibold ${retentionCellClass(cohort.d1.rate)}`}>
                    {percentage(cohort.d1.rate)} ({cohort.d1.retained}/{cohort.d1.eligible})
                  </span>
                </td>
                <td className="py-2">
                  <span className={`inline-flex rounded-xl px-2 py-1 text-xs font-semibold ${retentionCellClass(cohort.d7.rate)}`}>
                    {percentage(cohort.d7.rate)} ({cohort.d7.retained}/{cohort.d7.eligible})
                  </span>
                </td>
                <td className="py-2">
                  <span className={`inline-flex rounded-xl px-2 py-1 text-xs font-semibold ${retentionCellClass(cohort.d30.rate)}`}>
                    {percentage(cohort.d30.rate)} ({cohort.d30.retained}/{cohort.d30.eligible})
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CohortLineChart({ data }: { data: AdminDashboardData['comprehensionByCohort'] }) {
  if (data.cohorts.length === 0) {
    return (
      <div className="rounded-3xl border border-neutro/20 bg-white p-4">
        <h3 className="text-sm font-bold text-texto">Comprension media por cohorte</h3>
        <p className="mt-2 text-sm text-texto-suave">
          Aun no hay suficientes sesiones con respuestas para trazar cohortes.
        </p>
      </div>
    );
  }

  const width = 760;
  const height = 280;
  const left = 44;
  const right = 18;
  const top = 20;
  const bottom = 36;
  const spanX = Math.max(1, data.weeks.length - 1);
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const toX = (idx: number) => left + (idx / spanX) * chartWidth;
  const toY = (value: number) => top + ((100 - value) / 100) * chartHeight;

  const yTicks = [100, 75, 50, 25, 0];
  const xTickIndexes = new Set([0, Math.floor(data.weeks.length / 2), data.weeks.length - 1]);

  return (
    <div className="rounded-3xl border border-neutro/20 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-texto">Comprension media por cohorte de registro</h3>
        <span className="text-xs text-texto-suave">Ventana: ultimas {data.weeks.length} semanas</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                {tick}
              </text>
            </g>
          );
        })}

        {data.cohorts.map((cohort, cohortIdx) => {
          const color = COHORT_COLORS[cohortIdx % COHORT_COLORS.length];
          const segments: string[] = [];
          let current: string[] = [];

          cohort.points.forEach((point, idx) => {
            if (point.avgComprehension === null) {
              if (current.length > 1) segments.push(current.join(' '));
              current = [];
              return;
            }
            current.push(`${toX(idx)},${toY(point.avgComprehension)}`);
          });

          if (current.length > 1) {
            segments.push(current.join(' '));
          }

          return (
            <g key={cohort.cohort}>
              {segments.map((segment, segmentIdx) => (
                <polyline
                  key={`${cohort.cohort}-${segmentIdx}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  points={segment}
                />
              ))}
            </g>
          );
        })}

        {data.weeks.map((week, idx) => {
          if (!xTickIndexes.has(idx)) return null;
          const x = toX(idx);
          return (
            <text key={week} x={x} y={height - 10} textAnchor="middle" fontSize="11" fill="#6b7280">
              {formatShortDate(week)}
            </text>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3">
        {data.cohorts.map((cohort, idx) => (
          <div key={cohort.cohort} className="flex items-center gap-2 text-xs text-texto">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COHORT_COLORS[idx % COHORT_COLORS.length] }}
            />
            <span>Cohorte {cohort.cohort}</span>
            <span className="text-texto-suave">({cohort.students} ninos)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EngagementChart({ data }: { data: AdminDashboardData['engagement'] }) {
  const series = data.series.slice(-14);

  const width = 760;
  const height = 220;
  const left = 36;
  const right = 18;
  const top = 16;
  const bottom = 30;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const maxCount = Math.max(1, ...series.map((d) => Math.max(d.dau, d.wau)));
  const spanX = Math.max(1, series.length - 1);

  const toX = (idx: number) => left + (idx / spanX) * chartWidth;
  const toY = (value: number) => top + ((maxCount - value) / maxCount) * chartHeight;

  const dauPoints = series.map((d, idx) => `${toX(idx)},${toY(d.dau)}`).join(' ');
  const wauPoints = series.map((d, idx) => `${toX(idx)},${toY(d.wau)}`).join(' ');

  const yTicks = [0, Math.round(maxCount / 2), maxCount].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );
  const xTickIndexes = new Set([0, Math.floor(series.length / 2), series.length - 1]);

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                {tick}
              </text>
            </g>
          );
        })}

        {series.length > 1 && (
          <>
            <polyline
              fill="none"
              stroke="#FF6B6B"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={wauPoints}
              strokeDasharray="5 3"
            />
            <polyline
              fill="none"
              stroke="#4ECDC4"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={dauPoints}
            />
          </>
        )}

        {series.map((d, idx) => (
          <g key={d.date}>
            <circle cx={toX(idx)} cy={toY(d.wau)} r="3" fill="#FF6B6B" />
            <circle cx={toX(idx)} cy={toY(d.dau)} r="3.5" fill="#4ECDC4" />
          </g>
        ))}

        {series.map((d, idx) => {
          if (!xTickIndexes.has(idx)) return null;
          return (
            <text
              key={`tick-${d.date}`}
              x={toX(idx)}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
            >
              {formatShortDate(d.date)}
            </text>
          );
        })}
      </svg>

      <div className="mt-1 flex gap-4">
        <div className="flex items-center gap-1.5 text-xs text-texto-suave">
          <span className="inline-block h-2 w-5 rounded-full bg-[#4ECDC4]" />
          DAU (usuarios activos diarios)
        </div>
        <div className="flex items-center gap-1.5 text-xs text-texto-suave">
          <span
            className="inline-block h-0.5 w-5 rounded-full bg-[#FF6B6B]"
            style={{ borderTop: '2px dashed #FF6B6B', backgroundColor: 'transparent' }}
          />
          WAU (usuarios activos semanales)
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ showError }: { showError: boolean }) {
  return (
    <main className="min-h-screen bg-fondo px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-neutro/20 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-texto">Admin ZetaRead</h1>
        <p className="mt-2 text-sm text-texto-suave">
          Acceso interno para metricas operativas. Por ahora usa credenciales basicas.
        </p>

        {showError ? (
          <div className="mt-4 rounded-2xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
            Usuario o password incorrecto.
          </div>
        ) : null}

        <form action={adminLoginAction} className="mt-5 space-y-3">
          <div>
            <label htmlFor="username" className="mb-1 block text-xs font-semibold uppercase text-texto-suave">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full rounded-2xl border border-neutro/25 px-3 py-2 text-sm outline-none focus:border-turquesa"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase text-texto-suave">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-2xl border border-neutro/25 px-3 py-2 text-sm outline-none focus:border-turquesa"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-turquesa px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}

function DashboardScreen({
  username,
  data,
}: {
  username: string;
  data: AdminDashboardData;
}) {
  const recentStories = data.storiesByDay.slice(-7);

  return (
    <main className="min-h-screen bg-fondo px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl border border-neutro/20 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-texto">Panel Admin</h1>
              <p className="text-sm text-texto-suave">
                Usuario: {username} | Actualizado: {new Date(data.generatedAt).toLocaleString('es-ES')}
              </p>
            </div>
            <form action={adminLogoutAction}>
              <button
                type="submit"
                className="rounded-2xl border border-neutro/30 px-4 py-2 text-sm font-semibold text-texto hover:bg-fondo"
              >
                Cerrar sesion
              </button>
            </form>
          </div>


          {!data.totals.pricingConfigured ? (
            <div className="mt-2 rounded-2xl border border-neutro/20 bg-fondo px-3 py-2 text-xs text-texto-suave">
              Coste estimado desactivado. Si quieres verlo, define `LLM_COST_INPUT_USD_PER_1M` y
              `LLM_COST_OUTPUT_USD_PER_1M`.
            </div>
          ) : null}
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-texto-suave">Estudiantes</p>
            <p className="mt-2 font-datos text-3xl font-bold text-texto">{data.totals.students}</p>
          </div>

          <div className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-texto-suave">Historias generadas</p>
            <p className="mt-2 font-datos text-3xl font-bold text-texto">{data.totals.stories}</p>
          </div>

          <div className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-texto-suave">Lecturas completadas</p>
            <p className="mt-2 font-datos text-3xl font-bold text-texto">{data.totals.readingSessions}</p>
          </div>

          <div className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-texto-suave">Completitud media (30d)</p>
            <p className="mt-2 font-datos text-3xl font-bold text-texto">
              {percentage(data.totals.avgCompletionRate30d)}
            </p>
          </div>

          <div className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-texto-suave">Tokens totales</p>
            <p className="mt-2 font-datos text-3xl font-bold text-texto">{data.totals.totalTokens.toLocaleString('es-ES')}</p>
            <div className="mt-2 space-y-0.5 text-xs text-texto-suave">
              <p>
                Input:{' '}
                <span className="font-datos font-semibold text-texto">{data.totals.totalInputTokens.toLocaleString('es-ES')}</span>
              </p>
              <p>
                Output:{' '}
                <span className="font-datos font-semibold text-texto">{data.totals.totalOutputTokens.toLocaleString('es-ES')}</span>
              </p>
              <p className="mt-1 border-t border-neutro/10 pt-1">
                Coste:{' '}
                <span className="font-datos font-semibold text-texto">{formatUsd(data.totals.estimatedCostUsd)}</span>
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <StoriesBarChart data={data.storiesByDay} />

          <div className="rounded-3xl border border-neutro/20 bg-white p-4">
            <h3 className="text-sm font-bold text-texto">Ultimos 7 dias (historias)</h3>
            <div className="mt-3 space-y-2">
              {recentStories.map((item) => (
                <div key={item.date} className="flex items-center justify-between text-sm">
                  <span className="text-texto-suave">{formatDay(item.date)}</span>
                  <span className="font-semibold text-texto">{item.stories}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-fondo p-3 text-xs text-texto-suave">
              Tokens historia: {data.totals.totalStoryTokens.toLocaleString('es-ES')}
              <br />
              Tokens preguntas: {data.totals.totalQuestionTokens.toLocaleString('es-ES')}
              <br />
              Completitud media 30d: {percentage(data.totals.avgCompletionRate30d)}
            </div>
          </div>
        </section>

        <CompletionRateChart data={data.completionByDay} />

        <RetentionByCohortTable data={data.retentionByCohort} />

        <section className="rounded-3xl border border-neutro/20 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-texto">Lecturas por nino</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-neutro/20 text-left text-xs uppercase text-texto-suave">
                  <th className="py-2">Nino</th>
                  <th className="py-2">Registro</th>
                  <th className="py-2">Lecturas</th>
                  <th className="py-2">Comprension media</th>
                  <th className="py-2">Ultima lectura</th>
                </tr>
              </thead>
              <tbody>
                {data.readingsByStudent.map((row) => (
                  <tr key={row.studentId} className="border-b border-neutro/10">
                    <td className="py-2 font-semibold text-texto">{row.nombre}</td>
                    <td className="py-2 text-texto-suave">{formatDay(row.registeredAt)}</td>
                    <td className="py-2 text-texto">{row.totalReadings}</td>
                    <td className="py-2 text-texto">{percentage(row.avgComprehension)}</td>
                    <td className="py-2 text-texto-suave">
                      {row.lastReadingAt ? formatDay(row.lastReadingAt) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
          <div className="rounded-3xl border border-neutro/20 bg-white p-4">
            <h3 className="text-sm font-bold text-texto">Engagement guiding star (DAU / WAU)</h3>
            <p className="mt-1 text-xs text-texto-suave">
              Evento: completar lectura, aunque no haya respuestas.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-fondo p-3">
                <p className="text-xs text-texto-suave">DAU hoy</p>
                <p className="mt-1 font-datos text-2xl font-bold text-texto">{data.engagement.dau}</p>
              </div>
              <div className="rounded-2xl bg-fondo p-3">
                <p className="text-xs text-texto-suave">WAU hoy</p>
                <p className="mt-1 font-datos text-2xl font-bold text-texto">{data.engagement.wau}</p>
              </div>
              <div className="rounded-2xl bg-fondo p-3">
                <p className="text-xs text-texto-suave">Stickiness</p>
                <p className="mt-1 font-datos text-2xl font-bold text-texto">{percentage(data.engagement.dauWauRatio)}</p>
              </div>
            </div>

            <EngagementChart data={data.engagement} />
          </div>

          <CohortLineChart data={data.comprehensionByCohort} />
        </section>
      </div>
    </main>
  );
}

async function adminLoginAction(formData: FormData) {
  'use server';

  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '').trim();

  if (!username || !password) {
    redirect('/admin?error=invalid');
  }

  const result = await loginAdmin(username, password);
  if (!result.ok) {
    redirect('/admin?error=invalid');
  }

  redirect('/admin');
}

async function adminLogoutAction() {
  'use server';
  await logoutAdmin();
  redirect('/admin');
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [admin, params] = await Promise.all([getCurrentAdmin(), searchParams]);

  if (!admin) {
    return <LoginScreen showError={params.error === 'invalid'} />;
  }

  const data = await obtenerAdminDashboard();
  return (
    <DashboardScreen
      username={admin.username}
      data={data}
    />
  );
}
