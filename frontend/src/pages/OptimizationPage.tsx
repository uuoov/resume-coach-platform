import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Chip,
  Skeleton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { api, type OptimizationSuggestion, type Resume, type JDAnalysis, type MatchResult } from '../services/api';
import { getErrorMessage } from '../utils/error';

interface OptimizationPrerequisites {
  resume: Resume | null;
  jdAnalysis: JDAnalysis | null;
  matchResult: MatchResult | null;
  error: string | null;
}

const readOptimizationPrerequisites = (): OptimizationPrerequisites => {
  const resumeData = sessionStorage.getItem('resume');
  const jdData = sessionStorage.getItem('jdAnalysis');
  const matchData = sessionStorage.getItem('matchResult');

  if (!resumeData || !jdData || !matchData) {
    return {
      resume: null,
      jdAnalysis: null,
      matchResult: null,
      error: '请先完成简历上传和 JD 分析',
    };
  }

  try {
    return {
      resume: JSON.parse(resumeData) as Resume,
      jdAnalysis: JSON.parse(jdData) as JDAnalysis,
      matchResult: JSON.parse(matchData) as MatchResult,
      error: null,
    };
  } catch {
    return {
      resume: null,
      jdAnalysis: null,
      matchResult: null,
      error: '数据格式错误，请重新执行前面的步骤',
    };
  }
};

export default function OptimizationPage() {
  const navigate = useNavigate();
  const [prerequisites] = useState<OptimizationPrerequisites>(readOptimizationPrerequisites);
  const [loading, setLoading] = useState(() => !prerequisites.error);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [resume, setResume] = useState<Resume | null>(prerequisites.resume);
  const [jdAnalysis] = useState<JDAnalysis | null>(prerequisites.jdAnalysis);
  const [matchResult] = useState<MatchResult | null>(prerequisites.matchResult);
  const [error, setError] = useState<string | null>(prerequisites.error);
  const [optimizedContent, setOptimizedContent] = useState<string>('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [activeOriginalContent, setActiveOriginalContent] = useState<string>('');
  const hasRequestedSuggestions = useRef(false);

  useEffect(() => {
    if (!prerequisites.resume || !prerequisites.jdAnalysis || !prerequisites.matchResult) {
      return;
    }
    if (hasRequestedSuggestions.current) {
      return;
    }
    hasRequestedSuggestions.current = true;

    // 获取优化建议
    api.getSuggestions(prerequisites.resume, prerequisites.jdAnalysis, prerequisites.matchResult)
      .then((result) => {
        setSuggestions(result);
      })
      .catch((err) => {
        setError(getErrorMessage(err, '获取优化建议失败'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [prerequisites]);

  const handleGenerateOptimized = async (suggestion: OptimizationSuggestion, originalContent: string) => {
    if (!resume || !jdAnalysis || !matchResult) return;

    setSelectedSuggestion(suggestion.id);
    setActiveOriginalContent(originalContent);
    try {
      const content = await api.generateOptimizedContent(
        resume,
        jdAnalysis,
        matchResult,
        suggestion,
        originalContent
      );
      setOptimizedContent(content);
    } catch (err) {
      console.error('生成优化内容失败:', err);
    } finally {
      setSelectedSuggestion(null);
    }
  };

  const getSectionLabel = (section: string) => {
    const labels: Record<string, string> = {
      skills: '技能',
      'work-experience': '经历',
      summary: '总结',
      project: '项目',
      education: '教育',
      certifications: '证书',
      overall: '整体',
    };
    return labels[section] || section;
  };

  const handleApplyText = (oldText: string, newText: string) => {
    if (!resume || !oldText || !newText) return;
    
    const recursivelyReplace = (value: unknown, target: string, replacement: string): unknown => {
      if (typeof value === 'string') {
        return value.includes(target) ? value.replace(target, replacement) : value;
      }
      if (Array.isArray(value)) {
        return value.map(item => recursivelyReplace(item, target, replacement));
      }
      if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, item]) => [
            key,
            recursivelyReplace(item, target, replacement),
          ])
        );
      }
      return value;
    };

    const newResume = recursivelyReplace(resume, oldText, newText) as Resume;
    setResume(newResume);
    sessionStorage.setItem('resume', JSON.stringify(newResume));
    alert('✅ 建议已成功应用到当前简历！后续导出 PDF 将包含这些更改。');
  };

  const handleExportPdf = async () => {
    if (!resume) return;
    setIsExporting(true);
    try {
      const blob = await api.exportResumePDF(resume);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-${resume.basicInfo?.name || 'optimized'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('导出PDF失败:', err);
      alert('导出PDF失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!resume) return;
    setIsPreviewing(true);
    try {
      const blob = await api.previewResumePDF(resume);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('预览PDF失败:', err);
      alert('预览PDF失败，请重试');
    } finally {
      setIsPreviewing(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        {[1, 2, 3].map((i) => (
          <Paper key={i} sx={{ p: 3, mb: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Skeleton variant="rounded" width={60} height={22} />
              <Skeleton variant="text" width={240} height={28} />
            </Box>
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="70%" />
            <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
              <Skeleton variant="rectangular" height={100} sx={{ flex: 1, borderRadius: 2 }} />
              <Skeleton variant="rectangular" height={100} sx={{ flex: 1, borderRadius: 2 }} />
            </Box>
          </Paper>
        ))}
      </Box>
    );
  }

  if (error || suggestions.length === 0) {
    return (
      <Box>
        <Alert severity="error">
          {error || '暂无优化建议'}
        </Alert>
        <Button
          variant="contained"
          sx={{ mt: 3 }}
          onClick={() => navigate('/')}
        >
          返回首页
        </Button>
      </Box>
    );
  }

  const renderSuggestionCard = (suggestion: OptimizationSuggestion) => (
    <Accordion key={suggestion.id} elevation={0} sx={{
      mb: 1.5,
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: '8px !important',
      '&:before': { display: 'none' },
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
    }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ '& .MuiAccordionSummary-content': { my: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip size="small" label={getSectionLabel(suggestion.section)} color="primary" variant="outlined" sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}/>
          <Typography variant="subtitle1" fontWeight="600">
            {suggestion.title}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 3, px: 3 }}>
        <Typography color="text.secondary" sx={{ mb: 2, fontSize: '0.95rem' }}>
          {suggestion.description}
        </Typography>
        {suggestion.reason && (
          <Typography variant="body2" sx={{ mb: 3, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, borderLeft: '3px solid #94a3b8' }}>
            <strong>💡 优化思路：</strong>{suggestion.reason}
          </Typography>
        )}

        {suggestion.currentContent && suggestion.suggestedContent && (
          <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
            <Paper elevation={0} sx={{ p: 2.5, flex: 1, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 2 }}>
              <Typography variant="subtitle2" color="#b91c1c" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ❌ 修改前内容
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#7f1d1d', lineHeight: 1.6 }}>
                {suggestion.currentContent}
              </Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 2.5, flex: 1, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '4px solid #22c55e', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" color="#15803d" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ✨ AI 深度润色后
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#166534', lineHeight: 1.6, flexGrow: 1 }}>
                {suggestion.suggestedContent}
              </Typography>
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button 
                  size="small" 
                  variant="contained" 
                  color="success" 
                  disableElevation
                  onClick={() => handleApplyText(suggestion.currentContent!, suggestion.suggestedContent!)}
                >
                  ✅ 应用此建议
                </Button>
              </Box>
            </Paper>
          </Box>
        )}

        {suggestion.assumptionsMade && suggestion.assumptionsMade.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <AlertTitle sx={{ fontWeight: 'bold' }}>⚠️ 需核实的推测数据 / 经验</AlertTitle>
            AI 为了提升匹配度，对部分表述进行了高阶指标推测。<strong>在实际使用前，请务必根据您的真实情况核实或修改以下内容，切勿弄虚作假：</strong>
            <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
              {suggestion.assumptionsMade.map((assumption, idx) => (
                <li key={idx} style={{ paddingBottom: '4px' }}>{assumption}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant={selectedSuggestion === suggestion.id ? "contained" : "outlined"}
            color="primary"
            onClick={() => handleGenerateOptimized(suggestion, suggestion.currentContent || suggestion.description)}
            disabled={selectedSuggestion === suggestion.id}
            sx={{ borderRadius: 6, px: 3, textTransform: 'none', fontWeight: 600 }}
          >
            {selectedSuggestion === suggestion.id ? '⚡ AI 正在极速构思中...' : '🤖 请求 AI 重新润色'}
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  // 按优先级分组
  const criticalSuggestions = suggestions.filter(s => s.priority === 'critical');
  const highSuggestions = suggestions.filter(s => s.priority === 'high');
  const mediumSuggestions = suggestions.filter(s => s.priority === 'medium' || s.priority === 'low');

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        优化建议
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        共 {suggestions.length} 条建议，建议优先处理高优先级项
      </Typography>

      {optimizedContent && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>优化内容已生成</AlertTitle>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={optimizedContent}
            onChange={(e) => setOptimizedContent(e.target.value)}
            sx={{ mt: 1, bgcolor: 'background.paper' }}
          />
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigator.clipboard.writeText(optimizedContent)}
            >
              复制内容
            </Button>
            {activeOriginalContent && (
              <Button
                size="small"
                variant="contained"
                color="success"
                disableElevation
                onClick={() => handleApplyText(activeOriginalContent, optimizedContent)}
              >
                ✅ 应用到简历
              </Button>
            )}
          </Box>
        </Alert>
      )}

      {/* 紧急建议 */}
      {criticalSuggestions.length > 0 && (
        <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)', border: '1px solid #fecaca', borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom color="#b91c1c" fontWeight="bold">
            🔴 紧急优先级 ({criticalSuggestions.length} 条)
          </Typography>
          {criticalSuggestions.map(renderSuggestionCard)}
        </Paper>
      )}

      {/* 高优先级建议 */}
      {highSuggestions.length > 0 && (
        <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)', border: '1px solid #fde68a', borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom color="#d97706" fontWeight="bold">
            🟠 高优先级 ({highSuggestions.length} 条)
          </Typography>
          {highSuggestions.map(renderSuggestionCard)}
        </Paper>
      )}

      {/* 低优先级建议 */}
      {mediumSuggestions.length > 0 && (
        <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)', border: '1px solid #bbf7d0', borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom color="#15803d" fontWeight="bold">
            🟢 低优先级 ({mediumSuggestions.length} 条)
          </Typography>
          {mediumSuggestions.map(renderSuggestionCard)}
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/match')}
        >
          上一步
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            color="primary"
            onClick={handlePreviewPdf}
            disabled={isPreviewing}
          >
            {isPreviewing ? '生成预览中...' : '👁️ 预览 PDF'}
          </Button>
          <Button
            variant="contained"
            size="large"
            color="success"
            onClick={handleExportPdf}
            disabled={isExporting}
          >
            {isExporting ? '导出中...' : '⬇️ 导出简历 (PDF)'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
