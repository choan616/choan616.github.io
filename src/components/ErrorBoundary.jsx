import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-100 border border-red-400 text-red-700 rounded">
          <h2 className="text-2xl font-bold mb-4">Something went wrong.</h2>
          <p className="text-lg mb-2">We are sorry, but an error occurred.</p>
          {/* Optionally display error details for debugging */}
          <details className="text-sm text-gray-700 cursor-pointer">
            <summary>Click to see error details</summary>
            <pre className="mt-2 p-2 bg-red-50 border border-red-200 rounded overflow-x-auto">
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => window.location.reload()} // Option to reload the page
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
