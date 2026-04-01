import { LucidePlay, LucideStar } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { resolveThumbnail } from "../utils/url";

interface CourseCardProps {
  id: string;
  title: string;
  instructor: any;
  thumbnail: string;
  category: any;
  rating?: number;
  progress?: number;
  isEnrolled?: boolean;
  hideProgress?: boolean;
}

export function CourseCard({ id, title, instructor, thumbnail, category, rating = 0, progress, isEnrolled, hideProgress }: CourseCardProps) {
  const categoryName = typeof category === 'object' ? category?.name : category;
  const instructorName = typeof instructor === 'object' ? instructor?.name : instructor;

  const showProgress = !hideProgress && (isEnrolled || progress !== undefined);
  const progressValue = progress ?? 0;

  return (
    <Link to={`/course/${id}`} className="group block">
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-[border-color,box-shadow,transform] duration-300 hover:border-primary hover:shadow-md hover:shadow-primary/5 h-full flex flex-col">
        {/* Thumbnail Container */}
        <div className="relative aspect-video overflow-hidden bg-slate-100/50">
          <img
            src={resolveThumbnail(thumbnail)}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white bg-primary px-3 py-1.5 rounded-lg shadow-lg">Ver Detalhes</span>
          </div>
          <div className="absolute top-3 left-3">
            <span className="bg-white/95 backdrop-blur-sm text-slate-900 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-slate-200 shadow-sm">
              {categoryName}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="font-black text-slate-900 text-base leading-tight group-hover:text-primary transition-colors line-clamp-2 uppercase tracking-tight">
              {title}
            </h3>

          </div>

          {/* Progress (if enrolled) */}
          {showProgress && (
            <div className="space-y-1.5 pt-2 border-t border-slate-50 min-h-[40px]">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>Progresso</span>
                <span className="text-primary">{progressValue}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressValue}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-primary font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
