import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { siteEn } from './site.en';
import { siteEs } from './site.es';
import { siteFr } from './site.fr';

// `site` holds the offshore / privacy-first brand copy (marketing pages, nav, footer, app shell).
export const translations = {
  en: { ...en, site: siteEn },
  es: { ...es, site: siteEs },
  fr: { ...fr, site: siteFr }
};

export { en, es, fr };
