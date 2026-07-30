import React, { Component, ErrorInfo, ReactNode } from "react";
import { buildTenantLoginPath } from "@/lib/tenant-slug";
import { hardResetAndReload } from "@/lib/app-updater";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  recovering: boolean;
}

const RECOVER_KEY = "ac_error_recovered_at";

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    recovering: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, recovering: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Erros típicos de "shell antiga" em PWA instalado (bundle/chunk defasado).
    // Nesses casos limpamos caches e recarregamos automaticamente uma única vez.
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
