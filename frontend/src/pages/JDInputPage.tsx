import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Alert, AlertTitle, Divider } from '@mui/material';
import Chip from '@mui/material/Chip';
import { api, type JDAnalysis } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../utils/error';

const degreeLabels: Record<string, string> = {
  'high-school': '高中',
  associate: '大专',
  bachelor: '本科',
  master: '硕士',
  phd: '博士',
};

function formatDegree(degree?: string) {
  if (!degree) return '未要求';
  return degreeLabels[degree.toLowerCase()] || degree;
}

export default function JDInputPage() {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!jdText.trim()) {
      setError('请输入岗位描述');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await api.analyzeJD(jobTitle, company, jdText);
      setAnalysis(result);
      sessionStorage.setItem('jdAnalysis', JSON.stringify(result));
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'JD 分析失败，请重试'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        输入岗位 JD
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        AI 将深度分析岗位描述，提取关键词和能力要求
      </Typography>

      {!analysis ? (
        <Paper sx={{ p: 4 }}>
          <TextField
            fullWidth
            label="公司名称"
            placeholder="例如：阿里巴巴、腾讯、字节跳动"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="岗位名称"
            placeholder="例如：高级 Java 工程师、前端开发"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            sx={{ mb: 3 }}
            required
          />

          <TextField
            fullWidth
            label="岗位描述 (JD)"
            placeholder="请粘贴完整的岗位描述..."
            multiline
            rows={12}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            sx={{ mb: 3 }}
            required
          />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>分析失败</AlertTitle>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !jdText.trim()}
            >
              {isAnalyzing ? '分析中...' : '开始分析'}
            </Button>
          </Box>
        </Paper>
      ) : (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>JD 分析完成</AlertTitle>
            共提取 {analysis.hardSkills.length} 项硬技能、{analysis.softSkills.length} 项软技能
          </Alert>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {analysis.jobTitle} {analysis.company && `| ${analysis.company}`}
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              硬技能要求
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {analysis.hardSkills.map((skill, index) => (
                <Chip
                  key={index}
                  label={`${skill.name}${skill.isRequired ? ' (必需)' : ''}`}
                  color={skill.importance === 'critical' || skill.importance === 'high' ? 'error' : 'primary'}
                  variant="outlined"
                />
              ))}
            </Box>

            {analysis.softSkills.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  软技能要求
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {analysis.softSkills.map((skill, index) => (
                    <Chip key={index} label={skill} variant="outlined" color="success" />
                  ))}
                </Box>
              </>
            )}

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              经验要求
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {analysis.experience.minYears > 0 ? `最低 ${analysis.experience.minYears} 年` : '未设置明确年限要求'}
              {analysis.experience.industryPreference && analysis.experience.industryPreference.length > 0 && (
                <span> | 偏好行业：{analysis.experience.industryPreference.join(', ')}</span>
              )}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              学历要求
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              最低学历：{formatDegree(analysis.education.minDegree)}
              {analysis.education.majorPreference && analysis.education.majorPreference.length > 0 && (
                <span> | 偏好专业：{analysis.education.majorPreference.join(', ')}</span>
              )}
            </Typography>

            {analysis.hiddenRequirements.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  隐性需求
                </Typography>
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {analysis.hiddenRequirements.map((req, index) => (
                    <Box key={index} sx={{ mb: index < analysis.hiddenRequirements.length - 1 ? 1 : 0 }}>
                      <Typography variant="body2">{req.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        依据：{req.evidence}
                      </Typography>
                    </Box>
                  ))}
                </Alert>
              </>
            )}
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setAnalysis(null);
                sessionStorage.removeItem('jdAnalysis');
              }}
            >
              重新分析
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/match')}
            >
              下一步：查看匹配度
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
