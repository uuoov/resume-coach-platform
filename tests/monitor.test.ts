describe('monitor health checks', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  function loadMonitorWithDatabase(databaseMock: Record<string, unknown>) {
    jest.resetModules();
    jest.doMock('../src/services/database', () => databaseMock);
    return require('../src/utils/monitor').monitor as typeof import('../src/utils/monitor').monitor;
  }

  it('reports a clear error when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    const monitor = loadMonitorWithDatabase({
      prismaAvailable: false,
      prisma: null,
    });

    const health = await monitor.healthCheck();

    expect(health.status).toBe('unhealthy');
    expect(health.checks.database).toEqual({
      status: 'error',
      message: 'DATABASE_URL is not configured',
    });
    expect(health.checks.memory.status).not.toBe('error');
  });

  it('checks the shared Prisma client when DATABASE_URL is configured', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/resume_coach?schema=public';
    const queryRaw = jest.fn().mockResolvedValue([{ value: 1 }]);

    const monitor = loadMonitorWithDatabase({
      prismaAvailable: true,
      prisma: { $queryRaw: queryRaw },
    });

    const health = await monitor.healthCheck();

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(health.status).toBe('healthy');
    expect(health.checks.database.status).toBe('ok');
  });
});
