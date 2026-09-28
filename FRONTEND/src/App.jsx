import { lazy, Suspense, useEffect } from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import { PublicOnly, RequireAuth } from "./components/RouteGuards";
import { PageLoader } from "./components/Feedback";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import AuthCallback from "./pages/auth/AuthCallback";
import NotFound from "./pages/NotFound";

// Signed-in pages load on demand, so the landing page stays small.
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

/*
 * HashRouter keeps deep links working on static hosts that can't rewrite
 * every path to index.html. Google sign-in redirects to /#/auth/callback.
 */
export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Landing />} />
            <Route path="auth/callback" element={<AuthCallback />} />

            <Route element={<PublicOnly />}>
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
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
    </HashRouter>
  );
}
