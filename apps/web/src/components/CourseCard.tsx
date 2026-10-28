import { LucidePlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { resolveThumbnail } from "../utils/url";

interface CourseCardProps {
  id: string;
  title: string;
  instructor?: any;
  thumbnail: string;
  category?: any;
  rating?: number;
  progress?: number;
  isEnrolled?: boolean;
  hideProgress?: boolean;
}

export function CourseCard({ id, title, instructor, thumbnail, category, rating = 0, progress, isEnrolled, hideProgress }: CourseCardProps) {
  const categoryName = typeof category === 'object' ? (category as any)?.categoryName || (category as any)?.name : (category || 'Sem categoria');
  const instructorName = typeof instructor === 'object' ? instructor?.name : instructor;

  const showProgress = !hideProgress && (isEnrolled || progress !== undefined);
  const progressValue = progress ?? 0;

  return (
    <Link to={`/course/${id}`} className="group block h-full">
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden transition-all duration-200 hover:border-zinc-300 hover:shadow-sm h-full flex flex-col">
        {/* Thumbnail Container */}
        <div className="relative aspect-video overflow-hidden bg-zinc-100">
          <img
            src={resolveThumbnail(thumbnail)}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Subtle Hover Action Overlay */}
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-zinc-900 text-xs font-semibold shadow-sm">
              <LucidePlayCircle className="w-4 h-4 text-[#F19B0A]" />
              Ver curso
            </span>
          </div>

          {/* Clean Category Badge */}
          {categoryName && (
            <div className="absolute top-3 left-3">
              <span className="bg-white/90 backdrop-blur-md text-zinc-800 px-2.5 py-0.5 rounded-full text-xs font-medium border border-zinc-200/60 shadow-2xs">
                {categoryName}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-zinc-900 text-base leading-snug group-hover:text-[#F19B0A] transition-colors line-clamp-2">
              {title}
            </h3>
            {instructorName && (
              <p className="text-xs text-zinc-500 line-clamp-1">{instructorName}</p>
            )}
          </div>

          {/* Progress Bar (if enrolled) */}
          {showProgress && (
            <div className="space-y-1.5 pt-3 border-t border-zinc-100">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Progresso</span>
                <span className="font-semibold text-zinc-700">{progressValue}%</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressValue}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-[#F19B0A]"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
