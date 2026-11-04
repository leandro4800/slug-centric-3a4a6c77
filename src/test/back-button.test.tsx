import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, afterEach } from "vitest";
import BackHandler from "@/components/BackHandler";
import { useOwnBackButton } from "@/hooks/use-own-back-button";

/** Tela que desenha a própria seta de voltar (ex.: PageHeader). */
function TelaComSetaPropria() {
  useOwnBackButton();
  return <div>tela com seta própria</div>;
}

function renderAt(path: string, withOwnBack: boolean) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/:slug/app"
          element={
            <>
              <div>home</div>
              <BackHandler />
            </>
          }
        />
        <Route
          path="/:slug/app/dieta"
          element={
            <>
              {withOwnBack ? <TelaComSetaPropria /> : <div>conteúdo da dieta</div>}
              <BackHandler />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("seta de voltar", () => {
  it("mostra a seta flutuante quando a tela não tem a própria seta", () => {
    renderAt("/ct-alphacoach/app/dieta", false);
    expect(screen.getByLabelText("Voltar")).toBeTruthy();
  });

  it("esconde a seta flutuante quando a tela já mostra a própria seta", () => {
    renderAt("/ct-alphacoach/app/dieta", true);
    expect(screen.queryByLabelText("Voltar")).toBeNull();
  });

  it("volta a mostrar a seta flutuante quando a tela com seta própria sai", () => {
    const { rerender } = renderAt("/ct-alphacoach/app/dieta", true);
    expect(screen.queryByLabelText("Voltar")).toBeNull();

    rerender(
      <MemoryRouter initialEntries={["/ct-alphacoach/app/dieta"]}>
        <Routes>
          <Route
            path="/:slug/app"
            element={
              <>
                <div>home</div>
                <BackHandler />
              </>
            }
          />
          <Route
            path="/:slug/app/dieta"
            element={
              <>
                <div>conteúdo da dieta</div>
                <BackHandler />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Voltar")).toBeTruthy();
  });

  it("não mostra a seta flutuante na home", () => {
    renderAt("/ct-alphacoach/app", false);
    expect(screen.queryByLabelText("Voltar")).toBeNull();
  });
});
