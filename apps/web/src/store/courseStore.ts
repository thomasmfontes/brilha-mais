import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

export type ContentType = 'VIDEO' | 'PDF' | 'QUIZ' | 'ESSAY';

export interface QuizOption {
    text: string;
    isCorrect: boolean;
}

export interface QuizQuestion {
    text: string;
    options: QuizOption[];
}

export interface Material {
    id: string;
    name: string;
    url: string;
    type: string;
    size: string;
}

export interface Lesson {
    id: string;
    title: string;
    duration: string;
    completed: boolean;
    contentType: ContentType;
    youtubeId?: string;
    pdfUrl?: string;
    quiz?: {
        questions: QuizQuestion[];
    };
    materials?: Material[];
    deadline?: string;
}

export interface Module {
    id: string;
    title: string;
    lessons: Lesson[];
}

export interface Course {
    id: string;
    title: string;
    instructor: string;
    instructorObject?: { name: string };
    thumbnail: string;
    category: string; // Keep for legacy/string display
    categoryName?: string;
    categoryObject?: { id: string; name: string };
    rating: number;
    description: string;
    modules: Module[];
    progress?: number;
    lastLesson?: string;
    lastLessonId?: string;
    isEnrolled?: boolean;
    students?: string | number;
    status?: string;
    views?: string;
    isPublished?: boolean;
    isGlobal?: boolean;
    categoryId?: string;
    instructorId?: string;
    youtubeUrl?: string;
    createdAt?: string;
    updatedAt?: string;
    lastAccessedAt?: string;
}

interface CourseStore {
    courses: Course[];           // All public courses (used by Explore, Dashboard)
    myCourses: Course[];         // Enrolled courses only (used by MyCoursesPage)
    instructorCourses: Course[];
    isLoading: boolean;
    isMyCoursesLoading: boolean;
    fetchCourses: (silent?: boolean) => Promise<void>;
    fetchMyCourses: (silent?: boolean) => Promise<void>;
    fetchInstructorCourses: (silent?: boolean) => Promise<void>;
    fetchCourseById: (id: string) => Promise<void>;
    addCourse: (course: Partial<Course>) => Promise<void>;
    updateCourse: (id: string, course: Partial<Course>) => Promise<void>;
    removeCourse: (id: string) => Promise<void>;
    enrollInCourse: (id: string) => Promise<void>;
    toggleLessonCompletion: (lessonId: string, completed: boolean, quizAnswers?: Record<number, number>) => Promise<void>;
}

export const useCourseStore = create<CourseStore>()(
    persist(
        (set, get) => ({
            courses: [],
            myCourses: [],
            instructorCourses: [],
            isLoading: false,
            isMyCoursesLoading: false,
            fetchCourses: async (silent = false) => {
                if (!silent) set({ isLoading: true });
                try {
                    const { data } = await api.get(`/courses?t=${Date.now()}`);
                    set({ courses: data });
                } catch (error) {
                    console.error("Error fetching courses:", error);
                } finally {
                    if (!silent) set({ isLoading: false });
                }
            },
            fetchMyCourses: async (silent = false) => {
                // Uses a SEPARATE state slice to avoid conflicts with fetchCourses()
                if (!silent) set({ isMyCoursesLoading: true });
                try {
                    const { data } = await api.get(`/courses/my?t=${Date.now()}`);
                    set({ myCourses: data });
                } catch (error) {
                    console.error("Error fetching my courses:", error);
                } finally {
                    if (!silent) set({ isMyCoursesLoading: false });
                }
            },
            fetchInstructorCourses: async (silent = false) => {
                if (!silent) set({ isLoading: true });
                try {
                    const { data } = await api.get(`/courses/instructor?t=${Date.now()}`);
                    set({ instructorCourses: data });
                } catch (error) {
                    console.error("Error fetching instructor courses:", error);
                } finally {
                    if (!silent) set({ isLoading: false });
                }
            },
            fetchCourseById: async (id) => {
                try {
                    const { data } = await api.get(`/courses/${id}`);
                    set(state => ({
                        courses: state.courses.some(c => c.id === id)
                            ? state.courses.map(c => c.id === id ? data : c)
                            : [...state.courses, data]
                    }));
                } catch (error) {
                    console.error("Error fetching course by id:", error);
                }
            },
            addCourse: async (courseData) => {
                try {
                    await api.post('/courses', courseData);
                    get().fetchCourses();
                } catch (error) {
                    console.error("Error adding course:", error);
                }
            },
            updateCourse: async (id, courseData) => {
                try {
                    await api.put(`/courses/${id}`, courseData);
                    get().fetchCourses();
                } catch (error) {
                    console.error("Error updating course:", error);
                }
            },
            removeCourse: async (id) => {
                try {
                    await api.delete(`/courses/${id}`);
                    get().fetchCourses();
                } catch (error) {
                    console.error("Error removing course:", error);
                }
            },
            enrollInCourse: async (id) => {
                try {
                    await api.post('/enrollments', { courseId: id });
                    await get().fetchCourseById(id);
                    // Also refresh myCourses silently
                    get().fetchMyCourses(true);
                } catch (error) {
                    console.error("Error enrolling:", error);
                }
            },
            toggleLessonCompletion: async (lessonId, completed, quizAnswers) => {
                // Optimistic update
                set(state => ({
                    courses: state.courses.map(course => ({
                        ...course,
                        modules: (course.modules || []).map(mod => ({
                            ...mod,
                            lessons: (mod.lessons || []).map(lesson =>
                                lesson.id === lessonId ? { ...lesson, completed, quizAnswers } : lesson
                            )
                        }))
                    }))
                }));

                try {
                    await api.post('/progress/toggle', { lessonId, completed, quizAnswers });
                } catch (error) {
                    console.error("Error toggling lesson completion:", error);
                    // Revert on error
                    set(state => ({
                        courses: state.courses.map(course => ({
                            ...course,
                            modules: (course.modules || []).map(mod => ({
                                ...mod,
                                lessons: (mod.lessons || []).map(lesson =>
                                    lesson.id === lessonId ? { ...lesson, completed: !completed } : lesson
                                )
                            }))
                        }))
                    }));
                }
            },
        }),
        {
            name: 'brilha-mais-courses',
        }
    )
);
