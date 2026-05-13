/**
 * 认证功能测试脚本
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const body = data ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(responseData),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runAuthTests() {
  console.log('=====================================');
  console.log('Resume Coach Platform 认证功能测试');
  console.log('=====================================\n');

  // 1. 测试用户注册
  console.log('1. 测试用户注册...');
  try {
    const result = await request('POST', '/api/auth/register', {
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      name: '测试用户',
      avatar: '',
    });
    console.log('   状态:', result.status);
    console.log('   响应:', JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log('   失败:', e.message);
  }

  // 2. 测试用户登录
  console.log('\n2. 测试用户登录...');
  try {
    const result = await request('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    console.log('   状态:', result.status);
    console.log('   响应:', JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log('   失败:', e.message);
  }

  // 3. 测试获取当前用户信息（需要登录）
  console.log('\n3. 测试获取当前用户信息...');
  try {
    const result = await request('GET', '/api/auth/me');
    console.log('   状态:', result.status);
    console.log('   响应:', JSON.stringify(result.data, null, 2));
  } catch (e) {
    console.log('   失败:', e.message);
  }

  console.log('\n=====================================');
  console.log('认证功能测试完成');
  console.log('=====================================');
}

runAuthTests().catch(console.error);
