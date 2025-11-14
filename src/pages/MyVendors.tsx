import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';

interface Vendor {
  _id: string;
  companyName: string;
  vendorCode: string;
  vendorPhone: string;
  vendorEmail: string;
  gstNo: string;
  mode: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  rating: number;
  subVendor: string;
  selectedZones: string[];
  prices: {
    priceRate: any;
    priceChart: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface EditVendorData {
  companyName: string;
  vendorCode: string;
  vendorPhone: string;
  vendorEmail: string;
  gstNo: string;
  mode: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  rating: number;
  subVendor: string;
  selectedZones: string[];
}

const MyVendors: React.FC = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editFormData, setEditFormData] = useState<EditVendorData>({
    companyName: '',
    vendorCode: '',
    vendorPhone: '',
    vendorEmail: '',
    gstNo: '',
    mode: '',
    address: '',
    state: '',
    city: '',
    pincode: '',
    rating: 0,
    subVendor: '',
    selectedZones: []
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      
      if (!user?._id) {
        toast.error('User not authenticated');
        return;
      }
      
      const token = Cookies.get('authToken');
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }
      
      const response = await fetch(`/api/transporter/gettemporarytransporters?customerID=${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setVendors(data.data || []);
      } else {
        toast.error(data.message || 'Failed to fetch vendors');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error(`Error fetching vendors: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setEditFormData({
      companyName: vendor.companyName,
      vendorCode: vendor.vendorCode,
      vendorPhone: vendor.vendorPhone,
      vendorEmail: vendor.vendorEmail,
      gstNo: vendor.gstNo,
      mode: vendor.mode,
      address: vendor.address,
      state: vendor.state,
      city: vendor.city,
      pincode: vendor.pincode,
      rating: vendor.rating,
      subVendor: vendor.subVendor,
      selectedZones: vendor.selectedZones || []
    });
    setShowEditModal(true);
  };

  const handleSaveVendor = async () => {
    if (!editingVendor) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/transporter/update-vendor/${editingVendor._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Vendor updated successfully');
        setShowEditModal(false);
        setEditingVendor(null);
        fetchVendors(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to update vendor');
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast.error('Error updating vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${companyName}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/transporter/remove-tied-up', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerID: user?._id,
          companyName: companyName
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Vendor deleted successfully');
        fetchVendors(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to delete vendor');
      }
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Error deleting vendor');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Vendors</h1>
          <p className="mt-2 text-gray-600">Manage your added vendors and their details</p>
        </div>

        {/* Vendors List */}
        {vendors.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first vendor.</p>
            <div className="mt-6">
              <a
                href="/addvendor"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Vendor
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <div key={vendor._id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{vendor.companyName}</h3>
                    <p className="text-sm text-gray-600 mt-1">Code: {vendor.vendorCode}</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Phone:</span> {vendor.vendorPhone}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Email:</span> {vendor.vendorEmail}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">GST:</span> {vendor.gstNo}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Mode:</span> {vendor.mode}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Location:</span> {vendor.city}, {vendor.state} - {vendor.pincode}
                      </p>
                      {vendor.rating > 0 && (
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Rating:</span> {vendor.rating}/5
                        </p>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-gray-500">
                        Added on {formatDate(vendor.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleEditVendor(vendor)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteVendor(vendor._id, vendor.companyName)}
                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Edit Vendor</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company Name</label>
                      <input
                        type="text"
                        value={editFormData.companyName}
                        onChange={(e) => setEditFormData({...editFormData, companyName: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Vendor Code</label>
                      <input
                        type="text"
                        value={editFormData.vendorCode}
                        onChange={(e) => setEditFormData({...editFormData, vendorCode: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="text"
                        value={editFormData.vendorPhone}
                        onChange={(e) => setEditFormData({...editFormData, vendorPhone: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={editFormData.vendorEmail}
                        onChange={(e) => setEditFormData({...editFormData, vendorEmail: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">GST Number</label>
                      <input
                        type="text"
                        value={editFormData.gstNo}
                        onChange={(e) => setEditFormData({...editFormData, gstNo: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mode</label>
                      <select
                        value={editFormData.mode}
                        onChange={(e) => setEditFormData({...editFormData, mode: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Mode</option>
                        <option value="Road">Road</option>
                        <option value="Rail">Rail</option>
                        <option value="Air">Air</option>
                        <option value="Ship">Ship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <input
                        type="text"
                        value={editFormData.state}
                        onChange={(e) => setEditFormData({...editFormData, state: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <input
                        type="text"
                        value={editFormData.city}
                        onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pincode</label>
                      <input
                        type="text"
                        value={editFormData.pincode}
                        onChange={(e) => setEditFormData({...editFormData, pincode: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rating</label>
                      <select
                        value={editFormData.rating}
                        onChange={(e) => setEditFormData({...editFormData, rating: parseInt(e.target.value)})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={0}>Select Rating</option>
                        <option value={1}>1 Star</option>
                        <option value={2}>2 Stars</option>
                        <option value={3}>3 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={5}>5 Stars</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sub Vendor</label>
                    <input
                      type="text"
                      value={editFormData.subVendor}
                      onChange={(e) => setEditFormData({...editFormData, subVendor: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveVendor}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVendors;
