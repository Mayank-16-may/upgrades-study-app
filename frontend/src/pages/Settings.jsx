import React, { useState } from 'react';
import { User, Bell, Shield, Smartphone, Trash2, Eye, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const { user } = useAuth();

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar" style={{width: '250px'}}>
        <div className="card" style={{padding: 'var(--wb-spacing-medium)'}}>
          <h3 style={{fontSize: '14px', fontWeight: '900', color: 'var(--wb-offBlack64)', marginBottom: '16px'}}>SETTINGS</h3>
          
          <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <li>
              <button 
                style={{...styles.tabBtn, ...(activeTab === 'account' ? styles.activeTab : {})}}
                onClick={() => setActiveTab('account')}
              >
                <User size={18} /> Account Profile
              </button>
            </li>
            <li>
              <button 
                style={{...styles.tabBtn, ...(activeTab === 'notifications' ? styles.activeTab : {})}}
                onClick={() => setActiveTab('notifications')}
              >
                <Bell size={18} /> Notifications
              </button>
            </li>
            <li>
              <button 
                style={{...styles.tabBtn, ...(activeTab === 'ai' ? styles.activeTab : {})}}
                onClick={() => setActiveTab('ai')}
              >
                <Brain size={18} /> AI Tutor
              </button>
            </li>
            <li>
              <button 
                style={{...styles.tabBtn, ...(activeTab === 'accessibility' ? styles.activeTab : {})}}
                onClick={() => setActiveTab('accessibility')}
              >
                <Eye size={18} /> Accessibility
              </button>
            </li>
            <li>
              <button 
                style={{...styles.tabBtn, ...(activeTab === 'security' ? styles.activeTab : {})}}
                onClick={() => setActiveTab('security')}
              >
                <Shield size={18} /> Security & Privacy
              </button>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <h2 style={{fontSize: '32px', fontWeight: '900', marginBottom: 'var(--wb-spacing-x-large)'}}>
          {activeTab === 'account' && 'Account Profile'}
          {activeTab === 'notifications' && 'Notification Preferences'}
          {activeTab === 'ai' && 'AI Tutor Preferences'}
          {activeTab === 'accessibility' && 'Accessibility & Display'}
          {activeTab === 'security' && 'Security & Privacy'}
        </h2>

        {/* ACCOUNT TAB */}
        {activeTab === 'account' && (
          <div className="card" style={{padding: 'var(--wb-spacing-x-large)'}}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <input 
                type="text" 
                defaultValue={user?.user_metadata?.name || ''} 
                id="profileName"
                style={styles.input} 
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input 
                type="email" 
                defaultValue={user?.email || ''} 
                id="profileEmail"
                style={styles.input} 
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>School / University</label>
              <input 
                type="text" 
                placeholder="e.g. Stanford University" 
                style={styles.input} 
              />
            </div>
            
            <hr style={styles.divider} />
            
            <h3 style={{fontSize: '18px', fontWeight: '700', marginBottom: '16px'}}>Linked Accounts</h3>
            <div style={styles.linkedAccountRow}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <div style={styles.iconBox}><Smartphone size={20} /></div>
                <div>
                  <div style={{fontWeight: '700'}}>Phone Number</div>
                  <div style={{fontSize: '14px', color: 'var(--wb-offBlack64)'}}>Not linked</div>
                </div>
              </div>
              <button className="btn-secondary">Link Phone</button>
            </div>
            
            <div style={{marginTop: '32px', display: 'flex', justifyContent: 'flex-end'}}>
              <button 
                className="btn-primary" 
                onClick={async (e) => {
                  const btn = e.target;
                  const originalText = btn.innerText;
                  btn.innerText = 'Saving...';
                  btn.disabled = true;
                  
                  try {
                    const newName = document.getElementById('profileName').value;
                    const newEmail = document.getElementById('profileEmail').value;
                    
                    const updates = {};
                    if (newEmail !== user?.email) updates.email = newEmail;
                    if (newName !== user?.user_metadata?.name) updates.data = { name: newName };
                    
                    if (Object.keys(updates).length > 0) {
                      const { error } = await supabase.auth.updateUser(updates);
                      if (error) throw error;
                    }
                    
                    alert('Profile changes saved!');
                  } catch (err) {
                    alert('Error saving profile: ' + err.message);
                  } finally {
                    btn.innerText = originalText;
                    btn.disabled = false;
                  }
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="card" style={{padding: 'var(--wb-spacing-x-large)'}}>
            <div style={styles.toggleRow}>
              <div>
                <div style={{fontWeight: '700', fontSize: '16px'}}>Daily Mission Reminders</div>
                <div style={{fontSize: '14px', color: 'var(--wb-offBlack64)'}}>Get an email every morning with your Smart Calendar tasks.</div>
              </div>
              <input type="checkbox" defaultChecked style={styles.checkbox} />
            </div>
            <hr style={styles.divider} />
            <div style={styles.toggleRow}>
              <div>
                <div style={{fontWeight: '700', fontSize: '16px'}}>Study Group Updates</div>
                <div style={{fontSize: '14px', color: 'var(--wb-offBlack64)'}}>Notify me when someone overtakes me on the leaderboard.</div>
              </div>
              <input type="checkbox" defaultChecked style={styles.checkbox} />
            </div>
            <hr style={styles.divider} />
            <div style={styles.toggleRow}>
              <div>
                <div style={{fontWeight: '700', fontSize: '16px'}}>New Feature Announcements</div>
                <div style={{fontSize: '14px', color: 'var(--wb-offBlack64)'}}>Updates about AI Tutor improvements and platform updates.</div>
              </div>
              <input type="checkbox" style={styles.checkbox} />
            </div>
          </div>
        )}

        {/* AI TUTOR TAB */}
        {activeTab === 'ai' && (
          <div className="card" style={{padding: 'var(--wb-spacing-x-large)'}}>
            <p style={{color: 'var(--wb-offBlack64)', marginBottom: '24px'}}>Customize how your personal AI Tutor explains concepts and answers questions.</p>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Teaching Style</label>
              <select style={styles.input}>
                <option>Socratic (Guides you with questions)</option>
                <option>Direct (Provides clear, fast answers)</option>
                <option>Storyteller (Uses analogies and narratives)</option>
              </select>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Explanation Complexity</label>
              <select style={styles.input}>
                <option>High School Level</option>
                <option>Explain Like I'm 5 (Simple)</option>
                <option>University / Graduate Level</option>
              </select>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Custom Instructions (Optional)</label>
              <textarea 
                rows="4" 
                style={{...styles.input, resize: 'vertical'}} 
                placeholder="E.g., Always relate physics concepts to cars if possible..."
              ></textarea>
            </div>

            <div style={{marginTop: '32px', display: 'flex', justifyContent: 'flex-end'}}>
              <button className="btn-primary" style={{backgroundColor: 'var(--wb-purple)'}} onClick={() => alert('AI preferences saved!')}>Save AI Settings</button>
            </div>
          </div>
        )}

        {/* ACCESSIBILITY TAB */}
        {activeTab === 'accessibility' && (
          <div className="card" style={{padding: 'var(--wb-spacing-x-large)'}}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Base Font Size</label>
              <select style={styles.input}>
                <option>Normal (16px)</option>
                <option>Large (18px)</option>
                <option>Extra Large (20px)</option>
              </select>
            </div>

            <hr style={styles.divider} />

            <div style={styles.toggleRow}>
              <div>
                <div style={{fontWeight: '700', fontSize: '16px'}}>Dyslexia-Friendly Font</div>
                <div style={{fontSize: '14px', color: 'var(--wb-offBlack64)'}}>Use a specialized font (like OpenDyslexic) for better readability.</div>
              </div>
              <input type="checkbox" style={styles.checkbox} />
            </div>

            <hr style={styles.divider} />

            <div style={styles.toggleRow}>
              <div>
                <div style={{fontWeight: '700', fontSize: '16px'}}>High Contrast Mode</div>
                <div style={{fontSize: '14px', color: 'var(--wb-offBlack64)'}}>Increase color contrast for text and interactive elements.</div>
              </div>
              <input type="checkbox" style={styles.checkbox} />
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="card" style={{padding: 'var(--wb-spacing-x-large)'}}>
            <h3 style={{fontSize: '18px', fontWeight: '700', marginBottom: '16px'}}>Change Password</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Current Password</label>
              <input type="password" style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>New Password</label>
              <input type="password" style={styles.input} />
            </div>
            <button className="btn-secondary" style={{marginBottom: '32px'}} onClick={() => alert('Password updated securely.')}>Update Password</button>

            <hr style={styles.divider} />

            <h3 style={{fontSize: '18px', fontWeight: '700', color: 'var(--wb-red)', marginBottom: '16px'}}>Danger Zone</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(217, 41, 22, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(217, 41, 22, 0.2)'}}>
              <div>
                <div style={{fontWeight: '700', color: 'var(--wb-red)'}}>Delete Account & All Data</div>
                <div style={{fontSize: '14px', color: 'var(--wb-offBlack64)'}}>Permanently erase all syllabi, study plans, and progress.</div>
              </div>
              <button className="btn-primary" style={{backgroundColor: 'var(--wb-red)', borderColor: 'var(--wb-red)'}} onClick={() => alert('Action requires secondary confirmation (Mockup)')}>
                <Trash2 size={16} style={{marginRight: '8px'}}/> Delete Account
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    textAlign: 'left',
    color: 'var(--wb-offBlack64)',
    fontWeight: '700',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, color 0.2s'
  },
  activeTab: {
    backgroundColor: 'rgba(24, 101, 242, 0.1)',
    color: 'var(--wb-activeBlue)'
  },
  formGroup: {
    marginBottom: '20px'
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
  },
  divider: {
    border: 'none',
    borderTop: '1px solid var(--wb-offBlack16)',
    margin: '32px 0'
  },
  linkedAccountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    border: '1px solid var(--wb-offBlack16)',
    borderRadius: '8px',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    backgroundColor: 'var(--wb-offBlack8)',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  checkbox: {
    width: '24px',
    height: '24px',
    cursor: 'pointer'
  }
};

export default Settings;
