# Render反向代理来源校验修复

旧实现位于lib/agent/http.ts：Origin不等于new URL(request.url).origin时返回HTTP403、code=ORIGIN和“请求来源不允许”。生成和修改共用该处理器；Basic Auth失败返回401，二者不同。错误在模型调用前发生。

本地测试复现外部Origin=https://trainbetter-ai-test.onrender.com、内部request.url=http://localhost:10000/api/plan/create。此关系足以导致旧实现误拒绝，但没有用户公网认证凭据，未抓取线上已认证请求头，不能声称已经观察到Render内部实际值。

修复使用服务端APP_ORIGIN构成严格单一来源白名单。生产缺少或错误配置返回503，不退回客户端Host/X-Forwarded-Host。合法请求必须携带精确匹配的Origin；缺失、null、其他协议/域名、子域后缀伪装均403。Basic Auth继续保护页面/API。开发环境无配置仅允许当前localhost回环来源，脚本也需明确Origin。

Render Environment新增APP_ORIGIN=https://trainbetter-ai-test.onrender.com；值不加引号。临时设置ORIGIN_DIAGNOSTICS=true可以在日志中看到origin_check：accepted、requestUrlMatches、hostMatches、forwardedHostMatches、forwardedProtoMatches等布尔关系。无原始请求头、密码、签名、正文或模型数据。若accepted=true但requestUrlMatches=false，便能确认线上代理地址与可信外部来源不同。排障完关闭开关。

本次连同上一轮尚未上传的认证诊断修复发布，新增AUTH_DIAGNOSTICS可选开关；认证密码仍精确比较，不关闭认证。前端按操作类型显示“这次没有生成计划”或“这次没有修改计划”，重试保留原操作类型。

手动部署：确认Auto-Deploy关闭，保存APP_ORIGIN并选择稍后部署（若控制台提供此选项），再Manual Deploy → Deploy latest commit，核对部署提交SHA。若保存变量操作会触发部署，应让它使用最新分支提交。保持原模型密钥、签名密钥和访问密码。健康检查200只表示进程存活，不代表模型验收。

本次测试不消耗模型额度：模拟代理的生成/修改请求通过来源检查后进入输入校验（422）；不合法来源在输入处理前403。真实模型生成与修改需最新版本Live后另行验证。
