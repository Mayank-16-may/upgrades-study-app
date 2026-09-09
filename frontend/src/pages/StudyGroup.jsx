import React from 'react';
import { Trophy, Medal, User, Flame } from 'lucide-react';

const mockLeaderboard = [
  { rank: 1, name: 'Alex M.', score: 2450, syllabus: 45, streak: 12 },
  { rank: 2, name: 'You', score: 2100, syllabus: 33, streak: 5 },
  { rank: 3, name: 'Sarah K.', score: 1850, syllabus: 28, streak: 3 },
  { rank: 4, name: 'James T.', score: 1200, syllabus: 15, streak: 1 }
];

const StudyGroup = () => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Study Group: AP Physics C</h1>
        <div style={styles.headerStats}>
          <div className="card" style={styles.statCard}>
            <Trophy size={24} color="var(--wb-gold)" />
            <div>
              <p style={styles.statLabel}>Your Rank</p>
              <p style={styles.statValue}>2nd</p>
            </div>
          </div>
          <div className="card" style={styles.statCard}>
            <Flame size={24} color="var(--wb-red)" />
            <div>
              <p style={styles.statLabel}>Day Streak</p>
              <p style={styles.statValue}>5</p>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.contentGrid}>
        {/* Leaderboard */}
        <section className="card" style={styles.leaderboardCard}>
          <h2 style={styles.sectionTitle}>Weekly Leaderboard</h2>
          <table style={styles.table}>
            <thead>
              <tr style={styles.trHeader}>
                <th style={styles.th}>Rank</th>
                <th style={styles.th}>Student</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Syllabus %</th>
              </tr>
            </thead>
            <tbody>
              {mockLeaderboard.map((user) => (
                <tr key={user.rank} style={{
                  ...styles.tr, 
                  ...(user.name === 'You' ? styles.trHighlight : {})
                }}>
                  <td style={styles.td}>
                    {user.rank === 1 ? <Medal color="var(--wb-gold)" /> : user.rank}
                  </td>
                  <td style={styles.tdUser}>
                    <div style={styles.avatar}><User size={16}/></div>
                    {user.name}
                  </td>
                  <td style={{...styles.td, fontWeight: '700'}}>{user.score} XP</td>
                  <td style={styles.td}>
                    <div style={styles.miniProgressBg}>
                      <div style={{...styles.miniProgressFill, width: `${user.syllabus}%`}}></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* AI Quiz Call to action */}
        <section className="card" style={styles.quizCard}>
          <div style={styles.quizContent}>
            <h2 style={styles.sectionTitle}>Boost Your Rank!</h2>
            <p style={{color: 'var(--wb-offBlack64)', marginBottom: 'var(--wb-spacing-medium)'}}>
              Take an AI-generated quiz on <strong>Thermodynamics</strong> to earn up to 500 XP and jump to 1st place!
            </p>
            <button className="btn-primary" style={{backgroundColor: 'var(--wb-gold)', color: 'var(--wb-offBlack)'}} onClick={() => alert('Generating AI Quiz... (Mockup)')}>
              Start Quiz Now
            </button>
          </div>
          <div style={styles.quizIllustration}>
             <Trophy size={80} color="rgba(255,177,0,0.2)" />
          </div>
        </section>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: 'var(--wb-spacing-xx-large) var(--wb-spacing-medium)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--wb-spacing-xx-large)',
    flexWrap: 'wrap',
    gap: 'var(--wb-spacing-large)'
  },
  pageTitle: {
    fontSize: '36px',
    fontWeight: '900',
    color: 'var(--wb-darkBlue)',
  },
  headerStats: {
    display: 'flex',
    gap: 'var(--wb-spacing-medium)',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--wb-spacing-medium)',
    padding: 'var(--wb-spacing-medium) var(--wb-spacing-large)'
  },
  statLabel: {
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--wb-offBlack50)'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '900',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 'var(--wb-spacing-x-large)',
  },
  leaderboardCard: {
    padding: '0'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '900',
    padding: 'var(--wb-spacing-medium) var(--wb-spacing-large)',
    borderBottom: '1px solid var(--wb-offBlack16)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  trHeader: {
    backgroundColor: 'var(--wb-offWhite)',
  },
  th: {
    textAlign: 'left',
    padding: 'var(--wb-spacing-medium) var(--wb-spacing-large)',
    fontSize: '12px',
    textTransform: 'uppercase',
    color: 'var(--wb-offBlack64)'
  },
  tr: {
    borderBottom: '1px solid var(--wb-offBlack16)',
  },
  trHighlight: {
    backgroundColor: 'rgba(24, 101, 242, 0.05)',
  },
  td: {
    padding: 'var(--wb-spacing-medium) var(--wb-spacing-large)',
  },
  tdUser: {
    padding: 'var(--wb-spacing-medium) var(--wb-spacing-large)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: '700'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--wb-offBlack16)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  miniProgressBg: {
    width: '100%',
    height: '6px',
    backgroundColor: 'var(--wb-offBlack16)',
    borderRadius: '3px'
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: 'var(--wb-green)',
    borderRadius: '3px'
  },
  quizCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    backgroundColor: 'var(--wb-offWhite)',
    border: '1px solid var(--wb-gold)'
  },
  quizContent: {
    padding: 'var(--wb-spacing-large)'
  },
  quizIllustration: {
    display: 'flex',
    justifyContent: 'center',
    padding: 'var(--wb-spacing-large)',
    backgroundColor: 'var(--wb-offBlack8)',
    borderTop: '1px solid rgba(255,177,0,0.2)'
  }
};

export default StudyGroup;
