// ============================================================
// src/components/ui/ErrorBoundary.tsx
// ============================================================
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Aqui integraria com Sentry/DataDog/etc
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.reset);
      }
      if (this.props.fallback) return this.props.fallback;
      return <DefaultErrorFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

// ============================================================
// Default error fallback
// ============================================================
function DefaultErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center" role="alert">
      <div className="w-16 h-16 mb-4 text-red-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Algo deu errado
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
        {error.message || 'Ocorreu um erro inesperado. Tente novamente.'}
      </p>
      <button
        onClick={onReset}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
                   transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Tentar novamente
      </button>
    </div>
  );
}

// ============================================================
// src/components/ui/ErrorState.tsx — Inline error state
// ============================================================
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = 'Erro ao carregar dados',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`} role="alert">
      <p className="text-gray-600 dark:text-gray-400 mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary-600 hover:text-primary-700 underline"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// ============================================================
// src/components/ui/EmptyState.tsx
// ============================================================
interface EmptyStateProps {
  message?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  message = 'Nenhum resultado encontrado',
  description,
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{message}</p>
      {description && (
        <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
