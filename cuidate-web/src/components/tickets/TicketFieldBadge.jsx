import { getTicketEstadoDisplay, getTicketPrioridadDisplay } from '../../utils/ticketDisplay';

function ToneBadge({ tone, children }) {
  return <span className={`ticket-tone-badge ticket-tone-badge--${tone}`}>{children}</span>;
}

export function TicketEstadoBadge({ estado }) {
  const { label, tone } = getTicketEstadoDisplay(estado);
  return <ToneBadge tone={tone}>{label}</ToneBadge>;
}

export function TicketPrioridadBadge({ prioridad }) {
  const { label, tone } = getTicketPrioridadDisplay(prioridad);
  return <ToneBadge tone={tone}>{label}</ToneBadge>;
}
