import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'in',
    inventory_id: '',
    quantity: 0,
    unit_cost: 0,
    reference_number: '',
    notes: '',
    project_id: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get('/api/transactions');
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/transactions', formData);
      toast.success('Transaction recorded successfully');
      setShowModal(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'in',
      inventory_id: '',
      quantity: 0,
      unit_cost: 0,
      reference_number: '',
      notes: '',
      project_id: ''
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || transaction.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Receipt className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'in':
        return 'text-green-600 bg-green-100';
      case 'out':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track all inventory movements and transactions
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Transaction
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <select
          className="input-field w-48"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
          <option value="transfer">Transfer</option>
          <option value="adjustment">Adjustment</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Type</th>
                <th className="table-header">Item</th>
                <th className="table-header">Quantity</th>
                <th className="table-header">Unit Cost</th>
                <th className="table-header">Total Cost</th>
                <th className="table-header">Reference</th>
                <th className="table-header">User</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTransactionColor(transaction.type)}`}>
                      {getTransactionIcon(transaction.type)}
                      <span className="ml-1 capitalize">{transaction.type}</span>
                    </span>
                  </td>
                  <td className="table-cell">
                    <div>
                      <div className="font-medium text-gray-900">{transaction.item_name}</div>
                      <div className="text-sm text-gray-500">{transaction.item_code}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`font-medium ${
                      transaction.type === 'in' ? 'text-green-600' : 
                      transaction.type === 'out' ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {transaction.type === 'in' ? '+' : transaction.type === 'out' ? '-' : ''}{transaction.quantity}
                    </span>
                  </td>
                  <td className="table-cell">
                    ${transaction.unit_cost?.toFixed(2) || '0.00'}
                  </td>
                  <td className="table-cell">
                    ${transaction.total_cost?.toFixed(2) || '0.00'}
                  </td>
                  <td className="table-cell">
                    {transaction.reference_number || '-'}
                  </td>
                  <td className="table-cell">
                    {transaction.username || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Record New Transaction
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                  <select
                    required
                    className="input-field"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="in">Stock In</option>
                    <option value="out">Stock Out</option>
                    <option value="transfer">Transfer</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Code</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Enter item code"
                    value={formData.inventory_id}
                    onChange={(e) => setFormData({...formData, inventory_id: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="input-field"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Record Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
