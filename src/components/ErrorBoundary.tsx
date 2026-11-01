import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full bg-card border rounded-2xl p-6 shadow-xl text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred while loading this page."}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => window.location.href = "/"}
                className="flex items-center gap-1.5"
              >
                <Home className="h-4 w-4" /> Go Home
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4" /> Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
