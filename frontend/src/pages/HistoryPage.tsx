import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  LinearProgress,
  Avatar,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import BusinessIcon from '@mui/icons-material/Business';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import {
  readHistory,
  deleteHistory,
  clearHistory,
  restoreSnapshotToSession,
  type HistoryRecord,
} from '../services/history';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<HistoryRecord[]>(readHistory);
  const [notice, setNotice] = useState<string | null>(null);

  const handleClearHistory = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      clearHistory();
      setRecords([]);
    }
  };

  const handleDeleteRecord = (id: string) => {
    const updated = deleteHistory(id);
    setRecords(updated);
  };

  const handleOpenRecord = (record: HistoryRecord) => {
    const ok = restoreSnapshotToSession(record);
    if (ok) {
      navigate('/match');
      return;
    }
    // 没有快照（旧数据）→ 提示重新分析
    setNotice('该记录缺少完整快照，无法恢复。请重新上传简历并分析 JD。');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '高匹配';
    if (score >= 60) return '中等匹配';
    return '待提升';
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // 空状态
  if (records.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Avatar
          sx={{
            width: 80,
            height: 80,
            mx: 'auto',
            mb: 3,
            bgcolor: 'primary.light',
          }}
        >
          <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        </Avatar>
        <Typography variant="h5" fontWeight="700" gutterBottom>
          还没有匹配记录
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
          上传简历并分析 JD 后，匹配结果会自动保存在这里，方便您随时回顾和对比。
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => navigate('/resume')}
          sx={{
            px: 4,
            py: 1.5,
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)' },
          }}
        >
          开始第一次分析
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            匹配历史
          </Typography>
          <Typography color="text.secondary">
            共 {records.length} 条记录
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleClearHistory}
            startIcon={<DeleteOutlineIcon />}
          >
            清空
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/resume')}
          >
            新分析
          </Button>
        </Box>
      </Box>

      {notice && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Grid container spacing={2}>
        {records.map((record) => (
          <Grid key={record.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Paper
              sx={{
                p: 3,
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                  borderColor: 'primary.main',
                },
              }}
              onClick={() => handleOpenRecord(record)}
            >
              {/* 头部：分数 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight="700" sx={{ mb: 0.5, lineHeight: 1.2 }}>
                    {record.jobTitle}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {record.company}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="h4"
                    fontWeight="800"
                    sx={{ color: getScoreColor(record.overallScore), lineHeight: 1 }}
                  >
                    {record.overallScore}
                  </Typography>
                  <Chip
                    label={getScoreLabel(record.overallScore)}
                    size="small"
                    sx={{
                      mt: 0.5,
                      bgcolor: `${getScoreColor(record.overallScore)}15`,
                      color: getScoreColor(record.overallScore),
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                </Box>
              </Box>

              {/* 进度条 */}
              <LinearProgress
                variant="determinate"
                value={record.overallScore}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  mb: 2,
                  bgcolor: `${getScoreColor(record.overallScore)}15`,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getScoreColor(record.overallScore),
                    borderRadius: 3,
                  },
                }}
              />

              {/* 底部信息 */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(record.date)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  {record.resumeName && (
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      {record.resumeName}
                    </Typography>
                  )}
                  {record.aiPowered && (
                    <Chip label="AI" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                  )}
                  {!record.snapshot && (
                    <Chip label="旧" size="small" color="default" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                  )}
                  <Button
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record.id); }}
                    sx={{ minWidth: 'auto', p: 0.5, color: 'text.secondary' }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
