import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Package,
  Eye,
  Camera
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import QuickInventoryUpdate from '../components/QuickInventoryUpdate';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const [formData, setFormData] = useState({
    item_code: '',
    name: '',
    description: '',
    category_id: '',
    supplier_id: '',
    unit: '',
    current_stock: 0,
    min_stock_level: 0,
    max_stock_level: 0,
    unit_cost: 0,
    location: '',
    barcode: ''
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get('/api/inventory');
      setInventory(response.data.items);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`/api/inventory/${editingItem.id}`, formData);
        toast.success('Item updated successfully');
      } else {
        await axios.post('/api/inventory', formData);
        toast.success('Item created successfully');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save item');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_code: item.item_code,
      name: item.name,
      description: item.description || '',
      category_id: item.category_id || '',
      supplier_id: item.supplier_id || '',
      unit: item.unit,
      current_stock: item.current_stock,
      min_stock_level: item.min_stock_level,
      max_stock_level: item.max_stock_level || 0,
      unit_cost: item.unit_cost || 0,
      location: item.location || '',
      barcode: item.barcode || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`/api/inventory/${id}`);
        toast.success('Item deleted successfully');
        fetchInventory();
      } catch (error) {
        toast.error('Failed to delete item');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      item_code: '',
      name: '',
      description: '',
      category_id: '',
      supplier_id: '',
      unit: '',
      current_stock: 0,
      min_stock_level: 0,
      max_stock_level: 0,
      unit_cost: 0,
      location: '',
      barcode: ''
    });
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = inventory.filter(item => 
    item.current_stock <= item.min_stock_level
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your construction materials and equipment
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowQuickUpdate(true)}
            className="btn-secondary flex items-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            Quick Update
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Low Stock Alert
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  {lowStockItems.length} items are running low on stock.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-secondary flex items-center">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </button>
      </div>

      {/* Inventory Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Item Code</th>
                <th className="table-header">Name</th>
                <th className="table-header">Category</th>
                <th className="table-header">Current Stock</th>
                <th className="table-header">Min Level</th>
                <th className="table-header">Unit Cost</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{item.item_code}</td>
                  <td className="table-cell">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500">{item.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">{item.category_name || 'Uncategorized'}</td>
                  <td className="table-cell">
                    <span className={`font-medium ${
                      item.current_stock <= item.min_stock_level ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {item.current_stock} {item.unit}
                    </span>
                  </td>
                  <td className="table-cell">{item.min_stock_level} {item.unit}</td>
                  <td className="table-cell">${item.unit_cost?.toFixed(2) || '0.00'}</td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.current_stock <= item.min_stock_level
                        ? 'bg-red-100 text-red-800'
                        : item.current_stock <= item.min_stock_level * 1.5
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.current_stock <= item.min_stock_level ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Code</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.item_code}
                    onChange={(e) => setFormData({...formData, item_code: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="input-field"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({...formData, current_stock: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Stock Level</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="input-field"
                      value={formData.min_stock_level}
                      onChange={(e) => setFormData({...formData, min_stock_level: parseInt(e.target.value)})}
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
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
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

export default Inventory;
