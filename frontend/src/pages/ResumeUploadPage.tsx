import { useState, type ChangeEvent, type DragEvent } from 'react';
import { Box, Typography, Paper, Button, Alert, AlertTitle, List, ListItem, ListItemText, Divider, Chip, LinearProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { api, type Resume } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../utils/error';

const degreeLabels: Record<string, string> = {
  phd: '博士',
  master: '硕士',
  bachelor: '本科',
  associate: '大专',
};

function formatDegree(degree?: string) {
  if (!degree) return '';
  return degreeLabels[degree.toLowerCase()] || degree;
}

export default function ResumeUploadPage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [resume, setResume] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (isUploading) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    // 检查文件类型
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      setError('只支持 PDF 和 Word 文件格式');
      return;
    }

    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const parsedResume = await api.parseResume(file);
      setResume(parsedResume);
      sessionStorage.setItem('resume', JSON.stringify(parsedResume));
    } catch (err: unknown) {
      setError(getErrorMessage(err, '简历解析失败，请重试'));
    } finally {
      setIsUploading(false);
    }
  };

  const loadMockResume = () => {
    const mockResume: Resume = {
      id: 'mock-123456',
      basicInfo: {
        name: '张三（测试模板）',
        email: 'zhangsan@example.com',
        phone: '13800138000',
        location: '北京市海淀区',
        website: '',
        github: 'github.com/zhangsan',
        linkedin: ''
      },
      workExperience: [
        {
          id: 'exp-1',
          company: '宇宙科技有限公司',
          position: '高级前端工程师',
          startDate: '2020.01',
          endDate: '至今',
          isCurrent: true,
          description: [
            '主导前端架构升级，从 Vue 迁移至 React 测试栈',
            '提升首屏加载速度 40%，优化构建时间 30%',
            '带领 5 人前端小队完成 C 端用户中心重构'
          ]
        }
      ],
      projects: [
        {
          id: 'proj-1',
          name: '可视化低代码平台',
          role: '核心开发者',
          startDate: '2021.05',
          endDate: '2022.06',
          description: '从零搭建企业级低代码页面构建平台，支持拖拽和 JSON 导出',
          technologies: ['React', 'TypeScript', 'Zustand']
        }
      ],
      education: [
        {
          id: 'edu-1',
          school: '北京大学',
          degree: '本科',
          major: '计算机科学与技术',
          startDate: '2015',
          endDate: '2019'
        }
      ],
      skills: [
        { id: 'sk-1', name: 'JavaScript', category: 'programming-language', proficiency: 'expert' },
        { id: 'sk-2', name: 'React', category: 'framework', proficiency: 'advanced' },
        { id: 'sk-3', name: 'TypeScript', category: 'programming-language', proficiency: 'advanced' },
        { id: 'sk-4', name: 'Node.js', category: 'framework', proficiency: 'intermediate' }
      ]
    };
    
    setResume(mockResume);
    sessionStorage.setItem('resume', JSON.stringify(mockResume));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        上传简历
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        支持 PDF 和 Word 格式，AI 自动解析结构化信息
      </Typography>

      {/* 上传区域 */}
      {!resume && (
        <Paper
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={{
            p: 6,
            textAlign: 'center',
            cursor: isUploading ? 'default' : 'pointer',
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : (isUploading ? 'grey.300' : 'grey.400'),
            bgcolor: isDragging ? 'primary.light' : (isUploading ? 'grey.50' : 'background.paper'),
            transition: 'all 0.2s ease',
          }}
        >
          <input
            accept=".pdf,.doc,.docx"
            id="resume-upload"
            type="file"
            hidden
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <label htmlFor="resume-upload" style={{ width: '100%', display: 'block', cursor: isUploading ? 'default' : 'pointer' }}>
            <CloudUploadIcon sx={{ fontSize: 64, color: isDragging ? 'primary.dark' : 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isUploading ? '正在解析简历（AI 处理中）...' : (isDragging ? '松开鼠标上传文件' : '点击或拖拽上传简历')}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              支持格式：PDF、Word (.doc, .docx) | 最大 10MB
            </Typography>
            
            {isUploading && (
              <Box sx={{ width: '60%', mx: 'auto', mt: 2 }}>
                <LinearProgress />
              </Box>
            )}
          </label>
        </Paper>
      )}

      {/* 快捷测试模板按钮 */}
      {!resume && !isUploading && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            没有简历文件？
          </Typography>
          <Button variant="outlined" color="primary" onClick={loadMockResume}>
            📝 使用内置测试模板快速体验
          </Button>
        </Box>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <AlertTitle>上传失败</AlertTitle>
          {error}
        </Alert>
      )}

      {/* 解析结果预览 */}
      {resume && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>简历解析成功</AlertTitle>
            共解析出 {resume.workExperience.length} 段工作经历、{resume.projects?.length || 0} 个项目经历、{resume.education?.length || 0} 条教育背景、{resume.skills.length} 项技能
          </Alert>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>基本信息</Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              <ListItem>
                <ListItemText primary="姓名" secondary={resume.basicInfo.name || '未填写'} />
                <ListItemText primary="邮箱" secondary={resume.basicInfo.email || '未填写'} />
                <ListItemText primary="电话" secondary={resume.basicInfo.phone || '未填写'} />
                <ListItemText primary="所在地" secondary={resume.basicInfo.location || '未填写'} />
              </ListItem>
              {resume.basicInfo.github && (
                <ListItem>
                  <ListItemText primary="GitHub" secondary={resume.basicInfo.github} />
                </ListItem>
              )}
            </List>
          </Paper>

          {resume.summary && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>自我评价</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {resume.summary}
              </Typography>
            </Paper>
          )}

          {resume.workExperience.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>工作经历</Typography>
              <Divider sx={{ mb: 2 }} />
              {resume.workExperience.map((exp) => (
                <Box key={exp.id} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {exp.position} {exp.company && `| ${exp.company}`}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {exp.startDate} - {exp.isCurrent ? '至今' : exp.endDate}
                  </Typography>
                  <List dense>
                    {exp.description.map((desc, i) => (
                      <ListItem key={i}>
                        <ListItemText primary={desc} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </Paper>
          )}

          {resume.projects && resume.projects.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>项目经历</Typography>
              <Divider sx={{ mb: 2 }} />
              {resume.projects.map((proj) => (
                <Box key={proj.id} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {proj.name} {proj.role && `| ${proj.role}`}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                    {proj.startDate} - {proj.endDate || '至今'}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                    {proj.description}
                  </Typography>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {proj.technologies.map((tech, i) => (
                        <Chip key={i} label={tech} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Paper>
          )}

          {resume.education && resume.education.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>教育背景</Typography>
              <Divider sx={{ mb: 2 }} />
              {resume.education.map((edu) => (
                <Box key={edu.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {edu.school} {edu.degree && `| ${formatDegree(edu.degree)}`}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {edu.major} | {edu.startDate} - {edu.endDate}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}

          {resume.skills.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>技能清单</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {resume.skills.map((skill) => (
                  <Chip key={skill.id} label={skill.name} color="primary" variant="outlined" />
                ))}
              </Box>
            </Paper>
          )}

          {resume.certifications && resume.certifications.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>资格证书</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {resume.certifications.map((cert, i) => (
                  <Chip key={i} label={cert} color="secondary" variant="outlined" />
                ))}
              </Box>
            </Paper>
          )}

          {resume.languages && resume.languages.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>语言能力</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {resume.languages.map((lang, i) => (
                  <Chip key={i} label={lang} color="info" variant="outlined" />
                ))}
              </Box>
            </Paper>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setResume(null);
                sessionStorage.removeItem('resume');
              }}
            >
              重新上传
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/jd')}
            >
              下一步：输入 JD
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
