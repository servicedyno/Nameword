import { motion as Motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1];

export default function Reveal({ as = "div", children, className, delay = 0, ...rest }) {
  const reduced = useReducedMotion();
  const Tag = Motion[as] || Motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
