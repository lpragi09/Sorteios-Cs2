// Contas Google (e-mail em minúsculas) com acesso ao painel admin.
export const ADMIN_EMAILS = ["soarescscontato@gmail.com", "lpmragi@gmail.com"];

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
