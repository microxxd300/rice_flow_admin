import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { C } from '../theme';
import { api } from '../services/api';
import {
  Upload, FileText, CheckCircle2, XCircle, Info, AlertTriangle, Trash2, RefreshCw,
} from 'lucide-react';

const shadow = '0 1px 6px rgba(26,26,46,0.06), 0 0 1px rgba(26,26,46,0.04)';
const card   = { backgroundColor: C.surface, borderRadius: 12, boxShadow: shadow, border: `1px solid ${C.borderLight}` };

const REQUIRED_COLUMNS = [
  'nsic_code', 'common_name', 'ecosystem',
  'maturity_days', 'avg_yield_t_ha',
];

const OPTIONAL_COLUMNS = [
  'variety_id', 'season', 'max_yield_t_ha',
  'submergence_tolerance', 'drought_tolerance', 'salinity_tolerance',
  'optimal_temp_min', 'optimal_temp_max', 'optimal_rainfall_min',
  'year_released', 'notes',
];

const TIPS = [
  'First row must contain column headers.',
  'Save your spreadsheet as CSV UTF-8 (Excel and Google Sheets both support this).',
  'Ecosystem must be one of: irrigated_lowland, rainfed_lowland, upland.',
  'Tolerances (drought, submergence, salinity) must be one of: low, moderate, high.',
  'Numeric fields (maturity_days, yield) must use a dot (.) as decimal separator.',
  'Rows with the same nsic_code update the existing variety; new rows are inserted.',
];

const isCsv = (file) =>
  file?.name?.toLowerCase().endsWith('.csv');

export default function Import() {
  const [file, setFile]       = useState(null);
  const [status, setStatus]   = useState('idle'); // idle | uploading | success | error
  const [error, setError]     = useState('');
  const [result, setResult]   = useState(null);   // {created, updated, skipped, errors}

  const onDrop = useCallback((accepted, rejections) => {
    setStatus('idle');
    setError('');
    setResult(null);

    if (rejections.length > 0) {
      const rej  = rejections[0];
      const ext  = (rej.file?.name || '').split('.').pop()?.toUpperCase() || 'unknown';
      const isPdf = ext === 'PDF';
      setError(
        isPdf
          ? `PDF files are not supported. Please save your data as a CSV file (Excel → Save As → CSV UTF-8).`
          : `Only CSV files are accepted. The file you dropped is a ${ext} file.`
      );
      setStatus('error');
      return;
    }

    if (accepted[0]) {
      if (!isCsv(accepted[0])) {
        const ext = (accepted[0].name || '').split('.').pop()?.toUpperCase() || 'unknown';
        setError(`Only CSV files are accepted. You uploaded a ${ext} file.`);
        setStatus('error');
        return;
      }
      setFile(accepted[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;
    if (!isCsv(file)) {
      setError('Only CSV files are accepted.');
      setStatus('error');
      return;
    }
    setStatus('uploading');
    setError('');
    setResult(null);
    try {
      const res = await api.importVarietyCSV(file);
      setResult(res);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Upload failed.');
      // The server may also include an `expected_columns` payload on
      // header errors — surface it through `result` so the UI can show it.
      if (err?.payload?.expected_columns) {
        setResult({ errors: [], expected_columns: err.payload.expected_columns });
      }
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setError('');
    setResult(null);
  };

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, backgroundColor: C.background, minHeight: '100%' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Import Varieties</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
          Bulk-import rice varieties from a CSV file. Existing varieties are updated by NSIC code; new ones are added.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          ...card,
          padding: '40px 24px',
          border: `2px dashed ${isDragReject ? C.error : (isDragActive ? C.primary : C.borderLight)}`,
          backgroundColor: isDragActive ? C.primaryLighter : C.surface,
          textAlign: 'center', cursor: 'pointer',
          transition: 'background-color 0.12s, border-color 0.12s',
        }}>
        <input {...getInputProps()} />
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: isDragReject ? C.errorLight : C.primaryLighter,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Upload size={22} color={isDragReject ? C.error : C.primary} />
        </div>
        {file ? (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{file.name}</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB · ready to upload
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
              {isDragActive ? 'Drop the CSV here' : 'Drag a CSV file or click to browse'}
            </p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
              Only <strong style={{ color: C.text }}>.csv</strong> files are accepted.
              PDFs, Excel, images, and other formats will be rejected.
            </p>
          </>
        )}
      </div>

      {/* Action row */}
      {file && status !== 'success' && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={reset} disabled={status === 'uploading'} style={{
            height: 38, padding: '0 14px', fontSize: 13, fontWeight: 600,
            color: C.textSecondary, backgroundColor: C.surface,
            border: `1px solid ${C.borderLight}`, borderRadius: 10,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Trash2 size={13} />
            Remove
          </button>
          <button onClick={handleUpload} disabled={status === 'uploading'} style={{
            height: 38, padding: '0 18px', fontSize: 13, fontWeight: 600,
            color: '#fff',
            backgroundColor: status === 'uploading' ? '#9CA3AF' : C.primary,
            border: 'none', borderRadius: 10,
            cursor: status === 'uploading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {status === 'uploading'
              ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
              : <><Upload size={13} /> Import CSV</>}
          </button>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Error banner */}
      {error && (
        <div style={{
          ...card, padding: '14px 18px',
          borderLeft: `3px solid ${C.error}`,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <XCircle size={16} color={C.error} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Upload rejected</p>
            <p style={{ fontSize: 12, color: C.textSecondary, marginTop: 3, lineHeight: 1.5 }}>{error}</p>
            {result?.expected_columns && (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                Expected columns: <span style={{ fontFamily: 'ui-monospace, monospace' }}>{result.expected_columns.join(', ')}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success summary */}
      {status === 'success' && result && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', backgroundColor: C.successLight, display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.borderLight}` }}>
            <CheckCircle2 size={16} color={C.success} />
            <p style={{ fontSize: 13, fontWeight: 700, color: C.success }}>{result.message}</p>
          </div>
          <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Created', value: result.created, color: C.primary },
              { label: 'Updated', value: result.updated, color: C.info    },
              { label: 'Skipped', value: result.skipped, color: result.skipped > 0 ? C.warning : '#9CA3AF' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
              </div>
            ))}
          </div>
          {result.errors && result.errors.length > 0 && (
            <div style={{ borderTop: `1px solid ${C.borderLight}`, padding: '16px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.error, marginBottom: 8 }}>
                <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                {result.errors.length} row{result.errors.length === 1 ? '' : 's'} skipped due to errors
              </p>
              <div style={{ maxHeight: 220, overflow: 'auto', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
                {result.errors.slice(0, 50).map((e, i) => (
                  <div key={i} style={{
                    padding: '6px 0',
                    borderBottom: i < Math.min(50, result.errors.length) - 1 ? `1px solid ${C.borderLight}` : 'none',
                    color: C.textSecondary,
                  }}>
                    <span style={{ color: C.error, fontWeight: 700 }}>Line {e.line}:</span>{' '}
                    {Array.isArray(e.errors) ? e.errors.join(' · ') : String(e.errors)}
                  </div>
                ))}
                {result.errors.length > 50 && (
                  <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
                    + {result.errors.length - 50} more error{result.errors.length - 50 === 1 ? '' : 's'} not shown
                  </p>
                )}
              </div>
            </div>
          )}
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.borderLight}`, backgroundColor: C.surfaceAlt, textAlign: 'right' }}>
            <button onClick={reset} style={{
              height: 34, padding: '0 14px', fontSize: 12, fontWeight: 600,
              color: C.text, backgroundColor: C.surface,
              border: `1px solid ${C.borderLight}`, borderRadius: 8,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Upload another file
            </button>
          </div>
        </div>
      )}

      {/* Format guide */}
      <div style={card}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={14} color={C.textSecondary} />
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>CSV format guide</p>
        </div>
        <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Required columns
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REQUIRED_COLUMNS.map(c => (
                <div key={c} style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: C.text }}>
                  <span style={{ color: C.primary, marginRight: 6 }}>•</span>{c}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 18, marginBottom: 10 }}>
              Optional columns
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {OPTIONAL_COLUMNS.map(c => (
                <span key={c} style={{
                  fontSize: 11, fontFamily: 'ui-monospace, monospace',
                  color: '#6B7280', backgroundColor: C.surfaceAlt,
                  padding: '2px 8px', borderRadius: 5,
                }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Tips
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TIPS.map(tip => (
                <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Info size={11} color={C.primary} style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
