import { forwardRef } from 'react';
import { cn } from '../../../utils/cn';
import styles from './Container.module.css';

/**
 * Width-capped, horizontally padded wrapper.
 * `size="wide"` opts into the larger container width.
 */
const Container = forwardRef(function Container(
  { as: Tag = 'div', size = 'default', className, children, ...props },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={cn(
        styles.container,
        size === 'wide' && styles.wide,
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
});

Container.displayName = 'Container';

export default Container;