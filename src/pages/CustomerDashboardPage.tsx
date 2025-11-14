// src/pages/CustomerDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // For any navigation links
import { useAuth } from '../hooks/useAuth'; // To get user info and logout
import { User, Settings, MapPin, Truck as VendorIcon, LogOut } from 'lucide-react'; // Example icons
import Cookies from 'js-cookie';

// Placeholder types - these would ideally come from your src/types/index.ts
// and match what the backend /api/users/me returns
interface UserProfile {
  name: string;
  companyName?: string;
  email: string;
  contactNumber?: string;
  gstNumber?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  pickupAddresses?: Array<{
    label: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>;
  preferredVendorIds?: string[]; // Array of vendor IDs
}

// Placeholder type for all vendors (for preferred vendor selection)
interface BasicVendorInfo {
  id: string;
  name: string;
}

const CustomerDashboardPage: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth(); // Assuming useAuth provides user object
  const navigate = useNavigate(); // From react-router-dom, if not already imported in useAuth for logout

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allVendors, setAllVendors] = useState<BasicVendorInfo[]>([]); // For preferred vendor selection

  // TODO: Fetch user profile data when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) { // 'user' might come from useAuth directly or after a fetch
      const fetchProfile = async () => {
        setIsLoading(true);
        try {
          // const response = await fetch('/api/users/me'); // ACTUAL API CALL
          // if (!response.ok) throw new Error('Failed to fetch profile');
          // const data: UserProfile = await response.json();
          // setProfile(data);

          // Fetch user's added vendors (temporary transporters)
          const token = Cookies.get('authToken');
          let userVendors: BasicVendorInfo[] = [];
          
          if (token) {
            try {
              const vendorsResponse = await fetch(`/api/transporter/gettemporarytransporters?customerID=${user._id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (vendorsResponse.ok) {
                const vendorsData = await vendorsResponse.json();
                if (vendorsData.success && vendorsData.data) {
                  // Convert temporary transporters to BasicVendorInfo format
                  userVendors = vendorsData.data.map((vendor: any) => ({
                    id: vendor._id,
                    name: vendor.companyName
                  }));
                }
              }
            } catch (error) {
              console.error('Error fetching vendors:', error);
            }
          }

          // Create profile with real user data
          const userProfile: UserProfile = {
            name: user?.name || 'Customer Name',
            companyName: user?.companyName || 'Company Name',
            email: user?.email || 'customer@example.com',
            contactNumber: user?.contactNumber || '9876543210',
            gstNumber: user?.gstNumber || '27ABCDE1234F1Z5',
            billingAddress: { 
              street: user?.address || '123 Main St', 
              city: user?.city || 'Mumbai', 
              state: user?.state || 'MH', 
              postalCode: user?.pincode?.toString() || '400001', 
              country: 'India' 
            },
            pickupAddresses: [
              { label: 'Warehouse A', street: '456 Indl. Area', city: 'Pune', state: 'MH', postalCode: '411001', country: 'India' },
            ],
            preferredVendorIds: userVendors.map(v => v.id), // Use all user's vendors as preferred
          };
          setProfile(userProfile);
          setAllVendors(userVendors);

        } catch (error) {
          console.error("Failed to fetch profile data:", error);
          // Handle error display
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    } else if (!isAuthenticated && !user) { // If somehow user lands here without auth (e.g. direct nav, then logout)
        setIsLoading(false); // No data to load
    }
  }, [user, isAuthenticated]); // Re-fetch if user object changes

  const handleLogout = () => {
    logout(); // Call logout from useAuth
    // useAuth should handle navigation to /signin or homepage
    // navigate('/signin'); // Or handle navigation in useAuth hook itself after clearing token
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading your dashboard...</div>;
  }

  if (!profile && !isAuthenticated) { // Should be redirected by PrivateRoute, but good check
      return <div className="text-center py-10">Please <Link to="/signin" className="text-blue-600 hover:underline">sign in</Link> to view your dashboard.</div>;
  }
  
  if (!profile && isAuthenticated) { // Logged in, but profile fetch failed or no profile
      return <div className="text-center py-10">Could not load profile data. Please try again later or contact support.</div>;
  }


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Your Dashboard</h1>
        <button
          onClick={handleLogout}
          className="flex items-center bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm"
        >
          <LogOut size={16} className="mr-2" />
          Sign Out
        </button>
      </div>

      {/* Profile Section */}
      <section className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
          <User size={20} className="mr-2 text-blue-600" /> Profile Information
        </h2>
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Company:</strong> {profile.companyName || 'N/A'}</p>
            <p><strong>Contact:</strong> {profile.contactNumber || 'N/A'}</p>
            <p><strong>GST No:</strong> {profile.gstNumber || 'N/A'}</p>
            {profile.billingAddress && (
              <p className="md:col-span-2">
                <strong>Billing Address:</strong> 
                {profile.billingAddress.street}, {profile.billingAddress.city}, {profile.billingAddress.state} - {profile.billingAddress.postalCode}
              </p>
            )}
          </div>
        )}
        {/* TODO: Add "Edit Profile" button and modal/form */}
      </section>

      {/* Pickup Addresses Section */}
      <section className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
          <MapPin size={20} className="mr-2 text-blue-600" /> Pickup Addresses
        </h2>
        {profile?.pickupAddresses && profile.pickupAddresses.length > 0 ? (
          <ul className="space-y-2">
            {profile.pickupAddresses.map((addr, index) => (
              <li key={index} className="p-3 bg-gray-50 rounded-md text-sm">
                <strong>{addr.label}:</strong> {addr.street}, {addr.city}, {addr.state} - {addr.postalCode}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No pickup addresses saved.</p>
        )}
        {/* TODO: Add "Manage Pickup Addresses" button and modal/form */}
      </section>

      {/* Preferred Vendors Section */}
      <section className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
          <VendorIcon size={20} className="mr-2 text-blue-600" /> Preferred Vendors
        </h2>
        {profile?.preferredVendorIds && profile.preferredVendorIds.length > 0 && allVendors.length > 0 ? (
          <ul className="space-y-2">
            {profile.preferredVendorIds.map(vendorId => {
              const preferredVendor = allVendors.find(v => v.id === vendorId);
              return preferredVendor ? (
                <li key={vendorId} className="p-3 bg-gray-50 rounded-md text-sm">
                  {preferredVendor.name}
                </li>
              ) : null;
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No preferred vendors selected.</p>
        )}
        <div className="mt-4">
          <Link 
            to="/my-vendors" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <VendorIcon size={16} className="mr-2" />
            Manage Vendors
          </Link>
        </div>
      </section>

      <div className="mt-8 text-center">
          <Link to="/" className="text-blue-600 hover:underline">
            ← Back to Calculator
          </Link>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;