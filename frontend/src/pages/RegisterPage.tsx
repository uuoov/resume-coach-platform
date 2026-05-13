import { useState, type FormEvent, type ChangeEvent } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Link,
  CircularProgress,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/error';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为 6 位');
      setLoading(false);
      return;
    }

    try {
      await register(formData.email, formData.password, formData.name);
      navigate('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err, '注册失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      bgcolor: 'rgba(255,255,255,0.6)',
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f093fb 0%, #764ba2 50%, #667eea 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 30% 70%, rgba(255,255,255,0.05) 0%, transparent 40%)',
          animation: 'float 20s ease-in-out infinite',
        },
        '@keyframes float': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '50%': { transform: 'translate(2%, -2%) rotate(-1deg)' },
        },
      }}
    >
      <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'fadeInUp 0.6s ease-out',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              padding: { xs: 3, sm: 5 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
            }}
          >
            {/* Brand Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AutoFixHighIcon sx={{ fontSize: 32, color: '#4F46E5' }} />
              <Typography variant="h5" fontWeight="800" sx={{ color: '#4F46E5', letterSpacing: '-0.02em' }}>
                Resume Coach
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              AI 驱动的简历优化平台
            </Typography>

            <Typography component="h1" variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
              创建账号
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              开始你的简历优化之旅
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mt: 1, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                fullWidth
                id="name"
                label="用户名"
                name="name"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                sx={inputSx}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="邮箱地址"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                sx={inputSx}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="密码"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                helperText="至少 6 个字符"
                sx={inputSx}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="确认密码"
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                sx={inputSx}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2.5,
                  fontWeight: 700,
                  fontSize: '1rem',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                  boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6D28D9 0%, #4338CA 100%)',
                    boxShadow: '0 6px 20px rgba(124, 58, 237, 0.5)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {loading ? '注册中...' : '注册'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Link
                  component={RouterLink}
                  to="/login"
                  variant="body2"
                  sx={{
                    color: '#4F46E5',
                    fontWeight: 500,
                    '&:hover': { color: '#7C3AED' },
                  }}
                >
                  已有账号？立即登录
                </Link>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default RegisterPage;
