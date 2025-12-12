import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error tracking service here if needed
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full border-l-4 border-red-500">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-4xl">⚠️</span>
              <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
            </div>

            <p className="text-gray-600 mb-4">
              We encountered an unexpected error. Our team has been notified.
            </p>

            {process.env.REACT_APP_DEBUG_MODE === 'true' && (
              <details className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                <summary className="cursor-pointer font-semibold text-gray-700">
                  Error Details (Debug Mode)
                </summary>
                <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-40">
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}

            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                🔄 Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                🏠 Go Home
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              If the problem persists, please contact support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
