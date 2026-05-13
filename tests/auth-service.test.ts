import { AuthService } from '../src/services/auth-service';

describe('AuthService JWT configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('rejects placeholder JWT secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'replace_with_a_long_random_secret';

    expect(() => AuthService.generateToken('user-1')).toThrow('JWT_SECRET is missing or unsafe');
  });

  it('accepts a strong JWT secret in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a-secure-test-secret-with-more-than-32-chars';

    expect(AuthService.generateToken('user-1')).toEqual(expect.any(String));
  });
});
