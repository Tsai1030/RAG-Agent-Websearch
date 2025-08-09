// 簡易的對話訊息儲存服務，使用記憶體 Map 以 conversationId 為鍵保存訊息陣列
class ConversationService {
  constructor() {
    this.conversations = new Map();
  }

  // 取得指定 conversationId 的訊息陣列，若不存在則回傳空陣列
  getMessages(conversationId) {
    if (!conversationId) return [];
    return this.conversations.get(conversationId) || [];
  }

  // 儲存指定 conversationId 的訊息陣列
  saveMessages(conversationId, messages) {
    if (!conversationId) return;
    this.conversations.set(conversationId, messages);
  }
}

module.exports = new ConversationService();
