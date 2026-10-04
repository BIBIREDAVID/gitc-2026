import { BUS_PICKUP_POINTS, BUS_NOTE } from '../config/formOptions';

export default function BusPickup() {
  return (
    <section className="bus-section">
      <h2 className="section-heading">Free bus pickup points</h2>
      <p className="bus-copy">{BUS_NOTE}</p>
      <ul className="bus-list">
        {BUS_PICKUP_POINTS.map((point) => (
          <li className="bus-list-item" key={point.id}>
            <span className="bus-dot" aria-hidden="true" />
            {point.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
