import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { ReportProblemOutlined } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 应用级 ErrorBoundary
 *
 * 捕获任何子组件渲染期抛出的同步错误与 lazy-load 失败，
 * 提供一个「回到首页」按钮，避免整页白屏无法恢复。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 开发期打 console，生产期可考虑上报到 Sentry
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isChunkError =
      this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
      this.state.error?.message?.includes('Importing a module script failed');

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          bgcolor: 'background.default',
        }}
      >
        <Paper sx={{ p: 5, maxWidth: 520, textAlign: 'center' }}>
          <ReportProblemOutlined sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {isChunkError ? '页面加载失败' : '出现了一个错误'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isChunkError
              ? '可能是网络波动导致资源加载失败，请尝试刷新页面。'
              : '应用遇到了一个意外错误，请尝试刷新或返回首页。'}
          </Typography>
          {this.state.error && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 3,
                textAlign: 'left',
                bgcolor: 'grey.50',
                maxHeight: 160,
                overflow: 'auto',
              }}
            >
              <Typography variant="caption" color="text.secondary" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}>
                {this.state.error.message}
              </Typography>
            </Paper>
          )}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            {isChunkError ? (
              <Button variant="contained" onClick={this.handleReload}>
                刷新页面
              </Button>
            ) : (
              <>
                <Button variant="outlined" onClick={this.handleReset}>
                  重试
                </Button>
                <Button variant="contained" onClick={this.handleGoHome}>
                  回到首页
                </Button>
              </>
            )}
          </Box>
        </Paper>
      </Box>
    );
  }
}
