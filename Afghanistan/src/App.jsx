import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Pages and Components
import LoginPage from './SubPages/Loginpage';
import Register from './SubPages/Register';
import Navbar from './components/Navbar';
import Home from './SubPages/Home';
import Hero from './components/Hero';
import About from './components/About';
import Footer from './components/Footer';
import TrainingSection from './components/Training';
import Products from './components/Products';
import ContactSection from './components/Contact';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import HelpSupport from './components/Help&Support';
import TrainerProfiles from './components/TrainerProfiles';
import AdminDashboard from './components/AdminDashboard';

// Admin Pages
import DashboardPage from './SubPages/DashboardPage';
import RegisterPage from './SubPages/RegisterPage';
import SchedulePage from './SubPages/Schedule';
import ProductsPage from './SubPages/ProductsPage';
import TrainingsPage from './SubPages/TrainingsPage';
import AttendancePage from './SubPages/AttendancePage';
import RevenuePage from './SubPages/RevenuePage';
import MembersPage from './SubPages/MembersPage';

// Member Dashboard Pages
import MemberDashboard from './SubPages/MemberPages/MemberDashboard';
import MemberDashboardPage from './SubPages/MemberPages/MemberDashboardPage';
import MemberProfilePage from './SubPages/MemberPages/MemberProfilePage';
import MemberAttendancePage from './SubPages/MemberPages/MemberAttendancePage';
import MemberTrainingSessionsPage from './SubPages/MemberPages/MemberTrainingSessionsPage';
import MemberCommunityPage from './SubPages/MemberPages/MemberCommunityPage';
import MemberSupportPage from './SubPages/MemberPages/MemberSupportPage';

// Admin Community & Support Pages
import AdminCommunityManagement from './SubPages/AdminPages/AdminCommunityManagement';
import AdminSupportManagement from './SubPages/AdminPages/AdminSupportManagement';

// Trainer Dashboard
import TrainerDashboard from './SubPages/TrainerPages/TrainerDashboard';
import TrainersPage from './SubPages/TrainersPage';

const ProtectedRoute = ({ children, userType }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' || localStorage.getItem('token') !== null;
  const currentUserType = localStorage.getItem('userType');

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userType && userType !== currentUserType) {
    if (currentUserType === 'member') return <Navigate to="/member-dashboard" replace />;
    if (currentUserType === 'trainer') return <Navigate to="/trainer-dashboard" replace />;
    if (currentUserType === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' || localStorage.getItem('token') !== null;
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

  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' || localStorage.getItem('token') !== null;
  const userType = localStorage.getItem('userType');

  if (!isAuthenticated || userType !== 'member') return <Navigate to="/login" replace />;
  return children;
};

const TrainerRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true' || localStorage.getItem('token') !== null;
  const userType = localStorage.getItem('userType');
  if (!isAuthenticated || userType !== 'trainer') return <Navigate to="/login" replace />;
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
      token: localStorage.getItem('token') ? "exists" : "missing",
      userType: localStorage.getItem('userType'),
      userId: localStorage.getItem('userId'),
      memberId,
      trainerId: localStorage.getItem('trainerId')
    });
  }, []);

  return null;
};

function NavbarHandler() {
  const location = useLocation();
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/member-dashboard') ||
    location.pathname.startsWith('/trainer-dashboard')
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

  const toggleMenu = () => {
    const menuList = document.getElementById("menuList");
    if (menuList) {
      menuList.style.maxHeight = menuList.style.maxHeight === "0px" ? "300px" : "0px";
    }
  };

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
        <Route path="/register" element={<Register />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/helpandsupportpage" element={<HelpSupport />} />

        {/* Admin */}
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
        </Route>

        {/* Member */}
        <Route path="/member-dashboard/*" element={
          <MemberRoute>
            <MemberDashboard />
          </MemberRoute>
        }>
          <Route index element={<MemberDashboardPage />} />
          <Route path="profile" element={<MemberProfilePage />} />
          <Route path="attendance" element={<MemberAttendancePage />} />
          <Route path="trainings" element={<MemberTrainingSessionsPage />} />
          <Route path="shop" element={<div className="p-4"><h1 className="text-2xl font-bold">Shop</h1></div>} />
          <Route path="community" element={<MemberCommunityPage />} />
          <Route path="support" element={<MemberSupportPage />} />
        </Route>

        {/* Trainer */}
        <Route path="/trainer-dashboard/*" element={
          <TrainerRoute>
            <TrainerDashboard />
          </TrainerRoute>
        }>
          <Route index element={<div className="p-4"><h1 className="text-2xl font-bold">Trainer Dashboard</h1></div>} />
          <Route path="profile" element={<div className="p-4"><h1 className="text-2xl font-bold">My Profile</h1></div>} />
          <Route path="sessions" element={<div className="p-4"><h1 className="text-2xl font-bold">My Sessions</h1></div>} />
          <Route path="members" element={<div className="p-4"><h1 className="text-2xl font-bold">My Members</h1></div>} />
        </Route>

        {/* Redirect fallback */}
        <Route path="/debug-member-dashboard" element={<Navigate to="/member-dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
