import { Box, Typography, Button, Grid, Paper, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import WorkIcon from '@mui/icons-material/Work';
import DescriptionIcon from '@mui/icons-material/Description';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

export default function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <DescriptionIcon sx={{ fontSize: 32, color: '#fff' }} />,
      title: '智能简历解析',
      desc: '支持 PDF/Word 格式上传，AI 自动提取结构化信息，准确率高',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      icon: <PsychologyIcon sx={{ fontSize: 32, color: '#fff' }} />,
      title: 'JD 深度分析',
      desc: 'AI 深度解析岗位描述，提取关键词、技能要求和隐性需求',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 32, color: '#fff' }} />,
      title: '匹配度评估',
      desc: '5 维度匹配度分析，精准识别优势与差距，量化求职竞争力',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      icon: <WorkIcon sx={{ fontSize: 32, color: '#fff' }} />,
      title: '定向优化建议',
      desc: '基于匹配分析生成个性化优化方案，一岗一版精准投递',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    },
  ];

  const values = [
    { title: '一岗一版', desc: '为每个投递的岗位生成定制化简历，提高面试邀请率' },
    { title: '公司维度定制', desc: '分析公司背景、文化和技术栈，让简历更符合公司期望' },
    { title: '岗位维度定制', desc: '深度解析 JD，提取关键词和能力要求，精准匹配关键信息' },
    { title: 'AI + 数据驱动', desc: 'AI 生成优化建议，数据量化匹配度，科学提升求职成功率' },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 4,
          py: { xs: 6, md: 10 },
          px: 4,
          mb: 6,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeInUp 0.7s ease-out',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          },
        }}
      >
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          fontWeight="800"
          sx={{
            color: '#fff',
            fontSize: { xs: '2rem', md: '3.2rem' },
            position: 'relative',
            textShadow: '0 2px 10px rgba(0,0,0,0.15)',
          }}
        >
          AI 驱动的简历优化平台
        </Typography>
        <Typography
          variant="h5"
          sx={{
            color: 'rgba(255,255,255,0.85)',
            mb: 5,
            fontSize: { xs: '1rem', md: '1.3rem' },
            position: 'relative',
          }}
        >
          针对目标公司 + 岗位的定向简历优化，一岗一版，精准投递
        </Typography>
        <Box sx={{ position: 'relative', display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/resume')}
            endIcon={<ArrowForwardIcon />}
            sx={{
              px: 5,
              py: 1.8,
              bgcolor: '#fff',
              color: '#764ba2',
              fontWeight: 700,
              fontSize: '1.05rem',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.9)',
                boxShadow: '0 6px 30px rgba(0,0,0,0.2)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            开始优化简历
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/jd')}
            sx={{
              px: 5,
              py: 1.8,
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.5)',
              fontWeight: 600,
              fontSize: '1.05rem',
              borderRadius: 3,
              '&:hover': {
                borderColor: '#fff',
                bgcolor: 'rgba(255,255,255,0.1)',
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            分析岗位 JD
          </Button>
        </Box>
      </Box>

      {/* 核心功能 */}
      <Typography variant="h4" textAlign="center" gutterBottom fontWeight="700" sx={{ mb: 1 }}>
        核心功能
      </Typography>
      <Typography textAlign="center" color="text.secondary" sx={{ mb: 5 }}>
        四大核心能力，助你精准命中心仪岗位
      </Typography>

      <Grid container spacing={3} sx={{ mb: 8 }}>
        {features.map((f, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                height: '100%',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'grey.200',
                cursor: 'default',
                transition: 'all 0.3s ease',
                animation: `fadeInUp 0.6s ease-out ${0.1 + i * 0.1}s both`,
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                  borderColor: 'transparent',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 2.5,
                  background: f.gradient,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                }}
              >
                {f.icon}
              </Avatar>
              <Typography variant="h6" gutterBottom fontWeight="600">
                {f.title}
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.7 }}>
                {f.desc}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 核心价值 */}
      <Box sx={{ bgcolor: 'grey.50', borderRadius: 4, p: { xs: 3, md: 6 }, mb: 6 }}>
        <Typography variant="h4" textAlign="center" gutterBottom fontWeight="700" sx={{ mb: 1 }}>
          为什么选择 Resume Coach？
        </Typography>
        <Typography textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
          让每一次投递都有据可依
        </Typography>
        <Grid container spacing={3}>
          {values.map((v, i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <Paper
                sx={{
                  p: 3,
                  display: 'flex',
                  alignItems: 'flex-start',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  bgcolor: '#fff',
                }}
                elevation={0}
              >
                <CheckCircleIcon sx={{ color: '#43e97b', mr: 2, mt: 0.3, fontSize: 28 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                    {v.title}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {v.desc}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 底部 CTA */}
      <Box
        sx={{
          textAlign: 'center',
          py: 6,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: 4,
          mb: 2,
        }}
      >
        <Typography variant="h5" fontWeight="700" gutterBottom>
          准备好优化你的简历了吗？
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          上传简历，3 分钟获得专业优化方案
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/resume')}
          endIcon={<ArrowForwardIcon />}
          sx={{
            px: 5,
            py: 1.5,
            borderRadius: 3,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 20px rgba(102,126,234,0.4)',
            '&:hover': {
              boxShadow: '0 6px 30px rgba(102,126,234,0.5)',
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          立即开始
        </Button>
      </Box>
    </Box>
  );
}
