import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react';
import {
  fetchPlacePredictions,
  resolvePlaceDetails,
  directGeocode,
  PlaceResult,
} from '../services/googlePlaces';

interface PlaceAutocompleteInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: PlaceResult;
  onChange: (result: PlaceResult) => void;
}

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
}) => {
  const [inputText, setInputText] = useState(value.name || '');
  const [predictions, setPredictions] = useState<{ description: string; placeId: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setInputText(value.name || '');
  }, [value.name]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text || text.trim().length < 2) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await fetchPlacePredictions(text);
        setPredictions(results);
      } catch {
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);
  };

  const handleSelectPrediction = async (prediction: { description: string; placeId: string }) => {
    setIsLoading(true);
    setIsOpen(false);
    setInputText(prediction.description);

    try {
      const details = await resolvePlaceDetails(prediction.placeId, prediction.description);
      if (details) {
        onChange(details);
        setInputText(details.name);
      }
    } catch {
      // Fallback geocode
      const direct = await directGeocode(prediction.description);
      if (direct) {
        onChange(direct);
        setInputText(direct.name);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
      if (inputText.trim()) {
        setIsLoading(true);
        const res = await directGeocode(inputText.trim());
        if (res) {
          onChange(res);
          setInputText(res.name);
        }
        setIsLoading(false);
      }
    }
  };

  const handleClear = () => {
    setInputText('');
    setPredictions([]);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
        <span>{label}</span>
        {value.code && (
          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            {value.code}
          </span>
        )}
      </label>

      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          ) : (
            <MapPin className="w-4 h-4 text-slate-500" />
          )}
        </div>

        <input
          id={id}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
        />

        {inputText && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 rounded-md"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between">
            <span>Google Places Suggestions</span>
            <span className="text-[9px] lowercase font-normal">powered by google</span>
          </div>

          <ul className="divide-y divide-slate-100">
            {predictions.map((p) => (
              <li key={p.placeId}>
                <button
                  type="button"
                  onClick={() => handleSelectPrediction(p)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {p.description}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
