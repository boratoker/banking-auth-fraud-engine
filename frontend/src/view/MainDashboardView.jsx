import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import DashboardOverviewView from './DashboardOverviewView';
import AccountsView from './AccountsView';
import TransferView from './TransferView';
import SecurityView from './SecurityView';
import TransactionsView from './TransactionsView';

const MainDashboardView = ({ userName, email, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverviewView userName={userName} onNavigate={setActiveTab} />;
      case 'accounts':
        return <AccountsView />;
      case 'transfer':
        return <TransferView />;
      case 'security':
        return <SecurityView />;
      case 'transactions':
        return <TransactionsView />;
      default:
        return <DashboardOverviewView userName={userName} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="main-dashboard-wrapper">
      <Navbar 
        userName={userName} 
        email={email} 
        onLogout={onLogout} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRiskScore={98}
      />
      <div className="dashboard-body">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="dashboard-content">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default MainDashboardView;
