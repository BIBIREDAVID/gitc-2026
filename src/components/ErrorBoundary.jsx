import { Component } from 'react';
import './ErrorBoundary.css';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-boundary-page">
        <div className="error-boundary-card">
          <p className="mono-label">Something went wrong</p>
          <h1>This page hit a snag</h1>
          <p>
            Sorry about that — please try reloading. If it keeps happening, check your
            connection and try again in a moment.
          </p>
          <button type="button" className="btn-primary" onClick={this.handleReload}>
            Back to the homepage
          </button>
        </div>
      </div>
    );
  }
}
