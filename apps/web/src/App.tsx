import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import CoursePage from "./pages/CoursePage";
import InstructorDashboard from "./pages/InstructorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ExplorePage from "./pages/ExplorePage";
import CertificatesPage from "./pages/CertificatesPage";
import InstructorSyllabus from "./pages/InstructorSyllabus";
import InstructorCourseProgress from "./pages/InstructorCourseProgress";
import MyCoursesPage from "./pages/MyCoursesPage";
import ResourcesPage from "./pages/ResourcesPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import { AppLayout } from "./layouts/AppLayout";
import { Toaster } from "react-hot-toast";
import logo from "./assets/logo.png";

// Simplified Home Page
function Home() {
    return (
        <div className="bg-background text-foreground">
            <LandingPage />

            {/* Footer */}
            <footer className="py-16 border-t border-border px-4 bg-card">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                    <img src={logo} alt="Brilha Mais" className="h-10 w-auto" />
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-muted-foreground">&copy; 2026 Brilha Mais. Experiência de aprendizado premium.</p>
                        <div className="flex gap-4 justify-center md:justify-start text-xs text-muted-foreground">
                            <Link to="/terms" className="hover:text-primary transition-colors">Termos de Uso</Link>
                            <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Toaster position="bottom-right" toastOptions={{
                duration: 4000,
                style: {
                    background: '#fff',
                    color: '#0f172a',
                    fontWeight: 'bold',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                },
            }} />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />

                {/* Persistent Layout for Authenticated Routes */}
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/course/:id" element={<CoursePage />} />
                    <Route path="/instructor" element={<InstructorDashboard />} />
                    <Route path="/instructor/course/:id/syllabus" element={<InstructorSyllabus />} />
                    <Route path="/instructor/course/:id/progress" element={<InstructorCourseProgress />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/my-courses" element={<MyCoursesPage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/certificates" element={<CertificatesPage />} />
                    <Route path="/resources" element={<ResourcesPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
