export function mascararCpf(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function cpfValido(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) {
      soma += Number(d[i]) * (tamanho + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 || resto === 11 ? 0 : resto;
  };

  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}
