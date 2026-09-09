export const EMAILS_LICENCA_VITALICIA = ["bibliotecadigital654@gmail.com"];

export function temLicencaVitalicia(email: string | null | undefined): boolean {
  if (!email) return false;
  return EMAILS_LICENCA_VITALICIA.includes(email.trim().toLowerCase());
}
