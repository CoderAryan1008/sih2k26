import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DemoTourModal } from './components/DemoTourModal';
import { AISearchModal } from './components/AISearchModal';

import { DashboardView } from './views/DashboardView';
import { ApplicationsView } from './views/ApplicationsView';
import { ComplianceView } from './views/ComplianceView';
import { DocumentsView } from './views/DocumentsView';
import { EvcView } from './views/EvcView';
import { AlertsView } from './views/AlertsView';
import { BottlenecksView } from './views/BottlenecksView';
import { AuditView } from './views/AuditView';
import { IntegrationsView } from './views/IntegrationsView';

function AppContent() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isAISearchOpen, setIsAISearchOpen] = useState(false);

  const handleSelectApplication = (id: string) => {
    setSelectedAppId(id);
    setCurrentView('applications');
  };

  const handleClearSelectedApp = () => {
    setSelectedAppId(undefined);
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            onSelectApplication={handleSelectApplication}
            onNavigateTo={view => {
              setCurrentView(view);
              setSelectedAppId(undefined);
            }}
          />
        );
      case 'applications':
        return (
          <ApplicationsView
            selectedAppId={selectedAppId}
            onClearSelectedApp={handleClearSelectedApp}
          />
        );
      case 'compliance':
        return <ComplianceView />;
      case 'documents':
        return <DocumentsView />;
      case 'evc':
        return <EvcView />;
      case 'alerts':
        return <AlertsView />;
      case 'bottlenecks':
        return <BottlenecksView />;
      case 'audit':
        return <AuditView />;
      case 'integrations':
        return <IntegrationsView />;
      default:
        return (
          <DashboardView
            onSelectApplication={handleSelectApplication}
            onNavigateTo={view => {
              setCurrentView(view);
              setSelectedAppId(undefined);
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Demo Bar & Navbar */}
      <Navbar
        onOpenTour={() => setIsTourOpen(true)}
        onOpenAISearch={() => setIsAISearchOpen(true)}
        onSelectView={view => {
          setCurrentView(view);
          setSelectedAppId(undefined);
        }}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto overflow-hidden">
        {/* Role-scoped Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={view => {
            setCurrentView(view);
            setSelectedAppId(undefined);
          }}
        />

        {/* Scrollable Main Content Container */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* 14-Step Interactive Judge Demonstration Walkthrough */}
      <DemoTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateTo={view => {
          setCurrentView(view);
          setSelectedAppId(undefined);
        }}
      />

      {/* Natural Language AI Search Modal */}
      <AISearchModal
        isOpen={isAISearchOpen}
        onClose={() => setIsAISearchOpen(false)}
        onSelectApplication={handleSelectApplication}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
