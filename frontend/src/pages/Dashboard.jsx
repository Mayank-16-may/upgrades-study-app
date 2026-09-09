import React, { useState, useEffect } from 'react';
import { PlayCircle, FileText, MessageSquare, CheckCircle, Circle, BookOpen, Calendar, X, PlusCircle, Trash2, Sparkles, UploadCloud, ArrowRight } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { fetchPlan, fetchSubjects, deleteSubject, updatePlan, callBackendWithAuth } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// No mock subjects: new visitors start with a clean dashboard
const initialMockSubjects = [];

const buildTopicsFromPlan = (plan, subjectName) => {
  const topics = [];

  if (plan?.weeks) {
    plan.weeks.forEach(week => {
      (week.days || []).forEach(day => {
        topics.push({
          id: `w${week.week_number}-d${day.day}-${day.topic}`,
          title: day.topic,
          completed: day.completed || false,
          resources: day.resources || [],
          objectives: day.objectives || [],
          studyHours: day.study_hours,
          theme: week.theme,
          weekNumber: week.week_number,
          dayNumber: day.day
        });
      });
    });
  }

  if (topics.length > 0) return topics;

  return [{
    id: `intro-${subjectName || 'subject'}`,
    title: `Introduction to ${subjectName || 'your subject'}`,
    completed: false,
    resources: []
  }];
};

const subjectFromGeneratedPlan = (incoming) => {
  const plan = incoming.plan;
  return {
    id: incoming.id,
    title: incoming.name,
    progress: 0,
    rawPlan: plan,
    topics: buildTopicsFromPlan(plan, incoming.name),
    examDate: plan?.exam_date || incoming.examDate || '',
    weeklyHours: plan?.weekly_hours || incoming.weeklyHours || ''
  };
};

const subjectFromBackend = (subject, planRow) => {
  const plan = planRow?.plan_data || null;
  const title = subject.name || subject.title || 'Untitled Subject';

  const topics = buildTopicsFromPlan(plan, title);
  const completedCount = topics.filter(t => t.completed).length;
  const progress = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  return {
    id: subject.id,
    title,
    progress,
    rawPlan: plan,
    topics,
    examDate: plan?.exam_date || subject.exam_date || '',
    weeklyHours: plan?.weekly_hours || subject.weekly_study_hours || ''
  };
};

const Dashboard = () => {
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [subjects, setSubjects] = useState([]);
  
  // Safely initialize active subject
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [loadError, setLoadError] = useState('');
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI Tutor. What questions do you have about this topic?" }
  ]);

  // Modal State
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editHours, setEditHours] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      const incomingSubject = location.state?.newSubject
        ? subjectFromGeneratedPlan(location.state.newSubject)
        : null;

      if (incomingSubject) {
        setSubjects([incomingSubject]);
        setActiveSubject(incomingSubject);
      } else {
        setSubjects([]);
        setActiveSubject(null);
      }
      setLoadError('');
      return;
    }

    let cancelled = false;

    const loadSavedSubjects = async () => {
      setIsLoadingSubjects(true);
      setLoadError('');

      try {
        const response = await fetchSubjects();
        const savedSubjects = response.subjects || [];

        const hydratedSubjects = await Promise.all(
          savedSubjects.map(async subject => {
            try {
              const planResponse = await fetchPlan(subject.id);
              return subjectFromBackend(subject, planResponse.plan);
            } catch (err) {
              console.warn('Could not load plan for subject:', subject.id, err);
              return subjectFromBackend(subject, null);
            }
          })
        );

        const incomingSubject = location.state?.newSubject
          ? subjectFromGeneratedPlan(location.state.newSubject)
          : null;

        const mergedSubjects = incomingSubject && !hydratedSubjects.some(subject => subject.id === incomingSubject.id)
          ? [incomingSubject, ...hydratedSubjects]
          : hydratedSubjects;

        if (cancelled) return;

        setSubjects(mergedSubjects);
        setActiveSubject(prev => {
          if (incomingSubject) {
            return mergedSubjects.find(subject => subject.id === incomingSubject.id) || incomingSubject;
          }
          if (prev) {
            return mergedSubjects.find(subject => subject.id === prev.id) || mergedSubjects[0] || null;
          }
          return mergedSubjects[0] || null;
        });
      } catch (err) {
        if (cancelled) return;
        setSubjects([]);
        setActiveSubject(null);
        setLoadError(err.message || 'Failed to load saved study plans.');
      } finally {
        if (!cancelled) setIsLoadingSubjects(false);
      }
    };

    loadSavedSubjects();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, location.state]);

  // Handle incoming new subject from Landing Page immediately while saved data reloads.
  useEffect(() => {
    if (!location.state?.newSubject) return;

    const newSub = subjectFromGeneratedPlan(location.state.newSubject);

    setSubjects(prev => {
      if (prev.find(s => s.id === newSub.id)) return prev;
      return [newSub, ...prev];
    });
    setActiveSubject(newSub);
  }, [location.state]);

  // When subject changes, reset the active topic
  useEffect(() => {
    if (activeSubject && activeSubject.topics.length > 0) {
      setActiveTopic(activeSubject.topics[0]);
      setChatOpen(false);
    } else {
      setActiveTopic(null);
    }
  }, [activeSubject]);

  const handleSubjectChange = (e) => {
    const subjectId = e.target.value;
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      setActiveSubject(subject);
    }
  };

  const handleDeleteSubject = async () => {
    if (!activeSubject) return;
    
    // Only confirm if it's not a generic mock subject
    const isConfirmed = window.confirm(`Are you sure you want to delete "${activeSubject.title}"?`);
    if (!isConfirmed) return;

    try {
      if (!activeSubject.id.toString().startsWith('s')) {
        await deleteSubject(activeSubject.id);
      }
      
      setSubjects(prev => {
        const newSubjects = prev.filter(s => s.id !== activeSubject.id);
        setActiveSubject(newSubjects.length > 0 ? newSubjects[0] : null);
        return newSubjects;
      });
    } catch (err) {
      alert(`Failed to delete subject: ${err.message}`);
    }
  };

  const handleMarkComplete = async () => {
    // Optimistic UI update
    setSubjects(prev => {
      const newSubjects = [...prev];
      const subjectIndex = newSubjects.findIndex(s => s.id === activeSubject.id);
      if (subjectIndex !== -1) {
        const subject = {...newSubjects[subjectIndex]};
        const topicIndex = subject.topics.findIndex(t => t.id === activeTopic.id);
        
        if (topicIndex !== -1) {
          const topic = subject.topics[topicIndex];
          subject.topics = [...subject.topics];
          subject.topics[topicIndex] = { ...topic, completed: true };
          
          // Recalculate progress
          const completedCount = subject.topics.filter(t => t.completed).length;
          subject.progress = Math.round((completedCount / subject.topics.length) * 100);
          
          // Update rawPlan
          if (subject.rawPlan && topic.weekNumber !== undefined && topic.dayNumber !== undefined) {
            subject.rawPlan = JSON.parse(JSON.stringify(subject.rawPlan)); // Deep clone
            const week = subject.rawPlan.weeks.find(w => w.week_number === topic.weekNumber);
            if (week) {
              const day = (week.days || []).find(d => d.day === topic.dayNumber);
              if (day) {
                day.completed = true;
              }
            }
          }

          newSubjects[subjectIndex] = subject;
          setActiveSubject(subject);
          setActiveTopic(subject.topics[topicIndex]);

          // Persist to backend asynchronously
          if (subject.rawPlan) {
            updatePlan(subject.id, subject.rawPlan).catch(err => {
              console.error("Failed to update plan progress:", err);
            });
          }
        }
      }
      return newSubjects;
    });
  };

  const [chatLoading, setChatLoading] = useState(false);

  const handleSendMessage = async () => {
    if (chatInput.trim() === '' || chatLoading) return;
    
    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const data = await callBackendWithAuth('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: activeTopic?.title || activeSubject?.title || "General",
          message: userMessage,
          history: chatMessages
        })
      });

      setChatMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't process that right now. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const openEditModal = () => {
    setEditDate(activeSubject.examDate || '');
    setEditHours(activeSubject.weeklyHours || '');
    setIsEditScheduleOpen(true);
  };

  const saveSchedule = () => {
    setSubjects(prev => {
      const newSubjects = [...prev];
      const subjectIndex = newSubjects.findIndex(s => s.id === activeSubject.id);
      if (subjectIndex !== -1) {
        newSubjects[subjectIndex] = { ...newSubjects[subjectIndex], examDate: editDate, weeklyHours: editHours };
        setActiveSubject(newSubjects[subjectIndex]);
      }
      return newSubjects;
    });
    setIsEditScheduleOpen(false);
  };

  // 1. EMPTY STATE
  if (isLoadingSubjects && isAuthenticated) {
    return (
      <div className="dashboard-container" style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', textAlign: 'center'}}>
        <div className="card" style={{padding: '32px 40px'}}>
          <h2 style={{fontSize: '24px', fontWeight: '900', marginBottom: '8px'}}>Loading your study plans...</h2>
          <p style={{color: 'var(--wb-offBlack64)'}}>Checking your saved subjects and generated plans.</p>
        </div>
      </div>
    );
  }

  if (subjects.length === 0 || !activeSubject) {
    return (
      <div className="dashboard-container" style={{justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '40px 20px'}}>
        <div className="card" style={{maxWidth: '680px', width: '100%', padding: '48px 36px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.06)'}}>
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <BookOpen size={42} color="var(--wb-blue, #2563eb)" />
          </div>

          <h2 style={{fontSize: '28px', fontWeight: '800', marginBottom: '12px', color: 'var(--wb-offBlack, #111827)'}}>
            {loadError ? 'Could not load study plans' : 'Try adding subjects to get study plans'}
          </h2>

          <p style={{fontSize: '16px', color: 'var(--wb-offBlack64, #6b7280)', lineHeight: '1.6', marginBottom: '32px', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto'}}>
            {loadError || "Your dashboard is currently empty. Upload your syllabus or enter your subject topics to get an AI-generated weekly study plan and smart tutor."}
          </p>

          <Link to="/upload" style={{display: 'inline-block', textDecoration: 'none'}}>
            <button className="btn-primary" style={{
              padding: '16px 36px',
              fontSize: '17px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              borderRadius: '12px',
              cursor: 'pointer'
            }}>
              <PlusCircle size={20} /> Upload Syllabus / Add Subject
            </button>
          </Link>

          {/* 3-Step Quick Guide */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '16px',
            marginTop: '40px',
            paddingTop: '32px',
            borderTop: '1px solid var(--wb-offBlack16)',
            textAlign: 'left'
          }}>
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: 'var(--wb-offWhite)',
              border: '1px solid var(--wb-offBlack16)',
              transition: 'background-color 0.2s ease, border-color 0.2s ease'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                <span style={{width: '24px', height: '24px', borderRadius: '50%', background: 'var(--wb-blue)', color: '#ffffff', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>1</span>
                <strong style={{fontSize: '14px', color: 'var(--wb-offBlack)', fontWeight: '700'}}>Upload Syllabus</strong>
              </div>
              <p style={{fontSize: '13px', color: 'var(--wb-offBlack64)', margin: 0, lineHeight: '1.4'}}>Upload a PDF or paste your course topics</p>
            </div>

            <div style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: 'var(--wb-offWhite)',
              border: '1px solid var(--wb-offBlack16)',
              transition: 'background-color 0.2s ease, border-color 0.2s ease'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                <span style={{width: '24px', height: '24px', borderRadius: '50%', background: 'var(--wb-blue)', color: '#ffffff', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>2</span>
                <strong style={{fontSize: '14px', color: 'var(--wb-offBlack)', fontWeight: '700'}}>Get AI Plan</strong>
              </div>
              <p style={{fontSize: '13px', color: 'var(--wb-offBlack64)', margin: 0, lineHeight: '1.4'}}>Receive an adaptive weekly study roadmap</p>
            </div>

            <div style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: 'var(--wb-offWhite)',
              border: '1px solid var(--wb-offBlack16)',
              transition: 'background-color 0.2s ease, border-color 0.2s ease'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                <span style={{width: '24px', height: '24px', borderRadius: '50%', background: 'var(--wb-blue)', color: '#ffffff', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>3</span>
                <strong style={{fontSize: '14px', color: 'var(--wb-offBlack)', fontWeight: '700'}}>Ace Your Exams</strong>
              </div>
              <p style={{fontSize: '13px', color: 'var(--wb-offBlack64)', margin: 0, lineHeight: '1.4'}}>Track daily goals & chat with your AI tutor</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* 2. EDIT SCHEDULE MODAL */}
      {isEditScheduleOpen && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modal}>
            <button style={styles.closeBtn} onClick={() => setIsEditScheduleOpen(false)}><X size={24} /></button>
            <h2 style={{fontSize: '24px', fontWeight: '900', marginBottom: '8px'}}>Edit Schedule</h2>
            <p style={{color: 'var(--wb-offBlack64)', marginBottom: '24px'}}>Update your targets for {activeSubject.title}.</p>
            
            <div style={{marginBottom: '16px'}}>
              <label style={styles.label}>Target Exam Date</label>
              <input type="date" style={styles.input} value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            
            <div style={{marginBottom: '24px'}}>
              <label style={styles.label}>Weekly Study Hours</label>
              <input type="number" style={styles.input} value={editHours} onChange={(e) => setEditHours(e.target.value)} />
            </div>
            
            <button className="btn-primary" style={{width: '100%'}} onClick={saveSchedule}>Save Changes</button>
          </div>
        </div>
      )}

      {/* Sidebar: Subjects & Syllabus Progress */}
      <aside className="dashboard-sidebar">
        
        {/* Subject Selector */}
        <div className="card" style={{...styles.sidebarCard, marginBottom: 'var(--wb-spacing-medium)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
            <h3 style={{...styles.sidebarTitle, margin: 0}}><BookOpen size={18} style={{marginRight: '8px'}}/> My Subjects</h3>
            <Link to="/upload" title="Add another subject" style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--wb-blue, #2563eb)', textDecoration: 'none', fontWeight: '600'}}>
              <PlusCircle size={15} /> Add
            </Link>
          </div>
          <select 
            style={styles.subjectSelect} 
            value={activeSubject.id} 
            onChange={handleSubjectChange}
          >
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.title}</option>
            ))}
          </select>
        </div>

        {/* Progress for Active Subject */}
        <div className="card" style={styles.sidebarCard}>
          <h3 style={styles.sidebarTitle}>Syllabus Progress</h3>
          <div style={styles.progressBarBg}>
            <div style={{...styles.progressBarFill, width: `${activeSubject.progress}%`}}></div>
          </div>
          <p style={styles.progressText}>{activeSubject.progress}% Completed</p>
          
          <ul style={styles.topicList}>
            {activeSubject.topics.map(topic => (
              <li 
                key={topic.id} 
                style={{
                  ...styles.topicItem, 
                  ...(activeTopic?.id === topic.id ? styles.activeTopic : {})
                }}
                onClick={() => setActiveTopic(topic)}
              >
                {topic.completed ? (
                  <CheckCircle size={18} color="var(--wb-green)" />
                ) : (
                  <Circle size={18} color="var(--wb-offBlack32)" />
                )}
                <span style={styles.topicTitle}>{topic.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content: Resources */}
      <main className="dashboard-main">
        <div style={styles.header}>
          <div>
            <p style={styles.subjectBreadcrumb}>{activeSubject.title} /</p>
            <h2 style={styles.pageTitle}>{activeTopic?.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleDeleteSubject}
              style={{
                background: 'transparent',
                border: '1px solid var(--wb-red)',
                color: 'var(--wb-red)',
                padding: '0 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <Trash2 size={18} /> Delete
            </button>
            <button 
              className="btn-primary" 
              onClick={handleMarkComplete}
              disabled={activeTopic?.completed}
              style={{ opacity: activeTopic?.completed ? 0.5 : 1, cursor: activeTopic?.completed ? 'not-allowed' : 'pointer' }}
            >
              {activeTopic?.completed ? 'Completed' : 'Mark Complete'}
            </button>
          </div>
        </div>

        {/* Smart Calendar / Today's Mission Banner */}
        <div className="card" style={{
          backgroundColor: 'rgba(24, 101, 242, 0.05)', 
          border: '1px solid rgba(24, 101, 242, 0.2)', 
          marginBottom: 'var(--wb-spacing-x-large)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
           <div>
             <h3 style={{color: 'var(--wb-blue)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '18px', fontWeight: '900'}}>
               <Calendar size={20} /> Today's Mission
             </h3>
             <p style={{color: 'var(--wb-offBlack64)'}}>
               Complete this topic to stay on track for your exam on <strong>{activeSubject.examDate ? new Date(activeSubject.examDate).toLocaleDateString() : 'Set Date'}</strong> ({activeSubject.weeklyHours || 0} hrs/wk).
             </p>
           </div>
           <button className="btn-secondary" style={{color: 'var(--wb-blue)', borderColor: 'var(--wb-blue)'}} onClick={openEditModal}>
             Edit Schedule
           </button>
        </div>

        {/* Video Recommendations */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}><PlayCircle size={20}/> Video Lectures</h3>
          <div style={styles.grid}>
            {activeTopic?.resources?.filter(r => r.type === 'video').map((res, i) => (
              <div key={i} className="card" style={styles.resourceCard} onClick={() => {
                const query = encodeURIComponent(`${res.title} ${res.source || ''}`);
                window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
              }}>
                <div style={res.source?.toLowerCase().includes('khan') ? styles.videoThumbnailKhan : styles.videoThumbnail}></div>
                <h4 style={styles.resourceTitle}>{res.title}</h4>
                <p style={styles.resourceMeta}>{res.source || 'YouTube'} {res.duration_minutes ? `• ${res.duration_minutes} mins` : ''}</p>
              </div>
            ))}
            {(!activeTopic?.resources || activeTopic.resources.filter(r => r.type === 'video').length === 0) && (
              <p style={{color: 'var(--wb-offBlack50)', fontStyle: 'italic'}}>No videos scheduled for this topic.</p>
            )}
          </div>
        </section>

        {/* Text Resources */}
        <section style={styles.section}>
          <h3 style={styles.sectionTitle}><FileText size={20}/> Articles & Exercises</h3>
          <div style={styles.grid}>
            {activeTopic?.resources?.filter(r => r.type !== 'video').map((res, i) => (
              <div key={i} className="card" style={styles.resourceCard} onClick={() => {
                const query = encodeURIComponent(`${res.title} ${res.source || ''} study notes`);
                window.open(`https://www.google.com/search?q=${query}`, '_blank');
              }}>
                <h4 style={styles.resourceTitle}>{res.title}</h4>
                <p style={styles.resourceMeta}>{res.type.toUpperCase()} {res.source ? `• ${res.source}` : ''}</p>
              </div>
            ))}
            {(!activeTopic?.resources || activeTopic.resources.filter(r => r.type !== 'video').length === 0) && (
              <p style={{color: 'var(--wb-offBlack50)', fontStyle: 'italic'}}>No articles or exercises scheduled for this topic.</p>
            )}
          </div>
        </section>

        {/* AI Summary Interactive */}
        <section style={styles.section}>
          <div className="card" style={styles.aiCard}>
            <div style={styles.aiContent}>
              <h3 style={{fontSize: '20px', color: 'var(--wb-purple)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <MessageSquare size={24}/> AI Tutor Summary
              </h3>
              <p style={{marginTop: '8px', color: 'var(--wb-offBlack64)'}}>
                This section covers the core concepts of {activeTopic?.title}. 
                Make sure you understand the fundamental principles and how they apply to the broader subject of {activeSubject.title}...
              </p>
            </div>
            <button 
              className="btn-primary" 
              style={{backgroundColor: 'var(--wb-purple)'}}
              onClick={() => setChatOpen(!chatOpen)}
            >
              Chat with AI Tutor
            </button>
          </div>
          
          {chatOpen && (
            <div style={styles.chatBox} className="card">
              <div style={styles.chatHistory}>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} style={{textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '8px'}}>
                    <div style={msg.role === 'user' ? styles.userBubble : styles.aiBubble}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.chatInputArea}>
                <input 
                  type="text" 
                  placeholder="Ask a question..." 
                  style={styles.chatInput} 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  className="btn-primary" 
                  style={{backgroundColor: 'var(--wb-purple)'}}
                  onClick={handleSendMessage}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const styles = {
  sidebarCard: {
    padding: 'var(--wb-spacing-large)',
  },
  sidebarTitle: {
    fontSize: '14px',
    fontWeight: '900',
    color: 'var(--wb-offBlack64)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 'var(--wb-spacing-medium)',
    display: 'flex',
    alignItems: 'center'
  },
  subjectSelect: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid var(--wb-offBlack32)',
    fontSize: '16px',
    fontWeight: '700',
    fontFamily: 'inherit',
    backgroundColor: 'var(--wb-offWhite)'
  },
  progressBarBg: {
    height: '8px',
    backgroundColor: 'var(--wb-offBlack16)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--wb-green)',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '14px',
    color: 'var(--wb-offBlack64)',
    fontWeight: '700',
    marginBottom: 'var(--wb-spacing-large)'
  },
  topicList: {
    listStyle: 'none',
  },
  topicItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  activeTopic: {
    backgroundColor: 'var(--wb-offBlack8)',
  },
  topicTitle: {
    fontSize: '14px',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 'var(--wb-spacing-x-large)',
    flexWrap: 'wrap',
    gap: '16px'
  },
  subjectBreadcrumb: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--wb-offBlack50)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '900',
    color: 'var(--wb-offBlack)',
  },
  section: {
    marginBottom: 'var(--wb-spacing-x-large)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: 'var(--wb-spacing-medium)',
    color: 'var(--wb-darkBlue)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 'var(--wb-spacing-medium)',
  },
  resourceCard: {
    padding: 'var(--wb-spacing-medium)',
    cursor: 'pointer',
  },
  videoThumbnail: {
    height: '160px',
    backgroundColor: '#ff0000',
    borderRadius: '4px',
    marginBottom: '12px',
    opacity: 0.8
  },
  videoThumbnailKhan: {
    height: '160px',
    backgroundColor: 'var(--wb-teal)',
    borderRadius: '4px',
    marginBottom: '12px',
    opacity: 0.8
  },
  resourceTitle: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '4px'
  },
  resourceMeta: {
    fontSize: '14px',
    color: 'var(--wb-offBlack64)'
  },
  aiCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeft: '4px solid var(--wb-purple)',
    backgroundColor: 'var(--wb-offWhite)',
    flexWrap: 'wrap',
    gap: '16px'
  },
  aiContent: {
    minWidth: '200px',
    flexGrow: 1
  },
  chatBox: {
    marginTop: 'var(--wb-spacing-medium)',
    border: '1px solid var(--wb-purple)',
  },
  chatHistory: {
    minHeight: '200px',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: 'var(--wb-spacing-medium)',
    backgroundColor: 'var(--wb-offWhite)',
    borderRadius: '8px 8px 0 0',
  },
  aiBubble: {
    backgroundColor: 'var(--wb-purple)',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '16px 16px 16px 0',
    display: 'inline-block',
    maxWidth: '80%'
  },
  userBubble: {
    backgroundColor: 'var(--wb-offBlack8)',
    color: 'var(--wb-offBlack)',
    padding: '12px 16px',
    borderRadius: '16px 16px 0 16px',
    display: 'inline-block',
    maxWidth: '80%'
  },
  chatInputArea: {
    display: 'flex',
    gap: '12px',
    padding: 'var(--wb-spacing-medium)',
    borderTop: '1px solid var(--wb-offBlack16)',
  },
  chatInput: {
    flexGrow: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--wb-offBlack32)',
    fontSize: '16px',
    fontFamily: 'inherit'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--wb-offBlack64)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--wb-white)',
    padding: 'var(--wb-spacing-xx-large)',
    width: '100%',
    maxWidth: '450px',
    position: 'relative'
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--wb-offBlack64)'
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
    fontFamily: 'inherit',
    backgroundColor: 'var(--wb-offWhite)'
  }
};

export default Dashboard;
