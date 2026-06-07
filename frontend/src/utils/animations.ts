// utils/animations.ts — Variantes de Framer Motion reutilizables

export const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.3 } }
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

export const fadeInDown = {
  hidden: { opacity: 0, y: -12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
};

export const cardHover = {
  rest:  { scale: 1,    boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  hover: { scale: 1.015, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', transition: { duration: 0.2 } }
};

export const backdropVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.2 } },
  exit:   { opacity: 0, transition: { duration: 0.15 } }
};

export const modalVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  exit:   { opacity: 0, y: 20, scale: 0.97, transition: { duration: 0.18 } }
};

export const drawerVariants = {
  hidden: { x: '-100%' },
  show:   { x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit:   { x: '-100%', transition: { duration: 0.22, ease: 'easeIn' } }
};

export const metricPop = {
  hidden: { opacity: 0, scale: 0.82 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};

export const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
  exit:   { opacity: 0, y: -6, transition: { duration: 0.18 } }
};

export const listItem = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } }
};
