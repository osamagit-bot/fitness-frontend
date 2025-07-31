import AOS from "aos";
import "aos/dist/aos.css";
import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ThemeProvider } from "./contexts/ThemeContext";
// Components
import About from "./components/About";
import ContactSection from "./components/Contact";
import FAQ from "./components/FAQ";
import Hero from "./components/Hero";
import Products from "./components/Products";
import { Footer, Navbar } from "./components/shared";
import Testimonials from "./components/Testimonials";
import TrainerProfiles from "./components/TrainerProfiles";
import TrainingSection from "./components/Training";

// Public Pages
import {
  HelpSupportPage as HelpSupport,
  HomePage as Home,
  SchedulePage,
  CategoryPage,
} from "./pages/public";

// Kiosk Pages
import KioskCheckIn from "./pages/kiosk/KioskCheckIn";

// Layouts
import { AdminLayout, MemberLayout } from "./layouts";

// Admin Pages (Lazy Loaded)
const AdminAttendancePage = lazy(() =>
  import("./pages/admin/AttendancePage.jsx")
);
const AdminCommunityManagement = lazy(() =>
  import("./pages/admin/CommunityPage.jsx")
);
const AdminSettingsPage = lazy(() => import("./pages/admin/SettingsPage.jsx"));
const AdminSupportManagement = lazy(() =>
  import("./pages/admin/SupportPage.jsx")
);
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage.jsx"));
const MembersPage = lazy(() => import("./pages/admin/MembersPage.jsx"));
const ProductsPage = lazy(() => import("./pages/admin/ProductsPage.jsx"));
const RegisterPage = lazy(() =>
  import("./pages/admin/MemberRegistrationPage.jsx")
);
const RevenuePage = lazy(() => import("./pages/admin/RevenuePage.jsx"));
const TrainersPage = lazy(() => import("./pages/admin/TrainersPage.jsx"));
const TrainingsPage = lazy(() => import("./pages/admin/TrainingsPage.jsx"));
const StockPage = lazy(() => import("./pages/admin/Stock.jsx"));
const SalePage = lazy(() => import("./pages/admin/Sale.jsx"));

// Member Pages
import {
  AttendancePage as MemberAttendancePage,
  CommunityPage as MemberCommunityPage,
  DashboardPage as MemberDashboardPage,
  ProfilePage as MemberProfilePage,
  SettingsPage as MemberSettingsPage,
  SupportPage as MemberSupportPage,
  TrainingSessionsPage as MemberTrainingSessionsPage,
} from "./pages/member";

// Auth Pages
import AuthGuard from "./components/auth/AuthGuard";
import LoginPage from "./pages/auth/LoginPage";

function NavbarHandler() {
  const location = useLocation();
  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/member-dashboard") ||
    location.pathname.startsWith("/kiosk") ||
    location.pathname === "/login"
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
    <ThemeProvider>
      <NavbarHandler />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:category" element={<CategoryPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/helpandsupportpage" element={<HelpSupport />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Kiosk Route (Public - No Auth Required) */}
        <Route path="/kiosk" element={<KioskCheckIn />} />
       
        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <AuthGuard requiredRole="admin">
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="dashboard"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="register"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <RegisterPage />
              </Suspense>
            }
          />
          <Route
            path="products"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <ProductsPage />
              </Suspense>
            }
          />
          <Route
            path="trainings"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <TrainingsPage />
              </Suspense>
            }
          />
          <Route
            path="attendance"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <AdminAttendancePage />
              </Suspense>
            }
          />
          <Route
            path="revenue"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <RevenuePage />
              </Suspense>
            }
          />
          <Route
            path="members"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <MembersPage />
              </Suspense>
            }
          />
          <Route
            path="trainers"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <TrainersPage />
              </Suspense>
            }
          />
          <Route
            path="community"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <AdminCommunityManagement />
              </Suspense>
            }
          />
          <Route
            path="support"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <AdminSupportManagement />
              </Suspense>
            }
          />
          <Route
            path="stock"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <StockPage />
              </Suspense>
            }
          />
          <Route
            path="sale"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <SalePage />
              </Suspense>
            }
          />
          <Route
            path="adminsettings"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <AdminSettingsPage />
              </Suspense>
            }
          />
        </Route>

        {/* Member Routes */}
        <Route
          path="/member-dashboard/*"
          element={
            <AuthGuard requiredRole="member">
              <MemberLayout />
            </AuthGuard>
          }
        >
          <Route index element={<MemberDashboardPage />} />
          <Route path="profile" element={<MemberProfilePage />} />
          <Route path="attendance" element={<MemberAttendancePage />} />
          <Route path="trainings" element={<MemberTrainingSessionsPage />} />
          <Route path="settings" element={<MemberSettingsPage />} />
          <Route path="community" element={<MemberCommunityPage />} />
          <Route
            path="community/:communityId"
            element={<MemberCommunityPage />}
          />
          <Route path="support" element={<MemberSupportPage />} />
        </Route>

        {/* Redirects */}
        <Route
          path="/debug-member-dashboard"
          element={<Navigate to="/member-dashboard" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default App;
