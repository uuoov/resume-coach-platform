import { useState, type ReactNode } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  Avatar,
  Tooltip,
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import DescriptionIcon from '@mui/icons-material/Description';
import WorkIcon from '@mui/icons-material/Work';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: '首页', path: '/', icon: <HomeIcon /> },
  { label: '简历', path: '/resume', icon: <DescriptionIcon /> },
  { label: 'JD 分析', path: '/jd', icon: <WorkIcon /> },
  { label: '历史记录', path: '/history', icon: <HistoryIcon /> },
];

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const steps = ['上传简历', 'JD 分析', '匹配分析', '优化建议'];

  const getActiveStep = () => {
    const path = location.pathname;
    if (path === '/resume') return 0;
    if (path === '/jd') return 1;
    if (path === '/match') return 2;
    if (path === '/optimize') return 3;
    return -1;
  };

  const activeStep = getActiveStep();
  const isActivePath = (path: string) => location.pathname === path;

  const drawerContent = (
    <Box sx={{ width: 260, pt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, mb: 2 }}>
        <AutoFixHighIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" fontWeight="700" color="primary.main">
          Resume Coach
        </Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => { navigate(item.path); setDrawerOpen(false); }}
              selected={isActivePath(item.path)}
              sx={{
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'primary.light' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: isActivePath(item.path) ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: isActivePath(item.path) ? 600 : 400 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {user && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ px: 3, py: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {user.name || user.email}
            </Typography>
            <Button
              size="small"
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={() => { logout(); setDrawerOpen(false); }}
              sx={{ color: 'text.secondary' }}
            >
              退出登录
            </Button>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'grey.200',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              flexGrow: isMobile ? 1 : 0,
              mr: isMobile ? 0 : 4,
            }}
          >
            <AutoFixHighIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h6" fontWeight="700" color="primary.main" sx={{ letterSpacing: '-0.02em' }}>
              Resume Coach
            </Typography>
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  color="inherit"
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    color: isActivePath(item.path) ? 'primary.main' : 'text.secondary',
                    bgcolor: isActivePath(item.path) ? 'primary.light' : 'transparent',
                    fontWeight: isActivePath(item.path) ? 600 : 500,
                    '&:hover': {
                      bgcolor: isActivePath(item.path) ? 'primary.light' : 'grey.100',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {!isMobile && user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                }}
              >
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" color="text.primary" fontWeight={500}>
                {user.name || user.email}
              </Typography>
              <Tooltip title="退出登录" arrow>
                <IconButton
                  size="small"
                  onClick={logout}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main', bgcolor: 'error.light' },
                  }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* 移动端抽屉导航 */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { border: 'none' } }}
      >
        {drawerContent}
      </Drawer>

      {/* 核心流程的 Stepper */}
      {activeStep >= 0 && (
        <Box sx={{ width: '100%', bgcolor: 'background.default', pt: 3, pb: 1 }}>
          <Container maxWidth="md">
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Container>
        </Box>
      )}

      {/* 主内容 */}
      <Box sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ py: activeStep >= 0 ? 3 : 4 }}>
          {children}
        </Container>
      </Box>

      {/* 页脚 */}
      <Footer />
    </Box>
  );
}
