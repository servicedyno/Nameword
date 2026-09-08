import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // We need to use a functional component wrapper to access hooks
      return <ErrorBoundaryContent error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

const ErrorBoundaryContent = ({ error, errorInfo }) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t.common.errorBoundary.somethingWentWrong}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t.common.errorBoundary.sorryMessage}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="btn-blue w-full"
          >
            {t.common.errorBoundary.refreshPage}
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="btn-outline w-full"
          >
            {t.common.errorBoundary.goToHome}
          </button>
        </div>

        {import.meta.env.DEV && error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              {t.common.errorBoundary.errorDetails}
            </summary>
            <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-gray-800 dark:text-gray-200 overflow-auto">
              <div className="mb-2">
                <strong>{t.common.errorBoundary.error}</strong>
                <pre className="mt-1">{error.toString()}</pre>
              </div>
              <div>
                <strong>{t.common.errorBoundary.stackTrace}</strong>
                <pre className="mt-1">{errorInfo?.componentStack}</pre>
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorBoundary; 