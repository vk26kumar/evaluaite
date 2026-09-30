import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import { PublicOnly, RequireAuth } from "./components/RouteGuards";
import { PageLoader } from "./components/Feedback";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import AuthCallback from "./pages/auth/AuthCallback";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import NotFound from "./pages/NotFound";

const NewEvaluation = lazy(() => import("./pages/evaluate/NewEvaluation"));
const EvaluationPage = lazy(() => import("./pages/report/EvaluationPage"));
const History = lazy(() => import("./pages/History"));
const Slides = lazy(() => import("./pages/Slides"));
const Whiteboard = lazy(() => import("./pages/Whiteboard"));
const AssignmentsList = lazy(() => import("./pages/assignments/AssignmentsList"));
const NewAssignment = lazy(() => import("./pages/assignments/NewAssignment"));
const AssignmentPage = lazy(() => import("./pages/assignments/AssignmentPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Landing />} />
            <Route path="auth/callback" element={<AuthCallback />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="verify-email" element={<VerifyEmail />} />

            <Route element={<PublicOnly />}>
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route path="evaluate" element={<NewEvaluation />} />
              <Route path="evaluations" element={<History />} />
              <Route path="evaluations/:id" element={<EvaluationPage />} />
              <Route path="slides" element={<Slides />} />
              <Route path="whiteboard" element={<Whiteboard />} />
              <Route path="assignments" element={<AssignmentsList />} />
              <Route path="assignments/new" element={<NewAssignment />} />
              <Route path="assignments/:id" element={<AssignmentPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
