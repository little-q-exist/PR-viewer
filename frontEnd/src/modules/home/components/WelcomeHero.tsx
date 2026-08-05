import { Button, Space, Typography } from 'antd';
import { GithubOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const OAUTH_STATE_KEY = 'github-oauth-state';

export default function WelcomeHero() {
  const githubAppName = import.meta.env.VITE_GITHUB_APP_NAME || 'ai-pr-viewer';

  const handleLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_APP_CLIENT_ID;
    if (!clientId) {
      window.alert('GitHub App client ID is not configured.');
      return;
    }

    const state = crypto.randomUUID();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);

    const authorizationUrl = new URL('https://github.com/login/oauth/authorize');
    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', window.location.origin);
    authorizationUrl.searchParams.set('state', state);
    window.location.href = authorizationUrl.toString();
  };

  const handleInstall = () => {
    window.location.href = `https://github.com/apps/${githubAppName}/installations/new`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 200px)',
      textAlign: 'center',
      height: '100%'
    }}>
      <Title level={1} style={{ fontSize: 48, marginBottom: 16, color: '#fff', letterSpacing: 2 }}>
        PR Viewer
      </Title>
      <Paragraph style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', marginBottom: 40, maxWidth: 480 }}>
        AI 驱动的代码评审工具 — 粘贴 PR 链接，即刻获取专业 Review 建议
      </Paragraph>
      <Space direction="vertical" size="middle">
        <Button
          type="primary"
          size="large"
          icon={<GithubOutlined />}
          onClick={handleLogin}
          style={{ height: 48, paddingInline: 32, fontSize: 16, borderRadius: 8 }}
        >
          Login with GitHub
        </Button>
        <Button type="link" onClick={handleInstall}>
          首次使用？先安装 GitHub App
        </Button>
      </Space>
    </div>
  );
}
