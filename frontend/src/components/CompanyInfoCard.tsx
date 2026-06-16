import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Divider,
  Link,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WorkIcon from '@mui/icons-material/Work';
import GroupsIcon from '@mui/icons-material/Groups';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
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
  const roleInsights = companyInfo.roleInsights;
  const hasRoleInsights = Boolean(
    roleInsights &&
      (roleInsights.team ||
        roleInsights.techStack?.length ||
        roleInsights.typicalRequirements?.length ||
        roleInsights.workStyle ||
        roleInsights.interviewFocus?.length ||
        roleInsights.careerPath ||
        roleInsights.perks?.length)
  );

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

      {/* 岗位洞察（公司 + 岗位组合的特定信息） */}
      {hasRoleInsights && roleInsights && (
        <Accordion
          elevation={0}
          sx={{
            mt: 2,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
            borderRadius: 2,
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WorkIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                岗位洞察（公司 × 岗位）
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {roleInsights.team && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <GroupsIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    团队 / 业务线
                  </Typography>
                  <Typography variant="body2">{roleInsights.team}</Typography>
                </Box>
              </Box>
            )}

            {roleInsights.techStack && roleInsights.techStack.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <CodeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    该岗位实际使用的技术栈
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {roleInsights.techStack.map((tech, idx) => (
                    <Chip
                      key={idx}
                      label={tech}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {roleInsights.typicalRequirements && roleInsights.typicalRequirements.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <SchoolIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    该公司该岗位的典型要求
                  </Typography>
                </Box>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {roleInsights.typicalRequirements.map((req, idx) => (
                    <Box component="li" key={idx} sx={{ mb: 0.5 }}>
                      <Typography variant="body2">{req}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {roleInsights.workStyle && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  工作风格
                </Typography>
                <Typography variant="body2">{roleInsights.workStyle}</Typography>
              </Box>
            )}

            {roleInsights.interviewFocus && roleInsights.interviewFocus.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <LightbulbIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    面试考察重点
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {roleInsights.interviewFocus.map((focus, idx) => (
                    <Chip
                      key={idx}
                      label={focus}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {roleInsights.careerPath && (
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TrendingUpIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    职业发展路径
                  </Typography>
                  <Typography variant="body2">{roleInsights.careerPath}</Typography>
                </Box>
              </Box>
            )}

            {roleInsights.perks && roleInsights.perks.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  特殊吸引力 / 注意事项
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                  {roleInsights.perks.map((perk, idx) => (
                    <Box component="li" key={idx} sx={{ mb: 0.5 }}>
                      <Typography variant="body2">{perk}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {typeof roleInsights.confidence === 'number' && (
              <Alert severity="info" sx={{ mt: 2 }} icon={<InfoOutlinedIcon />}>
                该岗位洞察基于 AI 知识库（置信度 {(roleInsights.confidence * 100).toFixed(0)}%），请结合实际情况判断。
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
}
