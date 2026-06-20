import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useQuotaStore } from '@/stores/quotaStore';
import { seedDepartments } from '@/data/seed';

try {
  useQuotaStore.getState().ensureCurrentMonthQuotas(seedDepartments);
} catch (err) {
  console.warn('月度额度初始化检查失败', err);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
