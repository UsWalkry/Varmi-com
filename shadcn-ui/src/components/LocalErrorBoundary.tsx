import React from 'react';

interface LocalErrorBoundaryState {
  hasError: boolean;
}

class LocalErrorBoundary extends React.Component<React.PropsWithChildren<Record<string, never>>, LocalErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<Record<string, never>>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): LocalErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by LocalErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default LocalErrorBoundary;