export function SectionTitle({ title }: { index?: string; title: string }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
    </div>
  );
}
