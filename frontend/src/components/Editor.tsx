'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Code, Quote, Camera, Loader2 } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const Editor: React.FC<EditorProps> = ({ value, onChange, placeholder = 'Start writing reflections...' }) => {
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // starter-kit comes with normal text, lists, code blocks, quote, etc.
      })
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap-content-editor focus:outline-none',
      }
    }
  });

  const handleOcr = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setOcrImage(reader.result as string);
      setRotation(0);
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset input to allow scanning the same file again
  };

  const rotateImage = (imageSrc: string, rotationAngle: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // Swap width/height for 90 or 270 degrees
        if (rotationAngle === 90 || rotationAngle === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotationAngle * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL());
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  };

  const startScan = async () => {
    if (!ocrImage) return;
    setOcrLoading(true);
    setOcrStatus('Initializing...');
    setOcrProgress(0);
    const imageToScan = ocrImage;
    setOcrImage(null); // Close modal preview

    try {
      let finalImage = imageToScan;
      if (rotation !== 0) {
        setOcrStatus('Rotating image...');
        finalImage = await rotateImage(imageToScan, rotation);
      }

      setOcrStatus('Starting scan...');
      const { data: { text } } = await Tesseract.recognize(finalImage, 'eng', {
        langPath: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrStatus('Extracting text...');
            setOcrProgress(Math.round(m.progress * 100));
          } else if (m.status === 'loading language traineddata') {
            setOcrStatus('Loading language model...');
            setOcrProgress(Math.round(m.progress * 100));
          } else {
            setOcrStatus('Initializing scanner...');
            setOcrProgress(0);
          }
        }
      });

      if (text && text.trim() && editor) {
        const cleanedText = text.trim();
        editor.chain().focus().insertContent(`<blockquote><p>${cleanedText}</p></blockquote><p></p>`).run();
      }
    } catch (err) {
      console.error('OCR failed:', err);
      alert('Failed to extract text from image.');
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);
      setOcrStatus('');
      setRotation(0);
    }
  };

  // Keep value in sync when it changes from outside (e.g. form resets)
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      // Prevents cursor jumping issues while typing
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-editor-container">
      {/* Menu Bar */}
      <div className="tiptap-menu-bar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`tiptap-btn ${editor.isActive('bold') ? 'active' : ''}`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`tiptap-btn ${editor.isActive('italic') ? 'active' : ''}`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`tiptap-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`tiptap-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`tiptap-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
          title="Code Block"
        >
          <Code size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`tiptap-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
          title="Blockquote"
        >
          <Quote size={16} />
        </button>
        <button
          type="button"
          onClick={() => document.getElementById('ocr-file-input')?.click()}
          className={`tiptap-btn ${ocrLoading ? 'active' : ''}`}
          title={ocrLoading ? ocrStatus : "Scan Text (OCR)"}
          disabled={ocrLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', position: 'relative' }}
        >
          {ocrLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          {ocrLoading && <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{ocrProgress}%</span>}
        </button>
        <input
          id="ocr-file-input"
          type="file"
          accept="image/*"
          onChange={handleOcr}
          style={{ display: 'none' }}
        />
      </div>

      {/* Editor Content Area */}
      <div className="tiptap-editor-content" style={{ position: 'relative' }}>
        {ocrLoading && (
          <div 
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              background: 'rgba(9, 26, 30, 0.95)',
              border: '1px solid var(--border-glass-focus)',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.75rem',
              color: 'var(--text-primary)',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)'
            }}
          >
            <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            <span>{ocrStatus} {ocrProgress > 0 ? `(${ocrProgress}%)` : ''}</span>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* OCR Rotation Preview Modal */}
      {ocrImage && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '420px',
              background: 'rgba(13, 27, 33, 0.98)',
              border: '1px solid var(--border-glass-focus)',
              borderRadius: '20px',
              padding: '1.5rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              color: 'var(--text-primary)'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>Scan Page Preview</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                If the book text is sideways or upside down, rotate it until it&apos;s upright for best scanning results.
              </p>
            </div>

            <div 
              style={{
                width: '100%',
                height: '260px',
                background: '#040b0d',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: '1px dashed var(--border-glass)'
              }}
            >
              <img 
                src={ocrImage} 
                alt="OCR Scan Source" 
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  objectFit: 'contain',
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontWeight: 700 }}
              >
                🔄 Rotate 90°
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRotation((r) => (r + 270) % 360)}
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontWeight: 700 }}
              >
                🔄 Rotate -90°
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setOcrImage(null); setRotation(0); }}
                style={{ flex: 1, padding: '0.6rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={startScan}
                style={{ flex: 1.5, padding: '0.6rem', color: '#091A1E', fontWeight: 800 }}
              >
                Scan Text
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
