import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
          <h1 className="text-xl font-bold mb-4">Ops! Algo deu errado.</h1>
          <p className="text-sm text-zinc-400 mb-6">O aplicativo encontrou um erro inesperado.</p>
          <button
            onClick={() => window.location.href = "/login"}
            className="px-6 py-2 bg-primary rounded-full text-white font-medium"
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
