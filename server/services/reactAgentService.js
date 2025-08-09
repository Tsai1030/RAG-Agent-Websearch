const axios = require('axios');
const OpenAI = require('openai');
const DoctorRAGService = require('./doctorRagService');
const VectorRAGService = require('./vectorRagService');
const ScrapingBeeService = require('./scrapingBeeService');

// Serper API 搜尋服務
class SerperSearchService {
  constructor() {
    this.apiKey = process.env.SERPER_API_KEY;
    this.baseURL = 'https://google.serper.dev/search';
  }

  async search(query) {
    try {
      if (!this.apiKey) {
        console.log('⚠️ Serper API key 未設定，跳過 Google 搜尋');
        return { organic: [], totalResults: 0 };
      }
      const response = await axios.post(this.baseURL, { q: query, num: 5, gl: 'tw', hl: 'zh-tw' }, {
        headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Serper 搜尋錯誤:', error.message);
      return { organic: [], totalResults: 0 };
    }
  }
}

const SYSTEM_PROMPT = `你是一個醫療 ReAct agent，可使用以下工具：\n` +
  `1. doctor_rag：查詢醫師資料庫\n` +
  `2. vector_rag：向量檢索醫師資料\n` +
  `3. web_search：Google 搜尋\n` +
  `4. finish：輸出最終診斷報告。\n` +
  `請依序輸出 Thought、Action、Action Input，獲得 Observation 後再繼續，直到使用 finish。回覆語言為繁體中文。\n` +
  `當你已經有明確答案時，請務必使用 finish action 結束，不要重複回覆。\n` +
  `在輸出 finish action 時，請直接給出最終答案，不要加上「抱歉」、「我將正確地完成這次對話」等多餘語句或開場白，只需輸出醫療資訊本身。`;

// ReAct Agent 服務
class ReactAgentService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key' });
    this.doctorRag = new DoctorRAGService();
    this.vectorRag = new VectorRAGService();
    this.searchService = new SerperSearchService();
    this.scrapingBeeService = new ScrapingBeeService();
  }

  optimizeSearchQuery(userQuery) {
    let optimizedQuery = userQuery;
    if (userQuery.includes('看到幾號') || userQuery.includes('叫號')) {
      optimizedQuery += ' 即時叫號 門診進度';
    }
    if (userQuery.includes('醫師') && !userQuery.includes('高醫')) {
      optimizedQuery += ' 高雄醫學大學附設醫院';
    }
    return optimizedQuery;
  }

  async run(messages) {
    // 從現有訊息中取得最新的使用者問題
    const userMessages = messages.filter(m => m.role === 'user' && !m.content.startsWith('Observation'));
    const latestQuery = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

    for (let i = 0; i < 8; i++) {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        max_tokens: 600,
        temperature: 0.3
      });
      const reply = completion.choices[0].message.content.trim();
      console.log(`第${i+1}回合AI回覆:`, reply);
      const actionMatch = reply.match(/Action\s*:\s*(\w+)/i);
      const finishMatch = reply.match(/Finish\s*:\s*([\s\S]*)/i);
      const inputMatch = reply.match(/Action Input\s*:\s*([\s\S]*)/i);
      const action = actionMatch ? actionMatch[1].toLowerCase() : null;
      const actionInput = inputMatch ? inputMatch[1].trim() : '';

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

      let observation = '';
      if (action === 'doctor_rag') {
        const result = await this.doctorRag.searchDoctors(actionInput || latestQuery);
        observation = JSON.stringify(result);
      } else if (action === 'vector_rag') {
        const result = await this.vectorRag.searchDoctors(actionInput || latestQuery);
        observation = JSON.stringify(result);
      } else if (action === 'web_search') {
        const result = await this.searchService.search(this.optimizeSearchQuery(actionInput || latestQuery));
        observation = JSON.stringify(result.organic ? result.organic.slice(0,3) : []);
      } else {
        observation = '未知行動';
      }

      messages.push({ role: 'assistant', content: reply });
      messages.push({ role: 'user', content: `Observation: ${observation}` });
    }
    return '無法在限制內完成診斷';
  }
}

async function processMedicalQueryReact(messages) {
  const agent = new ReactAgentService();
  const response = await agent.run(messages);
  return { response };
}

module.exports = { ReactAgentService, processMedicalQueryReact, SYSTEM_PROMPT };
