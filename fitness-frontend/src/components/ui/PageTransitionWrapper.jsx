// components/PageTransitionWrapper.jsx
import { motion } from 'framer-motion';

const PageTransitionWrapper = ({ children }) => {
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransitionWrapper;
