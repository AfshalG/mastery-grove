// 3D text uses a font bundled with the app, so it never waits on a font CDN and works offline.
// The 3D text library reads .woff (not .woff2).
import nunitoExtraBold from '@fontsource/nunito/files/nunito-latin-800-normal.woff?url';

export const FONT_3D = nunitoExtraBold;
