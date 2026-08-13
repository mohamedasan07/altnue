import classNames from '../../utils/classNames'
import styles from './Loader.module.css'

const LOADER_SIZES = { sm: 'sm', md: 'md', lg: 'lg' }
const LOADER_COLORS = { current: 'current', primary: 'primary', light: 'light' }

function Loader({ size = 'md', color = 'primary', className, ...rest }) {
  return (
    <span
      className={classNames(
        styles.loader,
        styles[size],
        styles[color],
        className,
      )}
      role="status"
      aria-label="Loading"
      {...rest}
    />
  )
}

Loader.SIZES = LOADER_SIZES
Loader.COLORS = LOADER_COLORS

export default Loader
