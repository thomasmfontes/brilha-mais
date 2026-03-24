import React from 'react';
import {
    LucideLayoutGrid,
    LucideCpu,
    LucideCode,
    LucideSmartphone,
    LucideLaptop,
    LucideLanguages,
    LucideGlobe,
    LucideUsers,
    LucideUserCheck,
    LucideWallet,
    LucideBanknote,
    LucideTrendingUp,
    LucideBrain,
    LucideScale,
    LucideGavel,
    LucideMic2,
    LucidePresentation,
    LucideBookOpen,
    LucideTrophy,
    LucideStar
} from "lucide-react";

export const getIconComponent = (iconName: string, className: string = "h-5 w-5") => {
    const icons: Record<string, JSX.Element> = {
        LucideLayoutGrid: <LucideLayoutGrid className={className} />,
        LucideCpu: <LucideCpu className={className} />,
        LucideCode: <LucideCode className={className} />,
        LucideSmartphone: <LucideSmartphone className={className} />,
        LucideLaptop: <LucideLaptop className={className} />,
        LucideLanguages: <LucideLanguages className={className} />,
        LucideGlobe: <LucideGlobe className={className} />,
        LucideUsers: <LucideUsers className={className} />,
        LucideUserCheck: <LucideUserCheck className={className} />,
        LucideWallet: <LucideWallet className={className} />,
        LucideBanknote: <LucideBanknote className={className} />,
        LucideTrendingUp: <LucideTrendingUp className={className} />,
        LucideBrain: <LucideBrain className={className} />,
        LucideScale: <LucideScale className={className} />,
        LucideGavel: <LucideGavel className={className} />,
        LucideMic2: <LucideMic2 className={className} />,
        LucidePresentation: <LucidePresentation className={className} />,
        LucideBookOpen: <LucideBookOpen className={className} />,
        LucideTrophy: <LucideTrophy className={className} />,
        LucideStar: <LucideStar className={className} />
    };
    return icons[iconName] || <LucideLayoutGrid className={className} />;
};
