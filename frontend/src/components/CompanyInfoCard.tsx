import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid,
  Divider,
  Link,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import LanguageIcon from '@mui/icons-material/Language';
import CodeIcon from '@mui/icons-material/Code';
import type { CompanyInfo } from '../services/api';

interface CompanyInfoCardProps {
  companyInfo: CompanyInfo;
}

export default function CompanyInfoCard({ companyInfo }: CompanyInfoCardProps) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" fontWeight="bold">
          {companyInfo.name}
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {companyInfo.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {companyInfo.description}
        </Typography>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {companyInfo.industry && (
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

        {companyInfo.size && (
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

        {companyInfo.location && (
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
      {companyInfo.techStack && companyInfo.techStack.length > 0 && (
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
      {companyInfo.culture && (
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
