import React from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

const Layout = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-accent selection:text-white overflow-x-hidden">
      {/* Global Background Elements */}
      <div className="fixed inset-0 bg-grid z-0 pointer-events-none opacity-[0.4]"></div>
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 z-0 pointer-events-none"></div>
      
      <div className="relative z-10">
        <TopBar />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;