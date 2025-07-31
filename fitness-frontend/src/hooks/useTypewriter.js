import { useEffect, useRef, useState } from 'react';

const useTypewriter = (texts, options = {}) => {
  const {
    typingSpeed = 70,
    deletingSpeed = 30,
    pauseDuration = 2000,
    loop = true
  } = options;

  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopIndex, setLoopIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleTyping = () => {
      const currentString = texts[loopIndex];
      
      if (isDeleting) {
        // Deleting logic
        if (charIndex > 0) {
          setCurrentText(currentString.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setIsComplete(false);
          
          if (loop) {
            // Move to next text or back to first
            const nextIndex = (loopIndex + 1) % texts.length;
            setLoopIndex(nextIndex);
          }
        }
      } else {
        // Typing logic
        if (charIndex < currentString.length) {
          setCurrentText(currentString.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          // Finished typing
          setIsComplete(true);
          setIsDeleting(true);
        }
      }
    };

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set up next timeout
    timeoutRef.current = setTimeout(() => {
      handleTyping();
    }, isDeleting ? deletingSpeed : (isComplete ? pauseDuration : typingSpeed));

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [charIndex, isDeleting, isComplete, loopIndex, texts, typingSpeed, deletingSpeed, pauseDuration, loop]);

  return currentText;
};

export default useTypewriter;