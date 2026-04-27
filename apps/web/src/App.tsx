import React, { useState, useEffect } from "react";
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
import InstructorSubmissions from "./pages/InstructorSubmissions";
import MyCoursesPage from "./pages/MyCoursesPage";
import ResourcesPage from "./pages/ResourcesPage";
import TermosPage from "./pages/TermosPage";
import PrivacidadePage from "./pages/PrivacidadePage";
import { AppLayout } from "./layouts/AppLayout";
import { Toaster } from "react-hot-toast";
import UpdateNotifier from "./components/UpdateNotifier";
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
                        <p className="text-sm text-muted-foreground">&copy; 2026 Brilha Mais</p>
                        <div className="flex gap-4 justify-center md:justify-start text-xs text-muted-foreground">
                            <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
                            <Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function App() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <BrowserRouter>
            <Toaster 
                position={isMobile ? "top-center" : "bottom-right"} 
                containerStyle={{
                    bottom: isMobile ? 120 : 40,
                    top: isMobile ? 96 : 'auto',
                }}
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#fff',
                        color: '#0f172a',
                        fontWeight: 'bold',
                        borderRadius: '1rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    },
                }} 
            />
            <UpdateNotifier />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/termos" element={<TermosPage />} />
                <Route path="/privacidade" element={<PrivacidadePage />} />

                {/* Persistent Layout for Authenticated Routes */}
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/course/:id" element={<CoursePage />} />
                    <Route path="/instructor" element={<InstructorDashboard />} />
                    <Route path="/instructor/course/:id/syllabus" element={<InstructorSyllabus />} />
                    <Route path="/instructor/course/:id/progress" element={<InstructorCourseProgress />} />
                    <Route path="/instructor/submissions" element={<InstructorSubmissions />} />
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
