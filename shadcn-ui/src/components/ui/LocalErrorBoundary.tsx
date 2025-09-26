import React from 'react';

interface LocalErrorBoundaryState {
  hasError: boolean;
}

class LocalErrorBoundary extends React.Component<React.PropsWithChildren<object>, LocalErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): LocalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by LocalErrorBoundary:", error, errorInfo.componentStack);
    // Log error details to an external service or display more detailed information
    alert(`An error occurred: ${error.message}`);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default LocalErrorBoundary;