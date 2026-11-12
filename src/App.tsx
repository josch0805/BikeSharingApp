import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import AcceptInvite from "./pages/AcceptInvite";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import Home from "./pages/Home";
import ResourceDetail from "./pages/ResourceDetail";
import BookPage from "./pages/BookPage";
import ReturnPage from "./pages/ReturnPage";
import Admin from "./pages/Admin";
import ProfilePage from "./pages/ProfilePage";

export default function App() {
  const { session, profile, loading, needsPassword, markNeedsPassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === "/einladung") {
    return (
      <AcceptInvite
        onDone={() => {
          markNeedsPassword();
          navigate("/", { replace: true });
        }}
      />
    );
  }
  if (loading) return <div className="center muted">Lädt …</div>;
  if (!session) return <Login />;
  if (needsPassword) return <SetPassword />;

  const isAdmin = profile?.role === "admin";

  return (
    <div className="app">
      <main className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ressource/:id" element={<ResourceDetail />} />
          <Route path="/ressource/:id/buchen" element={<BookPage />} />
          <Route path="/buchung/:id/rueckgabe" element={<ReturnPage />} />
          <Route path="/profil" element={<ProfilePage />} />
          {isAdmin && <Route path="/admin" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end>
          <span className="tab-icon">🚲</span>Übersicht
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin">
            <span className="tab-icon">⚙️</span>Verwaltung
          </NavLink>
        )}
        <NavLink to="/profil">
          <span className="tab-icon">👤</span>Profil
        </NavLink>
      </nav>
    </div>
  );
}
