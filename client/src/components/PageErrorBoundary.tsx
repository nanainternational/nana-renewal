import { Component, type ErrorInfo, type ReactNode } from "react";

export default class PageErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page rendering failed", window.location.pathname, error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
        <h1 className="text-xl font-bold">페이지를 불러오지 못했습니다.</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
        <button className="rounded-md border px-5 py-3" onClick={() => window.location.reload()}>다시 불러오기</button>
        <a href="/" className="underline">홈으로 이동</a>
      </main>
    );
  }
}
