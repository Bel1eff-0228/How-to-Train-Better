# Agent 集成与运行

服务端 POST `/api/plan/create` 接受 `{profile, adultConfirmed:true}`；POST `/api/plan/revise` 接受 `{token,message}`。成功返回计划、来源及签名 token；失败返回 `{code,error}`，不替换原计划。

创建：Zod → 成年确认 → 风险拦截 → retrieve_fitness_knowledge → select_exercises → 模型结构化选择 → validate_training_plan → build_training_plan → 签名。
修改：验证签名与24小时有效期 → 风险拦截 → 模型提取条件patch → 合并旧条件 → 使用原计划重新规划 → 校验 → 返回新版本。

## 配置

复制 `.env.example` 为 `.env.local`，只在本机填写密钥。兼容提供方需支持 `/chat/completions`、`response_format:json_object` 及 `max_tokens`。不要在聊天、日志或Git提交中提供真实密钥。需要模型名、HTTPS API地址、API Key和32位以上随机计划签名密钥。没有配置时API返回503，不回退测试数据。

每次模型请求20秒超时，只对HTTP 5xx重试一次；输出最多2200 tokens，输入上下文最多50000字符。每日模型调用预算默认100次（重试也计费计数），全局每分钟20个请求，最多3个并发。金额取决于供应商价格，应另在供应商控制台设置硬支出上限。

这些限制在单Node进程内生效，重启会重置，不适合多实例/Serverless公开部署。生产默认关闭；确认单实例后才能设置 AGENT_SINGLE_INSTANCE=true。正式公共服务需共享限流和持久费用账本。签名token含计划数据，仅完整性保护，不是加密；客户端内存保存，刷新清空，不记录用户原始日志。

## 知识

源Skill的references目录不存在，由原 `tools/package_source.py` 在发布包中生成。源脚本位于tools，不是scripts。新增 `scripts/build-knowledge.mjs` 通过原loadBook解析100条，保留完整字段、book路径、章条、来源、核验日期和Skill哈希。生成副本不手工维护；predev/prebuild自动刷新。

检索为确定性关键词排序，每次最多8条；C级、争议、超过一年未核验、缺来源均标记。Skill规则人工提炼进服务端提示，不把全部Skill和正文拼接。原始文献本阶段未重新联网核验；引用存在不等于语义正确，仍需人工检查。代码/界面延续MIT，原正文/Skill仍遵循项目CC BY-NC 4.0与署名要求。

## 工具契约

工具均抛出ZodError或带code/status的AgentError，HTTP统一转换；模型错误不返回成功。

|工具|输入|输出|
|---|---|---|
|retrieve_fitness_knowledge|query, limit|完整条目、score、flags|
|select_exercises|Profile|该器械动作目录|
|validate_training_plan|profile,draft,sourceIds|验证后的Draft|
|build_training_plan|profile,draft,sourceIds,version,changes|Plan|
|revise_training_plan|原Plan, request|新版本Plan及来源|
|estimate_budget_options|Profile|额外购买空列表、0新增购买费、说明|

## 验证与限制

`npm test` 包含A—D等注入模型夹具测试，这不是真实供应商回答记录。`npm run typecheck`、`npm run build`检查应用。真实A/B验收须配置模型后在网页执行，不能将fixture通过冒充真实AI成功。

动作库为小型编辑目录，不是经过专家审核的完整训练系统。模型仅能在其中选择，不开放自定义动作、重量、饮食处方或购买建议。风险关键词可能误拦截/漏检，模型再进行风险判断，但不保证识别所有表达。高频训练、个人限制及动作技术仍需专业复核；本版本只提供一般信息草案。

自然语言patch由模型解释，非明确变更的保留依赖提示及合并规则，复杂多意图可能需要澄清；当前不支持聊天追问、跨设备同步、联网检索、持久计划或真实价格优化。
