/**
 * Supabase enforces a 6-char minimum password length and won't go lower on
 * the free plan. AMs only know a 4-digit PIN, so we pad it with a fixed
 * prefix before sending it as a "password" to Supabase Auth. The user
 * never sees this — login and onboarding APIs apply the same transform.
 */
export const PIN_PREFIX = "lgt-";

export function passwordFromPin(pin: string): string {
  return `${PIN_PREFIX}${pin}`;
}
