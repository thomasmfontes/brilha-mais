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
    return <LandingPage />;
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
