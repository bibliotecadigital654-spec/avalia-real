export function mensagemAuth(err: unknown): string {
  const bruto = err instanceof Error ? err.message : String(err ?? "");
  const m = bruto.toLowerCase();

  if (m.includes("weak") || m.includes("pwned") || m.includes("easy to guess")) {
    return "Essa senha é muito comum e foi recusada. Use uma senha diferente, com letras, números e um símbolo.";
  }
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) {
    return "Já existe uma conta com esse e-mail. Tente entrar.";
  }
  if (m.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Veja o link que enviamos.";
  }
  if (m.includes("password should be at least") || m.includes("at least 6")) {
    return "A senha precisa de ao menos 6 caracteres.";
  }
  if (m.includes("invalid email") || m.includes("unable to validate email")) {
    return "E-mail inválido.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo.";
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  }
  return bruto || "Não foi possível continuar.";
}
