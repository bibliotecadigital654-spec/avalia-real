export type Licenca = {
  status: string;
  validade: string | null;
  ativa: boolean;
};

const LICENCA_TEMPORARIAMENTE_ATIVA: Licenca = {
  status: "ativo",
  validade: null,
  ativa: true,
};

export function useLicenca(_userId: string | null | undefined) {
  async function recarregar() {}

  return {
    licenca: LICENCA_TEMPORARIAMENTE_ATIVA,
    carregando: false,
    recarregar,
    isAtivo: true,
    statusLicenca: "ativo" as const,
  };
}
