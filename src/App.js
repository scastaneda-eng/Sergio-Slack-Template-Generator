import React, { useCallback, useRef, useState } from 'react';
import { getPalette } from 'colorthief';
import './App.css';
import slackAppIcon from './slack-app-icon.jpeg';

const rgbToHex = (r, g, b) => {
  const toHex = (value) => value.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

function App() {
  const [imagePreview, setImagePreview] = useState(null);
  const [colors, setColors] = useState([]);
  const [themeString, setThemeString] = useState('');
  const [error, setError] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [copied, setCopied] = useState(false);
  const hiddenImageRef = useRef(null);

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
  const previewFg = (() => {
    if (colors.length === 0) return '#fff';
    const [r, g, b] = colors[0].rgb;
    const lum = (r * 299 + g * 587 + b * 114) / 1000;
    return lum < 128 ? '#fff' : '#1D1C1D';
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
              <p className="status-text status-text-muted">
                Upload a logo to see its palette and Slack theme.
              </p>
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
            </div>
          </section>
        </main>

        <section className="card preview-card">
          <h2 className="card-title">3. Live sidebar preview</h2>
          <p className="card-subtitle">How your theme looks applied to a Slack workspace.</p>
          <div className="sidebar-preview">
            <div className="sp-side" style={{ background: previewBg, color: previewFg }}>
              <div className="sp-ws">Your Workspace</div>
              <div
                className="sp-row selected"
                style={{ background: previewSelected, color: previewFg }}
              >
                <span className="sp-hash">#</span>general
              </div>
              <div className="sp-row">
                <span className="sp-hash">#</span>design
              </div>
              <div className="sp-row">
                <span className="sp-hash">#</span>random
              </div>
              <div className="sp-row" style={{ color: previewAccent, fontWeight: 900 }}>
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
