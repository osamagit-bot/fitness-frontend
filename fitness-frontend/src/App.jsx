import AOS from 'aos';
import 'aos/dist/aos.css';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

// Components
import About from './components/About';
import ContactSection from './components/Contact';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Hero from './components/Hero';
import Navbar from './components/Navbar';
import Products from './components/Products';
import Testimonials from './components/Testimonials';
import TrainerProfiles from './components/TrainerProfiles';
import TrainingSection from './components/Training';
import HelpSupport from './SubPages/HelpSupport';

// Public Pages
import Home from './SubPages/Home';
import LoginPage from './SubPages/Loginpage';

import SchedulePage from './SubPages/Schedule';

// Admin Pages
import AttendancePage from './SubPages/AdminPages/AdminAttendancePage';
import AdminCommunityManagement from './SubPages/AdminPages/AdminCommunityManagement';
import AdminDashboard from './SubPages/AdminPages/AdminDashboard';
import AdminSettingsPage from './SubPages/AdminPages/AdminSettingsPage';
import AdminSupportManagement from './SubPages/AdminPages/AdminSupportManagement';
import DashboardPage from './SubPages/AdminPages/DashboardPage';
import MembersPage from './SubPages/AdminPages/MembersPage';
import ProductsPage from './SubPages/AdminPages/ProductsPage';
import RegisterPage from './SubPages/AdminPages/RegisterPage';
import RevenuePage from './SubPages/AdminPages/RevenuePage';
import TrainersPage from './SubPages/AdminPages/TrainersPage';
import TrainingsPage from './SubPages/AdminPages/TrainingsPage';

// Member Pages
import MemberAttendancePage from './SubPages/MemberPages/MemberAttendancePage';
import MemberCommunityPage from './SubPages/MemberPages/MemberCommunityPage';
import MemberDashboard from './SubPages/MemberPages/MemberDashboard';
import MemberDashboardPage from './SubPages/MemberPages/MemberDashboardPage';
import MemberProfilePage from './SubPages/MemberPages/MemberProfilePage';
import MemberSettingsPage from './SubPages/MemberPages/MemberSettingsPage';
import MemberSupportPage from './SubPages/MemberPages/MemberSupportPage';
import MemberTrainingSessionsPage from './SubPages/MemberPages/MemberTrainingSessionsPage';



const ProtectedRoute = ({ children, userType }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' || localStorage.getItem('access_token') !== null;
  const currentUserType = localStorage.getItem('userType');

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userType && userType !== currentUserType) {
    if (currentUserType === 'member') return <Navigate to="/member-dashboard" replace />;
    
    if (currentUserType === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' || localStorage.getItem('access_token') !== null;
  const userType = localStorage.getItem('userType');
  if (!isAuthenticated || userType !== 'admin') return <Navigate to="/login" replace />;
  return children;
};

const MemberRoute = ({ children }) => {
  useEffect(() => {
    const memberID = localStorage.getItem('memberID');
    const memberId = localStorage.getItem('memberId');
    if (memberID && !memberId) localStorage.setItem('memberId', memberID);
    else if (memberId && !memberID) localStorage.setItem('memberID', memberId);
  }, []);

  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' || localStorage.getItem('access_token') !== null;
  const userType = localStorage.getItem('userType');
  if (!isAuthenticated || userType !== 'member') return <Navigate to="/login" replace />;
  return children;
};



const DebugLoginState = () => {
  useEffect(() => {
    const memberID = localStorage.getItem('memberID');
    const memberId = localStorage.getItem('memberId');
    if (memberID && !memberId) {
      localStorage.setItem('memberId', memberID);
      console.log("DebugLoginState: Copied memberID to memberId");
    } else if (memberId && !memberID) {
      localStorage.setItem('memberID', memberId);
      console.log("DebugLoginState: Copied memberId to memberID");
    }
  }, []);

  useEffect(() => {
    const memberId = localStorage.getItem('memberId') || localStorage.getItem('memberID');
    console.log("Current login state:", {
      isAuthenticated: localStorage.getItem('isAuthenticated'),
      token: localStorage.getItem('access_token') ? "exists" : "missing",
      userType: localStorage.getItem('userType'),
      userId: localStorage.getItem('userId'),
      memberId,
     
    });
  }, []);

  return null;
};


function NavbarHandler() {
  const location = useLocation();
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/member-dashboard') 
  ) {
    return null;
  }
  return <Navbar />;
}

function HomePage() {
  useEffect(() => {
    AOS.init();
    const menuList = document.getElementById("menuList");
    if (menuList) {
      menuList.style.maxHeight = "0px";
    }
  }, []);

  return (
    <>
      <Hero />
      <About />
      <Home />
      <TrainingSection />
      <Testimonials />
      <TrainerProfiles />
      <FAQ />
      <Products />
      <ContactSection />
      <Footer />
    </>
  );
}

function App() {
  return (
    <>
      <DebugLoginState />
      <NavbarHandler />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
       
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/helpandsupportpage" element={<HelpSupport />} />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="trainings" element={<TrainingsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="trainers" element={<TrainersPage />} />
          <Route path="community" element={<AdminCommunityManagement />} />
          <Route path="support" element={<AdminSupportManagement />} />
          <Route path="adminsettings" element={<AdminSettingsPage />} />
        </Route>

        {/* Member Routes */}
        <Route path="/member-dashboard/*" element={
          <MemberRoute>
            <MemberDashboard />
          </MemberRoute>
        }>
          <Route index element={<MemberDashboardPage />} />
          <Route path="profile" element={<MemberProfilePage />} />
          <Route path="attendance" element={<MemberAttendancePage />} />
          <Route path="trainings" element={<MemberTrainingSessionsPage />} />
          <Route path="settings" element={<MemberSettingsPage />} />
          <Route path="community" element={<MemberCommunityPage />} />
          <Route path="community/:communityId" element={<MemberCommunityPage />} />
          <Route path="support" element={<MemberSupportPage />} />
        </Route>

     
        
        

        {/* Fallbacks */}
        <Route path="/debug-member-dashboard" element={<Navigate to="/member-dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
