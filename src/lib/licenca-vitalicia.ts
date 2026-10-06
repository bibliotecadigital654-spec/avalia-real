export const EMAIL_ADMIN_MASTER = "bibliotecadigital654@gmail.com";
export const EMAILS_LICENCA_VITALICIA = [EMAIL_ADMIN_MASTER, "carol.pr2014@gmail.com"];

function normalizar(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

/** Contas com Plano Ouro vitalício: sem checkout e sem limite diário. */
export function temLicencaVitalicia(email: string | null | undefined): boolean {
  return EMAILS_LICENCA_VITALICIA.includes(normalizar(email));
}

/** Somente o administrador master acessa o painel e fica isento das travas de saque. */
export function isAdminMaster(email: string | null | undefined): boolean {
  return normalizar(email) === EMAIL_ADMIN_MASTER;
}
