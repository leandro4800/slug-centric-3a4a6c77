import React, { Component, ErrorInfo, ReactNode } from "react";
import { buildTenantLoginPath } from "@/lib/tenant-slug";
import { hardResetAndReload } from "@/lib/app-updater";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
  recovering: boolean;
}

const RECOVER_KEY = "ac_error_recovered_at";

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: null,
    recovering: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || "Erro desconhecido",
      recovering: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    const msg = `${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
    const isStaleBundle =
      msg.includes("dynamically imported module") ||
      msg.includes("failed to fetch") ||
      msg.includes("importing a module script failed") ||
      msg.includes("chunkloaderror") ||
      msg.includes("unexpected token '<'");

    let recentlyRecovered = false;
    try {
      const last = Number(sessionStorage.getItem(RECOVER_KEY) || 0);
      recentlyRecovered = Date.now() - last < 60_000;
    } catch {
      /* storage indisponível */
    }

    if (isStaleBundle && !recentlyRecovered) {
      try {
        sessionStorage.setItem(RECOVER_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      this.setState({ recovering: true });
      void hardResetAndReload();
    }
  }

  private handleManualReset = () => {
    void hardResetAndReload(buildTenantLoginPath());
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
          <h1 className="text-xl font-bold mb-4">
            {this.state.recovering ? "Atualizando o aplicativo…" : "Ops! Algo deu errado."}
          </h1>
          <p className="text-sm text-zinc-400 mb-6">
            {this.state.recovering
              ? "Estamos baixando a versão mais recente. Aguarde um instante."
              : "O aplicativo encontrou um erro inesperado."}
          </p>
          {!this.state.recovering && this.state.errorMessage ? (
            <p className="text-[11px] text-zinc-500 mb-6 max-w-sm break-words font-mono">
              {this.state.errorMessage}
            </p>
          ) : null}
          {!this.state.recovering && (
            <button
              onClick={this.handleManualReset}
              className="px-6 py-2 bg-primary rounded-full text-white font-medium"
            >
              Recarregar Aplicativo
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
