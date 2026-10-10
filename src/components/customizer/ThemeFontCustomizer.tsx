import React, { useState, useEffect } from 'react';
import { Palette, Type, Check, Sparkles, X, RefreshCw } from 'lucide-react';

export interface ThemeConfig {
  fontPreset: string;
  headingFont: string;
  bodyFont: string;
  accentColor: string;
  themeName: string;
  borderRadius: string;
}

export const FONT_PRESETS = [
  {
    id: 'editorial_dm_serif',
    name: 'Editorial Serif (DM Serif & Inter)',
    heading: 'DM Serif Display',
    body: 'Inter',
    googleUrl: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&display=swap',
  },
  {
    id: 'modern_sans',
    name: 'Modern Sans (Inter & Plus Jakarta)',
    heading: 'Plus Jakarta Sans',
    body: 'Inter',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=Inter:wght@400;500;600&display=swap',
  },
  {
    id: 'luxury_monograph',
    name: 'Heritage Monograph (Playfair & Inter)',
    heading: 'Playfair Display',
    body: 'Inter',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600&display=swap',
  },
  {
    id: 'contemporary',
    name: 'Contemporary (Outfit & Inter)',
    heading: 'Outfit',
    body: 'Inter',
    googleUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600&display=swap',
  },
];

export const COLOR_THEMES = [
  { id: 'forest', name: 'Mount Kenya Forest', hex: '#35594B', ring: 'ring-[#35594B]' },
  { id: 'clay', name: 'Rift Valley Clay', hex: '#B66D4D', ring: 'ring-[#B66D4D]' },
  { id: 'ink', name: 'Obsidian Ink', hex: '#252723', ring: 'ring-[#252723]' },
  { id: 'amber', name: 'Nairobi Amber', hex: '#f59e0b', ring: 'ring-amber-500' },
  { id: 'emerald', name: 'Mara Emerald', hex: '#10b981', ring: 'ring-emerald-500' },
];

interface ThemeFontCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeFontCustomizer: React.FC<ThemeFontCustomizerProps> = ({ isOpen, onClose }) => {
  const [selectedFontPreset, setSelectedFontPreset] = useState('editorial_dm_serif');
  const [customHeadingFont, setCustomHeadingFont] = useState('');
  const [selectedColor, setSelectedColor] = useState('#35594B');
  const [customColor, setCustomColor] = useState('#35594B');

  // Load selected Google Font dynamically into head
  useEffect(() => {
    const preset = FONT_PRESETS.find((p) => p.id === selectedFontPreset);
    if (preset) {
      const linkId = 'dynamic-google-fonts-link';
      let link = document.getElementById(linkId) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      link.href = preset.googleUrl;

      // Apply font to CSS variables
      document.documentElement.style.setProperty('--font-serif', `"${preset.heading}", serif`);
      document.documentElement.style.setProperty('--font-sans', `"${preset.body}", sans-serif`);
    }
  }, [selectedFontPreset]);

  // Apply custom font input if provided
  const handleApplyCustomFont = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHeadingFont.trim()) return;

    const fontName = customHeadingFont.trim();
    const encoded = fontName.replace(/\s+/g, '+');
    const linkId = 'dynamic-google-fonts-link';
    let link = document.getElementById(linkId) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap`;

    document.documentElement.style.setProperty('--font-serif', `"${fontName}", serif`);
  };

  const handleSelectColor = (hex: string) => {
    setSelectedColor(hex);
    document.documentElement.style.setProperty('--color-forest', hex);
  };

  const handleResetDefaults = () => {
    setSelectedFontPreset('editorial_dm_serif');
    setSelectedColor('#35594B');
    document.documentElement.style.setProperty('--color-forest', '#35594B');
    document.documentElement.style.setProperty('--color-clay', '#B66D4D');
    document.documentElement.style.setProperty('--font-serif', '"DM Serif Display", serif');
    document.documentElement.style.setProperty('--font-sans', '"Inter", sans-serif');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white border border-[#DCD8CE] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#DCD8CE] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#35594B]/10 border border-[#35594B]/20 flex items-center justify-center text-[#35594B]">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#252723]">Editorial Brand & Font System</h3>
              <p className="text-xs text-[#696B65]">Inspect and adapt live typography and color tokens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#696B65] hover:text-[#252723] hover:bg-[#F4F0E7]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Typographic Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#252723] flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[#35594B]" />
                <span>Typographic Pairings</span>
              </label>
              <span className="text-[11px] text-[#696B65]">Live Web Font Loader</span>
            </div>

            <div className="space-y-2">
              {FONT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedFontPreset(preset.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    selectedFontPreset === preset.id
                      ? 'bg-[#35594B]/5 border-[#35594B] text-[#252723] shadow-sm'
                      : 'bg-white hover:bg-[#FAF8F5] border-[#DCD8CE] text-[#696B65]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-[#252723]">{preset.name}</div>
                    <div className="text-[11px] text-[#696B65]">
                      Headline: <span className="text-[#35594B] font-medium">{preset.heading}</span> · Body: {preset.body}
                    </div>
                  </div>
                  {selectedFontPreset === preset.id && (
                    <div className="w-5 h-5 rounded-full bg-[#35594B] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color Themes */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#252723] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#35594B]" />
              <span>Editorial Color Identity</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleSelectColor(theme.hex)}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                    selectedColor === theme.hex
                      ? 'bg-[#FAF8F5] border-[#35594B] shadow-sm'
                      : 'bg-white hover:bg-[#FAF8F5] border-[#DCD8CE]'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 shadow-inner"
                    style={{ backgroundColor: theme.hex }}
                  />
                  <span className="text-[11px] font-medium text-[#252723] truncate">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Google Font Loader */}
          <div className="space-y-2 pt-2 border-t border-[#DCD8CE]">
            <label className="text-xs font-semibold text-[#252723]">
              Pull Any Google Font from the Web
            </label>
            <p className="text-[11px] text-[#696B65]">
              Type any exact Google Fonts name (e.g., &quot;Cinzel&quot;, &quot;Fraunces&quot;, &quot;Prata&quot;) to test it live:
            </p>
            <form onSubmit={handleApplyCustomFont} className="flex gap-2">
              <input
                type="text"
                value={customHeadingFont}
                onChange={(e) => setCustomHeadingFont(e.target.value)}
                placeholder="Google Font family name..."
                className="flex-1 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3 py-2 text-xs text-[#252723] focus:outline-none focus:border-[#35594B]"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg font-medium text-xs transition-colors shrink-0"
              >
                Load Font
              </button>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#DCD8CE] flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-[#696B65] hover:text-[#252723] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Editorial Defaults</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#35594B] hover:bg-[#29473B] text-white font-medium rounded-lg text-xs transition-colors"
          >
            Apply & Close
          </button>
        </div>

      </div>
    </div>
  );
};
