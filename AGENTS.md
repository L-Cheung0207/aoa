# AGENTS.md 规则：D:\workspace\voice-electron\new

## 前端测试规则

生成或修改前端代码时，默认不要创建或更新测试文件。

只有在用户明确要求编写前端测试时，才添加测试。

<!-- CODEGRAPH_START -->
## CodeGraph

本项目已配置 CodeGraph MCP server（`codegraph_*` 工具）。CodeGraph 是基于 tree-sitter 解析得到的代码知识图谱，包含每个符号、调用边和文件信息。读取速度很快，并且能返回 grep 无法直接得到的结构化信息。

### 什么时候优先使用 CodeGraph

处理结构性问题时优先使用 CodeGraph，例如：谁调用了谁、修改某个符号会影响什么、某个符号在哪里定义、某个函数的签名是什么。只有在查找字面文本时，例如字符串内容、注释、日志消息，或者已经打开了具体文件之后，才使用原生 grep/read。

| 问题                                            | 工具                                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| “X 在哪里定义？”/“查找名为 X 的符号”            | `codegraph_search`                                                          |
| “谁调用了函数 Y？”                              | `codegraph_callers`                                                         |
| “Y 调用了什么？”                                | `codegraph_callees`                                                         |
| “X 是如何到达/变成 Y 的？”/“追踪 X 到 Y 的流程” | `codegraph_trace`（一次调用返回完整路径，包括 callback/React/JSX 动态跳转） |
| “如果修改 Z，什么会受影响？”                    | `codegraph_impact`                                                          |
| “显示 Y 的签名/源码/docstring”                  | `codegraph_node`                                                            |
| “给我某个任务/区域的聚焦上下文”                 | `codegraph_context`                                                         |
| “一次查看多个相关符号的源码”                    | `codegraph_explore`                                                         |
| “path/ 下面有哪些文件？”                        | `codegraph_files`                                                           |
| “索引是否健康？”                                | `codegraph_status`                                                          |

### 使用准则

- **直接回答，不要把探索任务委托出去。** 对于“X 是怎么工作的”或架构类问题，先调用 `codegraph_context`，再用一次 `codegraph_explore` 查看它返回的关键符号源码。对于具体流程问题，例如“X 如何到达 Y”，先用 `codegraph_trace` 从 X 追踪到 Y，再用一次 `codegraph_explore` 查看相关函数体。
- **信任 CodeGraph 结果。** 结果来自完整 AST 解析。不要再用 grep 重复验证，这会更慢、也浪费上下文。
- **按符号名查找时不要先 grep。** `codegraph_search` 更快，并且一次返回类型、位置和签名。
- **只想要上下文时，不要串联 `codegraph_search` + `codegraph_node`。** 直接用 `codegraph_context`。
- **不要对多个符号循环调用 `codegraph_node`。** 一次 `codegraph_explore` 可以按文件返回多个相关符号的源码，比多次 node/read 更省上下文。
- **索引延迟：** 文件监听器在写入后大约有 500ms debounce。刚编辑完文件时，不要立刻重新查询 CodeGraph。

### 如果 `.codegraph/` 不存在

如果 MCP server 返回 “not initialized”，询问用户：`我注意到这个项目还没有初始化 CodeGraph。要我运行 codegraph init -i 来构建索引吗？`
<!-- CODEGRAPH_END -->

@RTK.md

## Caveman Mode

- Every session must use `caveman` skill: `D:\workspace\AOA\code\aoa-client\.agents\skills\caveman\SKILL.md`.
- Default level: `full`.
- Keep technical substance exact, replies terse, no filler.
- Persist across turns unless user says `stop caveman` or `normal mode`.
