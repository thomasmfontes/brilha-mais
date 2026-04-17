import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface CountUpProps {
    value: number;
    duration?: number;
}

const CountUp = ({ value, duration = 0.8 }: CountUpProps) => {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest));

    useEffect(() => {
        const controls = animate(count, value, { 
            duration,
            ease: "easeOut" 
        });
        return controls.stop;
    }, [value, count, duration]);

    return <motion.span>{rounded}</motion.span>;
};

export default CountUp;
