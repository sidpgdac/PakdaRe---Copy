import FileReport from '../pages/FileReport';

export default function FileReportModal({ onClose, onSubmit, showToast }) {
  return (
    <div className="mov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dbox" style={{ maxWidth: '600px', height: '90vh', overflowY: 'auto', padding: '0' }}>
        <div className="dmod-hdr" style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--ff-serif)', fontSize: 20, fontWeight: 700, color: 'var(--navy)' }}>
              File a New Report
            </div>
            <div style={{ fontSize: 13, color: 'var(--g500)', marginTop: 4 }}>
              Anonymous · Auto GPS-tagged · Auto-routed
            </div>
          </div>
          <button className="mclose" style={{ background: 'var(--g100)', color: 'var(--navy)' }} onClick={onClose}>✕</button>
        </div>
        
        <div style={{ padding: '0 24px 24px' }}>
          <FileReport 
            onSubmit={(c) => {
              onSubmit(c);
              onClose();
            }} 
            showToast={showToast} 
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
}
