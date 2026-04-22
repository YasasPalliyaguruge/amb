import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Readonly<Props>;

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg p-6 text-center">
          <div className="glass-panel max-w-lg w-full rounded-[2rem] p-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-brand-primary/70">
              Application Recovery
            </p>
            <h2 className="mb-4 text-3xl font-bold text-brand-text">
              Something interrupted the session
            </h2>
            <p className="mb-3 text-brand-text/70">
              The page hit an unexpected problem. Refresh to retry, and if it continues, check the recent console logs for the detailed error trace.
            </p>
            {import.meta.env.DEV && (
              <pre className="mb-6 max-h-40 overflow-auto rounded-xl bg-brand-bg p-4 text-left text-xs text-brand-text/60 whitespace-pre-wrap">
                {this.state.error?.message}
              </pre>
            )}
            <button
              className="px-6 py-2 bg-brand-primary text-white rounded-full font-medium hover:bg-brand-primary/90 transition-colors"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
