import AOS from 'aos';
import 'aos/dist/aos.css';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSmartAuth } from './features/auth';

// Components
import About from './components/About';
import ContactSection from './components/Contact';
import FAQ from './components/FAQ';
import Hero from './components/Hero';
import Products from './components/Products';
import { Footer, Navbar } from './components/shared';
import Testimonials from './components/Testimonials';
import TrainerProfiles from './components/TrainerProfiles';
import TrainingSection from './components/Training';
// Public Pages
import {
  HelpSupportPage as HelpSupport,
  HomePage as Home,
  LoginPage,
  SchedulePage,
  SmartLoginPage
} from './pages/public';

// Kiosk Pages
import KioskCheckIn from './pages/kiosk/KioskCheckIn';

// Layouts
import { AdminLayout, MemberLayout } from './layouts';

// Admin Pages
import {
  AttendancePage as AdminAttendancePage,
  CommunityPage as AdminCommunityManagement,
  SettingsPage as AdminSettingsPage,
  SupportPage as AdminSupportManagement,

  DashboardPage,
  MembersPage,
  ProductsPage,
  MemberRegistrationPage as RegisterPage,
  RevenuePage,
  TrainersPage,
  TrainingsPage
} from './pages/admin';

// Member Pages
import {
  AttendancePage as MemberAttendancePage,
  CommunityPage as MemberCommunityPage,
  DashboardPage as MemberDashboardPage,
  ProfilePage as MemberProfilePage,
  SettingsPage as MemberSettingsPage,
  SupportPage as MemberSupportPage,
  TrainingSessionsPage as MemberTrainingSessionsPage
} from './pages/member';



const ProtectedRoute = ({ children, userType }) => {
  const { isAuthenticated, userType: currentUserType, loading, environment } = useSmartAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userType && userType !== currentUserType) {
    if (currentUserType === 'member') return <Navigate to="/member-dashboard" replace />;
    if (currentUserType === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, userType, loading, environment } = useSmartAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || userType !== 'admin') return <Navigate to="/login" replace />;
  return children;
};

const MemberRoute = ({ children }) => {
  const { isAuthenticated, userType, loading, environment } = useSmartAuth();

  useEffect(() => {
    const memberID = localStorage.getItem('memberID');
    const memberId = localStorage.getItem('memberId');
    if (memberID && !memberId) localStorage.setItem('memberId', memberID);
    else if (memberId && !memberID) localStorage.setItem('memberID', memberId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || userType !== 'member') return <Navigate to="/login" replace />;
  return children;
};






function NavbarHandler() {
  const location = useLocation();
  if (
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/member-dashboard') ||
    location.pathname === '/login' ||
    location.pathname.startsWith('/kiosk')
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
      <NavbarHandler />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<SmartLoginPage />} />
        <Route path="/old-login" element={<LoginPage />} />
       
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/helpandsupportpage" element={<HelpSupport />} />
        
        {/* Kiosk Route (Public - No Auth Required) */}
        <Route path="/kiosk" element={<KioskCheckIn />} />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="trainings" element={<TrainingsPage />} />
          <Route path="attendance" element={<AdminAttendancePage />} />
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
            <MemberLayout />
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
