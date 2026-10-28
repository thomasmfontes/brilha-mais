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
import InstructorMeetings from "./pages/InstructorMeetings";
import MeetingProjection from "./pages/MeetingProjection";
import MeetingScanner from "./pages/MeetingScanner";
import { AppLayout } from "./layouts/AppLayout";
import { Toaster } from "react-hot-toast";
import UpdateNotifier from "./components/UpdateNotifier";
import logo from "./assets/logo.png";

// Clean Minimal Home Page
function Home() {
    return (
        <div className="bg-[#FAFAF9] text-zinc-900 min-h-screen flex flex-col justify-between">
            <LandingPage />

            {/* Minimalist Footer */}
            <footer className="w-full border-t border-zinc-200/70 bg-white py-8 px-6 sm:px-8 mt-auto">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link to="/" aria-label="Brilha Mais" className="flex items-center gap-2 focus:outline-none">
                        <img src={logo} alt="Brilha Mais" className="h-8 w-auto hover:opacity-85 transition-opacity" />
                    </Link>

                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs text-zinc-500">
                        <span>&copy; 2026 Brilha Mais</span>
                        <div className="flex items-center gap-4">
                            <Link to="/termos" className="hover:text-zinc-900 transition-colors">Termos de Uso</Link>
                            <span className="text-zinc-300">·</span>
                            <Link to="/privacidade" className="hover:text-zinc-900 transition-colors">Privacidade</Link>
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
                    top: isMobile ? 75 : 'auto',
                    zIndex: 999999,
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
                <Route path="/instructor/meeting/:id/project" element={<MeetingProjection />} />

                {/* Persistent Layout for Authenticated Routes */}
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/scan" element={<MeetingScanner />} />
                    <Route path="/course/:id" element={<CoursePage />} />
                    <Route path="/instructor" element={<InstructorDashboard />} />
                    <Route path="/instructor/course/:id/syllabus" element={<InstructorSyllabus />} />
                    <Route path="/instructor/course/:id/progress" element={<InstructorCourseProgress />} />
                    <Route path="/instructor/submissions" element={<InstructorSubmissions />} />
                    <Route path="/instructor/turma/:id/meetings" element={<InstructorMeetings />} />
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

export default App;
