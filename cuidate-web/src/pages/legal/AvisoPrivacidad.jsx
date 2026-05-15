import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';
import Logo from '../../components/common/Logo';
import PrivacyNoticeContent from '../../components/legal/PrivacyNoticeContent';
import { PRIVACY_NOTICE_META } from '../../content/avisoPrivacidad';

export default function AvisoPrivacidad() {
  return (
    <div
      className="login-page"
      style={{ alignItems: 'flex-start', paddingTop: '2rem', paddingBottom: '2rem' }}
    >
      <Card className="login-card" style={{ maxWidth: 720, width: '100%' }}>
        <h1 style={{ margin: '0 0 0.5rem', display: 'flex', justifyContent: 'center' }}>
          <Logo size="medium" variant="stack" />
        </h1>
        <h2 style={{ textAlign: 'center', margin: '0 0 1.5rem', fontSize: '1.35rem' }}>
          {PRIVACY_NOTICE_META.title}
        </h2>
        <PrivacyNoticeContent />
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/login">
            <Button variant="outline" type="button">
              Volver al inicio de sesión
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
