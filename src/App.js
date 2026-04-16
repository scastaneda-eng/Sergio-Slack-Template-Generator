import React, { useCallback, useRef, useState } from 'react';
import { getPalette } from 'colorthief';
import './App.css';
import slackLogo from './slack-logo.png';
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

      // Slack sidebar theme: comma-separated hex codes (4 colors).
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
      // eslint-disable-next-line no-console
      console.log(error);
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error('Copy failed', err);
    }
  };

  return (
    <div className="App">
      <div className="app-shell">
        <header className="app-header">
          <div className="app-brand">
            <div className="app-logo">
              <img
               src={slackLogo}
               alt="Slack logo"
               className="app-logo-icon"
             />
            </div>
          </div>
          <div>
            <h1>Slack Theme Generator</h1>
            <p className="app-subtitle">
              Drop in a logo, get a Slack sidebar theme you can paste directly into Slack. Perfectly matched to your customer's brand
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
            <h2 className="card-title">2. Generated palette</h2>
            <p className="card-subtitle">
              These are the 4 most dominant colors detected from your logo.
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
              <h3 className="theme-title">3. Slack sidebar theme</h3>
              <p className="theme-description">
                Copy this string and paste it into{' '}
                <span className="theme-highlight">
                  Slack &gt; Preferences &gt; Sidebar &gt; Custom theme
                </span>
                .
              </p>

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
