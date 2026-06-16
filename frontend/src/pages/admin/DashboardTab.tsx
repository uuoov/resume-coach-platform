import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import TodayIcon from '@mui/icons-material/Today';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { adminApi } from '../../services/api';

interface DashboardData {
  todayRegistrations: number;
  dau: number;
  aiCalls7d: number;
  aiErrors7d: number;
  aiTokens7d: number;
  aiErrorRate: number;
  pdfExports7d: number;
  userRoleStats: Array<{ role: string; _count: { _all: number } }>;
  aiServiceBreakdown: Array<{
    service: string;
    totalCalls: number;
    successCalls: number;
    failureCalls: number;
    totalTokens: number;
  }>;
}

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

function KpiCard({ title, value, icon, color }: KpiCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              borderRadius: 2,
              p: 1,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    adminApi
      .getDashboard()
      .then((d: DashboardData) => {
        if (isActive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(err instanceof Error ? err.message : '加载失败');
          setLoading(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!data) {
    return null;
  }

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="今日注册"
            value={data.todayRegistrations}
            icon={<TodayIcon />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="DAU（近 24h）"
            value={data.dau}
            icon={<GroupIcon />}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="AI 调用（近 7 天）"
            value={data.aiCalls7d}
            icon={<SmartToyIcon />}
            color="secondary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="PDF 导出 / 匹配（近 7 天）"
            value={data.pdfExports7d}
            icon={<PictureAsPdfIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                AI 健康度（近 7 天）
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={`调用 ${data.aiCalls7d}`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`错误 ${data.aiErrors7d}`}
                  color={data.aiErrorRate > 10 ? 'error' : 'default'}
                  variant="outlined"
                />
                <Chip
                  label={`错误率 ${data.aiErrorRate}%`}
                  color={data.aiErrorRate > 10 ? 'error' : 'success'}
                  variant="outlined"
                />
                <Chip
                  label={`Tokens ${data.aiTokens7d.toLocaleString()}`}
                  color="secondary"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                用户角色分布
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {data.userRoleStats.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    暂无数据
                  </Typography>
                )}
                {data.userRoleStats.map((stat) => (
                  <Chip
                    key={stat.role}
                    label={`${stat.role}: ${stat._count._all}`}
                    color={stat.role === 'ADMIN' ? 'secondary' : 'default'}
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            AI 调用按服务拆分（近 7 天）
          </Typography>
          {data.aiServiceBreakdown.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              暂无 AI 调用记录
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {data.aiServiceBreakdown.map((row) => (
                <Box
                  key={row.service}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {row.service}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      size="small"
                      label={`调用 ${row.totalCalls}`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`成功 ${row.successCalls}`}
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`失败 ${row.failureCalls}`}
                      color={row.failureCalls > 0 ? 'error' : 'default'}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={`Tokens ${row.totalTokens.toLocaleString()}`}
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
