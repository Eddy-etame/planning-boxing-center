"use client";

import { motion } from "framer-motion";

export const BlurFade = ({
  children,
  duration = 0.4,
  delay = 0,
  yOffset = 8,
  inView = true,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, filter: "blur(6px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
