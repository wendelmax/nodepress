/**
 * Native plugins that are enabled for a brand-new installation.
 *
 * Existing installations keep their persisted activation list; this helper is
 * only used by the installer when no activation state exists yet.
 */
export function getDefaultActivePluginIds(): string[] {
  return ['lgpd-consent']
}
