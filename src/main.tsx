import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try { document.documentElement.dataset.night = localStorage.getItem('jangwon-night-mode') || 'false'; } catch {}
class EventErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="field-paper" style={{ margin: 24 }}><h1>잠시 마법을 고르고 있어요</h1><p>저장된 기록을 지우지 않고 다시 연결할 수 있어요.</p><button className="field-primary" onClick={() => location.reload()}>화면 다시 열기</button><p>계속 어려우면 의상대여 장소의 운영본부로 와 주세요.</p></main> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<EventErrorBoundary><App /></EventErrorBoundary>);
