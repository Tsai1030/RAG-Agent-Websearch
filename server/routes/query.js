const express = require('express');
const { processMedicalQueryLangChain } = require('../services/langchainAgentService');

const router = express.Router();

// 醫療資訊查詢端點
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;

    // 驗證輸入
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: '查詢內容不能為空',
        message: '請提供有效的查詢內容'
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        error: '查詢內容過長',
        message: '查詢內容不能超過 500 個字元'
      });
    }

    console.log(`🔍 收到查詢: ${query}`);

    // 處理查詢
    const result = await processMedicalQueryLangChain(query.trim());

    res.json({
      success: true,
      query: query.trim(),
      response: result.response,
      searchResults: result.searchResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('查詢處理錯誤:', error);
    
    // 根據錯誤類型返回適當的錯誤訊息
    if (error.message.includes('API key')) {
      return res.status(500).json({
        error: 'API 設定錯誤',
        message: '請檢查 API 金鑰設定'
      });
    }
    
    if (error.message.includes('搜尋')) {
      return res.status(503).json({
        error: '搜尋服務暫時無法使用',
        message: '請稍後再試'
      });
    }

    res.status(500).json({
      error: '查詢處理失敗',
      message: '無法處理您的查詢，請稍後再試'
    });
  }
});

// 查詢歷史端點 (可選功能)
router.get('/history', (req, res) => {
  // 這裡可以實作查詢歷史功能
  res.json({
    message: '查詢歷史功能尚未實作',
    history: []
  });
});

module.exports = router; 