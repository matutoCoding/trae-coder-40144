import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { SchedulePage } from '@/pages/SchedulePage';
import { RecurringPage } from '@/pages/RecurringPage';
import { QuotaPage } from '@/pages/QuotaPage';
import { ExpensePage } from '@/pages/ExpensePage';

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/schedule" replace />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/quota" element={<QuotaPage />} />
          <Route path="/expense" element={<ExpensePage />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
