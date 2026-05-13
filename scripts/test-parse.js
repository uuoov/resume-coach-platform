const text = "张三\n\n现居：北京市海淀区\n手机：13800138000\n邮箱：zhangsan@example.com\nGitHub: github.com/zhangsan\n\n工作经压\n\n阿里巴巴集因 (2020.01-至今)\n高级 Java 工程师\n- 负责电商平台核心模块的设计和开发\n- 主导微服务架构改造，使用 Spring Cloud 框架\n- 优化数据库查询，提升系统性能 30%\n\n腾讯科技 (2018.01-2019.12)\nJava 开发工程师\n- 参与社交平台的后端开发\n- 使用 MySQL 和 Redis 进行数据存储\n\n项目经历\n\n电商平台重构项目 (2021.01-2021.06)\n负责：后端架构设计\n技术栈：Java, Spring Boot, MySQL, Redis\n- 主导电商平台从单体架构向微服务架构的迁移\n- 设计并实现了订单、支付、库存等核心服务\n\n教育背景\n\n北京大学 硕士 计算机科学与技术 2015-2018\n\n清华大学 本科 软件工程 2011-2015\n\n抆能清单\n\n- 精通 Java、Python 编程\n- 熟悉 Spring Boot8�Rpring Cloud 框架\n- 疟緰使用 MySQL、Redis、MongoDB\n- 熟悉 Docker、Kubernetes 容器化技朮\n- 了解 AWS、阿里云云服务\n\n自我评价\n\n热爱技术，有良好的学习能力和团队协作精祮。\n在分布式系统和高并发场景有丰富经验。";

console.log("=".repeat(60));
console.log("TEST 1: Location Regex");
console.log("=".repeat(60));

const locOrig = /(?:现居 | 所在 | 位于)[:：]s*([^
,，]+)/i;
const locFixed = /(?:现居|所在|位于)[:：]s*([^
,，]+)/i;
const m1 = text.match(locOrig);
const m2 = text.match(locFixed);
console.log("Original (spaces in alternation):", m1 ? m1[1].trim() : "NO MATCH");
console.log("Fixed (no spaces):", m2 ? m2[1].trim() : "NO MATCH");
if (!m1 && m2) console.log("*** BUG #1 CONFIRMED: spaces prevent location match ***");
else if (m1) console.log("Original pattern also matched");

console.log("
City char-class test:");
const cityP = /([北京上海广州深圳杭州南京成都武汉西安天津重庆][市区县])/;
console.log("  match:", "北京市海淀区".match(cityP)?.[0], "(char class matches single chars)");

console.log("
" + "=".repeat(60));
console.log("TEST 2: Work Experience Company Pattern");
console.log("=".repeat(60));

const cp = /^(.+?)s*[({（]?s*(d{4})s*[-–—.]s*(d{4}|至今 |Present)?s*[)}）]?$/;
const workTests = ["阿里巴巴集团 (2020.01-至今)", "腾讯科技 (2018.01-2019.12)", "阿里巴巴集团 (2020-至今)", "腾讯科技 (2018-2019)"];
for (const line of workTests) {
  const m = line.match(cp);
  console.log("  " + JSON.stringify(line));
  if (m) {
    console.log("    company=" + m[1].trim() + " year=" + m[2] + " end=[" + (m[3]||"") + "]");
    console.log("    isCurrent (=== 至今):", m[3] === "至今", "| isCurrent (=== 至今 with space):", m[3] === "至今 ");
  } else console.log("    NO MATCH");
}

console.log("
" + "=".repeat(60));
console.log("TEST 3: Education");
console.log("=".repeat(60));
const eduR = /(.+?)(大学 | 学院)?s*(硕士 | 博士 | 本科 | 大专|学士)s*([^d]*?)s*(d{4})s*[-–—]?s*(d{4})?/;
for (const el of ["北京大学 硕士 计算机科学与技术 2015-2018", "清华大学 本科 软件工程 2011-2015"]) {
  const m = el.match(eduR);
  console.log("  " + el);
  if (m) console.log("    school=" + m[1].trim() + " degree=" + (m[3]||"").trim() + " major=" + (m[4]||"").trim() + " " + m[5] + "-" + (m[6]||""));
  else console.log("    NO MATCH");
}

console.log("
" + "=".repeat(60));
console.log("TEST 4: Skills Word Boundary + CJK");
console.log("=".repeat(60));
const sTests = [["阿里云","了解 AWS、阿里云云服务"],["Java","精通 Java、Python"],["MySQL","使用 MySQL 和 Redis"],["Docker","熟悉 Docker、Kubernetes"]];
for (const [name, txt] of sTests) {
  const withB = new RegExp("\b" + name + "\b", "i");
  const noB = new RegExp(name, "i");
  const isCJK = /[一-鿿]/.test(name);
  console.log("  " + name + " CJK:" + isCJK + " with_b:" + withB.test(txt) + " no_b:" + noB.test(txt));
  if (isCJK && !withB.test(txt) && noB.test(txt)) console.log("    *** BUG #5 CONFIRMED ***");
}

console.log("
" + "=".repeat(60));
console.log("TEST 5: Proficiency");
console.log("=".repeat(60));
const profMap = {"精通":"expert","熟悉":"advanced","熟练":"advanced","了解":"beginner"};
for (const line of text.split("
").filter(l => l.trim().startsWith("- "))) {
  let lvl = "intermediate";
  for (const [k,v] of Object.entries(profMap)) { if (line.includes(k)) { lvl = v; break; } }
  console.log("  " + line.trim() + " => should be: " + lvl);
}

console.log("
" + "=".repeat(60));
console.log("BUG SUMMARY");
console.log("=".repeat(60));
console.log("BUG #1 [CRITICAL] Location: spaces in regex alternation prevent matching");
console.log("BUG #2 [MEDIUM] City: char class instead of alternation matches wrong substrings");
console.log("BUG #3 [CRITICAL] Work exp: YYYY.MM format not supported by companyPattern");
console.log("BUG #4 [HIGH] isCurrent: trailing space mismatch => always false");
console.log("BUG #5 [HIGH] Skills: word boundary breaks CJK matching");
console.log("BUG #6 [MEDIUM] Skills: proficiency always intermediate");
console.log("BUG #7 [LOW] parseCertifications: unimplemented");
console.log("BUG #8 [LOW] Education: inconsistent spacing in alternation");
console.log("BUG #9 [MEDIUM] Projects: incomplete section end detection");
console.log("BUG #10 [LOW] findNextSection: missing markers");
console.log("
Total: 10 bugs (2 CRITICAL, 2 HIGH, 3 MEDIUM, 3 LOW)");
console.log("=".repeat(60));
