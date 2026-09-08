import { useState, useEffect, useRef } from 'react';

const useDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [positionStyle, setPositionStyle] = useState({});
  const [isPositioned, setIsPositioned] = useState(false);
  const ref = useRef(null);

  const toggle = () => setIsOpen(prev => !prev);
  const close = () => setIsOpen(false);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsPositioned(false);
      return;
    }
    const node = ref.current;
    if (!node) return;
    
    const timer = setTimeout(() => {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const estimatedMenuHeight = 200;
      const spaceBelow = viewportHeight - rect.bottom;
      const shouldDropUp = spaceBelow < estimatedMenuHeight;
      setDropUp(shouldDropUp);

      const right = viewportWidth - rect.right; 
      if (shouldDropUp) {
        const bottom = viewportHeight - rect.top + 8;
        setPositionStyle({ position: 'fixed', right, bottom, top: 'auto' });
      } else {
        const top = rect.bottom + 8;
        setPositionStyle({ position: 'fixed', right, top, bottom: 'auto' });
      }
      setIsPositioned(true);
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);


  useEffect(() => {
    if (!isOpen || !isPositioned) return;
    
    const compute = () => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const estimatedMenuHeight = 200;
      const spaceBelow = viewportHeight - rect.bottom;
      const shouldDropUp = spaceBelow < estimatedMenuHeight;
      setDropUp(shouldDropUp);

      const right = viewportWidth - rect.right;
      if (shouldDropUp) {
        const bottom = viewportHeight - rect.top + 8;
        setPositionStyle({ position: 'fixed', right, bottom, top: 'auto' });
      } else {
        const top = rect.bottom + 8;
        setPositionStyle({ position: 'fixed', right, top, bottom: 'auto' });
      }
    };

    compute();
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
    };
  }, [isOpen, isPositioned]);

  return { isOpen, toggle, close, ref, dropUp, positionStyle, isPositioned };
};

export default useDropdown;