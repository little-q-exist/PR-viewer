import { Button, Typography } from 'antd';
import { GithubOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function WelcomeHero() {
  const handleLogin = () => {
    const githubAppName = import.meta.env.VITE_GITHUB_APP_NAME || 'ai-pr-viewer';
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
    }}>
      <Title level={1} style={{ fontSize: 48, marginBottom: 16, color: '#fff', letterSpacing: 2 }}>
        PR Viewer
      </Title>
      <Paragraph style={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', marginBottom: 40, maxWidth: 480 }}>
        AI 驱动的代码评审工具 — 粘贴 PR 链接，即刻获取专业 Review 建议
      </Paragraph>
      <Button
        type="primary"
        size="large"
        icon={<GithubOutlined />}
        onClick={handleLogin}
        style={{ height: 48, paddingInline: 32, fontSize: 16, borderRadius: 8 }}
      >
        Login with GitHub
      </Button>
    </div>
  );
}
