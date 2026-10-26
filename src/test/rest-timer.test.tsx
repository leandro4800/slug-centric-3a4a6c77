import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RestTimerButton } from "@/components/aluno/RestTimerButton";

afterEach(cleanup);

describe("botão de descanso", () => {
  it("abre a versão grande na tela ao iniciar e mostra o tempo restante", () => {
    render(<RestTimerButton seconds={81} />);

    fireEvent.click(screen.getByRole("button", { name: /Descanso 1:21/ }));

    const dialog = screen.getByRole("dialog", { name: "Contagem regressiva do descanso" });
    expect(within(dialog).getByText("1:21")).toBeInTheDocument();
    expect(within(dialog).getByText("Descanso")).toBeInTheDocument();
  });

  it("para a contagem ao tocar em Parar", () => {
    render(<RestTimerButton seconds={81} />);
    fireEvent.click(screen.getByRole("button", { name: /Descanso 1:21/ }));

    const dialog = screen.getByRole("dialog", { name: "Contagem regressiva do descanso" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Parar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descanso 1:21/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("fechar mantém a contagem rodando no botão compacto", () => {
    render(<RestTimerButton seconds={81} />);
    fireEvent.click(screen.getByRole("button", { name: /Descanso 1:21/ }));

    const dialog = screen.getByRole("dialog", { name: "Contagem regressiva do descanso" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descanso 1:21/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
