const { ChatOpenAI } = require('@langchain/openai');
const { DynamicTool } = require('langchain/tools');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const DoctorRAGService = require('./doctorRagService');
const VectorRAGService = require('./vectorRagService');
const ScrapingBeeService = require('./scrapingBeeService');
const axios = require('axios');

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
      const response = await axios.post(
        this.baseURL,
        { q: query, num: 5, gl: 'tw', hl: 'zh-tw' },
        {
          headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Serper 搜尋錯誤:', error.message);
      return { organic: [], totalResults: 0 };
    }
  }
}

class LangChainAgentService {
  constructor() {
    this.llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
      model: 'gpt-4o',
      temperature: 0.3,
    });
    this.doctorRag = new DoctorRAGService();
    this.vectorRag = new VectorRAGService();
    this.searchService = new SerperSearchService();
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

  async run(query) {
    const tools = [
      new DynamicTool({
        name: 'doctor_rag',
        description: '查詢醫師資料庫',
        func: async (input) => {
          const result = await this.doctorRag.searchDoctors(input);
          return JSON.stringify(result);
        },
      }),
      new DynamicTool({
        name: 'vector_rag',
        description: '向量檢索醫師資料',
        func: async (input) => {
          const result = await this.vectorRag.searchDoctors(input);
          return JSON.stringify(result);
        },
      }),
      new DynamicTool({
        name: 'web_search',
        description: 'Google 搜尋取得即時資訊',
        func: async (input) => {
          const result = await this.searchService.search(this.optimizeSearchQuery(input));
          return JSON.stringify(result.organic ? result.organic.slice(0, 3) : []);
        },
      }),
    ];

    const systemPrompt =
      '你是一個醫療 ReAct agent，可使用 doctor_rag、vector_rag、web_search 工具，' +
      '請依 Thought、Action、Action Input 的格式互動，最後以 finish 給出診斷報告，' +
      '回覆使用繁體中文。';

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
    ]);

    const executor = await initializeAgentExecutorWithOptions(tools, this.llm, {
      agentType: 'openai-functions',
      prompt,
      maxIterations: 8,
      verbose: false,
    });

    const result = await executor.invoke({ input: query });
    return result.output;
  }
}

async function processMedicalQueryLangChain(query) {
  const agent = new LangChainAgentService();
  const response = await agent.run(query);
  return { response };
}

module.exports = { LangChainAgentService, processMedicalQueryLangChain };
