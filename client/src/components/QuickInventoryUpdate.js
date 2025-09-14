import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Minus, Save, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import BarcodeScanner from './BarcodeScanner';

const QuickInventoryUpdate = ({ onClose, isOpen }) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantityChange, setQuantityChange] = useState(0);
  const [transactionType, setTransactionType] = useState('adjustment');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInventoryItems();
    }
  }, [isOpen]);

  const fetchInventoryItems = async () => {
    try {
      const response = await axios.get('/api/inventory');
      setInventoryItems(response.data.items);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      toast.error('Failed to load inventory items');
    }
  };

  const handleBarcodeScan = (barcode) => {
    setScannerOpen(false);
    
    // Find item by barcode or item code
    const item = inventoryItems.find(item => 
      item.barcode === barcode || item.item_code === barcode
    );
    
    if (item) {
      setSelectedItem(item);
      setSearchTerm(item.name);
      toast.success(`Found item: ${item.name}`);
    } else {
      toast.error('Item not found. Please add this barcode to an inventory item first.');
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.length > 2) {
      const filtered = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(term.toLowerCase()) ||
        item.item_code.toLowerCase().includes(term.toLowerCase()) ||
        (item.barcode && item.barcode.includes(term))
      );
      setInventoryItems(filtered);
    } else {
      fetchInventoryItems();
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setSearchTerm(item.name);
    setQuantityChange(0);
  };

  const handleQuantityChange = (change) => {
    setQuantityChange(prev => {
      const newValue = prev + change;
      return Math.max(0, newValue);
    });
  };

  const handleSubmit = async () => {
    if (!selectedItem || quantityChange === 0) {
      toast.error('Please select an item and enter a quantity change');
      return;
    }

    setLoading(true);
    try {
      // Record the transaction
      await axios.post('/api/transactions', {
        type: transactionType,
        inventory_id: selectedItem.id,
        quantity: quantityChange,
        notes: notes || `Quick update: ${transactionType}`
      });

      toast.success('Inventory updated successfully');
      
      // Reset form
      setSelectedItem(null);
      setSearchTerm('');
      setQuantityChange(0);
      setNotes('');
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to update inventory:', error);
      toast.error('Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Quick Inventory Update</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Barcode Scanner */}
        <div className="space-y-4 mb-6">
          <div className="flex space-x-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, or scan barcode..."
                  className="input-field pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              className="btn-primary flex items-center"
            >
              <Package className="h-4 w-4 mr-2" />
              Scan
            </button>
          </div>

          {/* Search Results */}
          {searchTerm && filteredItems.length > 0 && !selectedItem && (
            <div className="border rounded-lg max-h-40 overflow-y-auto">
              {filteredItems.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemSelect(item)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        {item.item_code} • Stock: {item.current_stock} {item.unit}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      ${item.unit_cost?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Item */}
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Selected Item</h4>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{selectedItem.name}</div>
                  <div className="text-sm text-gray-500">
                    {selectedItem.item_code} • Current Stock: {selectedItem.current_stock} {selectedItem.unit}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${selectedItem.unit_cost?.toFixed(2) || '0.00'}</div>
                  <div className="text-sm text-gray-500">per {selectedItem.unit}</div>
                </div>
              </div>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <select
                className="input-field"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
              >
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="adjustment">Adjustment</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            {/* Quantity Change */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Change
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  className="input-field text-center w-24"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(parseInt(e.target.value) || 0)}
                />
                <button
                  onClick={() => handleQuantityChange(1)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                New stock will be: {selectedItem.current_stock + (transactionType === 'out' ? -quantityChange : quantityChange)} {selectedItem.unit}
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                className="input-field"
                rows="3"
                placeholder="Add any notes about this transaction..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setSearchTerm('');
                  setQuantityChange(0);
                  setNotes('');
                }}
                className="btn-secondary"
              >
                Clear
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || quantityChange === 0}
                className="btn-primary flex items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Update Inventory
              </button>
            </div>
          </div>
        )}

        {/* Barcode Scanner Modal */}
        <BarcodeScanner
          isOpen={scannerOpen}
          onScan={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
        />
      </div>
    </div>
  );
};

export default QuickInventoryUpdate;
