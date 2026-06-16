/**
 * Repository 层数据映射测试
 *
 * 校验四个 repository：
 *   - resume-repository
 *   - jd-repository
 *   - match-repository
 *   - company-repository
 *
 * 目标：确保 repository 函数把输入字段正确映射到 Prisma 的 create/findUnique/update 调用参数。
 * 这层 bug 通常是字段名拼错、userId 未透传、content 未序列化等。
 *
 * 注意：tests/setup.ts 的 Prisma mock 只覆盖了少量方法（缺 matchRecord、缺 update/delete/findFirst），
 * 这里用本文件的 jest.mock 完整重定义，覆盖 setup.ts 的版本（仅对本文件生效）。
 */

jest.mock('@prisma/client', () => {
  const makeDelegate = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    company: makeDelegate(),
    resume: makeDelegate(),
    jD: makeDelegate(),
    matchRecord: makeDelegate(),
    user: makeDelegate(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

import { PrismaClient } from '@prisma/client';

// 由上方 mock 创建的共享单例
const prisma = new PrismaClient();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resume-repository', () => {
  const {
    createResume,
    getResumeById,
    getResumesByUserId,
    updateResume,
    deleteResume,
    createResumeVersion,
  } = require('../src/repositories/resume-repository');

  const sampleResume = {
    id: 'r-1',
    basicInfo: { name: '张三' },
    skills: [],
  } as any;

  it('createResume 把 userId/name/content/rawText/fileType 全部写入', async () => {
    await createResume({
      userId: 'u-1',
      name: '我的简历',
      content: sampleResume,
      rawText: 'raw',
      filePath: '/tmp/a.pdf',
      fileType: 'pdf',
    });

    expect(prisma.resume.create).toHaveBeenCalledWith({
      data: {
        userId: 'u-1',
        name: '我的简历',
        content: sampleResume,
        rawText: 'raw',
        filePath: '/tmp/a.pdf',
        fileType: 'pdf',
        version: 1,
      },
    });
  });

  it('createResume 允许 userId 为 undefined（匿名解析）', async () => {
    await createResume({
      name: '匿名',
      content: sampleResume,
      rawText: '',
      fileType: 'pdf',
    });

    const args = (prisma.resume.create as jest.Mock).mock.calls[0][0];
    expect(args.data.userId).toBeUndefined();
    expect(args.data.version).toBe(1);
  });

  it('getResumeById 含 parent/children include', async () => {
    (prisma.resume.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'r-1' });
    const result = await getResumeById('r-1');
    expect(result).toEqual({ id: 'r-1' });
    expect(prisma.resume.findUnique).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      include: expect.objectContaining({
        children: expect.any(Object),
        parent: true,
      }),
    });
  });

  it('getResumesByUserId 按 createdAt desc 排序 + parent include', async () => {
    (prisma.resume.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'r-1' }]);
    await getResumesByUserId('u-1');
    expect(prisma.resume.findMany).toHaveBeenCalledWith({
      where: { userId: 'u-1' },
      orderBy: { createdAt: 'desc' },
      include: { parent: { select: { id: true, name: true } } },
    });
  });

  it('updateResume 只更新传入的字段，未传 content 时不覆盖 content', async () => {
    await updateResume('r-1', { name: '新名字' });
    expect(prisma.resume.update).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data: { name: '新名字' },
    });
  });

  it('updateResume 传入 content 时一并写入', async () => {
    await updateResume('r-1', { content: sampleResume });
    expect(prisma.resume.update).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data: { content: sampleResume },
    });
  });

  it('deleteResume 传 id', async () => {
    await deleteResume('r-1');
    expect(prisma.resume.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } });
  });

  it('createResumeVersion 基于父版本号自增、继承 userId', async () => {
    (prisma.resume.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'r-1',
      userId: 'u-1',
      name: '简历',
      version: 3,
      rawText: 'raw',
      fileType: 'pdf',
    });

    await createResumeVersion('r-1', sampleResume);

    expect(prisma.resume.create).toHaveBeenCalledWith({
      data: {
        userId: 'u-1',
        name: '简历 v4',
        content: sampleResume,
        rawText: 'raw',
        fileType: 'pdf',
        parentId: 'r-1',
        version: 4,
      },
    });
  });

  it('createResumeVersion 父记录不存在时抛错', async () => {
    (prisma.resume.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(createResumeVersion('missing', sampleResume)).rejects.toThrow(
      /Parent resume not found/
    );
  });
});

describe('jd-repository', () => {
  const {
    createJD,
    getJDById,
    getJDsByUserId,
    updateJD,
    deleteJD,
  } = require('../src/repositories/jd-repository');

  const sampleJD = { jobTitle: '前端', rawText: 'JD' } as any;

  it('createJD 透传 userId/jobTitle/company/content/rawText', async () => {
    await createJD({
      userId: 'u-1',
      jobTitle: '前端工程师',
      company: 'Acme',
      content: sampleJD,
      rawText: 'JD 原文',
    });

    expect(prisma.jD.create).toHaveBeenCalledWith({
      data: {
        userId: 'u-1',
        jobTitle: '前端工程师',
        company: 'Acme',
        content: sampleJD,
        rawText: 'JD 原文',
      },
    });
  });

  it('getJDById 用 findUnique + where id', async () => {
    await getJDById('jd-1');
    expect(prisma.jD.findUnique).toHaveBeenCalledWith({ where: { id: 'jd-1' } });
  });

  it('getJDsByUserId 排序 + where userId', async () => {
    await getJDsByUserId('u-1');
    expect(prisma.jD.findMany).toHaveBeenCalledWith({
      where: { userId: 'u-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('updateJD 不传 content 时不动 content', async () => {
    await updateJD('jd-1', { company: 'Tencent' });
    expect(prisma.jD.update).toHaveBeenCalledWith({
      where: { id: 'jd-1' },
      data: { company: 'Tencent' },
    });
  });

  it('deleteJD 传 id', async () => {
    await deleteJD('jd-1');
    expect(prisma.jD.delete).toHaveBeenCalledWith({ where: { id: 'jd-1' } });
  });
});

describe('match-repository', () => {
  const {
    createMatchRecord,
    getMatchRecordById,
    getMatchRecordByResumeAndJD,
    getMatchRecordsByResumeId,
    getMatchRecordsByJDId,
  } = require('../src/repositories/match-repository');

  const sampleResult = { overallScore: 80 } as any;

  it('createMatchRecord 写 resumeId/jdId/result/suggestions', async () => {
    await createMatchRecord({
      resumeId: 'r-1',
      jdId: 'jd-1',
      result: sampleResult,
      suggestions: [],
    });

    expect(prisma.matchRecord.create).toHaveBeenCalledWith({
      data: {
        resumeId: 'r-1',
        jdId: 'jd-1',
        result: sampleResult,
        suggestions: [],
      },
    });
  });

  it('getMatchRecordById include resume/jd 简报', async () => {
    await getMatchRecordById('m-1');
    const args = (prisma.matchRecord.findUnique as jest.Mock).mock.calls[0][0];
    expect(args.where).toEqual({ id: 'm-1' });
    expect(args.include.jd.select).toEqual({
      id: true,
      jobTitle: true,
      company: true,
    });
  });

  it('getMatchRecordByResumeAndJD 用 findFirst + 组合 where', async () => {
    await getMatchRecordByResumeAndJD('r-1', 'jd-1');
    expect(prisma.matchRecord.findFirst).toHaveBeenCalledWith({
      where: { resumeId: 'r-1', jdId: 'jd-1' },
      include: { resume: true, jd: true },
    });
  });

  it('getMatchRecordsByResumeId 排序 + include jd 简报', async () => {
    await getMatchRecordsByResumeId('r-1');
    const args = (prisma.matchRecord.findMany as jest.Mock).mock.calls[0][0];
    expect(args.where).toEqual({ resumeId: 'r-1' });
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('getMatchRecordsByJDId include resume 简报', async () => {
    await getMatchRecordsByJDId('jd-1');
    const args = (prisma.matchRecord.findMany as jest.Mock).mock.calls[0][0];
    expect(args.where).toEqual({ jdId: 'jd-1' });
    expect(args.include.resume.select).toEqual({
      id: true,
      name: true,
      fileType: true,
    });
  });
});

describe('company-repository', () => {
  const {
    createCompany,
    getCompanyByName,
    getCompanyById,
    updateCompany,
    searchCompanies,
  } = require('../src/repositories/company-repository');

  const sampleCompany = {
    name: '字节跳动',
    industry: '互联网',
    techStack: ['Go'],
  };

  it('createCompany 直接透传 input', async () => {
    await createCompany(sampleCompany);
    expect(prisma.company.create).toHaveBeenCalledWith({ data: sampleCompany });
  });

  it('getCompanyByName 用 name 唯一索引', async () => {
    await getCompanyByName('字节跳动');
    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { name: '字节跳动' },
    });
  });

  it('getCompanyById 用 id', async () => {
    await getCompanyById('c-1');
    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: 'c-1' },
    });
  });

  it('updateCompany 透传 id + data', async () => {
    await updateCompany('c-1', { industry: '科技' });
    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 'c-1' },
      data: { industry: '科技' },
    });
  });

  it('searchCompanies 用 OR 跨字段 contains + take 10', async () => {
    await searchCompanies('字节');
    const args = (prisma.company.findMany as jest.Mock).mock.calls[0][0];
    expect(args.take).toBe(10);
    expect(args.where.OR).toHaveLength(3);
    expect(args.where.OR[0]).toEqual({
      name: { contains: '字节', mode: 'insensitive' },
    });
  });
});
