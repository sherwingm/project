import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import SharedGroupPage from './pages/SharedGroupPage';
import './locales';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/share/:groupId/member/:memberId" element={<SharedGroupPage />} />
          <Route path="/share/:groupId" element={<SharedGroupPage />} />
          <Route path="/share/:groupId/join" element={<App />} />
          <Route path="/join/:groupId" element={<App />} />
          <Route path="*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
