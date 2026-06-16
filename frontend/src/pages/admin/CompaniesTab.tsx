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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { adminApi } from '../../services/api';

interface CompanyRow {
  id: string;
  name: string;
  industry?: string | null;
  size?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
  techStack: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResult {
  items: CompanyRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface EditState {
  name: string;
  industry: string;
  size: string;
  location: string;
  website: string;
  description: string;
  techStack: string; // 逗号分隔
  source: string;
}

const emptyEdit: EditState = {
  name: '',
  industry: '',
  size: '',
  location: '',
  website: '',
  description: '',
  techStack: '',
  source: 'manual',
};

export default function CompaniesTab() {
  const [data, setData] = useState<ListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState>(emptyEdit);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listCompanies({
        keyword: keyword || undefined,
        source: sourceFilter || undefined,
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
  }, [page, pageSize, keyword, sourceFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setEdit(emptyEdit);
    setDialogOpen(true);
  };

  const openEdit = (row: CompanyRow) => {
    setEditingId(row.id);
    setEdit({
      name: row.name,
      industry: row.industry || '',
      size: row.size || '',
      location: row.location || '',
      website: row.website || '',
      description: row.description || '',
      techStack: row.techStack.join(', '),
      source: row.source,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: edit.name.trim(),
        industry: edit.industry.trim() || undefined,
        size: edit.size.trim() || undefined,
        location: edit.location.trim() || undefined,
        website: edit.website.trim() || undefined,
        description: edit.description.trim() || undefined,
        techStack: edit.techStack
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
        source: edit.source,
      };

      if (!payload.name) {
        throw new Error('公司名不能为空');
      }

      if (editingId) {
        await adminApi.updateCompany(editingId, payload);
      } else {
        await adminApi.createCompany(payload);
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CompanyRow) => {
    if (!window.confirm(`确认删除公司「${row.name}」？此操作不可恢复。`)) {
      return;
    }
    try {
      await adminApi.deleteCompany(row.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <TextField
          size="small"
          placeholder="搜索公司名 / 行业 / 地点"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(0);
          }}
        />
        <Select
          size="small"
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value as string);
            setPage(0);
          }}
          displayEmpty
        >
          <MenuItem value="">全部来源</MenuItem>
          <MenuItem value="mock">mock</MenuItem>
          <MenuItem value="search">search</MenuItem>
          <MenuItem value="manual">manual</MenuItem>
        </Select>
        <Button startIcon={<RefreshIcon />} onClick={load} size="small">
          刷新
        </Button>
        <Button startIcon={<AddIcon />} onClick={openCreate} size="small" variant="contained">
          新建
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
                  <TableCell>名称</TableCell>
                  <TableCell>行业</TableCell>
                  <TableCell>规模</TableCell>
                  <TableCell>地点</TableCell>
                  <TableCell>技术栈</TableCell>
                  <TableCell>来源</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.items.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.industry || '-'}</TableCell>
                    <TableCell>{row.size || '-'}</TableCell>
                    <TableCell>{row.location || '-'}</TableCell>
                    <TableCell>
                      {(row.techStack || []).slice(0, 5).join(', ')}
                      {row.techStack.length > 5 && ` +${row.techStack.length - 5}`}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.source}
                        color={
                          row.source === 'mock'
                            ? 'warning'
                            : row.source === 'search'
                              ? 'info'
                              : 'default'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="编辑">
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {row.source !== 'search' && (
                        <Tooltip title="删除">
                          <IconButton size="small" onClick={() => handleDelete(row)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data && data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      暂无公司
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? '编辑公司' : '新建公司'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="公司名称 *"
              value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
            />
            <TextField
              label="行业"
              value={edit.industry}
              onChange={(e) => setEdit({ ...edit, industry: e.target.value })}
            />
            <TextField
              label="规模"
              value={edit.size}
              onChange={(e) => setEdit({ ...edit, size: e.target.value })}
            />
            <TextField
              label="地点"
              value={edit.location}
              onChange={(e) => setEdit({ ...edit, location: e.target.value })}
            />
            <TextField
              label="官网"
              value={edit.website}
              onChange={(e) => setEdit({ ...edit, website: e.target.value })}
            />
            <TextField
              label="描述"
              multiline
              rows={3}
              value={edit.description}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })}
            />
            <TextField
              label="技术栈（逗号分隔）"
              value={edit.techStack}
              onChange={(e) => setEdit({ ...edit, techStack: e.target.value })}
            />
            <Select
              label="来源"
              value={edit.source}
              onChange={(e) => setEdit({ ...edit, source: e.target.value })}
            >
              <MenuItem value="mock">mock</MenuItem>
              <MenuItem value="manual">manual</MenuItem>
              <MenuItem value="search">search</MenuItem>
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
