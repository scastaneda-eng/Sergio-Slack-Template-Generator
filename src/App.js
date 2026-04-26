import React, { useCallback, useRef, useState } from 'react';
import { getPalette } from 'colorthief';
import './App.css';
import slackAppIcon from './slack-app-icon.jpeg';

const rgbToHex = (r, g, b) => {
  const toHex = (value) => value.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// WCAG relative luminance for an sRGB color
const relLuminance = (r, g, b) => {
  const toLin = (c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
};

// WCAG contrast ratio between two RGB triplets (1.0 = identical, 21.0 = max)
const contrastRatio = (rgb1, rgb2) => {
  const L1 = relLuminance(...rgb1);
  const L2 = relLuminance(...rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Pick whichever of white or near-black gives the best contrast against bg
const bestForeground = (rgb) => {
  const whiteRatio = contrastRatio(rgb, [255, 255, 255]);
  const darkRatio = contrastRatio(rgb, [29, 28, 29]);
  return whiteRatio >= darkRatio
    ? { hex: '#FFFFFF', ratio: whiteRatio }
    : { hex: '#1D1C1D', ratio: darkRatio };
};

// WCAG AA: 4.5 for normal text, 3.0 for large/bold text
const gradeContrast = (ratio) => {
  if (ratio >= 4.5) return 'good';
  if (ratio >= 3.0) return 'fair';
  return 'poor';
};

function App() {
  const [imagePreview, setImagePreview] = useState(null);
  const [colors, setColors] = useState([]);
  const [themeString, setThemeString] = useState('');
  const [error, setError] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const hiddenImageRef = useRef(null);
  const previewRef = useRef(null);

  const resetResults = () => {
    setColors([]);
    setThemeString('');
    setError('');
    setCopied(false);
  };

  const handleFile = useCallback((file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, SVG, etc.).');
      return;
    }

    resetResults();

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setImagePreview(result);
      }
    };
    reader.onerror = () => {
      setError('Could not read this image file. Please try another one.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = (event) => {
    const file = event.target.files && event.target.files[0];
    handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    handleFile(file);
  };

  const handleImageLoad = async () => {
    const img = hiddenImageRef.current;
    if (!img) return;

    try {
      setIsExtracting(true);
      const palette = await getPalette(img, { colorCount: 4 });

      if (!Array.isArray(palette) || palette.length === 0) {
        setError('Unable to extract colors from this image.');
        setColors([]);
        setThemeString('');
        return;
      }
      const hexColors = palette.map((color) => {
        const { r, g, b } = color.rgb();
        return rgbToHex(r, g, b);
      });

      const finalTheme = hexColors.join(', ');

      setColors(
        palette.map((color, index) => {
          const { r, g, b } = color.rgb();
          return {
            id: `${r}-${g}-${b}-${index}`,
            rgb: [r, g, b],
            hex: hexColors[index],
          };
        }),
      );
      setThemeString(finalTheme);
      setError('');

      // Surprise-and-delight reveal: scroll so BOTH the palette (Box 2)
      // and the live preview (Box 3) are visible together, and play a
      // brief glow pulse on the preview card. Honor reduced-motion users.
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => {
        const previewEl = previewRef.current;
        if (!previewEl) return;
        // Aim for ~35% of viewport height of headroom above the preview
        // card. That keeps the just-generated palette in view while still
        // bringing the preview prominently into focus.
        const headroom = Math.max(160, window.innerHeight * 0.35);
        const targetY = previewEl.getBoundingClientRect().top + window.scrollY - headroom;
        window.scrollTo({
          top: Math.max(0, targetY),
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }, 250);
      setJustRevealed(true);
      window.setTimeout(() => setJustRevealed(false), 1800);
    } catch (error) {
      console.error('Color extraction failed', error);
      setError('Something went wrong while extracting colors. Check the console for details and try another image.');
      setColors([]);
      setThemeString('');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyTheme = async () => {
    if (!themeString) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(themeString);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const previewBg = colors[0]?.hex ?? '#3F0E40';
  const previewSelected = colors[1]?.hex ?? '#1164A3';
  const previewAccent = colors[3]?.hex ?? '#ECB22E';

  // Compute the best foreground color for each Slack-sidebar surface independently.
  // Without this, we end up using the sidebar's foreground color on the active item
  // (which has a different background), making channel names invisible.
  const sideFg = colors[0] ? bestForeground(colors[0].rgb) : { hex: '#FFFFFF', ratio: 21 };
  const selectedFg = colors[1] ? bestForeground(colors[1].rgb) : { hex: '#FFFFFF', ratio: 21 };
  const accentFg = colors[3] ? bestForeground(colors[3].rgb) : { hex: '#FFFFFF', ratio: 21 };

  // Overall readability grade — the worst surface wins.
  const themeReadability = (() => {
    if (colors.length === 0) return null;
    const ratios = [sideFg.ratio, selectedFg.ratio, accentFg.ratio];
    const worst = Math.min(...ratios);
    return { grade: gradeContrast(worst), ratio: worst };
  })();

  return (
    <div className="App">
      <div className="app-shell">
        <header className="app-header">
          <img
            src={slackAppIcon}
            alt="Slack"
            className="app-logo-icon"
          />
          <div>
            <h1>Slack Theme Generator</h1>
            <p className="app-subtitle">
              Drop in a logo, get a Slack sidebar theme you can paste directly into Slack. Perfectly matched to your customer's brand.
            </p>
          </div>
        </header>

        <main className="app-main">
          <section className="card upload-card">
            <h2 className="card-title">1. Upload your logo</h2>
            <div className="upload-card-body">
              <p className="card-subtitle">
                Drag &amp; drop a file here or click to browse.
              </p>
              <label
                className="upload-area"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                />
                <div className="upload-content">
                  {imagePreview ? (
                    <div className="upload-preview">
                      <img src={imagePreview} alt="Uploaded logo preview" />
                    </div>
                  ) : (
                    <>
                      <div className="upload-icon">＋</div>
                      <div className="upload-text">
                        <span className="upload-main">Drop logo image here</span>
                        <span className="upload-secondary">PNG, JPG, SVG up to ~5MB</span>
                      </div>
                    </>
                  )}
                </div>
              </label>
              {error && <p className="error-text">{error}</p>}
            </div>
          </section>

          <section className="card results-card">
            <h2 className="card-title">2. Palette &amp; Slack theme</h2>
            <p className="card-subtitle">
              The 4 most dominant colors detected — paste the string into{' '}
              <span className="theme-highlight">
                Slack › Preferences › Sidebar › Custom theme
              </span>
              .
            </p>

            {isExtracting && (
              <p className="status-text">Analyzing colors&hellip;</p>
            )}

            {!isExtracting && colors.length === 0 && (
              <div className="color-grid color-grid-placeholder">
                {[0, 1, 2, 3].map((i) => (
                  <div className="color-swatch color-swatch-placeholder" key={i}>
                    <div className="color-chip color-chip-placeholder" />
                    <div className="color-meta">
                      <span className="color-label">Color {i + 1}</span>
                      <span className="color-hex">—</span>
                      <span className="color-rgb">Awaiting logo</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {colors.length > 0 && (
              <div className="color-grid">
                {colors.map((color, index) => (
                  <div className="color-swatch" key={color.id}>
                    <div
                      className="color-chip"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="color-meta">
                      <span className="color-label">Color {index + 1}</span>
                      <span className="color-hex">{color.hex}</span>
                      <span className="color-rgb">
                        rgb({color.rgb[0]}, {color.rgb[1]}, {color.rgb[2]})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="theme-section">
              <div className="theme-input-row">
                <textarea
                  className="theme-textarea"
                  value={themeString}
                  readOnly
                  placeholder="Your Slack theme string will appear here after uploading a logo."
                  rows={3}
                />
                <button
                  type="button"
                  className="copy-button"
                  disabled={!themeString}
                  onClick={handleCopyTheme}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="theme-help-text">
                The values map to your Slack sidebar colors from left to right
                (background, active item, hover, text, and accents).
              </p>
              <div
                className={`readability readability-${themeReadability ? themeReadability.grade : 'empty'}`}
              >
                <span className="readability-dot" aria-hidden="true" />
                <span className="readability-label">
                  {!themeReadability && 'Readability check'}
                  {themeReadability?.grade === 'good' && 'Good readability'}
                  {themeReadability?.grade === 'fair' && 'Fair readability'}
                  {themeReadability?.grade === 'poor' && 'Poor readability — text may be hard to read'}
                </span>
                <span className="readability-ratio" title="WCAG contrast ratio (worst surface)">
                  {themeReadability ? `${themeReadability.ratio.toFixed(1)}:1` : '—'}
                </span>
              </div>
            </div>
          </section>
        </main>

        <section
          ref={previewRef}
          className={`card preview-card${justRevealed ? ' preview-card-revealed' : ''}`}
          style={{ '--reveal-glow': previewAccent }}
        >
          <h2 className="card-title">3. Live sidebar preview</h2>
          <p className="card-subtitle">How your theme looks applied to a Slack workspace.</p>
          <div className="sidebar-preview">
            <div className="sp-side" style={{ background: previewBg, color: sideFg.hex }}>
              <div className="sp-ws">Your Workspace</div>
              <div
                className="sp-row selected"
                style={{ background: previewSelected, color: selectedFg.hex }}
              >
                <span className="sp-hash">#</span>general
              </div>
              <div className="sp-row">
                <span className="sp-hash">#</span>design
              </div>
              <div className="sp-row">
                <span className="sp-hash">#</span>random
              </div>
              <div className="sp-row sp-mentions" style={{ color: sideFg.hex }}>
                <span className="sp-mentions-dot" style={{ background: previewAccent }} aria-hidden="true" />
                @ mentions · 3
              </div>
            </div>
            <div className="sp-main">
              <div className="sp-msg">
                <div className="sp-av">RK</div>
                <div className="sp-body">
                  <b>Riley K.</b>Live preview of your sidebar theme 🎨
                </div>
              </div>
              <div className="sp-msg">
                <div className="sp-av" style={{ background: '#2EB67D' }}>MO</div>
                <div className="sp-body">
                  <b>Marcus O.</b>Looks great with the brand colors
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="app-footer">
          Created and maintained by Sergio Castaneda, Slack Solution Engineer
        </footer>
      </div>

      {imagePreview && (
        <img
          ref={hiddenImageRef}
          src={imagePreview}
          alt="Hidden logo for color extraction"
          className="hidden-image"
          crossOrigin="anonymous"
          onLoad={handleImageLoad}
        />
      )}
    </div>
  );
}

export default App;
