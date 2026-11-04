export type CoachTipo = "personal" | "nutricionista" | "fight" | "crossfit";
export type TenantVertical = "personal" | "fight" | "crossfit";

export const COACH_TIPOS: { value: CoachTipo; label: string }[] = [
  { value: "personal", label: "Personal" },
  { value: "nutricionista", label: "Nutricionista" },
  { value: "fight", label: "CT de lutas" },
  { value: "crossfit", label: "CrossFit" },
];

/** Nutricionista usa o mesmo app do personal. */
export function verticalFromTipo(tipo: CoachTipo): TenantVertical {
  return tipo === "nutricionista" ? "personal" : tipo;
}
