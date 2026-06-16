import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { adminApi } from '../../services/api';

interface AiLogRow {
  id: string;
  userId: string | null;
  service: string;
  provider: string;
  model: string;
  temperature: number | null;
  promptChars: number;
  responseChars: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

interface ListResult {
  items: AiLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface StatsRow {
  service: string;
  totalCalls: number;
  successCalls: number;
  failureCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
}

interface StatsPayload {
  days: number;
  since: string;
  stats: StatsRow[];
}

const SERVICE_OPTIONS = [
  'resume-parser',
  'jd-analyzer',
  'matching-engine',
  'optimization-advisor',
  'company-info',
];

export default function AiAuditTab() {
  const [data, setData] = useState<ListResult | null>(null);
  const [stats, setStats] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [serviceFilter, setServiceFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState<'true' | 'false' | ''>('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminApi.listAiLogs({
        service: serviceFilter || undefined,
        success: successFilter === 'true' ? true : successFilter === 'false' ? false : undefined,
        page: page + 1,
        pageSize,
      }),
      adminApi.getAiLogStats(7),
    ])
      .then(([list, stat]: [ListResult, StatsPayload]) => {
        setData(list);
        setStats(stat.stats);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, [page, pageSize, serviceFilter, successFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600}>
            AI 调用统计（近 7 天）
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {stats.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  暂无统计数据
                </Typography>
              </Grid>
            )}
            {stats.map((s) => (
              <Grid key={s.service} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {s.service}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Chip
                        size="small"
                        label={`调用 ${s.totalCalls}`}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`成功 ${s.successCalls}`}
                        color="success"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`失败 ${s.failureCalls}`}
                        color={s.failureCalls > 0 ? 'error' : 'default'}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`Tokens ${s.totalTokens.toLocaleString()}`}
                        color="secondary"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={`延迟 ${s.latencyMs.toLocaleString()}ms`}
                        variant="outlined"
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Select
          size="small"
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value as string);
            setPage(0);
          }}
          displayEmpty
        >
          <MenuItem value="">全部服务</MenuItem>
          {SERVICE_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          value={successFilter}
          onChange={(e) => {
            setSuccessFilter(e.target.value as any);
            setPage(0);
          }}
          displayEmpty
        >
          <MenuItem value="">全部结果</MenuItem>
          <MenuItem value="true">成功</MenuItem>
          <MenuItem value="false">失败</MenuItem>
        </Select>
        <Button startIcon={<RefreshIcon />} onClick={load} size="small">
          刷新
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>服务</TableCell>
                  <TableCell>模型</TableCell>
                  <TableCell align="right">Tokens (P/C/T)</TableCell>
                  <TableCell align="right">延迟</TableCell>
                  <TableCell>结果</TableCell>
                  <TableCell>错误</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{row.service}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{row.model}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {row.promptTokens ?? '-'}/{row.completionTokens ?? '-'}/{row.totalTokens ?? '-'}
                    </TableCell>
                    <TableCell align="right">{row.latencyMs}ms</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.success ? '成功' : '失败'}
                        color={row.success ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="error">
                        {row.errorMessage || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {data && data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      暂无 AI 调用记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {data && (
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
            />
          )}
        </>
      )}
    </Box>
  );
}
