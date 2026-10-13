// Maps the hackathon problem statement (Use Case 2) to what the app does, so judges can check coverage at a glance.
const questions = [
  { q: 'Has the ambulance deviated from its planned route?', a: 'Distance + heading bands (50 / 100 / 250 m) with a 3-fix GPS stability window.' },
  { q: 'What caused the deviation?', a: 'Reason codes from nearby incidents, traffic level and corridor status, e.g. CRITICAL_INCIDENT, HEAVY_TRAFFIC.' },
  { q: 'How much delay is expected?', a: 'Predicted vs. baseline ETA, with each factor labelled observed, derived, inferred or unknown.' },
  { q: 'What is the best alternative route?', a: 'Road-following alternatives scored on ETA, traffic and incidents; must save at least 2 minutes.' },
  { q: 'Should another ambulance be dispatched?', a: 'CONSIDER_BACKUP when a unit within 10 km is at least 5 minutes faster. The operator decides.' },
]

const objectives = [
  ['A', 'Monitor trajectories in real time', 'Live GPS ingest + Socket.IO map updates'],
  ['B', 'Detect route deviations', 'Corridor deviation engine'],
  ['C', 'Identify likely causes', 'Incident, traffic and corridor correlation'],
  ['D', 'Predict delays and ETA', 'Prediction with evidence per factor'],
  ['E', 'Recommend alternative routes', 'Deterministic rules + operator approval'],
  ['F', 'Natural-language explanations', 'GeoAgent AI, read-only tools, rule-based fallback'],
  ['G', 'Interactive map visualisation', 'Leaflet: planned, actual and recommended routes'],
]

export function UseCaseCoverage() {
  return (
    <section className="bg-background py-16 sm:py-24 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Built for Use Case 2</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">
          The five questions a control room asks, answered live
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          A GeoAgentic framework for emergency vehicle movement in urban cities. Rules decide, AI explains, and a human approves every change.
        </p>

        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {questions.map(({ q, a }, i) => (
            <li key={q} className="rounded-2xl border border-border bg-card/60 p-6 dark:bg-card/40">
              <span className="font-mono text-xs text-primary">Q{i + 1}</span>
              <h3 className="mt-2 font-semibold text-foreground">{q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Problem statement objectives and how SwiftCare covers them</caption>
            <thead className="bg-card/60 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Objective</th>
                <th scope="col" className="px-4 py-3">Requirement</th>
                <th scope="col" className="px-4 py-3">How SwiftCare does it</th>
              </tr>
            </thead>
            <tbody>
              {objectives.map(([id, req, how]) => (
                <tr key={id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{req}</td>
                  <td className="px-4 py-3 text-muted-foreground">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
