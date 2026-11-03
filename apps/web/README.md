# TrainBetter AI Web MVP

第三阶段：真实服务端模型接口、指南检索和受限计划工具已接入。没有密钥时明确报错，不回退演示数据。

详见 [Agent配置、工具契约及限制](AGENT.md)。先复制 `.env.example` 为 `.env.local` 并在本机填写配置，然后运行 `npm run dev`，打开 http://127.0.0.1:3000 。

检查：`npm test`、`npm run typecheck`、`npm run build`。生产运行 `npm start`。知识副本在启动/构建时从原book生成。

A—D测试通过代表注入模型夹具下的程序流程通过，不等于真实供应商已验收。现有测试模板函数仅供回归测试，页面不再调用它们。原v1阅读器保持独立。
