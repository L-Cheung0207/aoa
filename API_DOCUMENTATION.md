# AOSO API 接口文档

## 基本信息

- **服务器地址**: `172.30.21.67`
- **服务端口**: `9066`
- **基础 URL**: `http://172.30.21.67:9066`
- **接口协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

---

## 接口列表


| 接口名称    | 请求方法 | 请求路径                              | 功能描述              |
| ------- | ---- | --------------------------------- | ----------------- |
| 文本翻译    | POST | `/aoaapi_ctm/translate`           | 将文本翻译成指定语言        |
| 文本重写/润色 | POST | `/aoaapi_ctm/rewrite`             | 优化口语化文本，去除口头禅、重复等 |
| 基于模板的重写 | POST | `/aoaapi_ctm/rewrite_by_templete` | 根据预设模板结构化重写文本     |


---

## 1. 文本翻译接口 `/aoaapi_ctm/translate`

### 接口说明

将输入的文本翻译成目标语言，支持流式输出。默认翻译为葡萄牙语。

### 请求信息

- **请求方法**: `POST`
- **请求路径**: `/aoaapi_ctm/translate`
- **Content-Type**: `application/json`

### 请求参数


| 参数名        | 类型      | 必填  | 默认值     | 说明                                |
| ---------- | ------- | --- | ------- | --------------------------------- |
| `text`     | string  | 是   | -       | 需要翻译的原文内容                         |
| `language` | string  | 否   | `"葡語"`  | 目标翻译语言，如 `"葡語"`、`"英語"`、`"簡體中文"` 等 |
| `stream`   | boolean | 否   | `false` | 是否启用流式输出，`true` 为启用               |


### 响应格式

#### 非流式响应（`stream=false` 或未传）

**成功响应** (HTTP 200):

```json
{
  "translated_text": "翻译后的文本内容"
}
```

**失败响应** (HTTP 400):

```json
{
  "error": "Missing 'text' field in request body"
}
```

**异常响应** (HTTP 200):

```json
{
  "translated_text": "原始文本内容",
  "warning": "Translation failed, returning original text"
}
```

#### 流式响应（`stream=true`）

- **Content-Type**: `text/event-stream`
- **数据格式**: JSON Lines（每行一个 JSON 对象）

**流式数据格式**:

```json
{"data": "翻译内容片段1"}
{"data": "翻译内容片段2"}
{"data": "翻译内容片段3"}
```

### 请求示例

#### cURL 示例（非流式）

```bash
curl -X POST http://172.30.21.67:9066/aoaapi_ctm/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "你好，这是一个测试文本",
    "language": "葡語"
  }'
```

#### cURL 示例（流式）

```bash
curl -X POST http://172.30.21.67:9066/aoaapi_ctm/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "你好，这是一个测试文本",
    "language": "英語",
    "stream": true
  }'
```

#### JSON 请求体示例

```json
{
  "text": "系统维护通知：今晚10点至凌晨2点进行服务器升级",
  "language": "葡語",
  "stream": false
}
```

### 响应示例

#### 成功响应

```json
{
  "translated_text": "Aviso de manutenção do sistema: atualização do servidor das 22h00 às 02h00"
}
```

### 前端流式解析示例（JavaScript）

```javascript
const response = await fetch('http://172.30.21.67:9066/aoaapi_ctm/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '你好世界',
    language: '英語',
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      console.log('翻译片段:', data.data);
      // 实时渲染到界面
    } catch (e) {
      console.error('解析失败:', e);
    }
  }
}
```

### 注意事项

1. **空文本处理**: 如果 `text` 为空字符串或仅包含空白字符，接口将返回 `{"translated_text": ""}`
2. **异常容错**: 翻译失败时不会抛出错误，而是返回原文并附加 `warning` 字段
3. **语言参数**: `language` 参数会替换到系统提示词中，支持任意自然语言描述

---

## 2. 文本重写/润色接口 `/aoaapi_ctm/rewrite`

### 接口说明

对口语化的语音识别文本进行后处理优化，包括：

- 去除口头禅（如"嗯"、"啊"、"那个"等）
- 去除无意识重复
- 智能修正（处理自我纠正）
- 自动格式化（为并列内容添加序号和换行）

**核心原则**: 保持用户原始意图不变，保持输入的语言和简繁体特征。

### 请求信息

- **请求方法**: `POST`
- **请求路径**: `/aoaapi_ctm/rewrite`
- **Content-Type**: `application/json`

### 请求参数


| 参数名      | 类型      | 必填  | 默认值     | 说明                   |
| -------- | ------- | --- | ------- | -------------------- |
| `text`   | string  | 是   | -       | 需要重写的原始文本（可以是语音识别结果） |
| `stream` | boolean | 否   | `false` | 是否启用流式输出，`true` 为启用  |


### 响应格式

#### 非流式响应（`stream=false` 或未传）

**成功响应** (HTTP 200):

```json
{
  "rewritten_text": "优化后的文本内容"
}
```

**失败响应** (HTTP 400):

```json
{
  "error": "Missing 'text' field in request body"
}
```

**异常响应** (HTTP 200):

```json
{
  "rewritten_text": "原始文本内容",
  "warning": "Rewrite failed, returning original text"
}
```

#### 流式响应（`stream=true`）

- **Content-Type**: `text/event-stream`
- **数据格式**: JSON Lines

**流式数据格式**:

```json
{"data": "优化后文本片段1"}
{"data": "优化后文本片段2"}
{"data": "优化后文本片段3"}
```

### 请求示例

#### cURL 示例（非流式）

```bash
curl -X POST http://172.30.21.67:9066/aoaapi_ctm/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "text": "嗯...我想去那个...嗯...北京，然后就是天气天气很不错。"
  }'
```

#### cURL 示例（流式）

```bash
curl -X POST http://172.30.21.67:9066/aoaapi_ctm/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "text": "首先我们需要分析数据，其次不对不是其次，应该是第二步建立模型",
    "stream": true
  }'
```

### 响应示例

#### 成功响应

```json
{
  "rewritten_text": "我想去北京，天气很不错。"
}
```

#### 复杂场景响应

**输入**:

```json
{
  "text": "嗯...首先，我们需要那个...分析数据。其次，然后...不对，不是其次，应该是第二步是建立模型。第三步，呃，验证结果。"
}
```

**输出**:

```json
{
  "rewritten_text": "我们需要分析数据。\n1. 建立模型。\n2. 验证结果。"
}
```

### 注意事项

1. **语言保持**: 输入是什么语言，输出就是什么语言，不会强制转换
  - 粤语输入 → 粤语输出（保留"佢"、"嘅"、"咗"等用字）
  - 繁体输入 → 繁体输出
  - 简体输入 → 简体输出
2. **有意重复保留**: "非常非常"、"研究研究"等程度强调或动词重叠不会被去重
3. **智能修正**: 当检测到"不对"、"不是"、"说错了"等触发词时，会自动回删并修正前文
4. **格式化触发**: 只有出现两个及以上连续序号词（如"第一"、"第二"）时才会添加格式
5. **异常容错**: 重写失败时返回原文并附加 `warning` 字段

---

## 3. 基于模板的重写接口 `/aoaapi_ctm/rewrite_by_templete`

### 接口说明

根据用户需求自动选择最匹配的模板，然后将文本按照模板结构进行专业化重写。该接口包含两个阶段：

1. **模板选择**: 根据用户输入内容自动匹配最合适的模板
2. **文本重写**: 按照选定模板的格式和结构重写文本

### 请求信息

- **请求方法**: `POST`
- **请求路径**: `/aoaapi_ctm/rewrite_by_templete`
- **Content-Type**: `application/json`

### 请求参数


| 参数名               | 类型      | 必填  | 默认值     | 说明                  |
| ----------------- | ------- | --- | ------- | ------------------- |
| `text`            | string  | 是   | -       | 用户需求描述（用于模板匹配）      |
| `text_to_rewrite` | string  | 是   | -       | 需要按照模板重写的原始文本       |
| `stream`          | boolean | 否   | `false` | 是否启用流式输出，`true` 为启用 |


### 响应格式

#### 非流式响应（`stream=false` 或未传）

**成功响应** (HTTP 200):

```json
{
  "rewritten_text": "按照模板重写后的完整文本"
}
```

**失败响应** (HTTP 400):

```json
{
  "error": "Missing 'text' or 'text_to_rewrite' field in request body"
}
```

**模板未匹配** (HTTP 200):

```json
{
  "rewritten_text": "原始待重写文本",
  "warning": "rewrite_by_templete failed (not find templete_name: xxx), returning original text"
}
```

**异常响应** (HTTP 200):

```json
{
  "rewritten_text": "原始用户需求文本",
  "warning": "rewrite_by_templete failed, returning original text"
}
```

#### 流式响应（`stream=true`）

- **Content-Type**: `text/event-stream`
- **数据格式**: JSON Lines

**流式数据格式**:

```json
{"rewritten_text": "重写内容片段1", "head_tag": "<head>...</head>"}
{"rewritten_text": "重写内容片段2", "head_tag": "<head>...</head>"}
{"rewritten_text": "重写内容片段3", "head_tag": "<head>...</head>"}
```

**说明**: 

- `rewritten_text`: 流式输出的文本片段
- `head_tag`: HTML 模板的 `<head>` 部分标签，每条消息都会携带，便于前端完整渲染

### 请求示例

#### cURL 示例（非流式）

```bash
curl -X POST http://172.30.21.67:9066/aoaapi_ctm/rewrite_by_templete \
  -H "Content-Type: application/json" \
  -d '{
    "text": "帮我写一封正式的商务邮件给客户",
    "text_to_rewrite": "张总您好，关于我们上次讨论的项目，我想跟您确认一下进度。希望能尽快推进。谢谢！"
  }'
```

#### cURL 示例（流式）

```bash
curl -X POST http://172.30.21.67:9066/aoaapi_ctm/rewrite_by_templete \
  -H "Content-Type: application/json" \
  -d '{
    "text": "写一个服务器资源申请文档",
    "text_to_rewrite": "我们需要申请GPU服务器用于AI模型训练，预计需要4张A100，内存256G，使用周期3个月",
    "stream": true
  }'
```

### 响应示例

#### 成功响应

```json
{
  "rewritten_text": "<html>\n<head>head_tag</head>\n<body>\n<h1>服务器资源申请</h1>\n<p><strong>申请人</strong>: [待補充申请人姓名]</p>\n<p><strong>申请日期</strong>: [待補充申请日期]</p>\n<h2>资源需求</h2>\n<ul>\n<li>GPU型号: NVIDIA A100 × 4</li>\n<li>内存配置: 256GB</li>\n<li>使用周期: 3个月</li>\n</ul>\n<h2>用途说明</h2>\n<p>用于AI模型训练任务，需要高性能GPU加速计算过程。</p>\n<h2>预期成果</h2>\n<p>[待補充预期成果描述]</p>\n</body>\n</html>"
}
```

#### 模板未匹配响应

```json
{
  "rewritten_text": "张总您好，关于我们上次讨论的项目，我想跟您确认一下进度。希望能尽快推进。谢谢！",
  "warning": "rewrite_by_templete failed (not find templete_name: 无匹配模板), returning original text"
}
```

### 前端流式解析示例（JavaScript）

```javascript
const response = await fetch('http://172.30.21.67:9066/aoaapi_ctm/rewrite_by_templete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '写一个商务邮件',
    text_to_rewrite: '你好，项目进度如何？',
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let headTag = '';
let fullContent = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      headTag = data.head_tag;  // 保存head标签
      fullContent += data.rewritten_text;  // 累积内容
      
      // 实时渲染HTML（替换head_tag为实际的head内容）
      const completeHtml = fullContent.replace('head_tag', headTag);
      document.getElementById('preview').innerHTML = completeHtml;
    } catch (e) {
      console.error('解析失败:', e);
    }
  }
}
```

### 注意事项

1. **模板匹配机制**:
  - 系统会从模板库（`configs/templetes/templete_data.csv`）中根据 `text` 字段自动匹配最合适的模板
  - 匹配依据是用户需求描述与模板 `description` 字段的语义相似度
  - 如果无法匹配到任何模板，会返回原文并附带警告信息
2. **模板数据结构**:
  - 模板库包含以下字段：`name`（模板名称）、`description`（适用场景）、`templete`（HTML/Markdown模板内容）、`remark`（改写要求）、`head_tag`（HTML head标签）
3. **HTML 模板处理**:
  - 当使用 HTML 模板时，系统会将 `<head>...</head>` 部分替换为 `head_tag` 占位符
  - 流式响应中会返回 `head_tag` 字段，前端需要将其重新插入到最终 HTML 中
  - 输出的 HTML 必须包含完整的 `<html>` 和 `</html>` 标签
4. **缺失内容标记**:
  - 无法从用户输入中提取的信息会标记为 `[待補充xxx]` 或 `[需確認xxx]`
  - 当用户指定了输出语言时，这些标记也会被翻译成对应语言
5. **用户改写要求优先级**:
  - `text` 字段中的改写要求优先级最高
  - 如果与模板默认规则冲突，以用户要求为准
6. **异常容错策略**:
  - 模板匹配失败 → 返回 `text_to_rewrite` 原文
  - 重写过程异常 → 返回 `text`（用户需求）原文
  - 所有异常情况都返回 HTTP 200，通过 `warning` 字段标识
7. **语言支持**:
  - 支持多语言输出，用户可在 `text` 字段中指定语言要求
  - 系统会严格按照用户指定的语言进行重写

---

## 通用说明

### 错误码


| HTTP 状态码 | 说明                           |
| -------- | ---------------------------- |
| 200      | 请求成功（包括业务异常，通过 warning 字段标识） |
| 400      | 请求参数错误（缺少必填字段）               |
| 500      | 服务器内部错误                      |


### 流式输出说明

当 `stream=true` 时：

- 响应类型为 `text/event-stream`（Server-Sent Events）
- 每行是一个独立的 JSON 对象
- 前端需要按行解析并累积内容
- 适合实时渲染场景，提升用户体验

### 超时建议

- **非流式请求**: 建议设置超时时间为 30-60 秒
- **流式请求**: 建议设置首次响应超时 10 秒，整体超时 120 秒

### 字符编码

- 所有请求和响应均使用 UTF-8 编码
- 支持中文（简体/繁体）、英文、葡文等多语言

---

## 测试脚本运行说明

如需运行测试脚本，请使用以下 Python 解释器：

```bash
/data/ai/anaconda_envs/paddle/bin/python test.py
```

或

```bash
/data/ai/anaconda_envs/paddle/bin/python test_templete.py
```

---

## 更新日志


| 版本   | 日期         | 说明                    |
| ---- | ---------- | --------------------- |
| v1.0 | 2026-05-20 | 初始版本，包含翻译、重写、模板重写三个接口 |


---

## 联系方式

如有问题或建议，请联系开发团队。