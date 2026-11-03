# Render Basic Auth诊断

本地修复包含严格Base64/UTF-8解析、大小写不敏感的Basic scheme、用户名/密码分开验证和配置格式检查。密码仍精确比较，不自动trim或移除引号。用户名固定为小写tester；密码取运行时TEST_ACCESS_PASSWORD，不是MODEL_API_KEY或PLAN_SIGNING_SECRET。

2026-11-03无凭据公网检查：/api/health返回200，/返回401且挑战realm为TrainBetter Test。不能证明输入密码正确或远程环境值与用户输入一致。当前仓库只有proxy.ts执行Basic认证，业务API无第二套Basic认证。

## 部署诊断版后

1. Render Environment确认键名为TEST_ACCESS_PASSWORD。值只填密码本身，不能填TEST_ACCESS_PASSWORD=…整行，也不要加引号。建议新建至少24位随机ASCII密码，只在Render与自己的密码管理器保存。
2. 设置AUTH_DIAGNOSTICS=true，保存并重新部署/重启让运行实例生效；仅保存环境编辑不代表旧进程已更新。不要输出环境变量或截取有秘密值的界面。
3. 关闭当前网站标签页，用全新无痕窗口访问。用户名tester，密码为上述值。浏览器可能缓存旧Basic凭据。
4. 在Render Logs查找event=test_access、version=2的记录，只提供result值即可。不发送完整请求头、密码或环境截图。

|result|含义/处理|
|---|---|
|CONFIG_MISSING|运行时变量缺失，返回503|
|CONFIG_TOO_SHORT|密码不足20字符，返回503|
|CONFIG_FORMAT|首尾空白、换行/NUL、首尾引号等配置错误，返回503；修正控制台值|
|HEADER_MISSING|此请求无Authorization；首次访问正常。输入后仍只有此结果时，排查浏览器是否发送、代理是否剥离|
|HEADER_INVALID|协议或Base64/UTF-8格式无效|
|USERNAME_MISMATCH|收到凭据，但用户名不是小写tester|
|PASSWORD_MISMATCH|收到tester，但密码与运行实例配置不完全一致；检查是否更新了错误服务或缓存旧凭据|
|OK|代理认证成功；若浏览器仍循环，查同一时段后续请求状态、域名及日志|
|AUTH_INTERNAL|代理内部异常，返回503；不输出异常对象以避免意外泄露|

外部401统一响应，不暴露用户名/密码哪个错误。健康检查不暴露配置状态。AUTH_DIAGNOSTICS默认关闭，排查完成后关闭；不要批量猜测密码。若看不到version=2日志，检查诊断版提交是否实际部署、开关是否生效。

修复只在本地时，不能通过重新部署旧提交获得这些日志。先关闭自动部署，将修复上传至v2/render-test，再在Render选择Manual Deploy → Deploy latest commit。保留原服务URL，不更换main、不撤销访问保护。此处未声称公网正确密码验收通过。
