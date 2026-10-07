import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import StageShell, { needsStage } from './components/StageShell';

// フォントは同梱（オフライン動作のため CDN を使わない）
import '@fontsource/mochiy-pop-one/400.css';
// まるゴシックは出題文字（900）と見本（400）でしか使わないので、その2つだけ入れる
import '@fontsource/zen-maru-gothic/400.css';
import '@fontsource/zen-maru-gothic/900.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/700.css';
import '@fontsource/noto-sans-jp/900.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 表示領域が低いとき（Windows の文字の大きさを最大にしたときなど）は、広い仮の画面に描いて縮める。
// 読みこんだときに決める（途中で切り替えると、遊んでいる途中の状態が消えるため）
const staged = needsStage();
if (staged) document.body.style.overflow = 'hidden';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {staged ? <StageShell /> : <App />}
  </React.StrictMode>
);