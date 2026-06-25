import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const styles: Record<Variant, string> = {
  primary:
    'bg-[#2383E2] text-white hover:bg-[#1b6ec2] focus:ring-2 focus:ring-[#2383E2]/40',
  secondary:
    'text-[#1A1A1A] hover:bg-[#EFEEEC] focus:ring-2 focus:ring-[#E3E2DF]',
  danger:
    'text-[#E03E3E] hover:bg-[#FDF2F2] focus:ring-2 focus:ring-[#E03E3E]/30',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export default function Button({ variant = 'secondary', className = '', ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-sm transition-colors duration-100 disabled:opacity-40 disabled:pointer-events-none ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}
