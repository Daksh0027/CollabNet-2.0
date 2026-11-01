import { SwitchV2 } from '@juspay/blend-design-system'
import { content } from '../content'
import { useThemeMode } from '../blend/themeMode'
import { Logo } from './Logo'

export function Footer() {
  const { footer } = content
  const { mode, setMode } = useThemeMode()
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div className="site-footer__brand">
          <Logo />
          <p className="site-footer__blurb">{footer.blurb}</p>
        </div>
        <nav className="site-footer__columns" aria-label="Footer">
          {footer.columns.map((column) => (
            <div key={column.title} className="site-footer__column">
              <h2 className="site-footer__heading">{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a className="footer-link" href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="site-footer__bottom">
        <p className="site-footer__legal">{footer.legal}</p>
        <div className="site-footer__theme">
          <SwitchV2
            id="footer-theme-switch"
            label={footer.themeLabel}
            checked={mode === 'dark'}
            onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
          />
        </div>
      </div>
    </footer>
  )
}
