import { createFileRoute, redirect } from "@tanstack/react-router";

// O mural externo foi removido: quem acessar este endereço vai para a Home.
export const Route = createFileRoute("/_authenticated/ofertas")({
  beforeLoad: () => {
    throw redirect({ to: "/tarefas" });
  },
});
