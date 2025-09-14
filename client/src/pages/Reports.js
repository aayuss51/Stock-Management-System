import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Package, Users, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';

const Reports = () => {
  const [reports, setReports] = useState({
    inventoryValue: [],
    categoryWise: [],
    supplierPerformance: [],
    monthlySummary: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [inventoryValue, categoryWise, supplierPerformance, monthlySummary] = await Promise.all([
        axios.get('/api/reports/inventory-value'),
        axios.get('/api/reports/category-wise'),
        axios.get('/api/reports/supplier-performance'),
        axios.get('/api/reports/monthly-summary')
      ]);

      setReports({
        inventoryValue: inventoryValue.data,
        categoryWise: categoryWise.data,
        supplierPerformance: supplierPerformance.data,
        monthlySummary: monthlySummary.data
      });
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'inventory', name: 'Inventory Value', icon: Package },
    { id: 'categories', name: 'Categories', icon: TrendingUp },
    { id: 'suppliers', name: 'Suppliers', icon: Users }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Comprehensive insights into your inventory and operations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Inventory Value */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Total Inventory Value</h3>
              <div className="text-3xl font-bold text-primary-600">
                ${reports.inventoryValue.totalValue?.toLocaleString() || 0}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Across {reports.inventoryValue.itemCount || 0} items
              </p>
            </div>

            {/* Top Categories */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Categories by Value</h3>
              <div className="space-y-3">
                {reports.categoryWise.slice(0, 5).map((category, index) => (
                  <div key={category.category_name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {category.category_name || 'Uncategorized'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      ${category.total_value?.toLocaleString() || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Transaction Summary Chart */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Transaction Summary</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.monthlySummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_quantity" fill="#3B82F6" name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Value Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Value Report</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Item</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Current Stock</th>
                    <th className="table-header">Unit Cost</th>
                    <th className="table-header">Total Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.inventoryValue.items?.slice(0, 20).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.item_code}</div>
                        </div>
                      </td>
                      <td className="table-cell">{item.category_name || 'Uncategorized'}</td>
                      <td className="table-cell">{item.current_stock} {item.unit}</td>
                      <td className="table-cell">${item.unit_cost?.toFixed(2) || '0.00'}</td>
                      <td className="table-cell font-medium">
                        ${item.total_value?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution Chart */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Category Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reports.categoryWise}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category_name, total_value }) => 
                        `${category_name || 'Uncategorized'}: $${total_value?.toLocaleString() || 0}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total_value"
                    >
                      {reports.categoryWise.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Details */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Category Details</h3>
              <div className="space-y-4">
                {reports.categoryWise.map((category, index) => (
                  <div key={category.category_name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {category.category_name || 'Uncategorized'}
                      </h4>
                      <span className="text-sm font-medium text-primary-600">
                        ${category.total_value?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                      <div>Items: {category.item_count || 0}</div>
                      <div>Total Stock: {category.total_stock || 0}</div>
                      <div>Avg Cost: ${category.avg_unit_cost?.toFixed(2) || '0.00'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Supplier</th>
                    <th className="table-header">Contact Person</th>
                    <th className="table-header">Items Supplied</th>
                    <th className="table-header">Total Value</th>
                    <th className="table-header">Average Unit Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.supplierPerformance.map((supplier) => (
                    <tr key={supplier.supplier_name} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">{supplier.supplier_name}</div>
                          {supplier.email && (
                            <div className="text-sm text-gray-500">{supplier.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">{supplier.contact_person || '-'}</td>
                      <td className="table-cell">{supplier.item_count || 0}</td>
                      <td className="table-cell font-medium">
                        ${supplier.total_value?.toLocaleString() || 0}
                      </td>
                      <td className="table-cell">
                        ${supplier.avg_unit_cost?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
