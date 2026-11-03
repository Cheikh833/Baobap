/** Valeur pour <input type="date"> (dates stockées en UTC minuit). */
export const toDateInput = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
export const joinList = (a: string[] | null | undefined) => (a ?? []).join(", ");
