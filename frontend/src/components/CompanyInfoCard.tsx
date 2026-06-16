import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Divider,
  Link,
  Alert,
} from '@mui/material';
import type { ReactElement } from 'react';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import LanguageIcon from '@mui/icons-material/Language';
import CodeIcon from '@mui/icons-material/Code';
import VerifiedIcon from '@mui/icons-material/Verified';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import StorageIcon from '@mui/icons-material/Storage';
import type { CompanyInfo } from '../services/api';

interface CompanyInfoCardProps {
  companyInfo: CompanyInfo;
}

const SOURCE_META: Record<
  NonNullable<CompanyInfo['source']>,
  { label: string; color: 'success' | 'info' | 'warning' | 'default'; icon: ReactElement }
> = {
  'ai-knowledge': {
    label: 'AI 知识库',
    color: 'info',
    icon: <SmartToyIcon sx={{ fontSize: 14 }} />,
  },
  'ai-web': {
    label: 'AI + 官网核验',
    color: 'success',
    icon: <VerifiedIcon sx={{ fontSize: 14 }} />,
  },
  db: {
    label: '数据库',
    color: 'default',
    icon: <StorageIcon sx={{ fontSize: 14 }} />,
  },
  fallback: {
    label: '暂无权威信息',
    color: 'warning',
    icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />,
  },
};

export default function CompanyInfoCard({ companyInfo }: CompanyInfoCardProps) {
  const source = companyInfo.source || 'fallback';
  const isFallback = source === 'fallback';
  const sourceMeta = SOURCE_META[source];

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" fontWeight="bold" sx={{ mr: 1 }}>
          {companyInfo.name}
        </Typography>
        <Chip
          size="small"
          icon={sourceMeta.icon}
          label={sourceMeta.label}
          color={sourceMeta.color}
          variant="outlined"
          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
        />
      </Box>
      <Divider sx={{ mb: 2 }} />

      {isFallback && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<InfoOutlinedIcon />}>
          该公司信息为通用占位数据，并非真实调研结果。请勿作为决策依据；如需准确信息，请前往官网或天眼查/企查查等平台核实。
        </Alert>
      )}

      {companyInfo.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {companyInfo.description}
        </Typography>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {companyInfo.industry && !isFallback && (
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BusinessIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  行业
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {companyInfo.industry}
                </Typography>
              </Box>
            </Box>
          </Grid>
        )}

        {companyInfo.size && !isFallback && (
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PeopleIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  规模
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {companyInfo.size}
                </Typography>
              </Box>
            </Box>
          </Grid>
        )}

        {companyInfo.location && !isFallback && (
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationOnIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  地点
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {companyInfo.location}
                </Typography>
              </Box>
            </Box>
          </Grid>
        )}

        {companyInfo.website && (
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LanguageIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  官网
                </Typography>
                <Link href={companyInfo.website} target="_blank" rel="noopener noreferrer">
                  <Typography variant="body2" fontWeight="bold">
                    访问官网
                  </Typography>
                </Link>
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* 技术栈 */}
      {companyInfo.techStack && companyInfo.techStack.length > 0 && !isFallback && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CodeIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              技术栈
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {companyInfo.techStack.map((tech, index) => (
              <Chip
                key={index}
                label={tech}
                size="small"
                variant="outlined"
                color="primary"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* 企业文化 */}
      {companyInfo.culture && !isFallback && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            企业文化
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {companyInfo.culture.values?.map((value: string, index: number) => (
              <Chip
                key={index}
                label={value}
                size="small"
                color="secondary"
                variant="outlined"
              />
            ))}
            {companyInfo.culture.workStyle && (
              <Chip
                label={`工作风格: ${companyInfo.culture.workStyle}`}
                size="small"
                color="info"
                variant="filled"
              />
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
