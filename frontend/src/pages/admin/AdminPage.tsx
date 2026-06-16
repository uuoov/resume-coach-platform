import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import BusinessIcon from '@mui/icons-material/Business';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DashboardTab from './DashboardTab';
import UsersTab from './UsersTab';
import CompaniesTab from './CompaniesTab';
import AiAuditTab from './AiAuditTab';

type TabKey = 'dashboard' | 'users' | 'companies' | 'ai-audit';

const TABS: Array<{ key: TabKey; label: string; icon: ReactElement }> = [
  { key: 'dashboard', label: '数据看板', icon: <DashboardIcon /> },
  { key: 'users', label: '用户管理', icon: <PeopleAltIcon /> },
  { key: 'companies', label: '公司信息库', icon: <BusinessIcon /> },
  { key: 'ai-audit', label: 'AI 审计', icon: <AssessmentIcon /> },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 组件级 ping，确保后端可达；失败时显示 banner
    let isActive = true;
    import('../../services/api').then(({ adminApi }) => {
      adminApi
        .getDashboard()
        .then(() => {
          if (isActive) {
            setError(null);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isActive) {
            setError(err instanceof Error ? err.message : '无法连接到 Admin 接口');
            setLoading(false);
          }
        });
    });
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Admin 后台
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: { xs: 1, md: 3 } }}>
          <Tabs
            value={activeTab}
            onChange={(_e, v) => setActiveTab(v as TabKey)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: 3,
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.key}
                value={tab.key}
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
              />
            ))}
          </Tabs>

          <Box sx={{ mt: 1 }}>
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'companies' && <CompaniesTab />}
            {activeTab === 'ai-audit' && <AiAuditTab />}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
