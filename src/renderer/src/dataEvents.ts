type DataEventType =
  | "bills"
  | "auto-bills"
  | "notes"
  | "payments"
  | "invoices"
  | "tax"
  | "contacts"
  | "reminders"
  | "transactions";

type Listener = () => void;

const listeners = new Map<DataEventType, Set<Listener>>();

export function onDataChange(event: DataEventType, listener: Listener): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(listener);

  // Return unsubscribe function
  return () => {
    listeners.get(event)?.delete(listener);
  };
}

export function emitDataChange(event: DataEventType): void {
  listeners.get(event)?.forEach((fn) => fn());
}
