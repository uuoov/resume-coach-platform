import { Box, Container, Typography, Link, Grid, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        pt: 6,
        pb: 4,
        background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)',
        borderTop: '1px solid #E5E7EB',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* 品牌简介 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <AutoFixHighIcon sx={{ color: 'primary.main', fontSize: 24 }} />
              <Typography variant="h6" fontWeight="700" color="text.primary">
                Resume Coach
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: 320 }}>
              AI 驱动的简历优化平台。针对目标公司与岗位进行定向简历优化，一岗一版，精准投递。
            </Typography>
          </Grid>

          {/* 快速链接 */}
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1.5, color: 'text.primary' }}>
              快速开始
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link component={RouterLink} to="/resume" underline="hover" color="text.secondary" variant="body2">
                上传简历
              </Link>
              <Link component={RouterLink} to="/jd" underline="hover" color="text.secondary" variant="body2">
                JD 分析
              </Link>
              <Link component={RouterLink} to="/history" underline="hover" color="text.secondary" variant="body2">
                历史记录
              </Link>
            </Box>
          </Grid>

          {/* 核心功能 */}
          <Grid size={{ xs: 6, md: 3 }}>
            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1.5, color: 'text.primary' }}>
              核心能力
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">智能简历解析</Typography>
              <Typography variant="body2" color="text.secondary">AI 匹配度分析</Typography>
              <Typography variant="body2" color="text.secondary">定向优化建议</Typography>
              <Typography variant="body2" color="text.secondary">PDF 导出</Typography>
            </Box>
          </Grid>

          {/* 技术信息 */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1.5, color: 'text.primary' }}>
              关于
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                基于 React + Express + AI 构建
              </Typography>
              <Typography variant="body2" color="text.secondary">
                支持 DeepSeek 等 AI 模型提供智能分析能力
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} Resume Coach. All rights reserved.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            ✨ Powered by AI
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
