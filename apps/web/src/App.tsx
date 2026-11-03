import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import CoursePage from "./pages/CoursePage";
import InstructorDashboard from "./pages/InstructorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCompaniesPage from "./pages/AdminCompaniesPage";
import ExplorePage from "./pages/ExplorePage";
import CertificatesPage from "./pages/CertificatesPage";
import StudentResumePage from "./pages/StudentResumePage";
import CompanyActivationPage from "./pages/CompanyActivationPage";
import CompanyPortalPage from "./pages/CompanyPortalPage";
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
    return <LandingPage />;
}

// Fallback for external redirected routes caught by stale service worker
function RepositorioRedirect() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                const unregisterPromises = registrations.map((r) => r.unregister());
                Promise.all(unregisterPromises).finally(() => {
                    window.location.reload();
                });
            }).catch(() => {
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
    }, []);

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-50">
            <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                <p className="text-sm font-medium text-zinc-600">Redirecionando para o repositório...</p>
            </div>
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
                        background: '#ffffff',
                        color: '#09090b',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        borderRadius: '0.875rem',
                        border: '1px solid rgba(228, 228, 231, 0.9)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                    },
                }} 
            />
            <UpdateNotifier />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/termos" element={<TermosPage />} />
                <Route path="/privacidade" element={<PrivacidadePage />} />
                <Route path="/empresa/ativar" element={<CompanyActivationPage />} />
                <Route path="/empresa" element={<CompanyPortalPage />} />
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
                    <Route path="/admin/empresas" element={<AdminCompaniesPage />} />
                    <Route path="/my-courses" element={<MyCoursesPage />} />
                    <Route path="/explore" element={<ExplorePage />} />
                    <Route path="/certificates" element={<CertificatesPage />} />
                    <Route path="/resources" element={<ResourcesPage />} />
                    <Route path="/curriculo" element={<StudentResumePage />} />
                </Route>

                {/* Repositório fallback for stale service workers */}
                <Route path="/repositorio/*" element={<RepositorioRedirect />} />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App;
