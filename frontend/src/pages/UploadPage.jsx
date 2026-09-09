import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, ArrowRight, Loader } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { generateStudyPlan } from '../lib/api';
import AuthModal from '../components/AuthModal';

const UploadPage = () => {
  const [activeTab, setActiveTab] = useState('file');
  const [selectedFile, setSelectedFile] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [weeklyHours, setWeeklyHours] = useState('');
  const [error, setError] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    // Validation
    if (!newSubjectName.trim()) {
      setError('Please enter a name for your subject.');
      return;
    }
    if (!examDate || !weeklyHours) {
      setError('Please enter your target exam date and weekly study hours.');
      return;
    }
    if (activeTab === 'file' && !selectedFile) {
      setError('Please select a PDF file to upload.');
      return;
    }
    if (activeTab === 'text' && !pastedText.trim()) {
      setError('Please paste your syllabus text.');
      return;
    }
    setError('');

    if (!isAuthenticated) {
      setError('Please log in or sign up to generate and save a real AI study plan.');
      setIsAuthOpen(true);
      return;
    }

    // Real API call
    try {
      setIsGenerating(true);
      setGeneratingMessage('Uploading your syllabus...');

      setTimeout(() => setGeneratingMessage('Analyzing with AI...'), 2000);
      setTimeout(() => setGeneratingMessage('Building your personalized study plan...'), 6000);

      const result = await generateStudyPlan({
        file: activeTab === 'file' ? selectedFile : null,
        subjectName: newSubjectName,
        examDate: examDate,
        weeklyStudyHours: parseFloat(weeklyHours),
        syllabusText: activeTab === 'text' ? pastedText : null,
      });

      // Navigate to dashboard with the generated plan
      navigate('/dashboard', {
        state: {
          newSubject: {
            id: result.subject_id,
            name: newSubjectName,
            plan_id: result.plan_id,
            plan: result.plan,
          }
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to generate study plan. Please try again.');
    } finally {
      setIsGenerating(false);
      setGeneratingMessage('');
    }
  };

  return (
    <div style={{...styles.container, padding: '40px 20px'}}>
      <div style={{maxWidth: '800px', margin: '0 auto', width: '100%', marginBottom: '24px'}}>
        <Link to="/" style={{color: 'var(--wb-blue)', textDecoration: 'none', fontWeight: 'bold'}}>← Back to Home</Link>
      </div>

      <div style={{...styles.uploaderCard, marginTop: 0}} className="card">
        <h2 style={styles.uploaderTitle}>Upload Syllabus</h2>
        
        {/* Subject Name */}
        <div style={styles.subjectArea}>
          <label style={styles.label}>Subject Name</label>
          <input 
            type="text" 
            placeholder="e.g. AP Physics C, Calculus BC" 
            style={styles.input}
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
          />

          {/* Smart Calendar Schedule Inputs */}
          <div style={{display: 'flex', gap: 'var(--wb-spacing-medium)', marginTop: 'var(--wb-spacing-medium)'}}>
            <div style={{flex: 1}}>
              <label style={styles.label}>Target Exam Date</label>
              <input 
                type="date" 
                style={styles.input} 
                value={examDate} 
                onChange={(e) => setExamDate(e.target.value)} 
              />
            </div>
            <div style={{flex: 1}}>
              <label style={styles.label}>Weekly Study Hours</label>
              <input 
                type="number" 
                placeholder="e.g. 10" 
                style={styles.input} 
                value={weeklyHours} 
                onChange={(e) => setWeeklyHours(e.target.value)} 
                min="1" 
                max="100"
              />
            </div>
          </div>
        </div>

        {/* Upload Tabs */}
        <div style={styles.tabs}>
          <button 
            style={{...styles.tabBtn, ...(activeTab === 'file' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('file')}
          >
            <UploadCloud size={18} /> Upload PDF
          </button>
          <button 
            style={{...styles.tabBtn, ...(activeTab === 'text' ? styles.activeTab : {})}}
            onClick={() => setActiveTab('text')}
          >
            <FileText size={18} /> Paste Text
          </button>
        </div>

        <div style={styles.uploadArea}>
          {activeTab === 'file' ? (
            <div style={styles.dropzone}>
              {selectedFile ? (
                <>
                  <FileText size={48} color="var(--wb-green)" style={{marginBottom: '16px'}}/>
                  <p style={{fontWeight: '700', color: 'var(--wb-green)'}}>{selectedFile.name}</p>
                  <p style={{fontSize: '14px', color: 'var(--wb-offBlack50)', marginTop: '8px'}}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button 
                    className="btn-secondary" 
                    style={{marginTop: '16px'}}
                    onClick={() => { setSelectedFile(null); fileInputRef.current.value = ''; }}
                  >
                    Remove File
                  </button>
                </>
              ) : (
                <>
                  <ImageIcon size={48} color="var(--wb-offBlack32)" style={{marginBottom: '16px'}}/>
                  <p style={{fontWeight: '700', color: 'var(--wb-offBlack64)'}}>Drag & drop your syllabus here</p>
                  <p style={{fontSize: '14px', color: 'var(--wb-offBlack50)', marginTop: '8px'}}>Supports PDF (Max 10MB)</p>
                  <button 
                    className="btn-secondary" 
                    style={{marginTop: '24px'}}
                    onClick={() => fileInputRef.current.click()}
                  >
                    Browse Files
                  </button>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{display: 'none'}} 
                accept=".pdf" 
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <textarea 
              rows="10" 
              style={styles.textArea} 
              placeholder="Paste your syllabus content here..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            ></textarea>
          )}
        </div>
        
        {error && (
          <div style={{color: 'var(--wb-red)', fontSize: '14px', fontWeight: '700', marginBottom: 'var(--wb-spacing-medium)', textAlign: 'right'}}>
            {error}
          </div>
        )}

        {/* Generating State */}
        {isGenerating && (
          <div style={styles.generatingBanner}>
            <Loader size={20} className="spin" />
            <span>{generatingMessage}</span>
          </div>
        )}

        <div style={styles.actionRow}>
          <button 
            className="btn-primary" 
            style={{...styles.generateBtn, opacity: isGenerating || authLoading ? 0.6 : 1}} 
            onClick={handleUpload}
            disabled={isGenerating || authLoading}
          >
            {isGenerating ? 'Generating...' : 'Generate Study Plan'} {!isGenerating && <ArrowRight size={18} />}
          </button>
        </div>

        {!isAuthenticated && (
          <p style={{textAlign: 'center', fontSize: '13px', color: 'var(--wb-offBlack50)', marginTop: 'var(--wb-spacing-medium)'}}>
            Sign in to save your study plan and track progress.
          </p>
        )}
      </div>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: 'var(--wb-spacing-xxx-large) var(--wb-spacing-medium)',
  },
  hero: {
    textAlign: 'center',
    marginBottom: 'var(--wb-spacing-xx-large)',
  },
  headline: {
    fontSize: '56px',
    fontWeight: '900',
    color: 'var(--wb-darkBlue)',
    lineHeight: '1.1',
    marginBottom: 'var(--wb-spacing-large)',
    letterSpacing: '-1px'
  },
  subheadline: {
    fontSize: '20px',
    color: 'var(--wb-offBlack64)',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.5'
  },
  uploaderCard: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  uploaderTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: 'var(--wb-spacing-large)',
    color: 'var(--wb-offBlack)',
  },
  subjectArea: {
    marginBottom: 'var(--wb-spacing-large)',
    padding: 'var(--wb-spacing-medium)',
    backgroundColor: 'var(--wb-offWhite)',
    borderRadius: '8px',
    border: '1px solid var(--wb-offBlack16)'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '700',
    marginBottom: '8px',
    color: 'var(--wb-offBlack64)'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid var(--wb-offBlack32)',
    fontSize: '16px',
    fontFamily: 'inherit'
  },
  tabs: {
    display: 'flex',
    gap: 'var(--wb-spacing-medium)',
    marginBottom: 'var(--wb-spacing-medium)',
    borderBottom: '1px solid var(--wb-offBlack16)',
    paddingBottom: 'var(--wb-spacing-x-small)'
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    color: 'var(--wb-offBlack50)',
    fontSize: '16px',
    fontWeight: '700',
    padding: '8px 4px',
    borderBottom: '3px solid transparent',
  },
  activeTab: {
    color: 'var(--wb-blue)',
    borderBottom: '3px solid var(--wb-blue)',
  },
  uploadArea: {
    marginBottom: 'var(--wb-spacing-large)',
  },
  dropzone: {
    border: '2px dashed var(--wb-offBlack32)',
    borderRadius: '8px',
    padding: 'var(--wb-spacing-xx-large) var(--wb-spacing-medium)',
    textAlign: 'center',
    backgroundColor: 'var(--wb-offWhite)',
    transition: 'border-color 0.2s',
  },
  textArea: {
    width: '100%',
    minHeight: '200px',
    padding: 'var(--wb-spacing-medium)',
    borderRadius: '8px',
    border: '1px solid var(--wb-offBlack32)',
    fontFamily: 'inherit',
    fontSize: '16px',
    resize: 'vertical',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 32px',
    fontSize: '18px'
  },
  generatingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'rgba(24, 101, 242, 0.06)',
    border: '1px solid rgba(24, 101, 242, 0.2)',
    borderRadius: '8px',
    marginBottom: 'var(--wb-spacing-medium)',
    color: 'var(--wb-blue)',
    fontWeight: '700',
    fontSize: '16px',
  }
};

export default UploadPage;
