import { AlertTriangle } from 'lucide-react';
import { C } from '../../constants/colors';
import Card from '../ui/Card';

export default function LogoutConfirmModal({ onCancel, onConfirm }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'grid',
      placeItems: 'center',
      padding: '24px',
      background: 'rgba(15, 23, 36, 0.58)',
      backdropFilter: 'blur(6px)',
    }}>
      <Card style={{
        width: 'min(420px, 100%)',
        padding: '24px',
        borderRadius: '18px',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: `${C.red}18`,
          border: `1px solid ${C.red}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <AlertTriangle size={20} color={C.red} />
        </div>

        <div style={{
          fontSize: '24px',
          fontWeight: 700,
          color: C.text,
        }}>
          Confirm Logout
        </div>

        <div style={{
          marginTop: '10px',
          color: C.textDim,
          fontSize: '14px',
          lineHeight: 1.6,
        }}>
          Are you sure you want to log out of AedesCapella? Your current dashboard session will be closed.
        </div>

        <div style={{
          marginTop: '22px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
        }}>
          <button
            onClick={onCancel}
            style={{
              height: '42px',
              padding: '0 16px',
              borderRadius: '12px',
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: C.text,
              cursor: 'pointer',
              fontFamily: 'var(--font-data)',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: '42px',
              padding: '0 16px',
              borderRadius: '12px',
              border: `1px solid ${C.red}44`,
              background: `linear-gradient(135deg, ${C.red}, #b91c1c)`,
              color: '#fff7f7',
              cursor: 'pointer',
              fontFamily: 'var(--font-data)',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Yes, Logout
          </button>
        </div>
      </Card>
    </div>
  );
}
