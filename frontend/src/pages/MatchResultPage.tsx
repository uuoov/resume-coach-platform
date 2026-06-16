import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Grid, LinearProgress, Alert, AlertTitle, Button, Divider, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { api, type Resume, type JDAnalysis, type MatchResult } from '../services/api';
import { appendHistory } from '../services/history';
import RadarChart from '../components/RadarChart';
import CompanyInfoCard from '../components/CompanyInfoCard';

interface MatchPrerequisites {
  resume: Resume | null;
  jdAnalysis: JDAnalysis | null;
  error: string | null;
}

const readMatchPrerequisites = (): MatchPrerequisites => {
  const resumeData = sessionStorage.getItem('resume');
  const jdData = sessionStorage.getItem('jdAnalysis');

  if (!resumeData || !jdData) {
    return { resume: null, jdAnalysis: null, error: '请先上传简历并分析 JD' };
  }

  try {
    return {
      resume: JSON.parse(resumeData) as Resume,
      jdAnalysis: JSON.parse(jdData) as JDAnalysis,
      error: null,
    };
  } catch {
    return { resume: null, jdAnalysis: null, error: '数据格式错误，请重新上传简历并分析 JD' };
  }
};

export default function MatchResultPage() {
  const navigate = useNavigate();
  const [prerequisites] = useState<MatchPrerequisites>(readMatchPrerequisites);
  const { resume, jdAnalysis, error: initialError } = prerequisites;
  const [loading, setLoading] = useState(() => !initialError);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const hasRequestedMatch = useRef(false);

  useEffect(() => {
    if (!resume || !jdAnalysis) {
      return;
    }
    if (hasRequestedMatch.current) {
      return;
    }
    hasRequestedMatch.current = true;

    // 计算匹配度
    api.calculateMatch(resume, jdAnalysis)
      .then((result) => {
        setMatchResult(result);
        sessionStorage.setItem('matchResult', JSON.stringify(result));

        // 立即写入历史记录（含完整快照，支持点击恢复）
        appendHistory({ resume, jdAnalysis, matchResult: result });
      })
      .catch((err) => {
        setError(err.message || '匹配度计算失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [jdAnalysis, resume]);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={280} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 4 }} />

        {/* 分数骨架 */}
        <Paper sx={{ p: 5, mb: 5, textAlign: 'center', borderRadius: 4 }}>
          <Skeleton variant="circular" width={100} height={100} sx={{ mx: 'auto', mb: 2 }} />
          <Skeleton variant="text" width={180} sx={{ mx: 'auto', mb: 2 }} />
          <Skeleton variant="rectangular" height={12} sx={{ width: '80%', mx: 'auto', borderRadius: 6 }} />
        </Paper>

        {/* 雷达图与维度骨架 */}
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
              <Skeleton variant="circular" width={260} height={260} sx={{ mx: 'auto' }} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
              {[1, 2, 3, 4, 5].map((i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width={80} />
                  <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 4 }} />
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (error || !matchResult) {
    return (
      <Box>
        <Alert severity="error">
          {error || '加载失败'}
        </Alert>
        <Button
          variant="contained"
          sx={{ mt: 3 }}
          onClick={() => navigate('/resume')}
        >
          返回首页
        </Button>
      </Box>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success.main';
    if (score >= 60) return 'warning.main';
    return 'error.main';
  };

  const getScoreText = (score: number) => {
    if (score >= 80) return '较为匹配';
    if (score >= 60) return '基本匹配';
    return '匹配度较低';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        匹配度分析报告
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {jdAnalysis?.jobTitle} {jdAnalysis?.company && `| ${jdAnalysis?.company}`}
      </Typography>

      {/* 公司信息卡片 */}
      {jdAnalysis?.companyInfo && (
        <CompanyInfoCard companyInfo={jdAnalysis.companyInfo} />
      )}

      {/* 总体匹配度 */}
      <Paper sx={{ 
        p: 5, 
        mb: 5, 
        textAlign: 'center', 
        background: matchResult.overallScore >= 80 ? 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)' :
                    matchResult.overallScore >= 60 ? 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)' :
                    'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        borderRadius: 4,
        border: '1px solid',
        borderColor: matchResult.overallScore >= 80 ? '#bbf7d0' : matchResult.overallScore >= 60 ? '#fde68a' : '#fecaca',
      }}>
        <Typography variant="h2" fontWeight="800" color={getScoreColor(matchResult.overallScore)} sx={{ letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          {matchResult.overallScore}
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
          整体匹配度 - {getScoreText(matchResult.overallScore)}
        </Typography>
        <Box sx={{ width: '80%', mx: 'auto', mt: 3, mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={matchResult.overallScore}
            sx={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.05)' }}
            color={matchResult.overallScore >= 80 ? 'success' : matchResult.overallScore >= 60 ? 'warning' : 'error'}
          />
        </Box>
        {matchResult.aiPowered && (
          <Typography variant="body2" color="primary.main" sx={{ mt: 2, display: 'inline-flex', alignItems: 'center', fontWeight: 600, bgcolor: 'primary.50', px: 2, py: 0.5, borderRadius: 4 }}>
            ✨ 由 AI 引擎提供深度匹配分析
          </Typography>
        )}
      </Paper>

      {/* AI 分析报告 */}
      {matchResult.overallAnalysis && (
        <Paper sx={{ 
          p: 4, 
          mb: 5, 
          background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
          borderRadius: 3,
          border: '1px solid #c7d2fe',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)'
        }}>
          <Typography variant="h6" gutterBottom color="primary.dark" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            🤖 AI 整体评价
          </Typography>
          <Typography variant="body1" color="text.primary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '1.05rem' }}>
            {matchResult.overallAnalysis}
          </Typography>
        </Paper>
      )}

      {/* 风险预警 */}
      {matchResult.risks && matchResult.risks.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom color="error.main" fontWeight="bold">
            ⚠️ 关键风险提示
          </Typography>
          {matchResult.risks.map((risk, index) => (
            <Alert 
              severity={risk.severity === 'high' ? 'error' : (risk.severity === 'medium' ? 'warning' : 'info')} 
              sx={{ mb: 2 }} 
              key={index}
            >
              <AlertTitle>{risk.type}</AlertTitle>
              {risk.description}
              {risk.suggestion && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>💡 优化建议：</strong> {risk.suggestion}
                </Typography>
              )}
            </Alert>
          ))}
        </Box>
      )}

      <Grid container spacing={4}>
        {/* 雷达图 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              维度分析
            </Typography>
            <RadarChart
              data={[
                { name: '硬技能', value: matchResult.dimensions.skill.score },
                { name: '经验', value: matchResult.dimensions.experience.score },
                { name: '教育', value: matchResult.dimensions.education.score },
                { name: '软技能', value: matchResult.dimensions.softSkill.score },
                { name: '行业', value: matchResult.dimensions.industry.score },
              ]}
            />
          </Paper>
        </Grid>

        {/* 各维度详情 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              各维度得分
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {[
              { key: 'skill' as const, label: '硬技能' },
              { key: 'experience' as const, label: '经验' },
              { key: 'education' as const, label: '教育' },
              { key: 'softSkill' as const, label: '软技能' },
              { key: 'industry' as const, label: '行业' },
            ].map(({ key, label }, idx, arr) => {
              const dim = matchResult.dimensions[key];
              return (
                <Box key={key} sx={{ mb: idx < arr.length - 1 ? 2 : 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>{label}</Typography>
                    <Typography fontWeight="bold" color={getScoreColor(dim.score)}>
                      {dim.score} 分
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={dim.score}
                    color={dim.score >= 80 ? 'success' : dim.score >= 60 ? 'warning' : 'error'}
                  />
                  {dim.details && dim.details.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {dim.details.map((detail, didx) => (
                        <Typography key={didx} variant="caption" display="block" color="text.secondary">
                          • {detail}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Paper>
        </Grid>
      </Grid>

      {/* 优势项 */}
      {matchResult.strengths.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, mt: 3, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', borderRadius: 3, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            ✨ 核心优势
          </Typography>
          {matchResult.strengths.map((strength, index) => (
            <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
                • {strength.description}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* 待提升项 */}
      {matchResult.gaps.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', borderRadius: 3, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            🎯 待提升项
          </Typography>
          {matchResult.gaps.map((gap, index) => (
            <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.6 }}>
                • {gap.description}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/jd')}
        >
          上一步
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/optimize')}
        >
          下一步：查看优化建议
        </Button>
      </Box>
    </Box>
  );
}
