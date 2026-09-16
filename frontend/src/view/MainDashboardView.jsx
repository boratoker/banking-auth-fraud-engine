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
  const [transferPrefill, setTransferPrefill] = useState(null);
  const [transactionsFilter, setTransactionsFilter] = useState('');

  const handleNavigate = (tab, extra = {}) => {
    if (extra.transferPrefill) {
      setTransferPrefill(extra.transferPrefill);
    }
    if (extra.transactionsFilter !== undefined) {
      setTransactionsFilter(extra.transactionsFilter);
    }
    setActiveTab(tab);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverviewView userName={userName} onNavigate={setActiveTab} />;
      case 'accounts':
        return <AccountsView />;
      case 'transfer':
        return (
          <TransferView 
            initialRecipient={transferPrefill?.recipientName}
            initialIban={transferPrefill?.recipientIban}
          />
        );
      case 'security':
        return <SecurityView />;
      case 'transactions':
        return (
          <TransactionsView 
            initialSearchTerm={transactionsFilter}
          />
        );
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
        onNavigate={handleNavigate}
      />
      <div className="dashboard-body">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            // When switching tabs manually via sidebar, clear one-off search prefill
            if (tab !== 'transfer') setTransferPrefill(null);
            if (tab !== 'transactions') setTransactionsFilter('');
            setActiveTab(tab);
          }} 
        />
        <main className="dashboard-content">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default MainDashboardView;
