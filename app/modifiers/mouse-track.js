import { modifier } from 'ember-modifier';

export default modifier(function mouseTrack(element, positional, named) {
  const onMouseEnter = () => {
    window.electronAPI.setIgnoreMouse(false);
  };

  const onMouseLeave = () => {
    window.electronAPI.setIgnoreMouse(true, { forward: true });
  };

  element.addEventListener('mouseenter', onMouseEnter);
  element.addEventListener('mouseleave', onMouseLeave);

  // Cleanup function
  return () => {
    element.removeEventListener('mouseenter', onMouseEnter);
    element.removeEventListener('mouseleave', onMouseLeave);
    // Ensure mouse ignore is set to true when element is destroyed
    window.electronAPI.setIgnoreMouse(true, { forward: true });
  };
});
