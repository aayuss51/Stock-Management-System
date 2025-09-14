import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Users, 
  FolderOpen, 
  AlertTriangle, 
  TrendingUp,
  DollarSign,
  Activity,
  Camera
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import QuickInventoryUpdate from '../components/QuickInventoryUpdate';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/reports/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Items',
      value: dashboardData?.overview?.totalItems || 0,
      icon: Package,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Low Stock Items',
      value: dashboardData?.overview?.lowStockItems || 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: '-3%',
      changeType: 'negative'
    },
    {
      name: 'Total Suppliers',
      value: dashboardData?.overview?.totalSuppliers || 0,
      icon: Users,
      color: 'bg-green-500',
      change: '+5%',
      changeType: 'positive'
    },
    {
      name: 'Active Projects',
      value: dashboardData?.overview?.activeProjects || 0,
      icon: FolderOpen,
      color: 'bg-purple-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: 'Total Inventory Value',
      value: `$${dashboardData?.overview?.totalValue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: '+15%',
      changeType: 'positive'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your construction stock management system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="sr-only">
                          {stat.changeType === 'positive' ? 'Increased' : 'Decreased'} by
                        </span>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {dashboardData?.recentTransactions?.length > 0 ? (
              dashboardData.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      transaction.type === 'in' ? 'bg-green-500' : 
                      transaction.type === 'out' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{transaction.item_name}</p>
                      <p className="text-xs text-gray-500">{transaction.item_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      transaction.type === 'in' ? 'text-green-600' : 
                      transaction.type === 'out' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {transaction.type === 'in' ? '+' : '-'}{transaction.quantity}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent transactions</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => setShowQuickUpdate(true)}
              className="w-full btn-primary text-left"
            >
              <Camera className="inline h-4 w-4 mr-2" />
              Quick Inventory Update
            </button>
            <button className="w-full btn-secondary text-left">
              <Package className="inline h-4 w-4 mr-2" />
              Add New Inventory Item
            </button>
            <button className="w-full btn-secondary text-left">
              <Users className="inline h-4 w-4 mr-2" />
              Add New Supplier
            </button>
            <button className="w-full btn-secondary text-left">
              <FolderOpen className="inline h-4 w-4 mr-2" />
              Create New Project
            </button>
            <button className="w-full btn-secondary text-left">
              <Activity className="inline h-4 w-4 mr-2" />
              Record Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {dashboardData?.overview?.lowStockItems > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Low Stock Alert
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You have {dashboardData.overview.lowStockItems} items with low stock levels. 
                  Consider reordering to avoid stockouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Inventory Update Modal */}
      <QuickInventoryUpdate
        isOpen={showQuickUpdate}
        onClose={() => setShowQuickUpdate(false)}
      />
    </div>
  );
};

export default Dashboard;
