import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  TextField,
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
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import { adminApi } from '../../services/api';

interface UserRow {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED';
  disabledAt: string | null;
  createdAt: string;
}

interface ListResult {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UsersTab() {
  const [data, setData] = useState<ListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'DISABLED' | ''>('');
  const [roleFilter, setRoleFilter] = useState<'USER' | 'ADMIN' | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN'>('USER');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listUsers({
        q: q || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        page: page + 1,
        pageSize,
      })
      .then((result: ListResult) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
        setLoading(false);
      });
  }, [page, pageSize, q, statusFilter, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await adminApi.updateUser(editingId, {
        role: editRole,
        status: editStatus,
      });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: UserRow) => {
    setEditingId(row.id);
    setEditRole(row.role);
    setEditStatus(row.status);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <TextField
          size="small"
          placeholder="搜索 email / 姓名"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
        <Select
          size="small"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as any);
            setPage(0);
          }}
          displayEmpty
        >
          <MenuItem value="">全部状态</MenuItem>
          <MenuItem value="ACTIVE">ACTIVE</MenuItem>
          <MenuItem value="DISABLED">DISABLED</MenuItem>
        </Select>
        <Select
          size="small"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as any);
            setPage(0);
          }}
          displayEmpty
        >
          <MenuItem value="">全部角色</MenuItem>
          <MenuItem value="USER">USER</MenuItem>
          <MenuItem value="ADMIN">ADMIN</MenuItem>
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
                  <TableCell>Email</TableCell>
                  <TableCell>姓名</TableCell>
                  <TableCell>角色</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>注册时间</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.name || '-'}</TableCell>
                    <TableCell>
                      {editingId === row.id ? (
                        <Select
                          size="small"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as any)}
                        >
                          <MenuItem value="USER">USER</MenuItem>
                          <MenuItem value="ADMIN">ADMIN</MenuItem>
                        </Select>
                      ) : (
                        <Chip
                          size="small"
                          label={row.role}
                          color={row.role === 'ADMIN' ? 'secondary' : 'default'}
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === row.id ? (
                        <Select
                          size="small"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                        >
                          <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                          <MenuItem value="DISABLED">DISABLED</MenuItem>
                        </Select>
                      ) : (
                        <Chip
                          size="small"
                          label={row.status}
                          color={row.status === 'ACTIVE' ? 'success' : 'error'}
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      {editingId === row.id ? (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={handleSave}
                            disabled={saving}
                          >
                            保存
                          </Button>
                          <Button
                            size="small"
                            onClick={() => setEditingId(null)}
                            disabled={saving}
                          >
                            取消
                          </Button>
                        </Stack>
                      ) : (
                        <IconButton size="small" onClick={() => startEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data && data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      暂无用户
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
