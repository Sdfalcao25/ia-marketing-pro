export function StatCard({ label, value }: { label:string; value:string|number }) {
  return <div className="card stat"><span>{label}</span><strong>{value}</strong></div>;
}
