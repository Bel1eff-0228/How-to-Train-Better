# DeepSeek 真实调用诊断（2026-11-03）

配置确认：MODEL_BASE_URL=https://api.deepseek.com，MODEL_NAME=deepseek-flash；模型密钥和签名密钥已加载。未在本文保存任何密钥、请求头、输入内容或原始回答。

## 实际运行记录

- 原脚本第一次真实连接、生成3天45分钟哑铃计划、修改为2天全部通过（尚无逐请求计时）。
- 加入脱敏诊断后，默认思考模式：连接200/8920ms；生成首次503，重试200/6420ms并通过；修改条件解析请求200，但在20002ms读取正文超时，MODEL_TIMEOUT。
- 显式关闭思考：连接200/5437ms；生成200/9232ms；修改条件解析200/7441ms；修改后计划200/11248ms。全链路通过Schema及现有业务约束校验；无思考内容，结束原因均stop。
- 修复后默认配置再次验证：连接200/7187ms；生成收到200，但60005ms仍未完成正文，MODEL_TIMEOUT。故最终稳定性验收未通过。

以上是实际供应商调用，不是测试替身。HTTP 200只证明请求被接收，不保证完整回答可用；无法据此确认账户余额数值。未发现实际计划字段不满足Schema的案例。

## 原因和最小修改

已复现原20秒超时中断响应正文，且供应商有503和60秒正文未完成的波动。不能证明默认思考是唯一原因，也不能宣称调大超时已彻底修好。

- 保留原适配层与业务约束。官方DeepSeek地址默认传thinking.disabled；其他兼容服务不自动附加此参数。可用MODEL_THINKING覆盖。
- 默认超时60秒，可通过MODEL_TIMEOUT_MS设置，边界1至120秒；保留原5xx最多重试一次及调用额度计数。
- 明确区分HTTP、网络、超时、响应JSON、正文JSON、空正文、截断、超长输出。保留max_tokens=2200和json_object；当前成功输出未截断，无证据支持盲目增加token。
- MODEL_DIAGNOSTICS=true仅记录状态、耗时、长度、结束类别和内部错误代码。
- check-model.ts报告失败阶段和Zod问题路径/代码，不打印输入和原始回答。
- .env.example发现疑似真实凭据，已替换为空占位符。维护者需轮换模型密钥和签名密钥；本次未修改.env.local。

## 检查与复现

TypeScript通过；21项自动化测试通过（包含7类错误分类测试，自动化供应商替身不算真实验收）。未改动v1.0正文或历史发布包。

在apps/web目录PowerShell执行：

```powershell
$env:MODEL_DIAGNOSTICS='true'
node --env-file=.env.local --import tsx scripts/check-model.ts
```

轮换密钥后重启服务器再复测。若反复出现200后正文迟迟未结束，应向供应商反馈发生时间、模型、状态和耗时，并比较部署网络；不要发送完整请求头或用户原始数据。当前不应承诺公开服务稳定可用。

官方思考模式说明：https://api-docs.deepseek.com/guides/thinking_mode/
