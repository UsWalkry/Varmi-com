import { memo, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput = memo(({ value, onChange, placeholder = "Ürün ara...", className = "w-full" }: SearchInputProps) => {
  console.log('🔍 SearchInput rendering with value:', value);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);
  
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      className={className}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;