import type { FontStyle } from '../../types';

const fonts: { value: FontStyle; label: string; className: string }[] = [
  { value: 'sans-serif', label: 'Sans', className: 'font-sans' },
  { value: 'caveat', label: 'Caveat', className: 'font-caveat' },
  { value: 'indie-flower', label: 'Indie', className: 'font-indie' },
  { value: 'patrick-hand', label: 'Patrick', className: 'font-patrick' },
];

interface Props {
  value: FontStyle;
  onChange: (v: FontStyle) => void;
}

export default function FontPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {fonts.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`rounded px-2 py-0.5 text-xs transition-colors duration-100 ${f.className} ${
            value === f.value
              ? 'bg-[#EFEEEC] text-[#1A1A1A]'
              : 'text-[#6B6B6B] hover:bg-[#EFEEEC]'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
