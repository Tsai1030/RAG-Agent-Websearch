# ReAct Agent 醫療查詢系統架構分析

## 系統概述

這是一個基於 **ReAct (Reasoning and Acting)** 模式的醫療查詢智能代理系統，專門為台灣醫療環境設計。系統採用純 JavaScript 實現，**未使用 LangChain 框架**，而是自行實現了 ReAct 架構的核心邏輯。

## 架構設計

### 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                    ReactAgentService                        │
│                     (核心協調層)                             │
├─────────────────────────────────────────────────────────────┤
│  OpenAI GPT-4o     │  工具層 (Tools Layer)                  │
│  (推理引擎)         │                                        │
│                     │  ┌─────────────────────────────────┐   │
│                     │  │ SerperSearchService             │   │
│                     │  │ (Google 搜尋 API)               │   │
│                     │  └─────────────────────────────────┘   │
│                     │                                        │
│                     │  ┌─────────────────────────────────┐   │
│                     │  │ DoctorRAGService                │   │
│                     │  │ (醫師資料庫檢索)                │   │
│                     │  └─────────────────────────────────┘   │
│                     │                                        │
│                     │  ┌─────────────────────────────────┐   │
│                     │  │ VectorRAGService                │   │
│                     │  │ (向量檢索服務)                  │   │
│                     │  └─────────────────────────────────┘   │
│                     │                                        │
│                     │  ┌─────────────────────────────────┐   │
│                     │  │ ScrapingBeeService              │   │
│                     │  │ (網頁爬蟲服務)                  │   │
│                     │  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 核心類別結構

1. **ReactAgentService**: 主要的 ReAct 代理服務
2. **SerperSearchService**: Google 搜尋服務封裝
3. **外部服務依賴**: DoctorRAGService, VectorRAGService, ScrapingBeeService

## 為什麼不使用 LangChain

### 設計考量

1. **輕量化需求**: 避免引入大型框架的複雜性
2. **客製化控制**: 需要精確控制 ReAct 循環的每個步驟
3. **醫療領域特化**: 需要針對醫療查詢進行特殊優化
4. **依賴管理**: 減少外部依賴，提高系統穩定性

### 自實現的優勢

```javascript
// 自定義的 ReAct 循環控制
for (let i = 0; i < 8; i++) {
  // 完全控制每輪對話的邏輯
  const completion = await this.openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 600,
    temperature: 0.3
  });
  
  // 自定義的動作解析邏輯
  const actionMatch = reply.match(/Action\s*:\s*(\w+)/i);
  const finishMatch = reply.match(/Finish\s*:\s*([\s\S]*)/i);
  const inputMatch = reply.match(/Action Input\s*:\s*([\s\S]*)/i);
}
```

## Prompt 設計分析

### 系統提示詞 (System Prompt)

```javascript
const systemPrompt = `你是一個醫療 ReAct agent，可使用以下工具：\n` +
  `1. doctor_rag：查詢醫師資料庫\n` +
  `2. vector_rag：向量檢索醫師資料\n` +
  `3. web_search：Google 搜尋\n` +
  `4. finish：輸出最終診斷報告。\n` +
  `請依序輸出 Thought、Action、Action Input，獲得 Observation 後再繼續，直到使用 finish。回覆語言為繁體中文。`;
```

### 設計用意分析

#### 1. **角色定義**
- `你是一個醫療 ReAct agent` - 明確定義 AI 的角色和領域
- 建立專業的醫療查詢語境

#### 2. **工具清單**
- **明確列舉**: 避免 AI 嘗試使用不存在的工具
- **功能描述**: 讓 AI 理解每個工具的用途
- **有序排列**: 暗示工具的使用優先級

#### 3. **行為規範**
- `請依序輸出 Thought、Action、Action Input` - 強制遵循 ReAct 格式
- `獲得 Observation 後再繼續` - 確保循環邏輯正確
- `直到使用 finish` - 明確結束條件

#### 4. **語言設定**
- `回覆語言為繁體中文` - 確保輸出符合台灣用戶需求

## API 呼叫方法實現

### 1. Serper Google 搜尋 API

```javascript
async search(query) {
  try {
    if (!this.apiKey) {
      console.log('⚠️ Serper API key 未設定，跳過 Google 搜尋');
      return { organic: [], totalResults: 0 };
    }
    
    const response = await axios.post(this.baseURL, 
      { 
        q: query, 
        num: 5,           // 限制結果數量
        gl: 'tw',         // 地理位置：台灣
        hl: 'zh-tw'       // 語言：繁體中文
      }, 
      {
        headers: { 
          'X-API-KEY': this.apiKey, 
          'Content-Type': 'application/json' 
        },
        timeout: 10000    // 10秒超時
      }
    );
    return response.data;
  } catch (error) {
    console.error('Serper 搜尋錯誤:', error.message);
    return { organic: [], totalResults: 0 };
  }
}
```

#### 設計特點

1. **容錯機制**: API key 未設定時優雅降級
2. **本地化參數**: `gl: 'tw'`, `hl: 'zh-tw'` 針對台灣市場
3. **性能優化**: 限制結果數量和超時時間
4. **錯誤處理**: 確保異常時返回統一格式

### 2. OpenAI API 呼叫

```javascript
const completion = await this.openai.chat.completions.create({
  model: 'gpt-4o',      // 使用最新的 GPT-4o 模型
  messages,             // 對話歷史
  max_tokens: 600,      // 限制輸出長度
  temperature: 0.3      // 降低隨機性，提高一致性
});
```

#### 參數設計用意

- **模型選擇**: `gpt-4o` 提供最佳的推理能力
- **Token 限制**: `600` 平衡輸出品質和成本
- **Temperature**: `0.3` 在創造性和一致性間取得平衡

### 3. 工具路由實現

```javascript
let observation = '';
if (action === 'doctor_rag') {
  const result = await this.doctorRag.searchDoctors(actionInput || query);
  observation = JSON.stringify(result);
} else if (action === 'vector_rag') {
  const result = await this.vectorRag.searchDoctors(actionInput || query);
  observation = JSON.stringify(result);
} else if (action === 'web_search') {
  const result = await this.searchService.search(this.optimizeSearchQuery(actionInput || query));
  observation = JSON.stringify(result.organic ? result.organic.slice(0,3) : []);
} else {
  observation = '未知行動';
}
```

#### 設計特點

1. **統一接口**: 所有工具返回 JSON 格式
2. **容錯處理**: 未知行動返回錯誤訊息
3. **結果過濾**: 搜尋結果只取前3個，避免內容過多
4. **查詢優化**: 對搜尋查詢進行預處理

## 查詢優化策略

### 醫療特化優化

```javascript
optimizeSearchQuery(userQuery) {
  let optimizedQuery = userQuery;
  
  // 門診進度查詢優化
  if (userQuery.includes('看到幾號') || userQuery.includes('叫號')) {
    optimizedQuery += ' 即時叫號 門診進度';
  }
  
  // 醫師查詢優化
  if (userQuery.includes('醫師') && !userQuery.includes('高醫')) {
    optimizedQuery += ' 高雄醫學大學附設醫院';
  }
  
  return optimizedQuery;
}
```

### 優化策略分析

1. **語義擴展**: 將台灣醫療用語轉換為搜尋關鍵字
2. **上下文增強**: 自動添加醫院名稱提高搜尋準確性
3. **領域特化**: 針對醫療查詢場景進行優化

## ReAct 循環邏輯

### 動作解析

```javascript
const actionMatch = reply.match(/Action\s*:\s*(\w+)/i);
const finishMatch = reply.match(/Finish\s*:\s*([\s\S]*)/i);
const inputMatch = reply.match(/Action Input\s*:\s*([\s\S]*)/i);
```

### 結束條件判斷

```javascript
if (action === 'finish' || finishMatch) {
  const finalMatch = reply.match(/Final Answer\s*:\s*([\s\S]*)/i);
  if (finalMatch) {
    return finalMatch[1].trim();
  } else if (finishMatch) {
    return finishMatch[1].trim();
  } else {
    return reply;
  }
}
```

### 設計特點

1. **彈性解析**: 支援多種結束格式
2. **正規表達式**: 強健的文本解析
3. **容錯機制**: 多層次的結果提取

## 系統優勢

### 技術優勢

1. **輕量化架構**: 無需複雜框架，部署簡單
2. **高度客製化**: 針對醫療領域深度優化
3. **多源整合**: 結合結構化和非結構化數據
4. **本地化設計**: 完全適應台灣醫療環境

### 功能優勢

1. **智能推理**: ReAct 模式提供可解釋的推理過程
2. **多模態檢索**: 整合多種檢索策略
3. **實時搜尋**: 獲取最新醫療資訊
4. **容錯處理**: 完善的錯誤處理機制

## 使用示例

### 基本使用

```javascript
const agent = new ReactAgentService();
const result = await agent.run("我想找心臟科醫師");
console.log(result.response);
```

### 處理流程

1. **用戶查詢**: "我想找心臟科醫師"
2. **AI 思考**: Thought: 用戶想找心臟科醫師，我需要查詢醫師資料庫
3. **執行動作**: Action: doctor_rag
4. **獲取結果**: Observation: [醫師資料列表]
5. **繼續推理**: 直到找到合適答案
6. **輸出結果**: Final Answer: [心臟科醫師推薦]

## 性能和限制

### 性能優化

- **API 超時**: 10秒搜尋超時
- **結果限制**: 最多5個搜尋結果
- **循環限制**: 最多8輪對話
- **Token 控制**: 每次回應限制600 tokens

### 系統限制

- **依賴外部 API**: 需要 OpenAI 和 Serper API 金鑰
- **語言限制**: 主要支援繁體中文
- **領域限制**: 專門針對醫療查詢優化

## 總結

這個 ReAct Agent 系統展示了如何在不使用 LangChain 的情況下，自行實現一個功能完整的智能代理。通過精心設計的 Prompt、多源數據整合和本地化優化，系統能夠有效處理複雜的醫療查詢需求，為台灣醫療環境提供了一個高度客製化的解決方案。