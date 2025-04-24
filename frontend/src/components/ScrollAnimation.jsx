import { useEffect, useRef } from 'react';

const ScrollAnimation = ({ children, animationClass, delay = 0, threshold = 0.1 }) => {
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // When element is visible, add the animation class
          setTimeout(() => {
            entry.target.classList.add(animationClass);
          }, delay);
          
          // Once animation has been triggered, stop observing
          observer.unobserve(entry.target);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: threshold,
      }
    );

    const currentElement = elementRef.current;
    
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [animationClass, delay, threshold]);

  return (
    <div ref={elementRef} className="animated" style={{ opacity: 0 }}>
      {children}
    </div>
  );
};

export default ScrollAnimation; 