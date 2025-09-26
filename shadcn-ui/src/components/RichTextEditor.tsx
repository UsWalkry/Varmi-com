import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

// ReactQuill bazı ortamlarda (özellikle React 19 / Vite HMR kombinasyonu) import anında hata verebilir.
// Dinamik import ve client-guard ile güvenli kullanım sağlayalım; sorun olursa Textarea'ya düşer.
export default function RichTextEditor({ value, onChange, placeholder, className }: Props) {
  const isClient = useMemo(() => typeof window !== 'undefined', []);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Quill tipleri paketle gelmediği için minimal bir tip kullanıyoruz
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isClient || quillRef.current || !containerRef.current) return;
    let mounted = true;
    (async () => {
      try {
        const Quill = (await import('quill')).default;
        await import('quill/dist/quill.snow.css');
        if (!mounted || !containerRef.current) return;
        const editor = new Quill(containerRef.current, {
          theme: 'snow',
          placeholder,
          modules: {
            toolbar: [
              [{ header: [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              ['link', 'blockquote', 'code-block'],
              ['clean'],
            ],
          },
        });
        quillRef.current = editor;
        // Başlangıç değeri
        if (value) editor.clipboard.dangerouslyPasteHTML(value);
        // Değişiklikleri propagate et
        editor.on('text-change', () => {
          const html = editor.root.innerHTML;
          onChange(html);
        });
      } catch (e) {
        console.error('Quill load failed:', e);
        if (mounted) setFailed(true);
      }
    })();
    return () => { mounted = false; };
  }, [isClient, placeholder, onChange, value]);

  // Dışarıdan value güncellenirse editöre uygula (ör. form reset)
  useEffect(() => {
    const editor = quillRef.current;
    if (!editor) return;
    const current = editor.root.innerHTML;
    if (value !== current) {
      editor.clipboard.dangerouslyPasteHTML(value || '');
    }
  }, [value]);

  if (!isClient || failed) {
    return (
      <Textarea
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
      />
    );
  }

  return <div className={className} ref={containerRef} />;
}
